// Off-chain referee for the one-proof-per-game rollup.
//
// This is the JavaScript mirror of `applyMove` in proof-or-bluff-rollup.compact.
// Both players (browser and bot) run it during play so moves are instant; at
// game end its snapshot list becomes the `snapshots()` witness and its move
// list the `transcript()` witness for the closeGame proof. If this file and
// the circuit ever disagree, the proof simply fails — the simulator test
// (`proof-or-bluff-rollup.sim.test.js`) is what keeps them in lockstep.
//
// All hashing goes through the contract's own exported pure circuits
// (commitPlayCards, chainMove, dealHandRanks, handCountsFromRanks), so the
// referee cannot drift from the circuit on any value that is hashed.

export const MAX_MOVES = 64;
export const MAX_ROUNDS = 6;
export const KIND = Object.freeze({ NOOP: 0n, PLAY: 1n, ACCEPT: 2n, CHALLENGE: 3n });

export function handSize(mode) { return BigInt(mode) === 0n ? 5n : 7n; }
export function winThreshold(mode) {
  const m = BigInt(mode);
  return m === 0n ? 10n : m === 1n ? 15n : 20n;
}

// floor(u * m / 65536) via the little-endian product, exactly as the circuit.
function boundedDraw(hi, lo, m) {
  const u = Number(hi) * 256 + Number(lo);
  return BigInt(Math.floor((u * Number(m)) / 65536));
}
// The seed is a transient-domain Field (bigint). Little-endian bytes, as the
// circuit's `seed as Bytes<32>` cast; mid bytes 16/17 avoid the biased top byte.
export function seedBytes(seed) {
  const out = new Uint8Array(32);
  let v = BigInt(seed);
  for (let i = 0; i < 32; i += 1) { out[i] = Number(v & 0xffn); v >>= 8n; }
  return out;
}
export function startingRank(seed) { const b = seedBytes(seed); return boundedDraw(b[16], b[17], 13n); }

const zeros13 = () => Array.from({ length: 13 }, () => 0n);
const sum = (hand) => hand.reduce((a, v) => a + v, 0n);

/** How many of the first `count` cards are `target`. */
function played(cards, count, target) {
  let n = 0n;
  for (let i = 0; i < 4; i += 1) if (BigInt(count) >= BigInt(i + 1) && cards[i] === target) n += 1n;
  return n;
}

function removeFrom(hand, cards, count) {
  return hand.map((held, rank) => {
    const taken = played(cards, count, BigInt(rank));
    if (held < taken) throw new Error(`card not held: rank ${rank}`);
    return held - taken;
  });
}

const nextRankOf = (rank) => (rank >= 12n ? 0n : rank + 1n);
const minusOneFloor = (score) => (score === 0n ? 0n : score - 1n);

/**
 * Create a referee for one game.
 * @param pureCircuits  the compiled contract's `pureCircuits`
 * @param seed          bigint (Field) = combineEntropy(e1, e2)
 * @param salts         [salt1, salt2] Uint8Array(32) each — the referee needs
 *                      BOTH to track both hands. During play each side runs a
 *                      referee with only its own real hand (the other hand is
 *                      tracked as counts-unknown); at close the full referee is
 *                      rebuilt from both salts. See `publicOnly` below.
 * @param mode          0 CASUAL · 1 STANDARD · 4 CASINO
 */
export function createReferee(pureCircuits, { seed, salts, mode }) {
  const size = handSize(mode);
  const threshold = winThreshold(mode);
  const deal = (salt, round) =>
    pureCircuits.handCountsFromRanks(pureCircuits.dealHandRanks(salt, seed, BigInt(round), size), size);
  const hands = [
    Array.from({ length: MAX_ROUNDS }, (_, i) => deal(salts[0], i + 1)),
    Array.from({ length: MAX_ROUNDS }, (_, i) => deal(salts[1], i + 1)),
  ];

  const opening = {
    hand0: hands[0][0], hand1: hands[1][0], turn: 0n, currentRank: startingRank(seed),
    pending: false, claimRank: 0n, claimCount: 0n, claimCards: [0n, 0n, 0n, 0n], claimer: 0n,
    score0: 0n, score1: 0n, round: 1n, ended: false, chain: 0n,
  };

  function applyMove(s, m) {
    const noop = m.kind === KIND.NOOP;
    const isPlay = m.kind === KIND.PLAY;
    const isAccept = m.kind === KIND.ACCEPT;
    const isChallenge = m.kind === KIND.CHALLENGE;
    if (!(noop || isPlay || isAccept || isChallenge)) throw new Error('unknown move kind');
    if (noop && !s.ended) throw new Error('padding before game end');
    if (!noop && s.ended) throw new Error('move after game end');
    if (isPlay && s.pending) throw new Error('play while claim pending');
    if ((isAccept || isChallenge) && !s.pending) throw new Error('response without claim');
    if (isPlay && !(m.rank === s.currentRank && m.count >= 1n && m.count <= 4n)) throw new Error('bad claim');
    // Mirrors the circuit: every slot is a rank 0..12 (a 200 would dodge the
    // per-rank removal check), and slots past `count` must be zero so the
    // play commitment is canonical.
    if (isPlay) {
      for (let i = 0; i < 4; i += 1) {
        if (m.cards[i] > 12n) throw new Error('played card out of range');
        if (BigInt(i) >= m.count && m.cards[i] !== 0n) throw new Error('played card out of range');
      }
    }
    // rank/count feed the transcript chain for every kind; non-PLAY must be 0.
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
    const wantsRollover = resolved && (sum(h0) === 0n || sum(h1) === 0n) && !scored;
    // Out of deals: the game ends as a draw (mirrors the circuit exactly).
    const outOfRounds = wantsRollover && s.round >= BigInt(MAX_ROUNDS);
    const ended = scored || outOfRounds;
    const rollover = wantsRollover && !outOfRounds;
    const nextRound = rollover ? s.round + 1n : s.round;
    const nh0 = rollover ? hands[0][Number(nextRound) - 1] : h0;
    const nh1 = rollover ? hands[1][Number(nextRound) - 1] : h1;

    const playCommit = isPlay ? pureCircuits.commitPlayCards(m.cards, m.playSalt) : 0n;
    const chain = noop ? s.chain : pureCircuits.chainMove(s.chain, m.kind, m.rank, m.count, playCommit);

    return {
      hand0: noop ? s.hand0 : nh0, hand1: noop ? s.hand1 : nh1,
      // PLAY passes the turn to the responder; the responder then keeps it.
      turn: noop ? s.turn : (isPlay ? (s.turn === 0n ? 1n : 0n) : s.turn),
      currentRank: noop ? s.currentRank : (resolved ? nextRankOf(s.currentRank) : s.currentRank),
      pending: noop ? s.pending : isPlay,
      claimRank: isPlay ? m.rank : s.claimRank, claimCount: isPlay ? m.count : s.claimCount,
      claimCards: isPlay ? [...m.cards] : s.claimCards, claimer: isPlay ? s.turn : s.claimer,
      score0: sc0, score1: sc1, round: nextRound, ended: noop ? s.ended : ended, chain,
    };
  }

  const states = [opening];
  const moves = [];

  const api = {
    hands, opening, threshold, size,
    get state() { return states[states.length - 1]; },
    get states() { return states; },
    get moves() { return moves; },
    get truthfulPending() {
      const s = api.state;
      return played(s.claimCards, s.claimCount, s.claimRank) === s.claimCount;
    },
    /** Apply a move; throws if illegal (same message as the circuit). */
    apply(move) {
      if (moves.length >= MAX_MOVES) throw new Error('transcript full');
      const m = normalize(move);
      states.push(applyMove(api.state, m));
      moves.push(m);
      return api.state;
    },
    play(rank, count, cards, playSalt) { return api.apply({ kind: KIND.PLAY, rank, count, cards, playSalt }); },
    accept() { return api.apply({ kind: KIND.ACCEPT }); },
    challenge() { return api.apply({ kind: KIND.CHALLENGE }); },
    /** Pad with NOOPs to MAX_MOVES. Legal only once the game has ended. */
    pad() { while (moves.length < MAX_MOVES) api.apply({ kind: KIND.NOOP }); return api; },
    /** Public result + witnesses for closeGame. Call after pad(). */
    result() {
      if (moves.length !== MAX_MOVES) throw new Error('call pad() first');
      const fin = api.state;
      const winner = fin.score0 >= threshold ? 1n : fin.score1 >= threshold ? 2n : 0n;
      return {
        transcriptRoot: fin.chain, p1Score: fin.score0, p2Score: fin.score1, winner,
        witnesses: { transcript: moves, snapshots: states },
      };
    },
  };
  return api;
}

function normalize(move) {
  const kind = BigInt(move.kind);
  const cards = (move.cards ?? [0n, 0n, 0n, 0n]).map(BigInt);
  while (cards.length < 4) cards.push(0n);
  return {
    kind, rank: BigInt(move.rank ?? 0n), count: BigInt(move.count ?? 0n), cards: cards.slice(0, 4),
    playSalt: BigInt(move.playSalt ?? 0n),
  };
}
