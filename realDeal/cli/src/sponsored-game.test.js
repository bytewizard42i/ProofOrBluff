// End-to-end check of the sponsored game object: a scripted "human" plays whole
// games against the real scripted bot, and every chain step the game emits
// (constructor args, proveRound witnesses, closeGame consents) is fed through
// the COMPILED v3p circuit in the simulator. If the game object ever produced
// witnesses the circuit rejects, a Mainnet proof would fail the same way.

import { describe, expect, it } from 'vitest';
import * as runtime from '@midnight-ntwrk/compact-runtime';
import { createSponsoredGame, GAME_STATUS, GameError, handCountsToRanks } from './sponsored-game.js';
import { challengeReductionWitness } from './rollup-consent.js';
import { initialBoundary, createV3pReferee } from '../../contracts/rollup-v3p-referee.js';


const { Contract, pureCircuits, ledger } = await import('../../contracts/managed/proof-or-bluff-rollup-v3p/contract/index.js');
const SPONSOR = { bytes: new Uint8Array(32).fill(7) };

/** Deterministic randomness so a failure is reproducible. */
function seededRandom(seedByte) {
  let x = seedByte * 2654435761 + 1;
  return (n) => {
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i += 1) { x = (x * 1103515245 + 12345) >>> 0; out[i] = (x >>> 16) & 0xff; }
    return out;
  };
}

/** A simulator instance of the deployed contract fed by the game's chain steps. */
function simulatedChain(game) {
  const witness = {
    entropy: [new Uint8Array(32), new Uint8Array(32)], roundSecrets: [new Uint8Array(32), new Uint8Array(32)],
    moves: [], snapshots: [], boundary: initialBoundary(), remaining: [Array(7).fill(0n), Array(7).fill(0n)],
    p1CloseConsent: null, p2CloseConsent: null,
  };
  const contract = new Contract({
    entropyPair: (ctx) => [ctx.privateState, witness.entropy],
    roundSecrets: (ctx) => [ctx.privateState, witness.roundSecrets],
    roundMoves: (ctx) => [ctx.privateState, witness.moves],
    roundSnapshots: (ctx) => [ctx.privateState, witness.snapshots],
    startBoundary: (ctx) => [ctx.privateState, witness.boundary],
    remainingRanks: (ctx) => [ctx.privateState, witness.remaining],
    p1CloseConsent: (ctx) => [ctx.privateState, witness.p1CloseConsent],
    p2CloseConsent: (ctx) => [ctx.privateState, witness.p2CloseConsent],
    get_challenge_reduction: (ctx, full) => challengeReductionWitness(ctx, full),
  });
  const a = game.constructorArgs();
  const initial = contract.initialState(
    runtime.createConstructorContext({}, SPONSOR),
    a.playerOne, a.playerTwo, a.mode, a.p1EntropyCommit, a.p2EntropyCommit, a.p1RoundCommits, a.p2RoundCommits,
  );
  let context = runtime.createCircuitContext(
    runtime.dummyContractAddress(), SPONSOR,
    initial.currentContractState.data, initial.currentPrivateState, undefined, undefined, 1_800_000_000,
  );
  const call = (name, ...args) => { const r = contract.circuits[name](context, ...args); context = r.context; return r.result; };

  return {
    state: () => ledger(context.currentQueryContext.state),
    apply(step) {
      if (step.step === 'proveRound') {
        const w = step.witnesses;
        witness.entropy = w.entropyPair; witness.roundSecrets = w.roundSecrets;
        witness.moves = w.moves; witness.snapshots = w.snapshots; witness.remaining = w.remaining; witness.boundary = w.boundaryIn;
        return call('proveRound', BigInt(step.round));
      }
      if (step.step === 'closeGame') {
        const c = step.build(runtime.dummyContractAddress());
        witness.boundary = c.boundary; witness.p1CloseConsent = c.p1CloseConsent; witness.p2CloseConsent = c.p2CloseConsent;
        return call('closeGame', c.p1Score, c.p2Score, c.winner);
      }
      throw new Error(`unknown step ${step.step}`);
    },
  };
}

/** Scripted human: play 1 card of the rank if held, else bluff; challenge every 3rd bot claim. */
function playWholeGame(game, { challengeEvery = 3 } = {}) {
  let botClaims = 0;
  let guard = 0;
  while (game.status === GAME_STATUS.PLAYING) {
    if (guard++ > 500) throw new Error('game did not finish');
    const v = game.view();
    if (v.turn !== 'human') throw new Error('bot stalled on its own turn');
    if (v.pending) {
      botClaims += 1;
      if (botClaims % challengeEvery === 0) game.humanChallenge(); else game.humanAccept();
      continue;
    }
    const held = v.hand.includes(v.currentRank);
    const card = held ? v.currentRank : v.hand[0];
    game.humanPlay({ rank: v.currentRank, count: 1, cards: [card] });
  }
}

describe('sponsored v3p game', () => {
  it('rejects bad modes and difficulties with 400s', () => {
    expect(() => createSponsoredGame({ gameId: 'g', mode: 7, pureCircuits })).toThrow(GameError);
    expect(() => createSponsoredGame({ gameId: 'g', mode: 2, pureCircuits })).toThrow(/0, 1 or 4/);
    expect(() => createSponsoredGame({ gameId: 'g', mode: 1, difficulty: 'brutal', pureCircuits })).toThrow(/difficulty/);
  });

  it('opens with a dealt hand, the human on turn, and deploy pending', () => {
    const game = createSponsoredGame({ gameId: 'g1', mode: 1, pureCircuits, random: seededRandom(1) });
    const v = game.view();
    expect(v.status).toBe('playing');
    expect(v.hand).toHaveLength(7);
    expect(v.turn).toBe('human');
    expect(v.round).toBe(1);
    expect(v.chain.pending).toEqual(['deploy']);
    expect(v.lastEvents).toEqual([]);
    expect(game.takePendingChainSteps()).toEqual([]);
  });

  it('mode 0 deals 5 cards; casino (mode 4) deals 7', () => {
    expect(createSponsoredGame({ gameId: 'g0', mode: 0, pureCircuits, random: seededRandom(2) }).view().hand).toHaveLength(5);
    expect(createSponsoredGame({ gameId: 'g4', mode: 4, pureCircuits, random: seededRandom(2) }).view().hand).toHaveLength(7);
  });

  it('validates human plays against the rules and the real hand', () => {
    const game = createSponsoredGame({ gameId: 'g2', mode: 1, pureCircuits, random: seededRandom(3) });
    const v = game.view();
    const wrongRank = (v.currentRank + 1) % 13;
    expect(() => game.humanPlay({ rank: wrongRank, count: 1, cards: [v.hand[0]] })).toThrow(/current rank/);
    expect(() => game.humanPlay({ rank: v.currentRank, count: 5, cards: [0, 0, 0, 0, 0] })).toThrow(/1\.\.4/);
    expect(() => game.humanPlay({ rank: v.currentRank, count: 2, cards: [v.hand[0]] })).toThrow(/exactly/);
    const notHeld = [...Array(13).keys()].find((r) => !v.hand.includes(r));
    if (notHeld !== undefined) expect(() => game.humanPlay({ rank: v.currentRank, count: 1, cards: [notHeld] })).toThrow(/do not hold/);
    expect(() => game.humanAccept()).toThrow(/no bot claim/);
    expect(() => game.humanChallenge()).toThrow(/no bot claim/);
  });

  it('the bot responds to a play, and a human challenge reveals the bot\'s real cards', () => {
    const game = createSponsoredGame({ gameId: 'g3', mode: 1, pureCircuits, random: seededRandom(4) });
    let v = game.view();
    v = game.humanPlay({ rank: v.currentRank, count: 1, cards: [v.hand[0]] });
    const types = v.lastEvents.map((e) => e.type);
    expect(types[0]).toMatch(/^bot-(accept|challenge)$/);
    // After the response the bot takes the turn and plays, leaving a pending claim for us.
    if (v.status === 'playing' && v.pending) {
      expect(v.pending.claimer).toBe('bot');
      const after = game.humanChallenge();
      const ev = after.lastEvents.find((e) => e.type === 'human-challenge');
      expect(ev).toBeTruthy();
      expect(ev.revealed).toHaveLength(v.pending.count);
      expect(typeof ev.truthful).toBe('boolean');
      expect(ev.truthful).toBe(ev.revealed.every((r) => r === v.pending.rank));
    }
  });

  it.each([[1, 1], [2, 1], [3, 1], [4, 0], [5, 4]])('whole game #%i (mode %i): every emitted chain step is accepted by the compiled circuit', (n, mode) => {
    const game = createSponsoredGame({ gameId: `full-${n}`, mode, pureCircuits, random: seededRandom(10 + n) });
    const chain = simulatedChain(game);
    playWholeGame(game);
    expect(game.status).toBe('ended');

    const steps = game.takePendingChainSteps();
    const rounds = steps.filter((s) => s.step === 'proveRound').map((s) => s.round);
    expect(rounds).toEqual(rounds.map((_, i) => i + 1));
    expect(steps.at(-1).step).toBe('closeGame');
    for (const step of steps) chain.apply(step);

    const s = chain.state();
    const v = game.view();
    expect(s.closed).toBe(true);
    expect(Number(s.roundsProven)).toBe(rounds.length);
    expect(Number(s.p1Score)).toBe(v.scores.human);
    expect(Number(s.p2Score)).toBe(v.scores.bot);
    expect(['human', 'bot', 'draw']).toContain(v.winner);
    expect(v.winner).toBe(Number(s.winner) === 1 ? 'human' : Number(s.winner) === 2 ? 'bot' : 'draw');
    expect(v.lastEvents.at(-1).type).toBe('game-end');
  });

  it('receipts clear pending steps and closing flips status to closed', () => {
    const game = createSponsoredGame({ gameId: 'g5', mode: 1, pureCircuits, random: seededRandom(20) });
    game.recordReceipt({ step: 'deploy', contractAddress: 'abc', txHash: 't0', blockHeight: 1 });
    expect(game.view().chain.contractAddress).toBe('abc');
    expect(game.view().chain.pending).toEqual([]);
    playWholeGame(game);
    const steps = game.takePendingChainSteps();
    for (const st of steps) game.recordReceipt({ step: st.step, round: st.round, txHash: 'x', blockHeight: 2 });
    expect(game.view().chain.pending).toEqual([]);
    expect(game.status).toBe('closed');
    expect(() => game.humanAccept()).toThrow(/game is over/);
  });

  it('transcript is refused until closed, then discloses everything needed to recompute transcriptRoot', () => {
    const game = createSponsoredGame({ gameId: 'g6', mode: 1, pureCircuits, random: seededRandom(30) });
    expect(() => game.transcript()).toThrow(/closed/);
    playWholeGame(game);
    expect(() => game.transcript()).toThrow(/closed/);
    const steps = game.takePendingChainSteps();
    game.recordReceipt({ step: 'deploy', contractAddress: 'ab'.repeat(32), txHash: 't', blockHeight: 1 });
    for (const st of steps) game.recordReceipt({ step: st.step, round: st.round, txHash: 'x', blockHeight: 2 });
    const t = game.transcript();
    expect(t.roundSecrets[0]).toHaveLength(6);
    expect(t.rounds.length).toBeGreaterThan(0);
    // Independent re-derivation: replay the disclosed moves through a fresh referee.
    const seed = pureCircuits.combineEntropy(...t.entropy.map((h) => Uint8Array.from(Buffer.from(h, 'hex'))));
    const ref = createV3pReferee(pureCircuits, { seed, roundSecrets: t.roundSecrets.map((s) => s.map((h) => Uint8Array.from(Buffer.from(h, 'hex')))), mode: 1n });
    for (const r of t.rounds) {
      ref.startRound();
      for (const m of r.moves) ref.apply({ kind: BigInt(m.kind), rank: BigInt(m.rank), count: BigInt(m.count), cards: m.cards.map(BigInt), playSalt: BigInt(m.playSalt) });
      ref.finishRound();
    }
    expect(ref.result().transcriptChain.toString()).toBe(t.result.transcriptChain);
  });

  it('handCountsToRanks expands counts in rank order', () => {
    expect(handCountsToRanks([2n, 0n, 1n, ...Array(10).fill(0n)])).toEqual([0, 0, 2]);
  });
});
