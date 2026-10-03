import { describe, expect, it } from 'vitest';
import * as runtime from '@midnight-ntwrk/compact-runtime';
import { Contract, pureCircuits } from './managed/proof-or-bluff-mainnet/contract/index.js';

// These tests execute the REAL compiled circuits in memory (no chain, no proof
// server, no funds). A circuit assertion that fails here is exactly the
// assertion that would make a zero-knowledge proof impossible on-chain.

const PLAYER_ONE = '11'.repeat(32);
const PLAYER_TWO = '22'.repeat(32);
const NOW = 1_800_000_000;
const STANDARD_MODE = 1n;
const HAND_SIZE = 7n;
const ENTROPY_ONE = new Uint8Array(32).fill(3);
const ENTROPY_TWO = new Uint8Array(32).fill(7);
const SALT_ONE = new Uint8Array(32).fill(0xa1);
const SALT_TWO = new Uint8Array(32).fill(0xb2);
const hex = (bytes) => Buffer.from(bytes).toString('hex');
const emptyCounts = () => Array.from({ length: 13 }, () => 0n);

// Each simulated player keeps the private material a real client would hold:
// their salt, the shared seed, their current hand counts, and pending plays.
function createPlayer(publicKey, salt) {
  return { publicKey, salt, seed: null, handCounts: emptyCounts(), nextPlay: null, lastPlay: null };
}

function testTable() {
  const players = {
    [PLAYER_ONE]: createPlayer(PLAYER_ONE, SALT_ONE),
    [PLAYER_TWO]: createPlayer(PLAYER_TWO, SALT_TWO),
  };
  let active = players[PLAYER_ONE];
  const contract = new Contract({
    handSalt: (context) => [context.privateState, active.salt],
    sharedSeed: (context) => [context.privateState, active.seed],
    currentHandCounts: (context) => [context.privateState, active.handCounts],
    nextPlay: (context) => [context.privateState, active.nextPlay],
    revealLastPlay: (context) => [context.privateState, active.lastPlay],
  });
  const initial = contract.initialState(runtime.createConstructorContext({}, PLAYER_ONE));
  let context = runtime.createCircuitContext(
    runtime.dummyContractAddress(), PLAYER_ONE,
    initial.currentContractState.data, initial.currentPrivateState,
    undefined, undefined, NOW,
  );
  const as = (publicKey, blockTime = NOW) => {
    active = players[publicKey];
    context = runtime.createCircuitContext(
      runtime.dummyContractAddress(), publicKey,
      context.currentQueryContext.state, context.currentPrivateState,
      undefined, undefined, blockTime,
    );
  };
  const call = (name, ...args) => {
    const result = contract.circuits[name](context, ...args);
    context = result.context;
    return result.result;
  };
  return { as, call, players, activePlayer: () => active };
}

function playReveal(ranks) {
  const slot = (index) => ({
    rank: BigInt(ranks[index] ?? 0),
    salt: index < ranks.length ? new Uint8Array(32).fill(0x10 + index) : new Uint8Array(32),
  });
  const [s0, s1, s2, s3] = [0, 1, 2, 3].map(slot);
  return {
    count: BigInt(ranks.length),
    rank0: s0.rank, salt0: s0.salt, rank1: s1.rank, salt1: s1.salt,
    rank2: s2.rank, salt2: s2.salt, rank3: s3.rank, salt3: s3.salt,
  };
}

/** Drive a match to PLAYING with both players holding their private material. */
function setupPlayingMatch(table, mode = STANDARD_MODE) {
  const p1 = table.players[PLAYER_ONE];
  const p2 = table.players[PLAYER_TWO];
  const matchId = table.call('createMatch', mode,
    pureCircuits.commitEntropy(ENTROPY_ONE), pureCircuits.commitHandSalt(SALT_ONE), BigInt(NOW));
  table.as(PLAYER_TWO);
  table.call('joinMatch', matchId, pureCircuits.commitEntropy(ENTROPY_TWO), pureCircuits.commitHandSalt(SALT_TWO));
  table.as(PLAYER_ONE);
  table.call('revealSeed', matchId, ENTROPY_ONE, ENTROPY_TWO, 0n, BigInt(NOW));
  const seed = pureCircuits.combineEntropy(ENTROPY_ONE, ENTROPY_TWO);
  p1.seed = seed;
  p2.seed = seed;
  return { matchId, seed };
}

/** What an honest client does: derive its own hand from committed material. */
function dealtCounts(salt, seed, round, handSize = HAND_SIZE) {
  return pureCircuits.handCountsFromRanks(
    pureCircuits.dealHandRanks(salt, seed, BigInt(round), handSize), handSize,
  );
}
function firstHeldRank(counts) {
  return counts.findIndex((count) => count > 0n);
}
function firstMissingRank(counts) {
  return counts.findIndex((count) => count === 0n);
}

/** Honest play helper: play `ranks` from the active player's real hand. */
function honestPlay(table, matchId, ranks, claimedRank, state) {
  const player = table.activePlayer();
  const reveal = playReveal(ranks);
  player.nextPlay = reveal;
  player.lastPlay = reveal;
  if (!state.drawn) {
    player.handCounts = dealtCounts(player.salt, player.seed, state.round, state.handSize ?? HAND_SIZE);
    state.drawn = true;
  }
  table.call('playCards', matchId, pureCircuits.commitPlay(reveal), BigInt(claimedRank), BigInt(ranks.length), BigInt(NOW));
  player.handCounts = pureCircuits.removePlayed(player.handCounts, reveal);
}

describe('provably fair state-only circuits (no chain or funds)', () => {
  it('deals each player a hand only they can derive, publishing just commitments', () => {
    const table = testTable();
    const { matchId, seed } = setupPlayingMatch(table);
    const match = table.call('getMatch', matchId);
    expect(hex(match.seedCommitment)).toBe(hex(pureCircuits.commitSeed(seed)));
    expect(hex(match.seedCommitment)).not.toBe(hex(seed));
    expect(match.round).toBe(1n);
    expect(match.p1HandDrawn).toBe(false);

    const p1Hand = dealtCounts(SALT_ONE, seed, 1);
    const p2Hand = dealtCounts(SALT_TWO, seed, 1);
    expect(p1Hand.reduce((sum, count) => sum + count, 0n)).toBe(HAND_SIZE);
    expect(p2Hand.reduce((sum, count) => sum + count, 0n)).toBe(HAND_SIZE);
    // Different salts, same seed → different hands; a wrong salt yields a
    // different hand, so the opponent cannot reconstruct yours.
    expect(p1Hand).not.toEqual(p2Hand);
    expect(dealtCounts(new Uint8Array(32).fill(0xff), seed, 1)).not.toEqual(p1Hand);
    // A new round is a genuinely fresh deal from the same committed material.
    expect(dealtCounts(SALT_ONE, seed, 2)).not.toEqual(p1Hand);
    pureCircuits.dealHandRanks(SALT_ONE, seed, 1n, HAND_SIZE).forEach((rank) => {
      expect(rank).toBeGreaterThanOrEqual(0n);
      expect(rank).toBeLessThanOrEqual(12n);
    });
  });

  it('rejects playing a card the player was not dealt (the anti-cheat proof)', () => {
    const table = testTable();
    const { matchId, seed } = setupPlayingMatch(table);
    const p1 = table.players[PLAYER_ONE];
    const dealt = dealtCounts(SALT_ONE, seed, 1);
    const foreignRank = firstMissingRank(dealt);
    expect(foreignRank).toBeGreaterThanOrEqual(0);

    const cheat = playReveal([foreignRank]);
    p1.nextPlay = cheat;
    expect(() => table.call('playCards', matchId, pureCircuits.commitPlay(cheat), 0n, 1n, BigInt(NOW)))
      .toThrow(/Played cards are not in your hand/);

    // Lying about the hand itself does not help: on the first play the hand
    // is dealt in-circuit, so the witness counts are ignored.
    p1.handCounts = Array.from({ length: 13 }, () => 4n);
    expect(() => table.call('playCards', matchId, pureCircuits.commitPlay(cheat), 0n, 1n, BigInt(NOW)))
      .toThrow(/Played cards are not in your hand/);
  });

  it('rejects a wrong salt, a wrong seed, and a commitment that hides different cards', () => {
    const table = testTable();
    const { matchId, seed } = setupPlayingMatch(table);
    const p1 = table.players[PLAYER_ONE];
    const dealt = dealtCounts(SALT_ONE, seed, 1);
    const held = firstHeldRank(dealt);
    const honest = playReveal([held]);
    p1.nextPlay = honest;

    p1.salt = new Uint8Array(32).fill(0x99);
    expect(() => table.call('playCards', matchId, pureCircuits.commitPlay(honest), 0n, 1n, BigInt(NOW)))
      .toThrow(/Hand salt does not match commitment/);
    p1.salt = SALT_ONE;

    p1.seed = new Uint8Array(32).fill(0x55);
    expect(() => table.call('playCards', matchId, pureCircuits.commitPlay(honest), 0n, 1n, BigInt(NOW)))
      .toThrow(/Seed does not match commitment/);
    p1.seed = seed;

    const other = playReveal([firstMissingRank(dealt)]);
    expect(() => table.call('playCards', matchId, pureCircuits.commitPlay(other), 0n, 1n, BigInt(NOW)))
      .toThrow(/Play does not open its commitment/);
    expect(() => table.call('playCards', matchId, pureCircuits.commitPlay(honest), 0n, 2n, BigInt(NOW)))
      .toThrow(/Play count does not match claim/);
  });

  it('lets an honest bluff through, resolves it with one disclosed bit, and tracks the hand', () => {
    const table = testTable();
    const { matchId, seed } = setupPlayingMatch(table);
    const p1 = table.players[PLAYER_ONE];
    const dealt = dealtCounts(SALT_ONE, seed, 1);
    // Bluff: claim rank 0 while actually playing a held card that is not rank 0.
    const heldNonZero = dealt.findIndex((count, rank) => rank !== 0 && count > 0n);
    expect(heldNonZero).toBeGreaterThan(0);
    const state = { round: 1, drawn: false };
    honestPlay(table, matchId, [heldNonZero], 0, state);

    const afterPlay = table.call('getMatch', matchId);
    expect(afterPlay.p1HandDrawn).toBe(true);
    expect(afterPlay.p1HandSize).toBe(HAND_SIZE - 1n);
    expect(hex(afterPlay.p1HandCommit)).toBe(hex(pureCircuits.commitHandCounts(p1.handCounts, SALT_ONE, 1n)));

    table.as(PLAYER_TWO);
    table.call('challengeClaim', matchId, BigInt(NOW));
    table.as(PLAYER_ONE);
    expect(table.call('resolveChallenge', matchId, BigInt(NOW))).toBe(false);
    const resolved = table.call('getMatch', matchId);
    expect(resolved.p2Score).toBe(3n);
    expect(resolved.p1HandSize).toBe(HAND_SIZE - 1n); // pile discarded, never picked up
    expect(resolved.pileSize).toBe(0n);
    expect(resolved.phase).toBe(2n);
  });

  it('rejects a second play that does not open the stored hand commitment', () => {
    const table = testTable();
    const { matchId, seed } = setupPlayingMatch(table);
    const p1 = table.players[PLAYER_ONE];
    const p2 = table.players[PLAYER_TWO];
    const state1 = { round: 1, drawn: false };
    honestPlay(table, matchId, [firstHeldRank(dealtCounts(SALT_ONE, seed, 1))], 0, state1);
    table.as(PLAYER_TWO);
    table.call('acceptClaim', matchId, BigInt(NOW));
    // P2 plays rank 1 (claim) from its own real hand.
    const state2 = { round: 1, drawn: false };
    honestPlay(table, matchId, [firstHeldRank(dealtCounts(SALT_TWO, seed, 1))], 1, state2);
    table.as(PLAYER_ONE);
    table.call('acceptClaim', matchId, BigInt(NOW));

    // P1's second play: pretend to still hold every card.
    const truthfulCounts = p1.handCounts;
    p1.handCounts = dealtCounts(SALT_ONE, seed, 1);
    const reveal = playReveal([firstHeldRank(truthfulCounts)]);
    p1.nextPlay = reveal;
    expect(() => table.call('playCards', matchId, pureCircuits.commitPlay(reveal), 2n, 1n, BigInt(NOW)))
      .toThrow(/Hand does not match commitment/);
    p1.handCounts = truthfulCounts;
    table.call('playCards', matchId, pureCircuits.commitPlay(reveal), 2n, 1n, BigInt(NOW));
    expect(p2.handCounts.reduce((sum, count) => sum + count, 0n)).toBe(HAND_SIZE - 1n);
  });

  it('reshuffles with a fresh provable deal when a hand empties', () => {
    const table = testTable();
    const { matchId, seed } = setupPlayingMatch(table, 0n); // CASUAL: 5 cards
    const p1 = table.players[PLAYER_ONE];
    let rank = 0;
    const p2 = table.players[PLAYER_TWO];
    const p1State = { round: 1, drawn: false, handSize: 5n };
    const p2State = { round: 1, drawn: false, handSize: 5n };
    // P1 plays its whole 5-card hand honestly over consecutive turns, P2 accepts
    // and plays one card each turn. The helper deals on each side's first play.
    for (let turn = 0; turn < 5; turn += 1) {
      table.as(PLAYER_ONE);
      const p1Hand = p1State.drawn ? p1.handCounts : dealtCounts(SALT_ONE, seed, 1, 5n);
      honestPlay(table, matchId, [firstHeldRank(p1Hand)], rank, p1State);
      rank = (rank + 1) % 13;
      table.as(PLAYER_TWO);
      table.call('acceptClaim', matchId, BigInt(NOW));
      const mid = table.call('getMatch', matchId);
      if (mid.round === 2n) break;
      const p2Hand = p2State.drawn ? p2.handCounts : dealtCounts(SALT_TWO, seed, 1, 5n);
      honestPlay(table, matchId, [firstHeldRank(p2Hand)], rank, p2State);
      rank = (rank + 1) % 13;
      table.as(PLAYER_ONE);
      table.call('acceptClaim', matchId, BigInt(NOW));
    }
    const reshuffled = table.call('getMatch', matchId);
    expect(reshuffled.round).toBe(2n);
    expect(reshuffled.p1HandSize).toBe(5n);
    expect(reshuffled.p2HandSize).toBe(5n);
    expect(reshuffled.p1HandDrawn).toBe(false);
    expect(reshuffled.pileSize).toBe(0n);
    // The round-2 hand must come from round 2's deal, not round 1's.
    const staleHand = dealtCounts(SALT_ONE, seed, 1, 5n);
    const freshHand = dealtCounts(SALT_ONE, seed, 2, 5n);
    expect(freshHand).not.toEqual(staleHand);
  });

  it('rejects invented timestamps, zero-second forfeits, and disabled modes', () => {
    const table = testTable();
    expect(() => table.call('createMatch', 1n, pureCircuits.commitEntropy(ENTROPY_ONE), pureCircuits.commitHandSalt(SALT_ONE), 0n))
      .toThrow(/Timestamp is too old/);
    expect(() => table.call('createMatch', 3n, pureCircuits.commitEntropy(ENTROPY_ONE), pureCircuits.commitHandSalt(SALT_ONE), BigInt(NOW)))
      .toThrow(/Only score-based modes/);
    const { matchId } = setupPlayingMatch(table);
    table.as(PLAYER_TWO);
    expect(() => table.call('forfeitAbandonedMatch', matchId, BigInt(NOW), 0n))
      .toThrow(/Timeout must be between one hour and seven days/);
    expect(() => table.call('forfeitAbandonedMatch', matchId, BigInt(NOW), 3600n))
      .toThrow(/Timeout window still open/);
  });
});
