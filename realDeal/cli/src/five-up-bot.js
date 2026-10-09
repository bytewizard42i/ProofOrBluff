// five-up-bot.js — the house seat for 5 Up 2 Down.
//
// FIREWALL: every function here is handed ONLY what a real opponent would
// know — the bot's own two hole cards, the public board, the public claim,
// the scores. Never the human's cards. (sponsored five-up-game.js enforces
// this at the call sites; keep it that way.)
//
// The maths: the bot knows 7 of the 52 cards (its hole + the board). The
// human's two cards are a uniform pair from the other 45. For a claimed rank
// r, `avail(r)` = 4 - (copies on the board) - (copies in the bot's hole) is
// how many copies could possibly sit in the human's hand.

const C2 = (n) => (n < 2 ? 0 : (n * (n - 1)) / 2);
const UNKNOWN = 45;                       // 52 - 2 (own hole) - 5 (board)
const PAIRS = C2(UNKNOWN);                // 990 possible human hands

const count = (arr, r) => arr.filter((x) => x === r).length;

/** Probability the human really holds what they claim, given the bot's view. */
export function claimTruthProbability({ claim, board, hole }) {
  const avail = (r) => Math.max(0, 4 - count(board, r) - count(hole, r));
  if (claim.count === 0) return 1;
  if (claim.count === 1) {
    const a = avail(claim.ranks[0]);
    return 1 - C2(UNKNOWN - a) / PAIRS;   // at least one of the `a` copies
  }
  const [ra, rb] = claim.ranks;
  if (ra === rb) return C2(avail(ra)) / PAIRS;          // both cards that rank
  return (avail(ra) * avail(rb)) / PAIRS;               // one of each
}

const PROFILES = {
  easy:   { bluffFromZero: 0.20, bluffUpFromOne: 0.10, noise: 0.35, greed: 0.6 },
  medium: { bluffFromZero: 0.35, bluffUpFromOne: 0.25, noise: 0.15, greed: 1.0 },
  hard:   { bluffFromZero: 0.45, bluffUpFromOne: 0.35, noise: 0.05, greed: 1.2 },
};

const CLAIM_LINES = {
  honest0: ['Nothing for me — I pass. Showdown!', 'Board hates me. Pass. Draw your two.', 'Passing. Go on, draw against me.'],
  honest1: ['One match. Honest.', 'Got one. Believe me or don\'t.', 'Just the one.'],
  honest2: ['Two matches. Read \'em and weep.', 'Both of mine hit. Both.', 'Two. Challenge if you dare.'],
  bluff:   ['One match... probably.', 'I\'ve got that one. Trust me.', 'Two matches. Definitely two.', 'Would I lie to you?'],
};
const RESPOND_LINES = {
  accept: ['Fine, take it.', 'I\'ll allow it.', 'Sure. Next.'],
  challenge: ['Proof or bluff!', 'I don\'t buy it. Prove it.', 'Show me.'],
};
const pick = (arr, random) => arr[Math.floor(random() * arr.length)];

/** The ranks on the board the bot does NOT hold, most plausible first (fewest visible copies). */
function bluffableRanks(board, hole) {
  const visible = (r) => count(board, r) + count(hole, r);
  return [...new Set(board)].filter((r) => !hole.includes(r)).sort((a, b) => visible(a) - visible(b));
}

/**
 * Decide the bot's claim. Returns { count, ranks:[...], dialogue, bluff }.
 * `random()` → [0,1) is injectable for tests.
 */
export function decideClaim({ hole, board, difficulty = 'medium', random = Math.random }) {
  const p = PROFILES[difficulty] ?? PROFILES.medium;
  const real = hole.filter((r) => board.includes(r));
  const fakes = bluffableRanks(board, hole);
  if (real.length === 2) return { count: 2, ranks: [...real], bluff: false, dialogue: pick(CLAIM_LINES.honest2, random) };
  if (real.length === 1) {
    if (fakes.length && random() < p.bluffUpFromOne) return { count: 2, ranks: [real[0], fakes[0]], bluff: true, dialogue: pick(CLAIM_LINES.bluff, random) };
    return { count: 1, ranks: [real[0]], bluff: false, dialogue: pick(CLAIM_LINES.honest1, random) };
  }
  if (fakes.length && random() < p.bluffFromZero) return { count: 1, ranks: [fakes[0]], bluff: true, dialogue: pick(CLAIM_LINES.bluff, random) };
  // No matches and no nerve: PASS — the human draws the 2-card showdown.
  return { pass: true, count: 0, ranks: [], bluff: false, dialogue: pick(CLAIM_LINES.honest0, random) };
}

/**
 * Decide whether to challenge the human's claim. Expected-value on the score
 * gap: accepting hands the claimant +1/+3; challenging hands them +2/+4 when
 * true, but swings 2×lies our way when false.
 */
export function decideChallenge({ claim, board, hole, difficulty = 'medium', random = Math.random }) {
  const p = PROFILES[difficulty] ?? PROFILES.medium;
  if (claim.count === 0) return { shouldChallenge: false, dialogue: pick(RESPOND_LINES.accept, random) };
  const pTrue = claimTruthProbability({ claim, board, hole });
  const acceptGain = claim.count === 1 ? 1 : 3;
  const provenGain = claim.count === 1 ? 2 : 4;
  const expectedLies = claim.count === 1 ? 1 : (1 + (1 - pTrue));   // crude: a 2-claim that fails is often one lie
  const evAccept = -acceptGain;
  const evChallenge = pTrue * -provenGain + (1 - pTrue) * 2 * expectedLies * p.greed;
  const jitter = (random() - 0.5) * 2 * p.noise * 4;
  const shouldChallenge = evChallenge + jitter > evAccept;
  return { shouldChallenge, pTrue, dialogue: pick(shouldChallenge ? RESPOND_LINES.challenge : RESPOND_LINES.accept, random) };
}

export function challengeReaction({ botWasChallenger, lies, random = Math.random }) {
  if (botWasChallenger) {
    return lies > 0 ? pick(['Knew it. Caught you.', 'Busted.', `${lies === 2 ? 'Two lies' : 'A lie'}. Shameless.`], random)
      : pick(['...Okay, you had it.', 'Fine. Honest, this time.', 'Hmph. Carry on.'], random);
  }
  return lies > 0 ? pick(['Alright, you got me.', 'Worth a shot.', 'Caught. This round.'], random)
    : pick(['Told you.', 'Doubt me again, please.', 'Thanks for the bonus.'], random);
}
