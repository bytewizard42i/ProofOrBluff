import { describe, expect, it } from 'vitest';
import { createSponsoredClient, SponsoredApiError } from './client.js';
import { createMockSponsoredServer } from './mockServer.js';

function makeClient(serverOptions) {
  const server = createMockSponsoredServer(serverOptions);
  const client = createSponsoredClient({ baseUrl: server.baseUrl, fetchImpl: server.fetch });
  return { server, client };
}

describe('createSponsoredClient', () => {
  it('requires a base URL and appends /v1 exactly once', () => {
    expect(() => createSponsoredClient({ baseUrl: '', fetchImpl: () => {} })).toThrow('VITE_POB_API_URL');
    expect(createSponsoredClient({ baseUrl: 'https://api.example/', fetchImpl: () => {} }).apiRoot).toBe('https://api.example/v1');
    expect(createSponsoredClient({ baseUrl: 'https://api.example/v1', fetchImpl: () => {} }).apiRoot).toBe('https://api.example/v1');
  });

  it('reports health', async () => {
    const { client } = makeClient();
    const health = await client.health();
    expect(health.ok).toBe(true);
    expect(health.network).toBe('mainnet');
    expect(health.proofQueue).toEqual({ pending: 0 });
  });

  it('creates a mode 1 game with 7 cards and a mode 0 game with 5', async () => {
    const { client } = makeClient();
    const standard = await client.createGame({ mode: 1 });
    expect(standard.gameId).toMatch(/^[0-9a-f]{64}$/);
    expect(standard.hand).toHaveLength(7);
    expect(standard.cardsLeft).toEqual({ human: 7, bot: 7 });
    expect(standard.turn).toBe('human');
    expect(standard.chain).toEqual({ network: 'mainnet', contractAddress: null, receipts: [], pending: ['deploy'] });

    const casual = await client.createGame({ mode: 0, difficulty: 'easy' });
    expect(casual.hand).toHaveLength(5);
    expect(casual.difficulty).toBe('easy');
  });

  it('posts a play and gets the bot response back in lastEvents', async () => {
    const { client } = makeClient();
    const created = await client.createGame({ mode: 1 });
    const rank = created.currentRank;
    const after = await client.play(created.gameId, { rank, count: 1, cards: [rank] });
    expect(after.hand).toHaveLength(6);
    expect(after.lastEvents.map((e) => e.type)).toEqual(['bot-accept', 'bot-play']);
    expect(after.pending).toEqual({ claimer: 'bot', rank: rank + 1, count: 1 });
    expect(after.turn).toBe('human');
  });

  it('challenge reveals the bot cards', async () => {
    const { client } = makeClient();
    const created = await client.createGame({ mode: 1 });
    const rank = created.currentRank;
    await client.play(created.gameId, { rank, count: 1, cards: [rank] });
    const after = await client.challenge(created.gameId);
    const reveal = after.lastEvents.find((e) => e.type === 'human-challenge');
    expect(reveal.truthful).toBe(false);
    expect(reveal.revealed).toEqual([2]);
    expect(after.scores).toEqual({ human: 3, bot: 0 });
    expect(after.pending).toBeNull();
  });

  it('accept clears the bot claim and gives the responder the next turn', async () => {
    const { client } = makeClient();
    const created = await client.createGame({ mode: 1 });
    const rank = created.currentRank;
    await client.play(created.gameId, { rank, count: 1, cards: [rank] });
    const after = await client.accept(created.gameId);
    expect(after.lastEvents).toEqual([]);
    expect(after.pending).toBeNull();
    expect(after.turn).toBe('human');
    expect(after.currentRank).toBe(rank + 2);
  });

  it('surfaces receipts via getGame as proofs land', async () => {
    const { server, client } = makeClient();
    const created = await client.createGame({ mode: 1 });
    server.settleChain(created.gameId, 2888400);
    const view = await client.getGame(created.gameId);
    expect(view.chain.pending).toEqual([]);
    expect(view.chain.contractAddress).toBe('c0'.repeat(32));
    expect(view.chain.receipts[0]).toMatchObject({ step: 'deploy', blockHeight: 2888400 });
  });

  it('throws SponsoredApiError carrying the status and server message', async () => {
    const { client } = makeClient();
    const created = await client.createGame({ mode: 1 });
    const bad = client.play(created.gameId, { rank: created.currentRank + 5, count: 1, cards: [0] });
    await expect(bad).rejects.toBeInstanceOf(SponsoredApiError);
    await expect(bad).rejects.toMatchObject({ status: 400, message: expect.stringContaining('current rank') });

    await client.play(created.gameId, { rank: created.currentRank, count: 1, cards: [created.currentRank] });
    const wrongTurn = client.play(created.gameId, { rank: created.currentRank + 1, count: 1, cards: [0] });
    await expect(wrongTurn).rejects.toMatchObject({ status: 409 });
  });

  it('returns 404 for unknown games and rejects malformed ids locally', async () => {
    const { client } = makeClient();
    await expect(client.getGame('ff'.repeat(32))).rejects.toMatchObject({ status: 404, message: 'Unknown game.' });
    expect(() => client.getGame('not-hex')).toThrow('64-character');
  });

  it('maps 503 and 429 from the service', async () => {
    const { server, client } = makeClient({ ready: false, maxOpenGames: 1 });
    await expect(client.createGame()).rejects.toMatchObject({ status: 503 });
    server.setReady(true);
    await client.createGame();
    await expect(client.createGame()).rejects.toMatchObject({ status: 429 });
  });

  it('wraps network failures as status 0 (after exhausting retries)', async () => {
    const client = createSponsoredClient({ baseUrl: 'http://down.local', retryDelayMs: 0, fetchImpl: async () => { throw new Error('ECONNREFUSED'); } });
    await expect(client.health()).rejects.toMatchObject({ status: 0, message: expect.stringContaining('ECONNREFUSED') });
  });
});
