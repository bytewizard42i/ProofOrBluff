#!/usr/bin/env node
/**
 * TestWired Player Two localhost service.
 *
 * This process deliberately has a very small trust boundary: it listens only on
 * loopback, accepts JSON from the TestWired browser origin, and owns exactly one
 * long-lived P2 wallet session. The chain remains the source of truth for turn
 * selection; the in-memory hand is only the bot's private view of the public,
 * deterministic deal.
 */

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { openSession } from './cli.js';
import * as state from './state.js';
import { createSponsor, SPONSOR_LIMITS, SponsorError } from './sponsor.js';
import { createTicketStore, TicketError } from './tickets.js';
import { dealFromSeed, RANKS } from '../../shared/dealing.js';
import {
  decideChallenge,
  decidePlay,
  getChallengeReaction,
} from '../../../demoLand/src/game/ai/scripted.js';

const LOOPBACK_HOST = '127.0.0.1';
const DEFAULT_PORT = 3017;
const MAX_JSON_BODY_BYTES = 16 * 1024;
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3016',
  'http://127.0.0.1:3016',
];
const HEX_32_PATTERN = /^(?:0x)?[0-9a-fA-F]{64}$/;
const __filename = fileURLToPath(import.meta.url);

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function assertPlainObject(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, `${label} must be a JSON object.`);
  }
}

function rejectUnknownFields(value, allowedFields, label) {
  const unknownFields = Object.keys(value).filter((key) => !allowedFields.includes(key));
  if (unknownFields.length > 0) {
    throw new HttpError(
      400,
      `${label} contains unsupported field(s): ${unknownFields.join(', ')}.`,
    );
  }
}

/** Validate and canonicalize a Compact Bytes<32> value supplied over HTTP. */
export function validateHex32(value, fieldName) {
  if (typeof value !== 'string' || !HEX_32_PATTERN.test(value)) {
    throw new HttpError(
      400,
      `${fieldName} must be exactly 64 hexadecimal characters (an optional 0x prefix is accepted).`,
    );
  }
  return value.replace(/^0x/i, '').toLowerCase();
}

function validateDifficulty(value, fallback = 'medium') {
  const difficulty = value ?? fallback;
  if (typeof difficulty !== 'string' || !VALID_DIFFICULTIES.has(difficulty)) {
    throw new HttpError(400, 'difficulty must be one of: easy, medium, hard.');
  }
  return difficulty;
}

export function validateJoinBody(body, defaultDifficulty = 'medium') {
  assertPlainObject(body, 'Join request body');
  rejectUnknownFields(
    body,
    ['matchId', 'wagerAmount', 'p1Entropy', 'contractAddress', 'difficulty'],
    'Join request body',
  );

  if (!Number.isSafeInteger(body.wagerAmount) || body.wagerAmount < 0) {
    throw new HttpError(400, 'wagerAmount must be a non-negative safe integer.');
  }

  return {
    matchId: validateHex32(body.matchId, 'matchId'),
    wagerAmount: body.wagerAmount,
    p1Entropy: validateHex32(body.p1Entropy, 'p1Entropy'),
    contractAddress: body.contractAddress === undefined
      ? undefined
      : validateHex32(body.contractAddress, 'contractAddress'),
    difficulty: validateDifficulty(body.difficulty, defaultDifficulty),
  };
}

export function validateAdvanceBody(body) {
  assertPlainObject(body, 'Advance request body');
  rejectUnknownFields(body, ['matchId'], 'Advance request body');
  return { matchId: validateHex32(body.matchId, 'matchId') };
}

/**
 * Compact uses bigint and byte arrays, neither of which JSON.stringify handles
 * usefully by default. Safe bigints become numbers for ergonomic browser use;
 * larger values remain exact decimal strings, and public bytes become lowercase
 * hex without a misleading object full of numeric byte keys.
 */
export function normalizeCompactValue(value) {
  if (typeof value === 'bigint') {
    return value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER)
      ? Number(value)
      : value.toString();
  }
  if (value instanceof Uint8Array) {
    return Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  if (Array.isArray(value)) return value.map(normalizeCompactValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeCompactValue(nestedValue)]),
    );
  }
  return value;
}

function requireCompactInteger(match, fieldName) {
  const value = match?.[fieldName];
  if (typeof value === 'bigint') {
    if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(`Match field ${fieldName} is outside the supported non-negative integer range.`);
    }
    return Number(value);
  }
  if (Number.isSafeInteger(value) && value >= 0) return value;
  throw new Error(
    `Match is missing a valid ${fieldName}. Wait for the indexer to sync, then retry /api/testwired/advance.`,
  );
}

function requireCompactBoolean(match, fieldName) {
  if (typeof match?.[fieldName] !== 'boolean') {
    throw new Error(
      `Match is missing a valid ${fieldName}. Wait for the indexer to sync, then retry /api/testwired/advance.`,
    );
  }
  return match[fieldName];
}

/** Pure state-machine selection. It makes it mechanically clear that P1 paths are no-ops. */
export function selectBotAction(match) {
  const phase = requireCompactInteger(match, 'phase');

  if (phase === 2) {
    return requireCompactInteger(match, 'activePlayerIdx') === 1
      ? 'play'
      : 'await-p1-play';
  }

  if (phase === 3) {
    const lastPlayerIdx = requireCompactInteger(match, 'lastPlayerIdx');
    const isChallenged = requireCompactBoolean(match, 'isChallenged');
    if (lastPlayerIdx === 0 && !isChallenged) return 'respond-to-p1';
    if (lastPlayerIdx === 1 && isChallenged) return 'resolve-p2-play';
    if (lastPlayerIdx === 1) return 'await-p1-response';
    return 'await-p1-resolution';
  }

  return `await-phase-${phase}`;
}

function parseServerFlags(argv) {
  const flags = { port: DEFAULT_PORT, difficulty: 'medium' };
  for (let index = 2; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag !== '--port' && flag !== '--difficulty') {
      throw new Error(`Unknown bot option "${flag}". Use --port N or --difficulty easy|medium|hard.`);
    }
    if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value.`);
    if (flag === '--port') {
      const port = Number(value);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('--port must be an integer from 1 through 65535.');
      }
      flags.port = port;
    } else {
      flags.difficulty = validateDifficulty(value);
    }
    index += 1;
  }
  return flags;
}

function allowedOriginsFromEnvironment() {
  if (!process.env.POB_APP_ORIGIN) return new Set(DEFAULT_ALLOWED_ORIGINS);
  let configuredOrigin;
  try {
    configuredOrigin = new URL(process.env.POB_APP_ORIGIN).origin;
  } catch {
    throw new Error('POB_APP_ORIGIN must be an absolute HTTP(S) origin, for example http://localhost:3016.');
  }
  if (configuredOrigin !== process.env.POB_APP_ORIGIN.replace(/\/$/, '')) {
    throw new Error('POB_APP_ORIGIN must contain only an origin (no path, query, or fragment).');
  }
  if (!configuredOrigin.startsWith('http://') && !configuredOrigin.startsWith('https://')) {
    throw new Error('POB_APP_ORIGIN must use the http: or https: protocol.');
  }
  return new Set([configuredOrigin]);
}

function applyCors(request, response, allowedOrigins) {
  const origin = request.headers.origin;
  response.setHeader('Vary', 'Origin');
  if (!origin) return;
  if (!allowedOrigins.has(origin)) {
    throw new HttpError(403, `Origin ${origin} is not allowed to use the TestWired bot.`);
  }
  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function safeErrorMessage(error) {
  const message = error?.message || String(error);
  const projectId = process.env.BLOCKFROST_PROJECT_ID?.trim();
  return projectId ? message.replaceAll(projectId, '[redacted]') : message;
}

function sendJson(response, statusCode, payload) {
  const encodedPayload = JSON.stringify(normalizeCompactValue(payload));
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(encodedPayload),
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(encodedPayload);
}

async function readJsonBody(request, maxBytes = MAX_JSON_BODY_BYTES) {
  const contentType = request.headers['content-type'];
  if (typeof contentType !== 'string' || !contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'POST requests require Content-Type: application/json.');
  }

  const declaredLength = Number(request.headers['content-length']);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new HttpError(413, `JSON body exceeds the ${maxBytes}-byte limit.`);
  }

  const chunks = [];
  let receivedBytes = 0;
  for await (const chunk of request) {
    receivedBytes += chunk.length;
    if (receivedBytes > maxBytes) {
      throw new HttpError(413, `JSON body exceeds the ${maxBytes}-byte limit.`);
    }
    chunks.push(chunk);
  }

  if (receivedBytes === 0) throw new HttpError(400, 'Request body must contain a JSON object.');
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Request body is not valid JSON.');
  }
}

function noOp(reason, match) {
  return {
    status: 'waiting',
    action: 'none',
    dialogue: reason,
    reason,
    match: normalizeCompactValue(match),
  };
}

/**
 * Rebuild P2's private hand after a restart, then reconcile against the only
 * private-hand fact the contract stores: its size. Shrinking is necessarily a
 * deterministic best effort because past card identities are not on-chain.
 * Growth uses untouched deterministic draw-pile cards and never duplicates an
 * identity already in the reconstructed hand.
 */
function reconcileBotHand(matchId, match, botHands, privateDealSeed = null) {
  const mode = requireCompactInteger(match, 'mode');
  const targetHandSize = requireCompactInteger(match, 'p2HandSize');
  // In the wagered local contract the seed is public (a known privacy bug).
  // The state-only edition publishes only seedCommitment. The bot obtains the
  // seed from its privately exchanged entropies, never from the indexer.
  const combinedSeed = privateDealSeed || match?.combinedSeed;
  if (!(combinedSeed instanceof Uint8Array) || combinedSeed.length !== 32) {
    throw new Error(
      'Private deal seed is missing. Ensure both entropy values were exchanged and P1 called revealSeed.',
    );
  }

  let handState = botHands.get(matchId);
  if (!handState) {
    const deal = dealFromSeed(combinedSeed, mode);
    handState = { hand: [...deal.p2Hand], drawPile: [...deal.drawPile], pendingSize: null };
    botHands.set(matchId, handState);
  }

  // Immediately after playCards confirms, the indexer can briefly return the
  // pre-transaction hand size. Do not mistake that stale size for challenge
  // growth and invent replacement cards. Any different size means the indexer
  // advanced and normal reconciliation should resume.
  if (handState.pendingSize) {
    if (targetHandSize === handState.pendingSize.before
      && handState.hand.length === handState.pendingSize.after) {
      return handState;
    }
    handState.pendingSize = null;
  }

  if (handState.hand.length > targetHandSize) {
    handState.hand = handState.hand.slice(0, targetHandSize);
  }

  const knownCardIds = new Set(handState.hand.map((card) => card.id));
  for (const candidate of handState.drawPile) {
    if (handState.hand.length >= targetHandSize) break;
    if (!knownCardIds.has(candidate.id)) {
      handState.hand.push(candidate);
      knownCardIds.add(candidate.id);
    }
  }

  if (handState.hand.length !== targetHandSize) {
    throw new Error(
      `Cannot reconcile P2 hand to on-chain size ${targetHandSize} from the deterministic draw pile. Restart from a fresh TestWired match.`,
    );
  }
  return handState;
}

/**
 * Provably fair edition: the bot's hand is whatever the contract has committed
 * it to, derived from the bot's private salt and the shared seed. There is no
 * draw-pile guesswork because the contract itself verifies every play.
 */
async function provableBotHand(api, matchId, match) {
  const { ranks } = await api.getHand({ matchId, role: 'p2', match });
  return {
    hand: ranks.map((rankIndex, position) => ({
      id: `p2:${position}:${RANKS[rankIndex]}`,
      rankIndex,
      rank: RANKS[rankIndex],
      suit: 'hidden',
    })),
  };
}

function removePlayedCards(handState, cardsToPlay) {
  const playedIds = new Set(cardsToPlay.map((card) => card.id));
  handState.hand = handState.hand.filter((card) => !playedIds.has(card.id));
}

export function createTestWiredBot({ defaultDifficulty = 'medium' } = {}) {
  const validatedDefaultDifficulty = validateDifficulty(defaultDifficulty);
  const botHands = new Map();
  const matchDifficulties = new Map();
  const submittedStateFingerprints = new Map();
  let session = null;
  let operationQueue = Promise.resolve();

  // Wallet/prover calls are serialized so two browser polls cannot submit the
  // same turn twice while the first proof is still being generated.
  function serializeOperation(operation) {
    const result = operationQueue.then(operation, operation);
    operationQueue = result.catch(() => undefined);
    return result;
  }

  // Memoize the *promise*, not the resolved session: a public-network sync
  // takes minutes, and two requests arriving during it must share one
  // wallet instead of each opening (and syncing) their own.
  let sessionPromise = null;
  async function ensureSession() {
    if (session) return session;
    if (!sessionPromise) {
      sessionPromise = openSession({ player: 'p2' })
        .then((opened) => { session = opened; return opened; })
        .catch((error) => { sessionPromise = null; throw error; });
    }
    return sessionPromise;
  }

  function privateSeedForMatch(matchId, match) {
    if (session?.variant !== 'state-only') return null;
    if (!match.seedCommitment || !session.api.verifySeedCommitment(matchId, match.seedCommitment)) {
      throw new Error('The privately exchanged seed does not match the public seed commitment. Do not play this match.');
    }
    return session.api.getPrivateDealSeed(matchId);
  }

  async function join(body) {
    const request = validateJoinBody(body, validatedDefaultDifficulty);
    return serializeOperation(async () => {
      if (request.contractAddress) {
        const connectedContractAddress = typeof session?.api.address === 'string'
          ? session.api.address.replace(/^0x/i, '').toLowerCase()
          : null;
        if (session && connectedContractAddress !== request.contractAddress) {
          throw new HttpError(
            409,
            'The bot wallet is already connected to another contract. Restart the bot, then retry this join.',
          );
        }
        const networkId = session?.networkId || process.env.POB_NETWORK_ID || 'undeployed';
        const variant = session?.variant || process.env.POB_CONTRACT_VARIANT || 'wagered';
        state.setContractAddress(networkId, request.contractAddress, variant);
      }

      const activeSession = await ensureSession();
      if (activeSession.variant === 'state-only' && request.wagerAmount !== 0) {
        throw new HttpError(400, 'State-only matches never take a wager; send wagerAmount: 0.');
      }
      const existingMatch = await activeSession.api.getMatch(request.matchId);
      const phase = requireCompactInteger(existingMatch, 'phase');
      if (phase !== 0) {
        const p2Entropy = state.getEntropy(request.matchId, 'p2');
        if (!p2Entropy || state.getEntropy(request.matchId, 'p1') !== request.p1Entropy) {
          throw new HttpError(409, 'The computer cannot recover this match from its stored state. No join was submitted.');
        }
        return {
          matchId: request.matchId,
          p2Entropy,
          txId: null,
          contractAddress: activeSession.api.address,
          status: 'already-joined',
        };
      }
      activeSession.api.importEntropy(request.matchId, 'p1', request.p1Entropy);
      const result = await activeSession.api.joinMatch({
        matchId: request.matchId,
        wagerAmount: request.wagerAmount,
      });
      state.setActiveMatch(request.matchId, activeSession.variant);
      matchDifficulties.set(request.matchId, request.difficulty);

      return {
        matchId: request.matchId,
        p2Entropy: result.entropy,
        txId: result.txId,
        contractAddress: activeSession.api.address,
        status: 'joined',
      };
    });
  }

  async function getPublicMatch(matchId) {
    const activeSession = await ensureSession();
    const match = await activeSession.api.getMatch(matchId);
    if (!match || typeof match !== 'object') {
      throw new Error('getMatch returned no MatchState. Verify the match ID and wait for indexer sync.');
    }
    return match;
  }

  async function advance(body) {
    const { matchId } = validateAdvanceBody(body);
    return serializeOperation(async () => {
      const activeSession = await ensureSession();
      const match = await activeSession.api.getMatch(matchId);
      if (!match || typeof match !== 'object') {
        throw new Error('getMatch returned no MatchState. Verify the match ID and wait for indexer sync.');
      }

      const selectedAction = selectBotAction(match);
      const actionable = selectedAction === 'play'
        || selectedAction === 'respond-to-p1'
        || selectedAction === 'resolve-p2-play';
      const stateFingerprint = JSON.stringify(normalizeCompactValue({
        selectedAction,
        phase: match.phase,
        activePlayerIdx: match.activePlayerIdx,
        lastActionAt: match.lastActionAt,
        lastPlayCommit: match.lastPlayCommit,
        lastPlayerIdx: match.lastPlayerIdx,
        isChallenged: match.isChallenged,
      }));
      if (actionable && submittedStateFingerprints.get(matchId) === stateFingerprint) {
        return noOp(
          'A P2 transaction was already submitted for this exact state; waiting for indexer sync.',
          match,
        );
      }

      const provable = activeSession.variant === 'state-only';
      if (provable) privateSeedForMatch(matchId, match); // verifies the seed commitment or throws

      if (selectedAction === 'play') {
        const handState = provable
          ? await provableBotHand(activeSession.api, matchId, match)
          : reconcileBotHand(matchId, match, botHands, privateSeedForMatch(matchId, match));
        const currentRank = requireCompactInteger(match, 'currentRank');
        const requiredRank = RANKS[currentRank];
        if (!requiredRank) throw new Error(`Match currentRank ${currentRank} is outside the supported 0-12 range.`);
        if (handState.hand.length === 0) {
          throw new Error('P2 has no reconstructed cards but the contract requested a play. Inspect the match state.');
        }

        const difficulty = matchDifficulties.get(matchId) || validatedDefaultDifficulty;
        const decision = decidePlay({
          aiHand: handState.hand,
          requiredRank,
          difficulty,
          mode: 'home',
        });
        if (!Array.isArray(decision.cardsToPlay) || decision.cardsToPlay.length < 1
          || decision.cardsToPlay.length > 4) {
          throw new Error('Scripted AI returned an invalid play count; no transaction was submitted.');
        }
        const knownIds = new Set(handState.hand.map((card) => card.id));
        if (decision.cardsToPlay.some((card) => !knownIds.has(card.id))) {
          throw new Error('Scripted AI selected a card outside P2\'s reconstructed hand; no transaction was submitted.');
        }

        const result = await activeSession.api.playCards({
          matchId,
          cards: decision.cardsToPlay.map((card) => card.rankIndex),
          claimedRank: currentRank,
          claimedCount: decision.cardsToPlay.length,
          role: 'p2',
        });
        if (!provable) {
          removePlayedCards(handState, decision.cardsToPlay);
          handState.pendingSize = {
            before: requireCompactInteger(match, 'p2HandSize'),
            after: handState.hand.length,
          };
        }
        submittedStateFingerprints.set(matchId, stateFingerprint);
        return {
          status: 'acted',
          action: 'play',
          claimedRank: requiredRank,
          claimedCount: decision.cardsToPlay.length,
          dialogue: decision.dialogue,
          txId: result.txId,
        };
      }

      if (selectedAction === 'respond-to-p1') {
        const handState = provable
          ? await provableBotHand(activeSession.api, matchId, match)
          : reconcileBotHand(matchId, match, botHands, privateSeedForMatch(matchId, match));
        const claimedRankIndex = requireCompactInteger(match, 'lastClaimRank');
        const playerClaimedRank = RANKS[claimedRankIndex];
        if (!playerClaimedRank) {
          throw new Error(`Match lastClaimRank ${claimedRankIndex} is outside the supported 0-12 range.`);
        }
        const playerClaimedCount = requireCompactInteger(match, 'lastClaimCount');
        if (playerClaimedCount < 1 || playerClaimedCount > 4) {
          throw new Error(`Match lastClaimCount ${playerClaimedCount} is outside the supported 1-4 range.`);
        }
        const decision = decideChallenge({
          playerClaimedRank,
          playerClaimedCount,
          aiHand: handState.hand,
          difficulty: matchDifficulties.get(matchId) || validatedDefaultDifficulty,
          mode: 'home',
        });
        const result = decision.shouldChallenge
          ? await activeSession.api.challengeClaim({ matchId })
          : await activeSession.api.acceptClaim({ matchId });
        submittedStateFingerprints.set(matchId, stateFingerprint);
        return {
          status: 'acted',
          action: decision.shouldChallenge ? 'challenge' : 'accept',
          dialogue: decision.dialogue,
          txId: result.txId,
        };
      }

      if (selectedAction === 'resolve-p2-play') {
        const result = await activeSession.api.resolveChallenge({ matchId });
        submittedStateFingerprints.set(matchId, stateFingerprint);
        return {
          status: 'acted',
          action: 'resolve',
          claimWasTrue: result.honest,
          dialogue: getChallengeReaction({ aiWasChallenger: false, claimWasTrue: result.honest }),
          txId: result.txId,
        };
      }

      const waitingReasons = {
        'await-p1-play': 'Waiting for Player One to play.',
        'await-p1-response': 'Waiting for Player One to accept or challenge P2\'s claim.',
        'await-p1-resolution': 'Waiting for Player One to resolve the challenged P1 claim.',
        'await-phase-0': 'Waiting for Player Two to join the created match.',
        'await-phase-1': 'Waiting for Player One to reveal the combined seed.',
        'await-phase-4': 'The match is complete; no bot action is required.',
        'await-phase-5': 'The match was cancelled; no bot action is required.',
      };
      return noOp(waitingReasons[selectedAction] || `No P2 action is defined for ${selectedAction}.`, match);
    });
  }

  async function status(matchIdValue) {
    const matchId = validateHex32(matchIdValue, 'matchId');
    return serializeOperation(async () => {
      const match = await getPublicMatch(matchId);
      let handReady = false;
      let readinessReason = 'The seed is not finalized yet.';
      if (match.seedFinalized === true) {
        try {
          const activeSession = await ensureSession();
          if (activeSession.variant === 'state-only') await provableBotHand(activeSession.api, matchId, match);
          else reconcileBotHand(matchId, match, botHands, privateSeedForMatch(matchId, match));
          handReady = true;
          readinessReason = 'The computer wallet session and committed hand are ready.';
        } catch (error) {
          readinessReason = error.message;
        }
      }
      return {
        status: 'ok',
        match: normalizeCompactValue(match),
        bot: {
          ready: Boolean(session) && handReady,
          walletSessionOpen: Boolean(session),
          handReady,
          reason: readinessReason,
        },
      };
    });
  }

  async function shutdown() {
    const sessionToClose = session;
    session = null;
    sessionPromise = null;
    if (sessionToClose) await sessionToClose.walletHandle.shutdown();
  }

  // ── Sponsored play ──
  // The sponsor shares the bot's synced wallet (same DUST tank). Game
  // tickets gate who may draw on it; the sponsor's own policy gates what.
  const tickets = createTicketStore({ file: state.ticketsFile() });
  let sponsorInstance = null;
  async function ensureSponsor() {
    const activeSession = await ensureSession();
    if (!sponsorInstance) {
      const contractAddress = state.getContractAddress(activeSession.networkId, activeSession.variant);
      if (!contractAddress) throw new HttpError(503, 'No published table is configured; sponsorship is unavailable.');
      // Keep enough DUST for the bot's own moves. Configurable; default is a
      // conservative slice of what one bot transaction has cost on Preview.
      const reserveDust = BigInt(process.env.POB_SPONSOR_RESERVE_DUST || '50000000000000');
      sponsorInstance = createSponsor({
        walletCtx: activeSession.walletHandle.ctx,
        networkId: activeSession.networkId,
        contractAddress,
        reserveDust,
      });
    }
    return sponsorInstance;
  }

  function ticketInfo(code) {
    return { status: 'ok', ticket: tickets.inspect(code) };
  }

  async function sponsorStatus() {
    try {
      const sponsor = await ensureSponsor();
      return { status: 'ok', sponsor: await sponsor.status() };
    } catch (error) {
      return { status: 'ok', sponsor: { enabled: false, reason: safeErrorMessage(error) } };
    }
  }

  /**
   * Pay DUST for one player transaction. Order matters: validate the ticket
   * first (cheap, no wallet), then the transaction policy, and only consume
   * the allowance once the transaction has actually been submitted.
   */
  async function sponsorSubmit(body, clientKey) {
    assertPlainObject(body, 'Sponsor request');
    rejectUnknownFields(body, ['code', 'txHex', 'matchId', 'sessionKey'], 'Sponsor request');
    const { code, txHex, matchId = null, sessionKey = null } = body;
    const boundMatch = matchId == null ? null : validateHex32(matchId, 'matchId');
    const boundSession = sessionKey == null ? null : validateHex32(sessionKey, 'sessionKey');
    const info = tickets.inspect(code);
    if (!info.valid) {
      throw new HttpError(403, info.expired ? 'This game code has expired.' : info.revoked ? 'This game code has been revoked.' : 'This game code has used up its allowance.');
    }
    if (info.matchId && boundMatch && info.matchId !== boundMatch) {
      throw new HttpError(403, 'This game code is tied to a different match.');
    }
    const sponsor = await ensureSponsor();
    const result = await sponsor.sponsor({ txHex, clientKey });
    const consumed = tickets.consume(code, { matchId: boundMatch, sessionKey: boundSession });
    return { status: 'ok', ...result, ticket: { remaining: consumed.remaining } };
  }

  /**
   * Warm the wallet at boot instead of on the first player request, so the
   * multi-minute public-network sync is paid by the operator, not a player.
   * Readiness is reported on /health so the UI can say "table is opening"
   * honestly instead of freezing on a button.
   */
  const bootedAt = Date.now();
  function warmUp() {
    ensureSession().then(() => ensureSponsor()).catch((error) => {
      console.error(`Warm-up failed (will retry on first request): ${safeErrorMessage(error)}`);
    });
  }
  function readiness() {
    return {
      walletReady: Boolean(session),
      sponsorReady: Boolean(sponsorInstance),
      syncing: !session && Boolean(sessionPromise),
      uptimeSeconds: Math.round((Date.now() - bootedAt) / 1000),
    };
  }

  return { join, advance, status, shutdown, ticketInfo, sponsorStatus, sponsorSubmit, warmUp, readiness };
}

export function createBotServer({ defaultDifficulty = 'medium' } = {}) {
  const bot = createTestWiredBot({ defaultDifficulty });
  const allowedOrigins = allowedOriginsFromEnvironment();

  const server = http.createServer(async (request, response) => {
    try {
      applyCors(request, response, allowedOrigins);
      if (request.method === 'OPTIONS') {
        response.writeHead(204);
        response.end();
        return;
      }

      const requestUrl = new URL(request.url, `http://${LOOPBACK_HOST}`);
      if (request.method === 'GET' && requestUrl.pathname === '/health') {
        sendJson(response, 200, { status: 'ok', service: 'proof-or-bluff-testwired-bot', ...bot.readiness() });
        return;
      }
      if (request.method === 'POST' && requestUrl.pathname === '/api/testwired/join') {
        sendJson(response, 200, await bot.join(await readJsonBody(request)));
        return;
      }
      if (request.method === 'POST' && requestUrl.pathname === '/api/testwired/advance') {
        sendJson(response, 200, await bot.advance(await readJsonBody(request)));
        return;
      }
      if (request.method === 'GET' && requestUrl.pathname === '/api/testwired/status') {
        const unexpectedQueryKeys = [...requestUrl.searchParams.keys()].filter((key) => key !== 'matchId');
        if (unexpectedQueryKeys.length > 0) {
          throw new HttpError(400, `Unsupported query parameter(s): ${unexpectedQueryKeys.join(', ')}.`);
        }
        sendJson(response, 200, await bot.status(requestUrl.searchParams.get('matchId')));
        return;
      }
      // Sponsored play: ticket inspection, sponsor health, and fee payment.
      if (request.method === 'GET' && requestUrl.pathname === '/api/ticket') {
        sendJson(response, 200, bot.ticketInfo(requestUrl.searchParams.get('code')));
        return;
      }
      if (request.method === 'GET' && requestUrl.pathname === '/api/sponsor/status') {
        sendJson(response, 200, await bot.sponsorStatus());
        return;
      }
      if (request.method === 'POST' && requestUrl.pathname === '/api/sponsor/submit') {
        const clientKey = request.socket.remoteAddress || 'unknown';
        const body = await readJsonBody(request, SPONSOR_LIMITS.maxBodyBytes);
        sendJson(response, 200, await bot.sponsorSubmit(body, clientKey));
        return;
      }
      throw new HttpError(404, 'Route not found. Use GET /health or an /api/testwired endpoint.');
    } catch (error) {
      const statusCode = (error instanceof HttpError || error instanceof SponsorError || error instanceof TicketError)
        ? error.statusCode
        : 500;
      const nextStep = statusCode >= 500
        ? 'Check that the local Midnight stack, contract address, and POB_SEED_P2 are available, then retry.'
        : 'Correct the request using the endpoint contract, then retry.';
      sendJson(response, statusCode, { status: 'error', error: safeErrorMessage(error), nextStep });
      if (process.env.POB_VERBOSE && statusCode >= 500 && !process.env.BLOCKFROST_PROJECT_ID) console.error(error);
    }
  });

  return { server, bot };
}

async function main() {
  const flags = parseServerFlags(process.argv);
  const { server, bot } = createBotServer({ defaultDifficulty: flags.difficulty });
  let shutdownStarted = false;

  const shutdown = async (signal) => {
    if (shutdownStarted) return;
    shutdownStarted = true;
    console.log(`\n${signal} received; closing TestWired bot and P2 wallet...`);
    await new Promise((resolve) => server.close(resolve));
    await bot.shutdown();
    console.log('TestWired bot stopped cleanly.');
  };

  process.once('SIGINT', () => shutdown('SIGINT').catch(handleFatalError));
  process.once('SIGTERM', () => shutdown('SIGTERM').catch(handleFatalError));
  // A listener prevents Node from printing an unconditional stack trace for
  // bind failures such as EADDRINUSE; verbose mode still exposes diagnostics.
  server.once('error', handleFatalError);
  server.listen(flags.port, LOOPBACK_HOST, () => {
    console.log(`TestWired Player Two bot listening on http://${LOOPBACK_HOST}:${flags.port}`);
    if (process.env.POB_BOT_WARMUP !== '0') {
      console.log('Warming up the P2 wallet and sponsor now (players will not wait for this sync).');
      bot.warmUp();
    }
  });
}

function handleFatalError(error) {
  console.error(`TestWired bot failed: ${safeErrorMessage(error)}`);
  console.error('Next step: verify the port, P2 seed, persisted contract address, and local stack, then restart.');
  if (process.env.POB_VERBOSE && !process.env.BLOCKFROST_PROJECT_ID) console.error(error);
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch(handleFatalError);
}
