// Off-chain referee for the v3 "one proof per ROUND" rollup.
//
// JavaScript mirror of `applyRoundMove` / `roundFinished` in
// proof-or-bluff-rollup-v3.compact. Both players run it during play so moves
// are instant; when a round ends, `finishRound()` yields exactly the witnesses
// `proveRound(r)` needs: that round's 26 move slots (NOOP-padded), its 27
// snapshots, and the Boundary the proof must open and the one it will write.
//
// Differences from rollup-referee.js (v2):
//   * hands come from PER-ROUND secrets: deal(secret[seat][r-1], seed, r);
//   * a round ends at a rollover (a hand emptied, claim resolved) or at game
//     end — the referee does NOT deal the next round inside a move;
//   * state between rounds is a hand-free `Boundary`.
// All hashing goes through the contract's own pureCircuits so the referee
// cannot drift from the circuit on any hashed value.

export const MAX_ROUNDS = 6;
export const MAX_ROUND_MOVES = 26;
export const KIND = Object.freeze({ NOOP: 0n, PLAY: 1n, ACCEPT: 2n, CHALLENGE: 3n });

export function handSize(mode) { return BigInt(mode) === 0n ? 5n : 7n; }
export function winThreshold(mode) {
  const m = BigInt(mode);
  return m === 0n ? 10n : m === 1n ? 15n : 20n;
}

function boundedDraw(hi, lo, m) {
  const u = Number(hi) * 256 + Number(lo);
  return BigInt(Math.floor((u * Number(m)) / 65536));
}
export function seedBytes(seed) {
  const out = new Uint8Array(32);
  let v = BigInt(seed);
  for (let i = 0; i < 32; i += 1) { out[i] = Number(v & 0xffn); v >>= 8n; }
  return out;
}
export function startingRank(seed) { const b = seedBytes(seed); return boundedDraw(b[16], b[17], 13n); }

const sum = (hand) => hand.reduce((a, v) => a + v, 0n);
const handEmpty = (hand) => sum(hand) === 0n;
function played(cards, count, target) {
  let n = 0n;
  for (let i = 0; i < 4; i += 1) if (BigInt(count) >= BigInt(i + 1) && cards[i] === target) n += 1n;
  return n;
}
function removeFrom(hand, cards, count) {
  return hand.map((held, rank) => {
    const taken = played(cards, count, BigInt(rank));
    if (held < taken) throw new Error('card not held');
    return held - taken;
  });
}
const nextRankOf = (rank) => (rank >= 12n ? 0n : rank + 1n);
const minusOneFloor = (score) => (score === 0n ? 0n : score - 1n);

/** Mirror of the circuit's roundFinished(): game over, or a hand emptied and the claim resolved. */
export function roundFinished(s) {
  return s.ended || (!s.pending && (handEmpty(s.hand0) || handEmpty(s.hand1)));
}

export function normalizeMove(move) {
  const kind = BigInt(move.kind);
  const cards = (move.cards ?? [0n, 0n, 0n, 0n]).map(BigInt);
  while (cards.length < 4) cards.push(0n);
  return {
    kind, rank: BigInt(move.rank ?? 0n), count: BigInt(move.count ?? 0n), cards: cards.slice(0, 4),
    playSalt: BigInt(move.playSalt ?? 0n),
  };
}

export const initialBoundary = () => ({
  turn: 0n, currentRank: 0n, score0: 0n, score1: 0n, round: 0n, ended: false, chain: 0n,
});

/**
 * @param pureCircuits   compiled v3 contract's pureCircuits
 * @param seed           bigint — combineEntropy(e1, e2)
 * @param roundSecrets   [[6 × Uint8Array(32) for seat 0], [6 × for seat 1]]
 * @param mode           0 CASUAL · 1 STANDARD · 4 CASINO
 */
export function createV3Referee(pureCircuits, { seed, roundSecrets, mode }) {
  const size = handSize(mode);
  const threshold = winThreshold(mode);
  const deal = (seat, round) => pureCircuits.handCountsFromRanks(
    pureCircuits.dealHandRanks(roundSecrets[seat][round - 1], seed, BigInt(round), size), size,
  );

  let boundary = initialBoundary();
  let states = null;   // snapshots of the round in progress
  let moves = null;

  function applyRoundMove(s, m) {
    const roundDone = roundFinished(s);
    const noop = m.kind === KIND.NOOP;
    const isPlay = m.kind === KIND.PLAY;
    const isAccept = m.kind === KIND.ACCEPT;
    const isChallenge = m.kind === KIND.CHALLENGE;
    if (!(noop || isPlay || isAccept || isChallenge)) throw new Error('unknown move kind');
    if (noop && !roundDone) throw new Error('padding before round end');
    if (!noop && roundDone) throw new Error('move after round end');
    if (isPlay && s.pending) throw new Error('play while claim pending');
    if ((isAccept || isChallenge) && !s.pending) throw new Error('response without claim');
    if (isPlay && !(m.rank === s.currentRank && m.count >= 1n && m.count <= 4n)) throw new Error('bad claim');
    if (isPlay) {
      for (let i = 0; i < 4; i += 1) {
        if (m.cards[i] > 12n) throw new Error('played card out of range');
        if (BigInt(i) >= m.count && m.cards[i] !== 0n) throw new Error('played card out of range');
      }
    }
    if (!isPlay && (m.rank !== 0n || m.count !== 0n)) throw new Error('non-PLAY fields must be zero');

    const moverIs0 = s.turn === 0n;
    const playCount = isPlay ? m.count : 0n;
    const h0 = moverIs0 ? removeFrom(s.hand0, m.cards, playCount) : s.hand0;
    const h1 = moverIs0 ? s.hand1 : removeFrom(s.hand1, m.cards, playCount);

    const truthful = played(s.claimCards, s.claimCount, s.claimRank) === s.claimCount;
    const challengerIs0 = s.turn === 0n;
    const sc0 = !isChallenge ? s.score0 : challengerIs0 ? (truthful ? minusOneFloor(s.score0) : s.score0 + 3n) : s.score0;
    const sc1 = !isChallenge ? s.score1 : challengerIs0 ? s.score1 : (truthful ? minusOneFloor(s.score1) : s.score1 + 3n);

    const resolved = isAccept || isChallenge;
    const scored = s.ended || sc0 >= threshold || sc1 >= threshold;
    const emptied = resolved && (handEmpty(h0) || handEmpty(h1)) && !scored;
    const outOfRounds = emptied && s.round >= BigInt(MAX_ROUNDS);
    const gameEnded = scored || outOfRounds;

    const playCommit = isPlay ? pureCircuits.commitPlayCards(m.cards, m.playSalt) : 0n;
    const chain = noop ? s.chain : pureCircuits.chainMove(s.chain, m.kind, m.rank, m.count, playCommit);
    return {
      hand0: noop ? s.hand0 : h0, hand1: noop ? s.hand1 : h1,
      turn: noop ? s.turn : (isPlay ? (s.turn === 0n ? 1n : 0n) : s.turn),
      currentRank: noop ? s.currentRank : (resolved ? nextRankOf(s.currentRank) : s.currentRank),
      pending: noop ? s.pending : isPlay,
      claimRank: isPlay ? m.rank : s.claimRank, claimCount: isPlay ? m.count : s.claimCount,
      claimCards: isPlay ? [...m.cards] : s.claimCards, claimer: isPlay ? s.turn : s.claimer,
      score0: sc0, score1: sc1, round: s.round, ended: noop ? s.ended : gameEnded, chain,
    };
  }

  const api = {
    threshold, size,
    get boundary() { return boundary; },
    get round() { return boundary.round + 1n; },
    get state() { if (!states) throw new Error('no round in progress'); return states[states.length - 1]; },
    get inRound() { return states !== null; },
    get truthfulPending() {
      const s = api.state;
      return played(s.claimCards, s.claimCount, s.claimRank) === s.claimCount;
    },
    /** Deal round boundary.round + 1 from that round's secrets and open it. */
    startRound() {
      if (states) throw new Error('round already in progress');
      if (boundary.ended) throw new Error('game has ended');
      const r = boundary.round + 1n;
      if (r > BigInt(MAX_ROUNDS)) throw new Error('out of rounds');
      const currentRank = r === 1n ? startingRank(seed) : boundary.currentRank;
      const opening = {
        hand0: deal(0, Number(r)), hand1: deal(1, Number(r)), turn: boundary.turn, currentRank,
        pending: false, claimRank: 0n, claimCount: 0n, claimCards: [0n, 0n, 0n, 0n], claimer: 0n,
        score0: boundary.score0, score1: boundary.score1, round: r, ended: false, chain: boundary.chain,
      };
      states = [opening];
      moves = [];
      return opening;
    },
    apply(move) {
      if (!states) throw new Error('no round in progress');
      if (moves.length >= MAX_ROUND_MOVES) throw new Error('round transcript full');
      const m = normalizeMove(move);
      states.push(applyRoundMove(api.state, m));
      moves.push(m);
      return api.state;
    },
    play(rank, count, cards, playSalt) { return api.apply({ kind: KIND.PLAY, rank, count, cards, playSalt }); },
    accept() { return api.apply({ kind: KIND.ACCEPT }); },
    challenge() { return api.apply({ kind: KIND.CHALLENGE }); },
    /**
     * Close the round: pad to 26 NOOPs, advance the boundary, and return the
     * proveRound witnesses. Throws if the round has not actually finished.
     */
    finishRound() {
      if (!states) throw new Error('no round in progress');
      if (!roundFinished(api.state)) throw new Error('round did not finish');
      while (moves.length < MAX_ROUND_MOVES) api.apply({ kind: KIND.NOOP });
      const fin = api.state;
      const boundaryIn = boundary;
      const r = fin.round;
      const boundaryOut = {
        turn: fin.turn, currentRank: fin.currentRank, score0: fin.score0, score1: fin.score1,
        round: r, ended: fin.ended || r === BigInt(MAX_ROUNDS), chain: fin.chain,
      };
      const out = { round: r, moves, snapshots: states, boundaryIn, boundaryOut };
      boundary = boundaryOut;
      states = null; moves = null;
      return out;
    },
    /** Public result once the game has ended. */
    result() {
      if (!boundary.ended) throw new Error('game has not ended');
      const winner = boundary.score0 >= threshold ? 1n : boundary.score1 >= threshold ? 2n : 0n;
      return { transcriptChain: boundary.chain, p1Score: boundary.score0, p2Score: boundary.score1, winner, boundary };
    },
  };
  return api;
}
