import { describe, expect, it } from 'vitest';
import {
  toTableState,
  diffMatch,
  nextActor,
  matchWinner,
  playerChallengeOutcome,
  winThreshold,
  EMPTY_STATS,
  PHASE,
} from './tableAdapter.js';
import { LOG, classifyLog } from '../components/table/GameLog.jsx';

// Shape mirrors normalizeMatchResponse(); values from the completed Preview
// match c05498a3… (phase 2, 0–3, human hand 6) and synthetic neighbours.
function match(overrides = {}) {
  return {
    matchId: 'c05498a3bd1dac79020c0961207b1367a5fccba34493a52252f86b01a542fcbd',
    phase: PHASE.PLAYING,
    currentRank: 3,
    activePlayerIdx: 0,
    p1Score: 0,
    p2Score: 3,
    p1HandSize: 6,
    p2HandSize: 7,
    pileSize: 0,
    winner: 0,
    seedFinalized: true,
    mode: 1,
    round: 0,
    hasPendingPlay: false,
    isChallenged: false,
    lastPlayerIdx: 0,
    lastClaimRank: 0,
    lastClaimCount: 0,
    ...overrides,
  };
}

const hand = [
  { id: 'p1:r0:0:5', rank: '5', rankIndex: 3, suit: 'hidden' },
  { id: 'p1:r0:1:5', rank: '5', rankIndex: 3, suit: 'hidden' },
  { id: 'p1:r0:2:K', rank: 'K', rankIndex: 11, suit: 'hidden' },
];

describe('toTableState', () => {
  it('renders the Preview match as a playable table for the human', () => {
    const state = toTableState(match(), hand, { log: ['x'], stats: EMPTY_STATS });
    expect(state.status).toBe('playing');
    expect(state.turn).toBe('player');
    expect(state.lastPlay).toBeNull();
    expect(state.playerHand).toHaveLength(3);
    expect(state.aiHand).toEqual([]);
    expect(state.aiHandCount).toBe(7);
    expect(state.pileCount).toBe(0);
    expect(state.currentRank).toBe('5');
    expect(state.scores).toEqual({ player: 0, ai: 3 });
    expect(state.winThreshold).toBe(15);
    expect(state.log).toEqual(['x']);
  });

  it('never exposes bot cards or pile contents', () => {
    const state = toTableState(match({ pileSize: 4 }), hand, {});
    expect(state.aiHand).toEqual([]);
    expect(state.pile).toEqual([]);
    expect(state.discardPile).toEqual([]);
    expect(state.pileCount).toBe(4);
  });

  it('shows the bot claim as lastPlay the human must respond to', () => {
    const m = match({ phase: PHASE.AWAITING_RESPONSE, hasPendingPlay: true, lastPlayerIdx: 1, lastClaimRank: 3, lastClaimCount: 2, pileSize: 2 });
    const state = toTableState(m, hand, {});
    expect(state.turn).toBe('player');
    expect(state.lastPlay).toEqual({ player: 'ai', claimedRank: '5', claimedCount: 2, cards: [] });
    expect(state.proving).toBe(false);
  });

  it('keeps the human own played cards on lastPlay while the bot decides', () => {
    const played = [hand[0], hand[2]];
    const m = match({ phase: PHASE.AWAITING_RESPONSE, hasPendingPlay: true, lastPlayerIdx: 0, lastClaimRank: 3, lastClaimCount: 2 });
    const state = toTableState(m, hand.slice(1, 2), { lastPlayCards: played });
    expect(state.turn).toBe('ai');
    expect(state.lastPlay.player).toBe('player');
    expect(state.lastPlay.cards).toBe(played);
  });

  it('flags the mandatory prove step when the bot challenges the human', () => {
    const m = match({ phase: PHASE.AWAITING_RESPONSE, hasPendingPlay: true, lastPlayerIdx: 0, isChallenged: true, lastClaimCount: 1 });
    expect(nextActor(m)).toBe('prove');
    const state = toTableState(m, hand, {});
    expect(state.proving).toBe(true);
    expect(state.turn).toBe('player');
  });

  it('maps game over and the winner', () => {
    expect(matchWinner(match({ phase: PHASE.GAMEOVER, winner: 1 }))).toBe('player');
    expect(matchWinner(match({ phase: PHASE.GAMEOVER, winner: 2 }))).toBe('ai');
    expect(matchWinner(match({ winner: 1 }))).toBeNull();
    const state = toTableState(match({ phase: PHASE.GAMEOVER, winner: 2 }), hand, {});
    expect(state.status).toBe('gameover');
    expect(state.winner).toBe('ai');
  });

  it('reports waiting before the deal is sealed', () => {
    expect(toTableState(match({ phase: PHASE.WAITING_FOR_P2 }), [], {}).status).toBe('waiting');
    expect(nextActor(match({ phase: PHASE.WAITING_FOR_SEEDS }))).toBeNull();
  });

  it('uses the contract win thresholds', () => {
    expect(winThreshold(0)).toBe(10);
    expect(winThreshold(1)).toBe(15);
    expect(winThreshold(4)).toBe(20);
  });
});

describe('diffMatch log vocabulary', () => {
  const playing = match();
  const botClaimed = match({ phase: PHASE.AWAITING_RESPONSE, hasPendingPlay: true, lastPlayerIdx: 1, lastClaimRank: 3, lastClaimCount: 2, pileSize: 2, activePlayerIdx: 1 });

  it('emits a resume summary on first load only', () => {
    const { lines } = diffMatch(null, playing);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/Match resumed/);
    expect(diffMatch(null, match({ phase: PHASE.WAITING_FOR_P2 })).lines).toEqual([]);
  });

  it('logs the bot play with the AI played prefix and counts it', () => {
    const { lines, stats } = diffMatch(playing, botClaimed);
    expect(lines[0].startsWith(LOG.AI_PLAYED)).toBe(true);
    expect(classifyLog(lines[0]).actor).toBe('ai');
    expect(stats.aiPlays).toBe(1);
  });

  it('logs the human play with the You played prefix', () => {
    const mine = match({ phase: PHASE.AWAITING_RESPONSE, hasPendingPlay: true, lastPlayerIdx: 0, lastClaimRank: 3, lastClaimCount: 1 });
    const { lines } = diffMatch(playing, mine);
    expect(lines[0].startsWith(LOG.YOU_PLAYED)).toBe(true);
  });

  it('logs an accept when the pending play clears without a score change', () => {
    const accepted = match({ currentRank: 4, pileSize: 2 });
    const { lines, stats } = diffMatch(botClaimed, accepted);
    expect(lines[0].startsWith(LOG.YOU_ACCEPTED)).toBe(true);
    expect(stats.rounds).toBe(1);
  });

  it('logs a caught bluff as good for the human when the bot lied', () => {
    const challenged = { ...botClaimed, isChallenged: true };
    const resolved = match({ p1Score: 3, p2Score: 2, currentRank: 4 });
    const { lines, stats } = diffMatch(challenged, resolved);
    const outcome = lines.find((l) => l.startsWith(LOG.CAUGHT_BLUFFING));
    expect(outcome).toContain(LOG.AI_LOSES_MARKER);
    expect(classifyLog(outcome).kind).toBe('win-good');
    expect(stats.aiBluffsCaught).toBe(1);
  });

  it('logs a failed challenge as bad for the human when the bot was honest', () => {
    const challenged = { ...botClaimed, isChallenged: true };
    const resolved = match({ p1Score: 0, p2Score: 6, currentRank: 4 });
    const { lines, stats } = diffMatch(challenged, resolved);
    const outcome = lines.find((l) => l.startsWith(LOG.CHALLENGE_FAILED));
    expect(outcome).toContain(LOG.PLAYER_LOSES_MARKER);
    expect(classifyLog(outcome).kind).toBe('win-bad');
    expect(stats.playerFailedChallenges).toBe(1);
  });

  it('reproduces the verified Preview round: human bluffed, bot challenged, bot +3', () => {
    const mine = match({ phase: PHASE.AWAITING_RESPONSE, hasPendingPlay: true, lastPlayerIdx: 0, lastClaimRank: 0, lastClaimCount: 1, p1HandSize: 6, p2Score: 0, activePlayerIdx: 1 });
    const challenged = { ...mine, isChallenged: true };
    const resolved = match({ p1Score: 0, p2Score: 3, p1HandSize: 6, currentRank: 1 });
    const raise = diffMatch(mine, challenged);
    expect(raise.lines[0]).toMatch(/challenging your claim/);
    const { lines, stats } = diffMatch(challenged, resolved);
    const outcome = lines.find((l) => l.startsWith(LOG.CAUGHT_BLUFFING));
    expect(outcome).toContain(LOG.PLAYER_LOSES_MARKER);
    expect(classifyLog(outcome).actor).toBe('player');
    expect(stats.playerBluffsCaught).toBe(1);
  });

  it('logs game over with the winner prefix', () => {
    const before = match({ p1Score: 12 });
    const after = match({ phase: PHASE.GAMEOVER, winner: 1, p1Score: 15 });
    const { lines } = diffMatch(before, after);
    expect(lines.at(-1).startsWith(LOG.YOU_WIN)).toBe(true);
  });
});

describe('playerChallengeOutcome', () => {
  const before = match({ p1Score: 3, p2Score: 3 });
  it('reads the score delta', () => {
    expect(playerChallengeOutcome(before, match({ p1Score: 6, p2Score: 2 }))).toEqual({ claimWasTrue: false });
    expect(playerChallengeOutcome(before, match({ p1Score: 2, p2Score: 6 }))).toEqual({ claimWasTrue: true });
    expect(playerChallengeOutcome(before, before)).toBeNull();
  });
});
