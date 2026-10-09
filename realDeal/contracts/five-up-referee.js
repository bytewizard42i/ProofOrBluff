// five-up-referee.js — off-chain rule engine for 5 Up 2 Down, mirroring
// five-up-two-down.compact move for move (docs/FIVE_UP_TWO_DOWN.md).
//
// The referee holds BOTH players' hole cards (it is the sponsored service's
// table, or a test harness). It produces exactly the witnesses proveRound
// needs: this round's 4 moves plus the boundary it started from. Everything
// hash-shaped (deal, chain links) is delegated to the compiled pure circuits
// so the referee cannot drift from the contract.

export const MAX_ROUNDS = 10;
export const MOVES_PER_ROUND = 4;
// 0 NOOP (a PASS's response slot) · 1 CLAIM · 2 ACCEPT · 3 CHALLENGE · 4 PASS.
export const KIND = Object.freeze({ NOOP: 0n, CLAIM: 1n, ACCEPT: 2n, CHALLENGE: 3n, PASS: 4n });

export function targetScore(mode) { return BigInt(mode) === 0n ? 10n : 20n; }

// --- the deal, mirrored from the circuit --------------------------------
// The circuit exports only the two digests (compiling the deal as a pure
// circuit too would double its 5 GB compile cost). Floyd's draw and the
// sorting-network shuffle are reproduced here byte for byte; every full-game
// test proves the mirror matches, since a divergent deal breaks the chain.
const bytesOf = (digest) => Array.from(digest, Number);
/** boundedDraw: floor(((hi*256+lo) * m) / 65536) — byte 2 of the 24-bit product. */
export const boundedDraw = (hi, lo, m) => Math.floor(((hi * 256 + lo) * m) / 65536);
export const cardToRank = (c) => Math.floor(c / 4);
/** Floyd's algorithm: 9 distinct cards from 52 (m_i = 44+i, fallback m_i-1). */
export function floydNine(b) {
  const out = [];
  for (let i = 0; i < 9; i += 1) {
    const t = boundedDraw(b[2 * i], b[2 * i + 1], 44 + i);
    out.push(out.includes(t) ? 43 + i : t);
  }
  return out;
}
// Knuth's 25-comparator network for n = 9, as compare-exchange pairs in order.
const SORT9 = [[0,1],[3,4],[6,7],[1,2],[4,5],[7,8],[0,1],[3,4],[6,7],[2,5],[0,3],[1,4],[5,8],[3,6],[4,7],[2,5],[0,3],[1,4],[5,7],[2,6],[1,3],[4,6],[2,4],[5,6],[2,3]];
/** Sort nine 16-bit keys with the network, carrying the cards along. */
export function shuffleNine(cards, s) {
  const k = Array.from({ length: 9 }, (_, i) => s[2 * i] * 256 + s[2 * i + 1]);
  const c = [...cards];
  for (const [i, j] of SORT9) {
    const lt = k[i] < k[j];
    if (!lt) { [k[i], k[j]] = [k[j], k[i]]; [c[i], c[j]] = [c[j], c[i]]; }
  }
  return c;
}
/** Card indices of the nine dealt cards (0-1 P1 hole, 2-3 P2 hole, 4-8 board). */
export function dealNineIndices(pureCircuits, salt0, salt1, seed, round) {
  const drawn = floydNine(bytesOf(pureCircuits.dealDigest(salt0, salt1, seed, BigInt(round))));
  return shuffleNine(drawn, bytesOf(pureCircuits.shuffleDigest(salt0, salt1, seed, BigInt(round))));
}
/** The k-th card (0-based) not in `dealt`: step over each dealt card at or below the running value. */
export function skipDealt(k, dealt) {
  let r = k;
  for (const d of [...dealt].sort((a, b) => a - b)) if (d <= r) r += 1;
  return r;
}
/** Four distinct remaining-deck indices (0..42), mirroring the circuit's showdownIdx. */
export function showdownIndices(b) {
  const skipOne = (k, p) => (p <= k ? k + 1 : k);
  const k0 = boundedDraw(b[0], b[1], 43);
  const k1 = skipOne(boundedDraw(b[2], b[3], 42), k0);
  const [lo01, hi01] = k0 < k1 ? [k0, k1] : [k1, k0];
  const k2 = skipOne(skipOne(boundedDraw(b[4], b[5], 41), lo01), hi01);
  const [m0, m1, m2] = [k0, k1, k2].sort((a, b) => a - b);
  const k3 = skipOne(skipOne(skipOne(boundedDraw(b[6], b[7], 40), m0), m1), m2);
  return [k0, k1, k2, k3];
}
/** The four showdown cards, drawn from the 43 the deal left (none among `dealt`). */
export function showdownCards(dealt, b) {
  return showdownIndices(b).map((k) => skipDealt(k, dealt));
}
/** Card indices of all thirteen cards, in slot order
 *  (0-1 P1 hole, 2-3 P2 hole, 4-8 board, 9-10 showdown pair A, 11-12 pair B). */
export function dealThirteenIndices(pureCircuits, salt0, salt1, seed, round) {
  const nine = dealNineIndices(pureCircuits, salt0, salt1, seed, round);
  return [...nine, ...showdownCards(nine, bytesOf(pureCircuits.showdownDigest(salt0, salt1, seed, BigInt(round))))];
}
export function dealThirteenRanks(pureCircuits, salt0, salt1, seed, round) {
  return dealThirteenIndices(pureCircuits, salt0, salt1, seed, round).map(cardToRank);
}

export const initialBoundary = () => ({
  turn: 0n, score0: 0n, score1: 0n, round: 0n, ended: false, winner: 0n, chain: 0n,
});

export function normalizeMove(move) {
  return {
    kind: BigInt(move.kind), count: BigInt(move.count ?? 0n),
    rankA: BigInt(move.rankA ?? 0n), rankB: BigInt(move.rankB ?? 0n),
  };
}

const onBoard = (r, board) => board.includes(r);
const subFloor = (score, d) => (score <= d ? 0n : score - d);

/** Mirror of the circuit's resolveClaim. Throws on an illegal claim/response. */
export function resolveClaim(hole, board, claim, response) {
  if (claim.kind !== KIND.CLAIM) throw new Error('expected a CLAIM');
  if (claim.count > 2n) throw new Error('claim count out of range');
  if (claim.count >= 1n && !onBoard(claim.rankA, board)) throw new Error('claimed rank not on board');
  if (claim.count >= 2n && !onBoard(claim.rankB, board)) throw new Error('claimed rank not on board');
  if (claim.count < 1n && claim.rankA !== 0n) throw new Error('unused claim slot must be zero');
  if (claim.count < 2n && claim.rankB !== 0n) throw new Error('unused claim slot must be zero');
  const isAccept = response.kind === KIND.ACCEPT;
  const isChallenge = response.kind === KIND.CHALLENGE;
  if (!(isAccept || isChallenge)) throw new Error('expected a response');
  if (response.count !== 0n || response.rankA !== 0n || response.rankB !== 0n) throw new Error('response fields must be zero');
  if (isChallenge && claim.count < 1n) throw new Error('nothing to challenge');

  const aHit = hole[0] === claim.rankA || hole[1] === claim.rankA;
  const bHit = hole[0] === claim.rankB || hole[1] === claim.rankB;
  const pairHit = (hole[0] === claim.rankA && hole[1] === claim.rankB) || (hole[0] === claim.rankB && hole[1] === claim.rankA);
  const trueCount = claim.count === 0n ? 0n : claim.count === 1n ? (aHit ? 1n : 0n) : pairHit ? 2n : (aHit || bHit ? 1n : 0n);
  const lies = claim.count - trueCount;

  const acceptGain = claim.count === 0n ? 0n : claim.count === 1n ? 1n : 3n;
  const provenGain = claim.count === 1n ? 2n : 4n;
  const shown = isChallenge ? lies : 0n;
  return {
    claimantGain: isAccept ? acceptGain : (lies === 0n ? provenGain : 0n),
    claimantLoss: shown, responderGain: shown, lies: shown,
    // Referee-only extras (never leave the table): the real truth of the claim.
    trueCount,
  };
}

/** Mirror of the circuit's resolvePass: the responder's two showdown draws
 *  each win +1 by strictly outranking the passer's same-slot hole card. */
export function resolvePass(hole, draw, pass, response) {
  if (pass.kind !== KIND.PASS) throw new Error('expected a PASS');
  if (pass.count !== 0n || pass.rankA !== 0n || pass.rankB !== 0n) throw new Error('pass fields must be zero');
  if (response.kind !== KIND.NOOP) throw new Error('a pass can only be followed by NOOP');
  if (response.count !== 0n || response.rankA !== 0n || response.rankB !== 0n) throw new Error('noop fields must be zero');
  const wins = BigInt(draw[0] > hole[0]) + BigInt(draw[1] > hole[1]);
  return { claimantGain: 0n, claimantLoss: 0n, responderGain: wins, lies: 0n, trueCount: 0n, pass: true, draws: [draw[0], draw[1]] };
}

/** The true match count of a hole against a board (bot/UI helper, private). */
export function matchesFor(hole, board) {
  return hole.filter((r) => board.includes(r));
}

export function createFiveUpReferee(pureCircuits, { seed, roundSecrets, mode }) {
  const target = targetScore(mode);
  const deal = (round) => {
    const [s0, s1] = [roundSecrets[0][round - 1], roundSecrets[1][round - 1]];
    const cards = dealThirteenIndices(pureCircuits, s0, s1, seed, round);
    // The three digests ride along as witnesses (the circuit re-derives and asserts them).
    const digests = [pureCircuits.dealDigest, pureCircuits.shuffleDigest, pureCircuits.showdownDigest]
      .map((f) => bytesOf(f(s0, s1, seed, BigInt(round))).map(BigInt));
    return { cards: cards.map(BigInt), ranks: cards.map(cardToRank).map(BigInt), digests };
  };

  let boundary = initialBoundary();
  let round = null;   // { r, holes: [[..],[..]], board, moves: [], first, chain, scores }

  const api = {
    target,
    get boundary() { return boundary; },
    get round() { if (!round) throw new Error('no round in progress'); return round; },
    /** Whose move it is: seat index 0/1 and what they must do. */
    get state() {
      const r = api.round;
      const n = r.moves.length;
      const claimant = n < 2 ? r.first : 1n - r.first;
      const step = n % 2 === 0 ? 'claim' : 'respond';
      const actor = step === 'claim' ? claimant : 1n - claimant;
      const pending = step === 'respond' ? r.moves[n - 1] : null;
      return { round: r.r, step, actor, claimant, pending, board: r.board, scores: [r.scores[0], r.scores[1]], done: n === MOVES_PER_ROUND };
    },
    /** Private: the hole cards of a seat this round. */
    hole(seat) { return api.round.holes[Number(seat)]; },
    startRound() {
      if (round) throw new Error('round already in progress');
      if (boundary.ended) throw new Error('game has ended');
      const r = boundary.round + 1n;
      if (r > BigInt(MAX_ROUNDS)) throw new Error('out of rounds');
      const { cards, ranks, digests } = deal(Number(r));
      const board = ranks.slice(4, 9);
      round = {
        r, cards, ranks, digests, holes: [ranks.slice(0, 2), ranks.slice(2, 4)], board,
        draws: [ranks.slice(9, 11), ranks.slice(11, 13)],   // showdown pair per claim step
        moves: [], first: boundary.turn,
        chain: pureCircuits.chainBoard(boundary.chain, board), scores: [boundary.score0, boundary.score1],
        outcomes: [],
      };
      return api.state;
    },
    apply(move) {
      const r = api.round;
      if (r.moves.length >= MOVES_PER_ROUND) throw new Error('round is complete');
      const m = normalizeMove(move);
      const st = api.state;
      if (st.step === 'claim') {
        if (m.kind === KIND.PASS) {
          // The claimant claims nothing; the responder draws the exchange's
          // showdown pair. The transcript link binds the draws + wins.
          const draw = r.draws[r.moves.length === 0 ? 0 : 1];
          const out = resolvePass(r.holes[Number(st.claimant)], draw, m, normalizeMove({ kind: KIND.NOOP }));
          const responder = 1 - Number(st.claimant);
          r.scores[responder] += out.responderGain;
          r.moves.push(m, normalizeMove({ kind: KIND.NOOP }));
          r.outcomes.push({ claimant: st.claimant, claim: m, response: normalizeMove({ kind: KIND.NOOP }), ...out });
          r.chain = pureCircuits.chainMove(r.chain, KIND.PASS, out.responderGain, draw[0], draw[1], 0n);
          r.chain = pureCircuits.chainMove(r.chain, KIND.NOOP, 0n, 0n, 0n, 0n);
          return api.state;
        }
        if (m.kind !== KIND.CLAIM) throw new Error('expected a CLAIM or PASS');
        // Legality is fully checked when the response lands (same as the circuit);
        // pre-check the public parts here so a bad claim fails fast.
        if (m.count > 2n) throw new Error('claim count out of range');
        if (m.count >= 1n && !onBoard(m.rankA, r.board)) throw new Error('claimed rank not on board');
        if (m.count >= 2n && !onBoard(m.rankB, r.board)) throw new Error('claimed rank not on board');
        r.moves.push(m);
        r.chain = pureCircuits.chainMove(r.chain, m.kind, m.count, m.rankA, m.rankB, 0n);
        return api.state;
      }
      const claim = r.moves[r.moves.length - 1];
      const claimant = Number(st.claimant);
      const out = resolveClaim(r.holes[claimant], r.board, claim, m);
      r.scores[claimant] = subFloor(r.scores[claimant] + out.claimantGain, out.claimantLoss);
      r.scores[1 - claimant] += out.responderGain;
      r.moves.push(m);
      r.outcomes.push({ claimant: BigInt(claimant), claim, response: m, ...out });
      r.chain = pureCircuits.chainMove(r.chain, m.kind, 0n, 0n, 0n, out.lies);
      return api.state;
    },
    claim(count, rankA = 0n, rankB = 0n) { return api.apply({ kind: KIND.CLAIM, count, rankA, rankB }); },
    pass() { return api.apply({ kind: KIND.PASS }); },
    accept() { return api.apply({ kind: KIND.ACCEPT }); },
    challenge() { return api.apply({ kind: KIND.CHALLENGE }); },
    /** Close the round: advance the boundary and return proveRound's witnesses. */
    finishRound() {
      const r = api.round;
      if (r.moves.length !== MOVES_PER_ROUND) throw new Error('round did not finish');
      const [s0, s1] = r.scores;
      const ended = s0 >= target || s1 >= target || r.r === BigInt(MAX_ROUNDS);
      const winner = !ended ? 0n : s0 > s1 ? 1n : s1 > s0 ? 2n : 0n;
      const boundaryIn = boundary;
      const boundaryOut = { turn: 1n - r.first, score0: s0, score1: s1, round: r.r, ended, winner, chain: r.chain };
      const out = { round: r.r, moves: r.moves, cards: r.cards, ranks: r.ranks, digests: r.digests, boundaryIn, boundaryOut, board: r.board, draws: r.draws, outcomes: r.outcomes };
      boundary = boundaryOut; round = null;
      return out;
    },
    result() {
      if (!boundary.ended) throw new Error('game has not ended');
      return { transcriptChain: boundary.chain, p1Score: boundary.score0, p2Score: boundary.score1, winner: boundary.winner, boundary };
    },
  };
  return api;
}
