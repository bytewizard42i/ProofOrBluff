// Off-chain referee for the v4 round rollup (hex-packed hands, SHARED deck,
// empty-hand win with caught-at-the-door). Mirrors
// proof-or-bluff-rollup-v4.compact.
//
// v4 deltas vs v3p:
//   * dealPairPacked deals 2*size DISTINCT cards from one 52-card deck, keyed
//     on both seats' round secrets — no cross-hand duplicates, per-seat hands
//     still need both secrets.
//   * Emptying your hand WINS if the final claim survives (accepted or a
//     wrongly-challenged honest claim); caught bluffing on the door ends only
//     the round. Boundary/GameState carry `winner`; result() reads it.
//
// JavaScript mirror of `applyRoundMove` / `roundFinished` / conservation in
// proof-or-bluff-rollup-v3p.compact. Same round-by-round protocol as
// rollup-v3-referee.js; the difference is the state it carries:
//   * a hand is ONE bigint — 13 base-16 digits, digit r = cards of rank r;
//   * per move it tallies `played` (packed) and `plays` (count) per seat;
//   * at round end it also hands back `remaining` — the ranks each seat still
//     holds — which the circuit packs and checks as dealt == played + remaining.
// The referee still tracks real per-rank hands privately (it must know what
// each player holds to compute `remaining` and to refuse illegal plays locally);
// the circuit only ever sees the packed totals.

export const MAX_ROUNDS = 6;
export const MAX_ROUND_MOVES = 26;
export const KIND = Object.freeze({ NOOP: 0n, PLAY: 1n, ACCEPT: 2n, CHALLENGE: 3n });

export function handSize(mode) { return BigInt(mode) === 0n ? 5n : 7n; }
export function winThreshold(mode) {
  const m = BigInt(mode);
  return m === 0n ? 10n : m === 1n ? 15n : 20n;
}
export const rankWeight = (r) => 16n ** BigInt(r);
export const packRanks = (ranks) => ranks.reduce((acc, r) => acc + rankWeight(r), 0n);
/** Expand a packed hand back to 13 per-rank counts (for the referee's private bookkeeping). */
export function unpackHand(packed) {
  const out = [];
  let v = BigInt(packed);
  for (let r = 0; r < 13; r += 1) { out.push(v & 0xfn); v >>= 4n; }
  return out;
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

const nextRankOf = (rank) => (rank >= 12n ? 0n : rank + 1n);
const minusOneFloor = (score) => (score === 0n ? 0n : score - 1n);
const playSum = (cards, count) => cards.slice(0, Number(count)).reduce((a, c) => a + rankWeight(c), 0n);

export function roundFinished(s, size) {
  return s.ended || (!s.pending && (s.plays0 === size || s.plays1 === size));
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
  turn: 0n, currentRank: 0n, score0: 0n, score1: 0n, round: 0n, ended: false, winner: 0n, chain: 0n,
});

export function createV4Referee(pureCircuits, { seed, roundSecrets, mode }) {
  const size = handSize(mode);
  const threshold = winThreshold(mode);
  // v4: one shared deck — both hands from 2*size distinct cards, keyed on BOTH secrets.
  const dealPair = (round) => pureCircuits.dealPairPacked(
    roundSecrets[0][round - 1], roundSecrets[1][round - 1], seed, BigInt(round), size,
  );

  let boundary = initialBoundary();
  let states = null, moves = null;
  let dealt = null;        // [packed0, packed1] for the round in progress
  let hands = null;        // private per-rank counts, for legality + `remaining`

  function applyRoundMove(s, m) {
    const roundDone = roundFinished(s, size);
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
    const sum = playSum(m.cards, playCount);
    if (isPlay && (moverIs0 ? s.plays0 : s.plays1) + m.count > size) throw new Error('more cards than dealt');
    // Private legality (the circuit proves this via round-end conservation):
    if (isPlay) {
      const hand = hands[moverIs0 ? 0 : 1];
      for (const c of m.cards.slice(0, Number(m.count))) {
        if (hand[Number(c)] === 0n) throw new Error('card not held');
        hand[Number(c)] -= 1n;
      }
    }
    const np0 = moverIs0 ? s.played0 + sum : s.played0;
    const np1 = moverIs0 ? s.played1 : s.played1 + sum;
    const nc0 = moverIs0 ? s.plays0 + playCount : s.plays0;
    const nc1 = moverIs0 ? s.plays1 : s.plays1 + playCount;

    const truthful = s.claimSum === rankWeight(s.claimRank) * s.claimCount;
    const challengerIs0 = s.turn === 0n;
    const sc0 = !isChallenge ? s.score0 : challengerIs0 ? (truthful ? minusOneFloor(s.score0) : s.score0 + 3n) : s.score0;
    const sc1 = !isChallenge ? s.score1 : challengerIs0 ? s.score1 : (truthful ? minusOneFloor(s.score1) : s.score1 + 3n);

    const resolved = isAccept || isChallenge;
    const emptied = resolved && (nc0 === size || nc1 === size);
    const caughtAtDoor = emptied && isChallenge && !truthful;
    const emptyWin = emptied && !caughtAtDoor;
    const scored = s.ended || sc0 >= threshold || sc1 >= threshold;
    const outOfRounds = emptied && s.round >= BigInt(MAX_ROUNDS);
    const gameEnded = scored || emptyWin || outOfRounds;
    const w = scored ? (sc0 >= threshold ? 1n : 2n)
      : emptyWin ? (nc0 === size ? 1n : 2n)
        : 0n;

    const playCommit = isPlay ? pureCircuits.commitPlayCards(m.cards, m.playSalt) : 0n;
    const chain = noop ? s.chain : pureCircuits.chainMove(s.chain, m.kind, m.rank, m.count, playCommit);
    return {
      played0: noop ? s.played0 : np0, played1: noop ? s.played1 : np1,
      plays0: noop ? s.plays0 : nc0, plays1: noop ? s.plays1 : nc1,
      turn: noop ? s.turn : (isPlay ? (s.turn === 0n ? 1n : 0n) : s.turn),
      currentRank: noop ? s.currentRank : (resolved ? nextRankOf(s.currentRank) : s.currentRank),
      pending: noop ? s.pending : isPlay,
      claimRank: isPlay ? m.rank : s.claimRank, claimCount: isPlay ? m.count : s.claimCount,
      claimSum: isPlay ? sum : s.claimSum, claimer: isPlay ? s.turn : s.claimer,
      score0: sc0, score1: sc1, round: s.round, ended: noop ? s.ended : gameEnded,
      winner: noop ? s.winner : (gameEnded ? w : s.winner), chain,
    };
  }

  const api = {
    threshold, size,
    get boundary() { return boundary; },
    get state() { if (!states) throw new Error('no round in progress'); return states[states.length - 1]; },
    /** The private per-rank hands this round (referee bookkeeping only). */
    get hands() { return hands; },
    get truthfulPending() { const s = api.state; return s.claimSum === rankWeight(s.claimRank) * s.claimCount; },
    startRound() {
      if (states) throw new Error('round already in progress');
      if (boundary.ended) throw new Error('game has ended');
      const r = boundary.round + 1n;
      if (r > BigInt(MAX_ROUNDS)) throw new Error('out of rounds');
      dealt = dealPair(Number(r));
      hands = [unpackHand(dealt[0]), unpackHand(dealt[1])];
      const opening = {
        played0: 0n, played1: 0n, plays0: 0n, plays1: 0n,
        turn: boundary.turn, currentRank: r === 1n ? startingRank(seed) : boundary.currentRank,
        pending: false, claimRank: 0n, claimCount: 0n, claimSum: 0n, claimer: 0n,
        score0: boundary.score0, score1: boundary.score1, round: r, ended: false, winner: boundary.winner, chain: boundary.chain,
      };
      states = [opening]; moves = [];
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
    /** Pad, advance the boundary, return proveRound witnesses incl. `remaining`. */
    finishRound() {
      if (!states) throw new Error('no round in progress');
      if (!roundFinished(api.state, size)) throw new Error('round did not finish');
      while (moves.length < MAX_ROUND_MOVES) api.apply({ kind: KIND.NOOP });
      const fin = api.state;
      // remaining = the ranks still held, as a 7-slot vector padded with 0.
      const remaining = hands.map((hand) => {
        const ranks = [];
        hand.forEach((n, rank) => { for (let i = 0n; i < n; i += 1n) ranks.push(BigInt(rank)); });
        while (ranks.length < 7) ranks.push(0n);
        return ranks;
      });
      const r = fin.round;
      const boundaryIn = boundary;
      const boundaryOut = {
        turn: fin.turn, currentRank: fin.currentRank, score0: fin.score0, score1: fin.score1,
        round: r, ended: fin.ended || r === BigInt(MAX_ROUNDS), winner: fin.winner, chain: fin.chain,
      };
      const out = { round: r, moves, snapshots: states, remaining, dealt, boundaryIn, boundaryOut };
      boundary = boundaryOut; states = null; moves = null; dealt = null; hands = null;
      return out;
    },
    result() {
      if (!boundary.ended) throw new Error('game has not ended');
      return { transcriptChain: boundary.chain, p1Score: boundary.score0, p2Score: boundary.score1, winner: boundary.winner, boundary };
    },
  };
  return api;
}
