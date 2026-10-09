// 5 Up 2 Down sponsored game: the bot plays, the human is scripted, and every
// chain step the game emits (deploy → proveRound(r)… → closeGame) is run
// through the REAL compiled circuit. A failure here is what Mainnet would reject.

import { describe, expect, it } from 'vitest';
import * as runtime from '@midnight-ntwrk/compact-runtime';
import { createFiveUpGame, FIVE_UP_MODES } from './five-up-game.js';
import { challengeReductionWitness } from './rollup-consent.js';
import { claimTruthProbability, decideChallenge, decideClaim } from './five-up-bot.js';
import { createChainQueue, createSponsoredHttpApp } from './sponsored-service.js';
import http from 'node:http';

const { Contract, pureCircuits, ledger } = await import('../../contracts/managed/five-up-two-down/contract/index.js');
const { pureCircuits: v3pPure } = await import('../../contracts/managed/proof-or-bluff-rollup-v3p/contract/index.js');

/** A sim-ledger "chain" that executes each step with the compiled circuit. */
function circuitChain() {
  const witness = { entropy: null, roundSecrets: null, moves: [], ranks: [], boundary: null, p1: null, p2: null };
  const contract = new Contract({
    entropyPair: (c) => [c.privateState, witness.entropy],
    roundSecrets: (c) => [c.privateState, witness.roundSecrets],
    roundMoves: (c) => [c.privateState, witness.moves],
    dealtRanks: (c) => [c.privateState, witness.ranks],
    startBoundary: (c) => [c.privateState, witness.boundary],
    p1CloseConsent: (c) => [c.privateState, witness.p1],
    p2CloseConsent: (c) => [c.privateState, witness.p2],
    get_challenge_reduction: (c, f) => challengeReductionWitness(c, f),
  });
  const address = runtime.dummyContractAddress();
  let context = null;
  const call = (name, ...args) => { const r = contract.circuits[name](context, ...args); context = r.context; return r.result; };
  return {
    state: () => ledger(context.currentQueryContext.state),
    async deployGame(a) {
      const init = contract.initialState(runtime.createConstructorContext({}, '33'.repeat(32)),
        a.playerOne, a.playerTwo, a.mode, a.p1EntropyCommit, a.p2EntropyCommit, a.p1RoundCommits, a.p2RoundCommits);
      context = runtime.createCircuitContext(address, '33'.repeat(32), init.currentContractState.data, init.currentPrivateState, undefined, undefined, 1_800_000_000);
      return { contractAddress: address, txHash: 'sim-deploy', blockHeight: 1 };
    },
    async proveRound({ round, witnesses: w }) {
      witness.entropy = w.entropyPair; witness.roundSecrets = w.roundSecrets; witness.moves = w.moves; witness.ranks = w.ranks; witness.boundary = w.boundaryIn;
      call('proveRound', BigInt(round));
      return { txHash: `sim-r${round}`, blockHeight: 1 + round };
    },
    async closeGame(a) {
      witness.boundary = a.boundary; witness.p1 = a.p1CloseConsent; witness.p2 = a.p2CloseConsent;
      call('closeGame', a.p1Score, a.p2Score, a.winner);
      return { txHash: 'sim-close', blockHeight: 99 };
    },
    async joinAt() {},
  };
}

/** Scripted human: honest claims; challenge 2-claims, accept 1-claims. */
function playOut(game) {
  let guard = 0;
  let v = game.view();
  while (v.status === 'playing') {
    if (guard++ > 200) throw new Error('did not finish');
    if (v.step === 'claim') {
      const m = v.myMatches;
      v = game.humanClaim({ count: m.length, ranks: m });
    } else {
      v = v.pending.count === 2 ? game.humanChallenge() : game.humanAccept();
    }
  }
  return v;
}

async function runSteps(game, chain) {
  // deploy first (the service does this on creation), then drain in order.
  let r = await chain.deployGame(game.constructorArgs()); game.recordReceipt({ step: 'deploy', ...r });
  for (const step of game.takePendingChainSteps()) {
    if (step.step === 'proveRound') { r = await chain.proveRound(step); game.recordReceipt({ step: 'proveRound', round: step.round, ...r }); }
    else if (step.step === 'closeGame') { r = await chain.closeGame(step.build(runtime.dummyContractAddress())); game.recordReceipt({ step: 'closeGame', ...r }); }
  }
}

describe('5 Up 2 Down sponsored game', () => {
  it.each([0, 1])('whole game (mode %i): every emitted chain step is accepted by the compiled circuit', async (mode) => {
    for (let n = 0; n < 2; n += 1) {
      const game = createFiveUpGame({ gameId: 'g'.repeat(64), mode, pureCircuits });
      const view = playOut(game);
      expect(view.status).toBe('ended');
      expect(['human', 'bot', 'draw']).toContain(view.winner);
      const chain = circuitChain();
      await runSteps(game, chain);
      const s = chain.state();
      expect(s.closed).toBe(true);
      expect(Number(s.p1Score)).toBe(game.view().scores.human);
      expect(Number(s.p2Score)).toBe(game.view().scores.bot);
      expect(game.view().status).toBe('closed');
      expect(game.view().chain.pending).toEqual([]);
      const t = game.transcript();
      expect(t.rounds.length).toBeGreaterThan(0);
      expect(t.result.winner).toBe(view.winner);
    }
  });
  it('view never leaks the bot hole; lastEvents carry dialogue; human-challenge reveals the bot cards', () => {
    const game = createFiveUpGame({ gameId: 'h'.repeat(64), mode: 1, pureCircuits });
    const v = game.view();
    expect(v.gameType).toBe('fiveup');
    expect(v.board).toHaveLength(5); expect(v.hole).toHaveLength(2);
    expect(Object.keys(v)).not.toContain('botHole');
    expect(v.turn).toBe('human'); expect(v.step).toBe('claim');
    const after = game.humanClaim({ count: 0, ranks: [] });
    // bot responded (accept, 0-claim) and claimed; now it's the human's response — or the round rolled
    if (after.step === 'respond') {
      expect(after.pending.claimer).toBe('bot');
      expect(after.lastEvents.some((e) => e.type === 'bot-claim' && typeof e.dialogue === 'string')).toBe(true);
      if (after.pending.count > 0) {
        const c = game.humanChallenge();
        const ev = c.lastEvents.find((e) => e.type === 'human-challenge');
        expect(ev.revealed).toHaveLength(2);
        expect(typeof ev.lies).toBe('number');
      }
    }
  });
  it('validation: bad counts, ranks not on board, wrong step, challenging a 0-claim', () => {
    const game = createFiveUpGame({ gameId: 'i'.repeat(64), mode: 1, pureCircuits });
    expect(() => game.humanClaim({ count: 3, ranks: [1, 2, 3] })).toThrow(/count must be/);
    expect(() => game.humanClaim({ count: 1, ranks: [] })).toThrow(/exactly/);
    const off = [0,1,2,3,4,5,6,7,8,9,10,11,12].find((r) => !game.view().board.includes(r));
    expect(() => game.humanClaim({ count: 1, ranks: [off] })).toThrow(/not on the board/);
    expect(() => game.humanAccept()).toThrow(/no claim to respond to/);
    expect(() => createFiveUpGame({ gameId: 'j'.repeat(64), mode: 4, pureCircuits })).toThrow(/mode must be/);
    expect(FIVE_UP_MODES).toEqual([0, 1]);
  });
  it('abandon drops pending chain work and the transcript stays sealed until closed', () => {
    const game = createFiveUpGame({ gameId: 'k'.repeat(64), mode: 1, pureCircuits });
    expect(() => game.transcript()).toThrow(/closed on-chain/);
    const v = game.abandon();
    expect(v.status).toBe('abandoned');
    expect(v.chain.pending).toEqual([]);
    expect(game.takePendingChainSteps()).toEqual([]);
  });
});

describe('5 Up 2 Down bot', () => {
  it('claim probabilities: certain lies score 0, likely truths near 1', () => {
    const board = [12, 12, 12, 12, 3];           // all four Aces showing
    expect(claimTruthProbability({ claim: { count: 1, ranks: [12] }, board, hole: [5, 6] })).toBe(0);
    expect(claimTruthProbability({ claim: { count: 0, ranks: [] }, board, hole: [5, 6] })).toBe(1);
    const p1 = claimTruthProbability({ claim: { count: 1, ranks: [3] }, board, hole: [5, 6] });   // 3 copies of rank 3 out there
    expect(p1).toBeGreaterThan(0.12); expect(p1).toBeLessThan(0.14);
  });
  it('always challenges a claim that cannot be true; never challenges a 0-claim', () => {
    const board = [12, 12, 12, 12, 3];
    for (let i = 0; i < 20; i += 1) {
      expect(decideChallenge({ claim: { count: 1, ranks: [12] }, board, hole: [5, 6], difficulty: 'hard', random: Math.random }).shouldChallenge).toBe(true);
      expect(decideChallenge({ claim: { count: 0, ranks: [] }, board, hole: [5, 6], random: Math.random }).shouldChallenge).toBe(false);
    }
  });
  it('claims are legal: named ranks are on the board, honest when it has two matches', () => {
    const board = [1, 4, 7, 9, 11];
    for (let i = 0; i < 50; i += 1) {
      const d = decideClaim({ hole: [4, 9], board, difficulty: 'hard', random: Math.random });
      expect(d.count).toBe(2); expect(d.ranks.sort()).toEqual([4, 9]);
      const e = decideClaim({ hole: [2, 3], board, difficulty: 'hard', random: Math.random });
      for (const r of e.ranks) expect(board).toContain(r);
      expect(e.count).toBe(e.ranks.length);
    }
  });
});

describe('5 Up 2 Down over HTTP (fake chain)', () => {
  it('POST /v1/games {game:"fiveup"} → claim/accept/challenge routes; play is refused on this table', async () => {
    const fake = { async deployGame() { return { contractAddress: 'c'.repeat(64), txHash: 't', blockHeight: 1 }; }, async proveRound({ round }) { return { txHash: `r${round}`, blockHeight: 2 }; }, async closeGame() { return { txHash: 'x', blockHeight: 3 }; }, async joinAt() {} };
    const seen = [];
    const queue = createChainQueue({ chainForGame: async (id, addr, type) => { seen.push(type); return fake; }, onReceipt: (id, r) => app.receipt(id, r) });
    const app = createSponsoredHttpApp({ pureCircuits: v3pPure, fiveUpPureCircuits: pureCircuits, queue, network: 'test' });
    const server = http.createServer((q, s) => app.handle(q, s));
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${server.address().port}`;
    const call = async (method, p, body) => { const res = await fetch(base + p, { method, headers: { Origin: 'https://prooforbluff.app', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return { status: res.status, body: await res.json() }; };
    try {
      let { status, body: v } = await call('POST', '/v1/games', { game: 'fiveup', mode: 1 });
      expect(status).toBe(201); expect(v.gameType).toBe('fiveup'); expect(v.board).toHaveLength(5);
      const id = v.gameId;
      expect((await call('POST', `/v1/games/${id}/play`, { rank: 0, count: 1, cards: [0] })).status).toBe(409);
      let guard = 0;
      while (v.status === 'playing' && guard++ < 200) {
        if (v.step === 'claim') ({ body: v } = await call('POST', `/v1/games/${id}/claim`, { count: v.myMatches.length, ranks: v.myMatches }));
        else ({ body: v } = await call('POST', `/v1/games/${id}/${v.pending.count === 2 ? 'challenge' : 'accept'}`));
      }
      expect(v.status).toBe('ended');
      await queue.idle();
      expect(seen.every((t) => t === 'fiveup')).toBe(true);
      expect((await call('GET', `/v1/games/${id}`)).body.status).toBe('closed');
      expect((await call('POST', '/v1/games', { game: 'nope' })).status).toBe(400);
      expect((await call('POST', '/v1/games', { game: 'fiveup', mode: 4 })).status).toBe(400);
    } finally { server.close(); }
  });
  it('503 for fiveup when the server has no 5U2D bindings', async () => {
    const queue = createChainQueue({ chainForGame: async () => ({}), onReceipt: () => {} });
    const app = createSponsoredHttpApp({ pureCircuits: v3pPure, queue, network: 'test' });
    const server = http.createServer((q, s) => app.handle(q, s));
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    try {
      const res = await fetch(`http://127.0.0.1:${server.address().port}/v1/games`, { method: 'POST', headers: { Origin: 'https://prooforbluff.app', 'Content-Type': 'application/json' }, body: JSON.stringify({ game: 'fiveup' }) });
      expect(res.status).toBe(503);
    } finally { server.close(); }
  });
});
