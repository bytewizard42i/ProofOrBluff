import { describe, expect, it } from 'vitest';
import { LOG } from '../../components/table/GameLog.jsx';
import { createMockSponsoredServer } from './mockServer.js';
import {
  ACTIVE_GAME_KEY,
  SponsoredAiProvider,
  SponsoredGameProvider,
  applyEvents,
  cardsToRanks,
  handToCards,
  summariseChain,
  viewToTableState,
} from './sponsoredProvider.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function makeProvider(serverOptions) {
  const server = createMockSponsoredServer(serverOptions);
  const storage = memoryStorage();
  const provider = new SponsoredGameProvider({ baseUrl: server.baseUrl, fetchImpl: server.fetch, storage });
  return { server, storage, provider };
}

const cardsOfRank = (state, rank) => state.playerHand.filter((c) => c.rank === rank);

describe('rank conversion', () => {
  it('maps sorted rank indices to stable UI cards with hidden suits', () => {
    const cards = handToCards([0, 3, 3, 12]);
    expect(cards).toEqual([
      { id: 'human:0:0', rank: '2', rankIndex: 0, suit: 'hidden' },
      { id: 'human:3:0', rank: '5', rankIndex: 3, suit: 'hidden' },
      { id: 'human:3:1', rank: '5', rankIndex: 3, suit: 'hidden' },
      { id: 'human:12:0', rank: 'A', rankIndex: 12, suit: 'hidden' },
    ]);
  });

  it('maps UI cards, rank strings and indices back to API ranks', () => {
    expect(cardsToRanks([{ rank: 'A' }, { rankIndex: 4 }, 'J', 7])).toEqual([12, 4, 9, 7]);
    expect(() => cardsToRanks([{ rank: '1' }])).toThrow('Unknown card rank');
  });
});

describe('SponsoredGameProvider', () => {
  it('starts a mode 1 game with 7 cards in the table state shape', async () => {
    const { provider, storage } = makeProvider();
    const state = await provider.startGame({ mode: 1 });
    expect(state.playerHand).toHaveLength(7);
    expect(state.aiHandCount).toBe(7);
    expect(state.aiHand).toEqual([]);
    expect(state.status).toBe('playing');
    expect(state.turn).toBe('player');
    expect(state.lastPlay).toBeNull();
    expect(state.currentRank).toBe('5');
    expect(state.scores).toEqual({ player: 0, ai: 0 });
    expect(state.winThreshold).toBe(15);
    expect(state.privateDecks).toBe(true);
    expect(state.log[0]).toContain('first to 15');
    expect(state.chain.pending).toEqual(['deploy']);
    expect(storage.getItem(ACTIVE_GAME_KEY)).toBe(provider.activeGameId);
  });

  it('starts a mode 0 game with 5 cards and a threshold of 10', async () => {
    const { provider } = makeProvider();
    const state = await provider.startGame({ mode: 0 });
    expect(state.playerHand).toHaveLength(5);
    expect(state.winThreshold).toBe(10);
  });

  it('plays through the table actions and surfaces the bot response', async () => {
    const { provider } = makeProvider();
    const start = await provider.startGame({ mode: 1 });
    const state = await provider.actions.play({ cards: cardsOfRank(start, '5').slice(0, 1) });
    expect(state.playerHand).toHaveLength(6);
    expect(state.turn).toBe('player');
    expect(state.lastPlay).toEqual({ player: 'ai', claimedRank: '6', claimedCount: 1, cards: [] });
    expect(state.pileCount).toBe(2);
    expect(state.stats.aiPlays).toBe(1);
    expect(state.stats.rounds).toBe(1);
    expect(state.aiDialogue).toBe('One. Trust me.');
    expect(provider.aiDialogue).toBe('One. Trust me.');
    const tail = state.log.slice(-3);
    expect(tail[0]).toMatch(new RegExp(`^${LOG.YOU_PLAYED} 1 card`));
    expect(tail[1]).toMatch(new RegExp(`^${LOG.AI_ACCEPTED} the claim`));
    expect(tail[2]).toMatch(new RegExp(`^${LOG.AI_PLAYED} 1 card`));
  });

  it('challenge resolves with the reveal and the GameTable result shape', async () => {
    const { provider } = makeProvider();
    const start = await provider.startGame({ mode: 1 });
    await provider.actions.play({ cards: cardsOfRank(start, '5').slice(0, 1) });
    const result = await provider.actions.challenge();
    expect(result.claimWasTrue).toBe(false);
    expect(result.revealed).toEqual([{ id: 'reveal:2:0', rank: '4', rankIndex: 2, suit: 'hidden' }]);
    expect(result.logLength).toBe(result.state.log.length);
    expect(result.state.scores).toEqual({ player: 3, ai: 0 });
    expect(result.state.stats.aiBluffsCaught).toBe(1);
    expect(result.state.lastReveal).toMatchObject({ challenger: 'player', truthful: false });
    expect(result.state.lastPlay).toBeNull();
    expect(result.state.pileCount).toBe(0);
    const line = result.state.log.at(-1);
    expect(line.startsWith(LOG.CAUGHT_BLUFFING)).toBe(true);
    expect(line).toContain(LOG.AI_LOSES_MARKER);
  });

  it('accept logs the human acceptance and hands the turn back to the player', async () => {
    const { provider } = makeProvider();
    const start = await provider.startGame({ mode: 1 });
    await provider.actions.play({ cards: cardsOfRank(start, '5').slice(0, 1) });
    const state = await provider.actions.accept();
    expect(state.log.at(-1).startsWith(LOG.YOU_ACCEPTED)).toBe(true);
    expect(state.lastPlay).toBeNull();
    expect(state.turn).toBe('player');
    expect(state.currentRank).toBe('7');
    expect(state.stats.rounds).toBe(2);
    expect(state.pileCount).toBe(2);
  });

  it('propagates chain receipts through refresh without re-logging events', async () => {
    const { server, provider } = makeProvider();
    await provider.startGame({ mode: 1 });
    const logBefore = provider.getGameState().log.length;
    server.settleChain(provider.activeGameId, 2888400);
    const state = await provider.refresh();
    expect(state.log).toHaveLength(logBefore);
    expect(state.chain.deployed).toBe(true);
    expect(state.chain.contractAddress).toBe('c0'.repeat(32));
    expect(state.chain.pending).toEqual([]);
    expect(provider.chain.receipts).toHaveLength(1);
  });

  it('counts proven rounds for the receipts widget', () => {
    const view = {
      round: 3, status: 'playing',
      chain: { network: 'mainnet', contractAddress: 'ab', receipts: [{ step: 'deploy' }, { step: 'proveRound', round: 1 }], pending: ['proveRound:2'] },
    };
    expect(summariseChain(view)).toMatchObject({ roundsProven: 1, roundsPlayed: 2, label: 'round 1/2 proven', deployed: true, closed: false });
  });

  it('plays a whole game to the end and marks it gameover', async () => {
    const { provider } = makeProvider();
    let state = await provider.startGame({ mode: 0 });
    let guard = 0;
    while (state.status === 'playing' && guard < 200) {
      guard += 1;
      if (state.lastPlay?.player === 'ai') {
        await provider.challenge();
      } else {
        await provider.makePlay({ cards: state.playerHand.slice(0, 1) });
      }
      state = provider.getGameState();
    }
    expect(state.status).toBe('gameover');
    expect(['player', 'ai', 'draw']).toContain(state.winner);
    expect(state.log.some((l) => l.startsWith(LOG.YOU_WIN) || l.startsWith(LOG.AI_WINS) || l.startsWith('Draw'))).toBe(true);
    expect(state.chain.pending).toContain('closeGame');
  });

  it('rejects out-of-turn actions with the service status and a warning log line', async () => {
    const { provider } = makeProvider();
    await provider.startGame({ mode: 1 });
    await expect(provider.accept()).rejects.toMatchObject({ status: 409 });
    expect(provider.getGameState().log.at(-1).startsWith(LOG.WARN)).toBe(true);
  });

  it('forgets a stored game the service no longer knows (404)', async () => {
    const { server, storage } = makeProvider();
    storage.setItem(ACTIVE_GAME_KEY, 'ff'.repeat(32));
    const provider = new SponsoredGameProvider({ baseUrl: server.baseUrl, fetchImpl: server.fetch, storage });
    expect(provider.activeGameId).toBe('ff'.repeat(32));
    expect(await provider.resumeGame()).toBeNull();
    expect(provider.activeGameId).toBeNull();
    expect(storage.getItem(ACTIVE_GAME_KEY)).toBeNull();
  });

  it('resumes a stored game and notifies subscribers', async () => {
    const { server, storage, provider } = makeProvider();
    await provider.startGame({ mode: 1 });
    const second = new SponsoredGameProvider({ baseUrl: server.baseUrl, fetchImpl: server.fetch, storage });
    const seen = [];
    second.subscribe((state) => seen.push(state));
    const state = await second.resumeGame();
    expect(state.gameId).toBe(provider.activeGameId);
    expect(state.log[0]).toContain('Match resumed');
    expect(seen).toHaveLength(1);
    second.resetGame();
    expect(second.getGameState()).toBeNull();
    expect(storage.getItem(ACTIVE_GAME_KEY)).toBeNull();
  });

  it('requires startGame before any move', async () => {
    const { provider } = makeProvider();
    await expect(provider.makePlay({ cards: [] })).rejects.toThrow('No active sponsored game');
  });
});

describe('applyEvents / viewToTableState', () => {
  it('turns a bot challenge into the caught-bluffing line against the player', () => {
    const view = { currentRank: 5, status: 'playing', round: 1, scores: { human: 0, bot: 3 } };
    const applied = applyEvents(view, [{ type: 'bot-challenge', truthful: false, revealed: [1, 9], dialogue: 'Gotcha.' }], { humanAction: { type: 'play', rank: 4, count: 2 } });
    expect(applied.lines[1].startsWith(LOG.CAUGHT_BLUFFING)).toBe(true);
    expect(applied.lines[1]).toContain(LOG.PLAYER_LOSES_MARKER);
    expect(applied.stats.playerBluffsCaught).toBe(1);
    expect(applied.dialogue).toBe('Gotcha.');
    expect(applied.reveal.challenger).toBe('ai');
  });

  it('maps an ended view to gameover with the winner in table vocabulary', () => {
    const view = { status: 'ended', winner: 'bot', hand: [], scores: { human: 4, bot: 15 }, mode: 1, round: 3, cardsLeft: { human: 0, bot: 0 }, chain: { receipts: [], pending: [] } };
    const state = viewToTableState(view);
    expect(state.status).toBe('gameover');
    expect(state.winner).toBe('ai');
    expect(state.playerHand).toEqual([]);
    expect(state.scores).toEqual({ player: 4, ai: 15 });
  });
});

describe('SponsoredAiProvider', () => {
  it('refuses local decisions and echoes the server dialogue', async () => {
    const { provider } = makeProvider();
    const ai = new SponsoredAiProvider(provider);
    expect(() => ai.decidePlay()).toThrow('server-driven');
    expect(() => ai.decideChallenge()).toThrow('server-driven');
    const start = await provider.startGame({ mode: 1 });
    await provider.makePlay({ cards: cardsOfRank(start, '5').slice(0, 1) });
    expect(ai.getReaction()).toEqual({ dialogue: 'One. Trust me.', mediaHint: null, emotionTag: null });
    expect(ai.getGameOverMessage(true).dialogue).toContain('Final score 0–0');
  });
});
