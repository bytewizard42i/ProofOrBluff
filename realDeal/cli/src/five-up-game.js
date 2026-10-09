// Sponsored (wallet-free) 5 Up 2 Down game — the in-memory object behind one
// `gameId` when a player picks the second table (docs/FIVE_UP_TWO_DOWN.md).
//
// Same shape as sponsored-game.js (Original) so the service treats both the
// same: constructorArgs / takePendingChainSteps / recordReceipt / abandon /
// transcript / view, plus the human actions humanClaim / humanAccept /
// humanChallenge. The bot seat is driven by five-up-bot.js, which is handed
// only the bot's own hole cards, the board and the public claim.

import { randomBytes } from 'node:crypto';
import { createFiveUpReferee, MAX_ROUNDS, matchesFor, targetScore } from '../../contracts/five-up-referee.js';
import { consentKeyPairFromSecret, buildCloseConsent, signCloseConsent, gameIdFromContractAddress } from './rollup-consent.js';
import * as fiveUpBot from './five-up-bot.js';
import { GameError, GAME_STATUS, SEAT, DIFFICULTIES } from './sponsored-game.js';

export const FIVE_UP_MODES = Object.freeze([0, 1]);   // 0 Casual (to 10) · 1 Standard (to 20)
export const GAME_TYPE = 'fiveup';

const seatName = (seat) => (Number(seat) === SEAT.HUMAN ? 'human' : 'bot');
const winnerName = (w) => (w === 1n ? 'human' : w === 2n ? 'bot' : 'draw');
const nums = (arr) => arr.map(Number);

export function createFiveUpGame({ gameId, mode, difficulty = 'medium', pureCircuits, bot = fiveUpBot, random = randomBytes }) {
  if (!FIVE_UP_MODES.includes(mode)) throw new GameError(400, 'mode must be 0 (Casual, to 10) or 1 (Standard, to 20)');
  if (!DIFFICULTIES.includes(difficulty)) throw new GameError(400, 'difficulty must be easy, medium or hard');

  const keyPairs = [consentKeyPairFromSecret(random(32)), consentKeyPairFromSecret(random(32))];
  const playerIds = keyPairs.map((kp) => pureCircuits.playerIdFromPk(kp.pk));
  const entropy = [new Uint8Array(random(32)), new Uint8Array(random(32))];
  const roundSecrets = [0, 1].map(() => Array.from({ length: MAX_ROUNDS }, () => new Uint8Array(random(32))));
  const seed = pureCircuits.combineEntropy(entropy[0], entropy[1]);
  const modeBig = BigInt(mode);
  const target = Number(targetScore(modeBig));
  // The bot's dice: a float in [0,1) from the same CSPRNG as the secrets.
  const rnd = () => new Uint8Array(random(4)).reduce((a, b) => a * 256 + b, 0) / 2 ** 32;

  const referee = createFiveUpReferee(pureCircuits, { seed, roundSecrets, mode: modeBig });

  let status = GAME_STATUS.PLAYING;
  let events = [];
  const chain = { contractAddress: null, receipts: [], pending: ['deploy'] };
  const pendingChainSteps = [];
  const finishedRounds = [];
  const push = (event) => events.push(event);
  const inRound = () => { try { referee.round; return true; } catch { return false; } };

  function constructorArgs() {
    const commits = (seat) => roundSecrets[seat].map((s, i) => pureCircuits.commitRoundSecret(s, BigInt(i + 1)));
    return {
      playerOne: playerIds[0], playerTwo: playerIds[1], mode: modeBig,
      p1EntropyCommit: pureCircuits.commitEntropy(entropy[0]), p2EntropyCommit: pureCircuits.commitEntropy(entropy[1]),
      p1RoundCommits: commits(0), p2RoundCommits: commits(1),
    };
  }

  let roundSummary = null;   // finished-round display data while awaitingNext
  function settleRoundIfFinished() {
    if (!inRound() || !referee.state.done) return;
    const fin = referee.finishRound();
    const round = Number(fin.round);
    finishedRounds.push(fin);
    push({ type: 'round-end', round, board: nums(fin.board), scores: { human: Number(fin.boundaryOut.score0), bot: Number(fin.boundaryOut.score1) } });
    // Reveal the completed hand while the round sits on the table: both holes
    // plus every outcome (claims, lies shown, showdown draws and wins).
    roundSummary = {
      round, board: nums(fin.board),
      hole: nums(fin.ranks.slice(0, 2)), botHole: nums(fin.ranks.slice(2, 4)),
      showdowns: fin.outcomes.filter((o) => o.pass).map((o) => ({
        passer: seatName(o.claimant), drawer: seatName(1n - o.claimant),
        draws: nums(o.draws), wins: Number(o.responderGain), passerHole: nums(fin.ranks.slice(Number(o.claimant) * 2, Number(o.claimant) * 2 + 2)),
      })),
      scores: { human: Number(fin.boundaryOut.score0), bot: Number(fin.boundaryOut.score1) },
    };
    pendingChainSteps.push({
      step: 'proveRound', round,
      witnesses: { ...fin, entropyPair: entropy, roundSecrets: [roundSecrets[0][round - 1], roundSecrets[1][round - 1]] },
    });
    chain.pending.push(`proveRound:${round}`);

    if (!referee.boundary.ended) return;   // hold on the finished hand until next()

    status = GAME_STATUS.ENDED;
    const result = referee.result();
    pendingChainSteps.push({
      step: 'closeGame',
      build: (contractAddress) => {
        const consent = buildCloseConsent(pureCircuits, {
          gameId: gameIdFromContractAddress(contractAddress), transcriptRoot: result.transcriptChain,
          p1Score: result.p1Score, p2Score: result.p2Score, winner: result.winner,
        });
        return {
          boundary: result.boundary, p1Score: result.p1Score, p2Score: result.p2Score, winner: result.winner,
          p1CloseConsent: signCloseConsent(pureCircuits, consent, keyPairs[0]),
          p2CloseConsent: signCloseConsent(pureCircuits, consent, keyPairs[1]),
        };
      },
    });
    chain.pending.push('closeGame');
    push({ type: 'game-end', winner: winnerName(result.winner) });
  }

  /** The bot acts (claims and/or responds) until it is the human's move or the round settles. */
  function runBot() {
    for (let guard = 0; guard < 6 && status === GAME_STATUS.PLAYING; guard += 1) {
      if (!inRound()) return;   // finished round held on the table
      const s = referee.state;
      if (Number(s.actor) !== SEAT.BOT) return;
      const hole = nums(referee.hole(SEAT.BOT));
      const board = nums(s.board);
      if (s.step === 'claim') {
        const d = bot.decideClaim({ hole, board, difficulty, random: rnd });
        if (d.pass) {
          referee.pass();
          const out = referee.round.outcomes.at(-1);
          push({ type: 'bot-pass', dialogue: d.dialogue });
          push({ type: 'showdown', passer: 'bot', draws: nums(out.draws), wins: Number(out.responderGain) });
        } else {
          referee.claim(BigInt(d.count), BigInt(d.ranks[0] ?? 0), BigInt(d.ranks[1] ?? 0));
          push({ type: 'bot-claim', count: d.count, ranks: d.ranks, dialogue: d.dialogue });
        }
      } else {
        const claim = { count: Number(s.pending.count), ranks: [s.pending.rankA, s.pending.rankB].slice(0, Number(s.pending.count)).map(Number) };
        const d = bot.decideChallenge({ claim, board, hole, difficulty, random: rnd });
        if (d.shouldChallenge) {
          referee.challenge();
          const out = referee.round.outcomes.at(-1);
          push({ type: 'bot-challenge', lies: Number(out.lies), truthful: out.lies === 0n, dialogue: bot.challengeReaction({ botWasChallenger: true, lies: Number(out.lies), random: rnd }) });
        } else {
          referee.accept();
          push({ type: 'bot-accept', dialogue: d.dialogue });
        }
      }
      settleRoundIfFinished();
    }
  }

  function requireHuman(step) {
    if (status !== GAME_STATUS.PLAYING) throw new GameError(409, 'game is over');
    if (!inRound()) throw new GameError(409, 'round complete — deal the next hand');
    const s = referee.state;
    if (Number(s.actor) !== SEAT.HUMAN) throw new GameError(409, 'not your turn');
    if (s.step !== step) throw new GameError(409, step === 'claim' ? 'respond to the pending claim first' : 'no claim to respond to');
    return s;
  }
  function afterHuman() { settleRoundIfFinished(); runBot(); return game.view(); }

  referee.startRound();
  runBot();   // round 1: the human claims first, so this is a no-op; kept for symmetry

  const game = {
    gameId, mode, difficulty, playerIds, gameType: GAME_TYPE,
    get status() { return status; },
    constructorArgs,
    takePendingChainSteps() { return pendingChainSteps.splice(0); },
    recordReceipt(receipt) {
      chain.receipts.push(receipt);
      const key = receipt.step === 'proveRound' ? `proveRound:${receipt.round}` : receipt.step;
      chain.pending = chain.pending.filter((p) => p !== key);
      if (receipt.step === 'deploy') chain.contractAddress = receipt.contractAddress;
      if (receipt.step === 'closeGame' && status === GAME_STATUS.ENDED) status = GAME_STATUS.CLOSED;
    },

    /** Human claims `count` matches naming `ranks` (board ranks, 0..2 of them). */
    humanClaim({ count, ranks }) {
      const s = requireHuman('claim');
      if (!Number.isInteger(count) || count < 0 || count > 2) throw new GameError(400, 'count must be 0, 1 or 2');
      if (!Array.isArray(ranks) || ranks.length !== count || ranks.some((r) => !Number.isInteger(r) || r < 0 || r > 12)) {
        throw new GameError(400, 'ranks must list exactly `count` ranks in 0..12');
      }
      const board = nums(s.board);
      for (const r of ranks) if (!board.includes(r)) throw new GameError(400, `rank ${r} is not on the board`);
      events = [];
      referee.claim(BigInt(count), BigInt(ranks[0] ?? 0), BigInt(ranks[1] ?? 0));
      return afterHuman();
    },
    humanAccept() {
      requireHuman('respond');
      events = [];
      referee.accept();
      return afterHuman();
    },
    /** Claim nothing and take the showdown: the Ai draws 2 cards, each that
     *  outranks the matching hole card scores it +1. You lose nothing. */
    humanPass() {
      requireHuman('claim');
      events = [];
      referee.pass();
      const out = referee.round.outcomes.at(-1);
      push({ type: 'human-pass' });
      push({ type: 'showdown', passer: 'human', draws: nums(out.draws), wins: Number(out.responderGain) });
      return afterHuman();
    },
    /** Deal the next hand — only while a finished round sits on the table. */
    nextRound() {
      if (status !== GAME_STATUS.PLAYING) throw new GameError(409, 'game is over');
      if (inRound()) throw new GameError(409, 'round still in progress');
      events = [];
      referee.startRound();
      runBot();
      return game.view();
    },
    /** As at a real table, a challenged bot shows its cards (the chain only learns the lie count). */
    humanChallenge() {
      const s = requireHuman('respond');
      if (Number(s.pending.count) === 0) throw new GameError(409, 'nothing to challenge — accept the 0-claim');
      events = [];
      const revealed = nums(referee.hole(SEAT.BOT));
      referee.challenge();
      const out = referee.round.outcomes.at(-1);
      push({ type: 'human-challenge', lies: Number(out.lies), truthful: out.lies === 0n, revealed, dialogue: bot.challengeReaction({ botWasChallenger: false, lies: Number(out.lies), random: rnd }) });
      return afterHuman();
    },
    abandon() {
      if (status !== GAME_STATUS.PLAYING) return game.view();
      status = GAME_STATUS.ABANDONED;
      chain.pending = [];
      pendingChainSteps.length = 0;
      events = [{ type: 'game-abandoned' }];
      return game.view();
    },
    transcript() {
      if (status !== GAME_STATUS.CLOSED) throw new GameError(409, 'transcript is published once the game is closed on-chain');
      const r = referee.result();
      return {
        gameId, gameType: GAME_TYPE, mode, difficulty, contractAddress: chain.contractAddress,
        playerIds: playerIds.map((p) => Buffer.from(p).toString('hex')),
        entropy: entropy.map((e) => Buffer.from(e).toString('hex')),
        roundSecrets: roundSecrets.map((seat) => seat.map((s) => Buffer.from(s).toString('hex'))),
        rounds: finishedRounds.map((fin) => ({
          round: Number(fin.round), board: nums(fin.board),
          moves: fin.moves.map((m) => ({ kind: Number(m.kind), count: Number(m.count), rankA: Number(m.rankA), rankB: Number(m.rankB) })),
          outcomes: fin.outcomes.map((o) => ({ claimant: seatName(o.claimant), lies: Number(o.lies), trueCount: Number(o.trueCount) })),
          boundaryOut: Object.fromEntries(Object.entries(fin.boundaryOut).map(([k, v]) => [k, typeof v === 'bigint' ? v.toString() : v])),
        })),
        result: { p1Score: Number(r.p1Score), p2Score: Number(r.p2Score), winner: winnerName(r.winner), transcriptChain: r.transcriptChain.toString() },
        howToVerify: 'Re-run realDeal/contracts/five-up-referee.js with seed = combineEntropy(entropy) and these roundSecrets/moves; commitTranscript(result.transcriptChain) must equal the contract\'s transcriptRoot.',
      };
    },
    view() {
      const live = status === GAME_STATUS.PLAYING;
      const waiting = live && !inRound();       // finished hand on the table
      const s = live && !waiting ? referee.state : null;
      const b = referee.boundary;
      const hole = s ? nums(referee.hole(SEAT.HUMAN)) : (roundSummary?.hole ?? []);
      const board = s ? nums(s.board) : (roundSummary?.board ?? []);
      return {
        gameId, status, gameType: GAME_TYPE, mode, difficulty, target,
        round: Number(s ? s.round : b.round),
        turn: s ? seatName(s.actor) : null,
        step: waiting ? 'round-end' : (s ? s.step : null),
        awaitingNext: waiting,
        roundSummary: waiting ? roundSummary : null,
        board, hole,
        myMatches: s ? nums(matchesFor(referee.hole(SEAT.HUMAN), s.board)) : [],
        pending: s?.pending ? { claimer: seatName(s.claimant), count: Number(s.pending.count), ranks: [s.pending.rankA, s.pending.rankB].slice(0, Number(s.pending.count)).map(Number) } : null,
        scores: { human: Number(s ? s.scores[0] : b.score0), bot: Number(s ? s.scores[1] : b.score1) },
        winner: live || status === GAME_STATUS.ABANDONED ? null : winnerName(referee.result().winner),
        lastEvents: [...events],
        chain: { contractAddress: chain.contractAddress, receipts: [...chain.receipts], pending: [...chain.pending] },
      };
    },
  };
  return game;
}
