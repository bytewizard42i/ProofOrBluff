import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import {
  connectWallet,
  isWalletAvailable,
  subscribeWalletState,
} from './midnight/wallet.js';
import RealDealGameProvider from './providers/realdeal/gameProvider.js';
import { getContractAddress, CONTRACT_VARIANT, NETWORK_ID } from './midnight/config.js';
import { dealFromSeed, RANKS } from '../../shared/dealing.js';
import ProofServerChoice from './ProofServerChoice.jsx';
import MidnightActivityPanel, { probeMidnightHealth } from './activity/MidnightActivityPanel.jsx';
import {
  failOperation,
  finishOperation,
  getState as getActivityState,
  isOperationInFlight,
  setStage,
  startOperation,
  subscribe as subscribeActivity,
} from './activity/activityStore.js';
import DiagnosticsButton from './diagnostics/DiagnosticsButton.jsx';
import { buildDiagnosticReport } from './diagnostics/diagnosticReport.js';
import SiteLinks from './SiteLinks.jsx';
import ContractAddressControl from './ContractAddressControl.jsx';
import { optionalTransactionId } from './midnight/transactionId.js';
import GuidedGameSetup from './GuidedGameSetup.jsx';
import { completeMatchSetup } from './midnight/matchSetup.js';
import { getStoredEntropy } from './midnight/contract.js';
import { ENDPOINTS } from './midnight/config.js';
import { normalizeCoinPublicKeyHex } from './midnight/coinPublicKey.js';

// Public-network builds get a loud badge so nobody mistakes a Preview match
// for a local-chain test (or, later, for mainnet). Local stays quiet.
const NETWORK_BADGES = Object.freeze({
  undeployed: { text: 'LOCAL CHAIN', tone: 'local' },
  preview: { text: 'PREVIEW TESTNET · NO REAL MONEY', tone: 'testnet' },
  preprod: { text: 'PREPROD TESTNET · NO REAL MONEY', tone: 'testnet' },
  mainnet: { text: 'MIDNIGHT MAINNET · NO WAGERS', tone: 'mainnet' },
});

/**
 * Builds the sanitized "Copy diagnostic report" payload. Called on click, not
 * on render. Runs a fresh health probe so the report says what the services
 * looked like at the moment the player asked for help, not minutes earlier.
 * Everything passes through the redaction layer in diagnostics/; only the
 * first 12 characters of the wallet address survive.
 */
async function buildTestWiredDiagnosticReport({ wallet, error }) {
  const health = await probeMidnightHealth((...args) => window.fetch(...args));
  const activity = getActivityState();
  return buildDiagnosticReport({
    networkId: NETWORK_ID,
    contractVariant: CONTRACT_VARIANT,
    contractAddress: getContractAddress(),
    endpoints: ENDPOINTS,
    activityHistory: [...(activity.history || []), ...(activity.current ? [activity.current] : [])],
    walletSummary: {
      connected: Boolean(wallet),
      networkLabel: wallet?.networkId || NETWORK_ID,
      address: wallet?.address || null,
    },
    healthSnapshot: {
      proofServer: { reachable: health.proofServer.status === 'reachable' },
      indexer: { reachable: health.indexer.status === 'reachable', blockHeight: health.indexer.blockHeight },
    },
    errors: error ? [error] : [],
    userAgent: navigator.userAgent,
  });
}

const NETWORK_LABELS = Object.freeze({
  undeployed: 'local chain',
  preview: 'Preview testnet',
  preprod: 'Preprod testnet',
});

const BOT_URL = (import.meta.env.VITE_TESTWIRED_BOT_URL || 'http://127.0.0.1:3017')
  .replace(/\/$/, '');
const STANDARD_MODE = 1;
const AUTOMATIC_POLL_MS = 10_000;
const HAND_STORAGE_PREFIX = 'pob:testwired:p1-hand:';

const PHASE_NAMES = Object.freeze([
  'Waiting for Player Two',
  'Waiting for entropy reveal',
  'Playing',
  'Awaiting response',
  'Game over',
]);

const SUIT_LABELS = Object.freeze({
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
  spades: 'Spades',
});

function firstDefined(object, names) {
  for (const name of names) {
    if (object?.[name] !== undefined && object[name] !== null) return object[name];
  }
  return null;
}

function parseSafeInteger(value, label, { minimum = 0, maximum = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === null || value === undefined || typeof value === 'boolean') {
    throw new Error(`${label} was missing or was not an integer.`);
  }
  if (typeof value === 'string' && !/^\d+$/.test(value)) {
    throw new Error(`${label} must be written as a whole nonnegative number.`);
  }
  const number = typeof value === 'bigint' ? Number(value) : Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new Error(`${label} must be a safe integer from ${minimum} through ${maximum}.`);
  }
  return number;
}

/** IDs and entropy are contract Bytes<32>, represented at this boundary as hex. */
function requireHex64(value, label) {
  let candidate = value;
  if (value instanceof Uint8Array) {
    candidate = Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  if (typeof candidate !== 'string') {
    throw new Error(`${label} was missing or was not a hexadecimal string.`);
  }
  const clean = candidate.startsWith('0x') ? candidate.slice(2) : candidate;
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error(`${label} must contain exactly 64 hexadecimal characters.`);
  }
  return clean.toLowerCase();
}

function shorten(value, head = 8, tail = 6) {
  if (!value) return 'not available';
  return value.length > head + tail + 3
    ? `${value.slice(0, head)}…${value.slice(-tail)}`
    : value;
}

function phaseNumber(value) {
  if (typeof value === 'string' && !/^\d+$/.test(value)) {
    const normalized = value.trim().toUpperCase().replaceAll(' ', '_');
    const index = [
      'WAITING_FOR_PLAYER_TWO',
      'WAITING_FOR_ENTROPY_REVEAL',
      'PLAYING',
      'AWAITING_RESPONSE',
      'GAMEOVER',
    ].indexOf(normalized);
    if (index >= 0) return index;
  }
  return parseSafeInteger(value, 'Match phase', { maximum: 4 });
}

/**
 * The bot endpoint is deliberately the normalization boundary. Still validate
 * every field used for rendering or deciding which wallet circuit may run: a
 * malformed localhost response must never turn into an unintended transaction.
 */
function normalizeMatchResponse(payload, expectedMatchId) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Bot returned no JSON match object. Start or update the TestWired bot.');
  }
  const source = payload.match && typeof payload.match === 'object'
    ? payload.match
    : payload;
  const responseMatchId = firstDefined(source, ['matchId', 'id']);
  if (responseMatchId != null) {
    const normalizedId = requireHex64(responseMatchId, 'Bot match ID');
    if (expectedMatchId && normalizedId !== expectedMatchId) {
      throw new Error('Bot returned status for a different match ID. Restart the bot for this match.');
    }
  }

  const phase = phaseNumber(firstDefined(source, ['phase', 'matchPhase']));
  const currentRank = parseSafeInteger(
    firstDefined(source, ['currentRank', 'requiredRank']),
    'Required rank',
    { maximum: RANKS.length - 1 },
  );
  const activePlayerIdx = parseSafeInteger(
    firstDefined(source, ['activePlayerIdx', 'activePlayer', 'turn']),
    'Active player',
    { maximum: 1 },
  );
  const winner = parseSafeInteger(firstDefined(source, ['winner']), 'Winner', { maximum: 2 });

  const seedFinalized = Boolean(firstDefined(source, ['seedFinalized']));
  const combinedSeedValue = firstDefined(source, ['combinedSeed', 'combinedSeedHex']);
  const combinedSeed = !seedFinalized || combinedSeedValue == null
    ? null
    : requireHex64(combinedSeedValue, 'Combined seed');
  const publishedCommitment = firstDefined(source, ['seedCommitment']);
  const seedCommitment = seedFinalized && publishedCommitment
    ? requireHex64(publishedCommitment, 'Seed commitment') : null;

  return {
    matchId: expectedMatchId || (responseMatchId ? requireHex64(responseMatchId, 'Bot match ID') : null),
    phase,
    currentRank,
    activePlayerIdx,
    p1Score: parseSafeInteger(firstDefined(source, ['p1Score', 'playerOneScore']), 'P1 score'),
    p2Score: parseSafeInteger(firstDefined(source, ['p2Score', 'playerTwoScore']), 'P2 score'),
    p1HandSize: parseSafeInteger(firstDefined(source, ['p1HandSize', 'playerOneHandSize']), 'P1 hand size'),
    p2HandSize: parseSafeInteger(firstDefined(source, ['p2HandSize', 'playerTwoHandSize']), 'P2 hand size'),
    pileSize: parseSafeInteger(firstDefined(source, ['pileSize', 'pile']), 'Pile size'),
    winner,
    seedFinalized,
    combinedSeed,
    seedCommitment,
    // Provably fair edition public fields. Absent on the wagered contract.
    mode: parseSafeInteger(firstDefined(source, ['mode']) ?? STANDARD_MODE, 'Game mode', { maximum: 4 }),
    round: parseSafeInteger(firstDefined(source, ['round']) ?? 0, 'Round'),
    p1HandDrawn: Boolean(firstDefined(source, ['p1HandDrawn'])),
    p2HandDrawn: Boolean(firstDefined(source, ['p2HandDrawn'])),
    hasPendingPlay: Boolean(firstDefined(source, ['hasPendingPlay', 'pendingPlay'])),
    isChallenged: Boolean(firstDefined(source, ['isChallenged', 'challenged'])),
    lastPlayerIdx: parseSafeInteger(
      firstDefined(source, ['lastPlayerIdx', 'lastPlayer']),
      'Last player',
      { maximum: 1 },
    ),
    lastClaimRank: parseSafeInteger(
      firstDefined(source, ['lastClaimRank', 'claimedRank']) ?? 0,
      'Last claim rank',
      { maximum: RANKS.length - 1 },
    ),
    lastClaimCount: parseSafeInteger(
      firstDefined(source, ['lastClaimCount', 'claimedCount']) ?? 0,
      'Last claim count',
      { maximum: 4 },
    ),
    escrowReleased: Boolean(firstDefined(source, ['escrowReleased'])),
  };
}

function readStoredHand(matchId) {
  try {
    const raw = window.localStorage.getItem(`${HAND_STORAGE_PREFIX}${matchId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.handIds) || !Number.isSafeInteger(parsed.drawIndex)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistHand(matchId, handState) {
  try {
    window.localStorage.setItem(`${HAND_STORAGE_PREFIX}${matchId}`, JSON.stringify(handState));
  } catch {
    // Private browsing and storage quotas must not make on-chain play fail.
  }
}

function removeP1Cards(matchId, combinedSeed, cards, removedIds) {
  const stored = readStoredHand(matchId);
  const remainingIds = new Set(removedIds);
  const handIds = (stored?.handIds || cards.map((card) => card.id))
    .filter((id) => !remainingIds.has(id));
  const next = {
    combinedSeed,
    handIds,
    drawIndex: stored?.combinedSeed === combinedSeed ? stored.drawIndex : 0,
    // Indexer reads can briefly report the pre-play size after makePlay returns.
    // Keep that stale public value from inventing replacement draw cards.
    pendingSize: { before: cards.length, after: handIds.length },
  };
  persistHand(matchId, next);
  return cards.filter((card) => !remainingIds.has(card.id));
}

/**
 * Rebuild only P1's private view. The P2 deal is intentionally never returned,
 * placed in React state, logged, or rendered by this browser component.
 */
function reconcileP1Hand(matchId, combinedSeed, publicHandSize, removedIds = []) {
  const { p1Hand, drawPile } = dealFromSeed(combinedSeed, STANDARD_MODE);
  const cardById = new Map([...p1Hand, ...drawPile].map((card) => [card.id, card]));
  const stored = readStoredHand(matchId);
  const canReuseStored = stored?.combinedSeed === combinedSeed;
  let handIds = canReuseStored
    ? stored.handIds.filter((id) => cardById.has(id))
    : p1Hand.map((card) => card.id);
  let drawIndex = canReuseStored ? stored.drawIndex : 0;
  const explicitlyRemoved = new Set(removedIds);
  handIds = handIds.filter((id) => !explicitlyRemoved.has(id));

  const pendingSize = canReuseStored ? stored.pendingSize : null;
  if (pendingSize
    && pendingSize.before === publicHandSize
    && pendingSize.after === handIds.length) {
    persistHand(matchId, { combinedSeed, handIds, drawIndex, pendingSize });
    return handIds.map((id) => cardById.get(id));
  }

  // A public decrease normally follows P1's own play, whose exact IDs were
  // removed above. On reload there is no way to infer historical private cards,
  // so deterministic tail trimming is the honest, stable fallback.
  if (handIds.length > publicHandSize) handIds = handIds.slice(0, publicHandSize);

  // Challenge penalties increase hand size. Consume the deterministic draw pile
  // in order, skipping anything already present, so card IDs remain unique.
  const seen = new Set(handIds);
  while (handIds.length < publicHandSize && drawIndex < drawPile.length) {
    const candidate = drawPile[drawIndex];
    drawIndex += 1;
    if (!seen.has(candidate.id)) {
      seen.add(candidate.id);
      handIds.push(candidate.id);
    }
  }
  if (handIds.length !== publicHandSize) {
    throw new Error(
      `Cannot reconcile ${publicHandSize} P1 cards from the deterministic STANDARD deck. Refresh bot status.`,
    );
  }

  const next = { combinedSeed, handIds, drawIndex };
  persistHand(matchId, next);
  return handIds.map((id) => cardById.get(id));
}

/**
 * Provably fair edition: P1's hand is exactly what the contract has committed
 * to, derived from this browser's private salt and the shared seed. Card IDs
 * are positional so React keys stay stable within a round.
 */
function provableP1Hand(api, match) {
  const { ranks } = api.getProvableHand({ matchId: match.matchId, role: 'p1', match });
  return ranks.map((rankIndex, position) => ({
    id: `p1:r${match.round}:${position}:${RANKS[rankIndex]}`,
    rankIndex,
    rank: RANKS[rankIndex],
    suit: 'hidden',
  }));
}

function botHasAction(match) {
  return (match.phase === 2 && match.activePlayerIdx === 1)
    || (match.phase === 3 && match.lastPlayerIdx === 0 && !match.isChallenged)
    || (match.phase === 3 && match.lastPlayerIdx === 1 && match.isChallenged);
}

function formatError(error) {
  if (error?.name === 'AbortError') return null;
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return `Cannot reach the TestWired bot at ${BOT_URL}. Start it on port 3017, then retry.`;
  }
  return error?.message || String(error);
}

/**
 * WHAT: Reports one on-chain SDK call to the Midnight activity store so the
 * MidnightActivityPanel can show the player what is happening.
 *
 * WHY the stages are coarse: a provider call such as makePlay() runs proving,
 * wallet signing, submission and indexer confirmation inside one promise, and
 * the SDK gives us no per-stage callback. Being honest means we report only
 * what we can observe: we enter `proving` right before the call (with a
 * message explaining the call also signs and submits), then `confirmed` when
 * the promise resolves (with the public tx id if one came back), or `failed`
 * if it throws. We never invent `awaiting-signature` because we cannot see it.
 *
 * PRIVACY: only the label, a fixed message and the public tx id reach the
 * store. The result object itself (which may hold entropy) is never passed.
 */
async function trackOnChainOperation(label, performCall, {
  stage = 'proving',
  message = 'Proving, signing and submitting via your wallet',
} = {}) {
  const operationId = startOperation(label);
  try {
    setStage(operationId, stage, { message });
    const result = await performCall();
    const publicTransactionId = result?.txId ?? result?.txHash ?? result?.transactionId;
    finishOperation(operationId, {
      txId: typeof publicTransactionId === 'string' ? publicTransactionId : undefined,
    });
    return result;
  } catch (caught) {
    failOperation(operationId, formatError(caught) || 'Cancelled before completion.');
    throw caught;
  }
}

/** Lets React re-render when the activity store's in-flight flag changes. */
function useActivityInFlight() {
  return useSyncExternalStore(subscribeActivity, isOperationInFlight, isOperationInFlight);
}

export default function TestWiredPanel() {
  // Duplicate-submit guard: while any on-chain operation is in flight, every
  // on-chain button is disabled even if `busy` were somehow cleared early.
  const activityInFlight = useActivityInFlight();
  const [walletAvailable, setWalletAvailable] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [balances, setBalances] = useState({});
  const [botHealth, setBotHealth] = useState('checking');
  const [wagerInput, setWagerInput] = useState(CONTRACT_VARIANT === 'state-only' ? '0' : '5');
  const [difficulty, setDifficulty] = useState('medium');
  const [setupStep, setSetupStep] = useState('prepare');
  const [hasSavedMatch, setHasSavedMatch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState('');
  const [error, setError] = useState(null);
  const [matchId, setMatchId] = useState(null);
  const [match, setMatch] = useState(null);
  const [lastTransactionId, setLastTransactionId] = useState(null);
  const [lastBotAction, setLastBotAction] = useState('');
  const [dialogue, setDialogue] = useState('');
  const [progress, setProgress] = useState([]);
  const [hand, setHand] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const providerRef = useRef(null);
  const mountedRef = useRef(false);
  const requestControllersRef = useRef(new Set());
  const progressSequenceRef = useRef(0);

  const addProgress = useCallback((message) => {
    if (!mountedRef.current) return;
    progressSequenceRef.current += 1;
    const entry = { id: progressSequenceRef.current, message };
    setProgress((current) => [...current.slice(-39), entry]);
  }, []);

  const fetchBot = useCallback(async (path, options = {}) => {
    const controller = new AbortController();
    requestControllersRef.current.add(controller);
    try {
      const response = await fetch(`${BOT_URL}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...options.headers,
        },
      });
      const text = await response.text();
      let data = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Bot ${path} returned non-JSON data (HTTP ${response.status}).`);
        }
      }
      if (!response.ok) {
        const detail = data?.error || data?.message || text || response.statusText;
        throw new Error(`Bot ${path} failed (HTTP ${response.status}): ${detail}`);
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error(`Bot ${path} returned an invalid JSON response.`);
      }
      return data;
    } finally {
      requestControllersRef.current.delete(controller);
    }
  }, []);

  const applyMatch = useCallback((nextMatch) => {
    if (!mountedRef.current) return;
    // The state-only contract publishes a hash of the deal seed, never the
    // seed itself. Rebuild it from the entropies privately exchanged with P2,
    // and verify it against the public commitment before showing any cards.
    if (CONTRACT_VARIANT === 'state-only' && nextMatch.seedFinalized && !nextMatch.seedCommitment) {
      throw new Error('Indexer returned no seed commitment. Wait for the state-only contract to sync.');
    }
    const combinedSeed = CONTRACT_VARIANT === 'state-only' && nextMatch.seedFinalized
      ? requireHex64(
        providerRef.current?.api?.getPrivateDealSeed(nextMatch.matchId, nextMatch.seedCommitment),
        'Private deal seed',
      )
      : nextMatch.combinedSeed;
    const currentMatch = { ...nextMatch, combinedSeed };
    setMatch(currentMatch);
    if (combinedSeed) {
      const nextHand = CONTRACT_VARIANT === 'state-only'
        ? provableP1Hand(providerRef.current.api, nextMatch)
        : reconcileP1Hand(
          nextMatch.matchId,
          combinedSeed,
          nextMatch.p1HandSize,
        );
      setHand(nextHand);
      const availableIds = new Set(nextHand.map((card) => card.id));
      setSelectedIds((current) => new Set([...current].filter((id) => availableIds.has(id))));
    }
  }, []);

  const refreshStatus = useCallback(async ({ quiet = false } = {}) => {
    if (!matchId) return null;
    if (!quiet) addProgress('Requesting normalized public match status from the bot.');
    const data = await fetchBot(`/api/testwired/status?matchId=${encodeURIComponent(matchId)}`);
    const normalized = normalizeMatchResponse(data, matchId);
    applyMatch(normalized);
    if (!quiet) addProgress(`Status refreshed: ${PHASE_NAMES[normalized.phase]}.`);
    return normalized;
  }, [addProgress, applyMatch, fetchBot, matchId]);

  const advanceBot = useCallback(async (activeMatchId = matchId) => {
    if (!activeMatchId) throw new Error('No active match is available for the bot.');
    addProgress('Asking the localhost P2 bot to advance its next required action.');
    const data = await fetchBot('/api/testwired/advance', {
      method: 'POST',
      body: JSON.stringify({ matchId: activeMatchId }),
    });
    const action = data.action == null ? '' : String(data.action);
    const nextDialogue = data.dialogue == null ? '' : String(data.dialogue);
    const botTransactionId = optionalTransactionId(data);
    if (mountedRef.current) {
      setLastBotAction(action);
      setDialogue(nextDialogue);
      if (botTransactionId) setLastTransactionId(botTransactionId);
    }
    if (data.match) applyMatch(normalizeMatchResponse(data, activeMatchId));
    addProgress(action ? `Bot action: ${action}.` : 'Bot reports no action is currently required.');
    return data;
  }, [addProgress, applyMatch, fetchBot, matchId]);

  const runLocked = useCallback(async (message, operation) => {
    if (busy) return;
    setError(null);
    setBusy(true);
    setBusyMessage(message);
    try {
      await operation();
    } catch (caught) {
      const formatted = formatError(caught);
      if (formatted && mountedRef.current) {
        setError(formatted);
        addProgress(`Stopped: ${formatted}`);
      }
    } finally {
      if (mountedRef.current) {
        setBusy(false);
        setBusyMessage('');
      }
    }
  }, [addProgress, busy]);

  useEffect(() => {
    mountedRef.current = true;
    isWalletAvailable()
      .then((available) => { if (mountedRef.current) setWalletAvailable(available); })
      .catch(() => { if (mountedRef.current) setWalletAvailable(false); });
    fetchBot('/health')
      .then(() => { if (mountedRef.current) setBotHealth('ready'); })
      .catch((caught) => {
        if (caught?.name !== 'AbortError' && mountedRef.current) setBotHealth('offline');
      });

    return () => {
      mountedRef.current = false;
      for (const controller of requestControllersRef.current) controller.abort();
      requestControllersRef.current.clear();
    };
  }, [fetchBot]);

  useEffect(() => {
    if (!wallet) return undefined;
    return subscribeWalletState(wallet, (next) => {
      if (!mountedRef.current) return;
      if (next?.balances) setBalances(next.balances);
      if (next?.error) setError(`Wallet balance refresh failed: ${formatError(next.error)}`);
    });
  }, [wallet]);

  // Poll only active matches, and schedule after the full interval so automatic
  // requests can never run faster than the required eight-second floor.
  useEffect(() => {
    if (!matchId || !match || match.phase === 4 || busy) return undefined;
    const timer = window.setTimeout(() => {
      (async () => {
        const refreshed = await refreshStatus({ quiet: true });
        if (!refreshed || !botHasAction(refreshed) || !mountedRef.current) return;
        setBusy(true);
        setBusyMessage(
          'The computer is proving its next move. Keep this page open; no wallet action is needed.',
        );
        try {
          await advanceBot(matchId);
        } finally {
          if (mountedRef.current) {
            setBusy(false);
            setBusyMessage('');
          }
        }
      })().catch((caught) => {
        const formatted = formatError(caught);
        if (formatted && mountedRef.current) {
          setError(formatted);
          setBusy(false);
          setBusyMessage('');
        }
      });
    }, AUTOMATIC_POLL_MS);
    return () => window.clearTimeout(timer);
  }, [advanceBot, busy, match, matchId, refreshStatus]);

  const connect = useCallback(() => runLocked('Waiting for Lace connection approval.', async () => {
    addProgress(`Requesting a Lace connection on ${NETWORK_LABELS[NETWORK_ID] || NETWORK_ID}.`);
    // Connecting is the one step where we genuinely know we are waiting on
    // Lace, so `connecting-wallet` is an honest stage here.
    const handle = await trackOnChainOperation('Connect Lace', () => connectWallet(), {
      stage: 'connecting-wallet',
      message: 'Approve the connection request in Lace',
    });
    if (!mountedRef.current) return;
    setWallet(handle);
    setBalances(handle.balances || {});
    // Exactly one provider belongs to this connected handle. Construction is
    // side-effect free: it does not locate or deploy a contract until Start.
    providerRef.current = new RealDealGameProvider({ walletHandle: handle });
    setHasSavedMatch(Boolean(providerRef.current.activeMatchId));
    setSetupStep('match');
    addProgress('Lace connected. No contract was deployed during connection.');
  }), [addProgress, runLocked]);

  const finishMatchSetup = useCallback(async (activeMatchId, wagerAmount) => {
    const provider = providerRef.current;
    const contractAddress = requireHex64(getContractAddress(), 'Configured game table');
    const p1Entropy = requireHex64(getStoredEntropy(activeMatchId, 'p1'), 'Saved match setup');
    setMatchId(activeMatchId);
    const readMatch = async () => {
      const raw = await provider.getGameState();
      const connectedKeyHex = normalizeCoinPublicKeyHex(wallet?.coinPublicKey);
      if (requireHex64(raw?.playerOne?.bytes, 'Player wallet') !== connectedKeyHex) {
        throw new Error('This match belongs to another wallet. Connect the Lace wallet that created it.');
      }
      return raw;
    };
    const completed = await completeMatchSetup({
      readMatch,
      hasOpponentEntropy: () => Boolean(getStoredEntropy(activeMatchId, 'p2')),
      joinBot: async () => {
        setBusyMessage('The computer is joining your saved match. Keep this page open.');
        addProgress('Asking the computer to join or recover its confirmed join.');
        const joined = await fetchBot('/api/testwired/join', {
          method: 'POST',
          body: JSON.stringify({ matchId: activeMatchId, wagerAmount, p1Entropy, contractAddress, difficulty }),
        });
        provider.importEntropy('p2', requireHex64(joined.p2Entropy, 'Computer setup response'));
        setLastTransactionId(optionalTransactionId(joined));
      },
      revealSeed: async () => {
        setBusyMessage('Finalizing the deal. Approve the game transaction in Lace when prompted.');
        const result = await trackOnChainOperation('Finalize deal', () => provider.revealSeed({ startingRank: 0 }));
        setLastTransactionId(optionalTransactionId(result));
      },
    });
    applyMatch(normalizeMatchResponse({ match: completed }, activeMatchId));
    await advanceBot(activeMatchId);
  }, [addProgress, advanceBot, applyMatch, difficulty, fetchBot, wallet]);

  const resumeMatch = useCallback(() => runLocked(
    'Checking your saved match before submitting anything.',
    async () => {
      const savedMatchId = requireHex64(providerRef.current?.activeMatchId, 'Saved match ID');
      await finishMatchSetup(savedMatchId, parseSafeInteger(wagerInput, 'Wager', { minimum: 0 }));
    },
  ), [finishMatchSetup, runLocked, wagerInput]);

  const startMatch = useCallback(() => runLocked(
    'Creating your game. Approve the transaction in Lace when prompted.',
    async () => {
      if (!providerRef.current || !wallet) throw new Error('Connect Lace before starting your game.');
      if (providerRef.current.activeMatchId) throw new Error('A match is already saved. Use Resume my match instead.');
      if (NETWORK_ID !== 'undeployed' && !getContractAddress()) throw new Error('No published game table is configured. Nothing was submitted.');
      const wagerAmount = parseSafeInteger(wagerInput, 'Wager', { minimum: 0 });
      setProgress([]);
      setHand([]);
      setSelectedIds(new Set());
      setMatch(null);
      setMatchId(null);
      setLastTransactionId(null);
      setLastBotAction('');
      setDialogue('');

      addProgress(CONTRACT_VARIANT === 'state-only'
        ? 'Creating a no-stakes STANDARD match on the selected network.'
        : `Creating a STANDARD mode match with local-chain wager ${wagerAmount}.`);
      const created = await trackOnChainOperation('Create match', () => providerRef.current.startGame({
        mode: STANDARD_MODE,
        wagerAmount,
      }));
      const newMatchId = requireHex64(created?.matchId, 'Created match ID');
      setHasSavedMatch(true);
      const createTransactionId = optionalTransactionId(created);
      if (!mountedRef.current) return;
      setMatchId(newMatchId);
      setLastTransactionId(createTransactionId);
      addProgress(`Match ${shorten(newMatchId)} created${createTransactionId ? ` in tx ${shorten(createTransactionId)}` : ''}.`);

      await finishMatchSetup(newMatchId, wagerAmount);
    },
  ), [addProgress, finishMatchSetup, runLocked, wagerInput, wallet]);

  /**
   * Runs one P1 on-chain action, then lets the bot respond and refreshes.
   * `activityLabel` is the short public name shown in the Midnight activity
   * panel (for example "Play cards"); `description` is the longer log line.
   */
  const transactThenAdvance = useCallback((activityLabel, description, transaction, options = {}) => runLocked(
    'Proving your move and waiting for confirmation. Approve the request in Lace when prompted.',
    async () => {
      if (!providerRef.current || !matchId) throw new Error('Connect Lace and start a match first.');
      addProgress(description);
      const result = await trackOnChainOperation(
        activityLabel,
        () => transaction(providerRef.current),
      );
      const transactionId = optionalTransactionId(result);
      if (mountedRef.current) setLastTransactionId(transactionId);
      addProgress(`Transaction submitted${transactionId ? `: ${shorten(transactionId)}` : '.'}`);
      // In the provable edition the hand record is updated by playCards itself
      // and re-read on the next status refresh; only the wagered path needs
      // this optimistic local removal.
      if (CONTRACT_VARIANT !== 'state-only' && options.removedIds?.length && match?.combinedSeed && mountedRef.current) {
        setHand((currentHand) => removeP1Cards(
          matchId,
          match.combinedSeed,
          currentHand,
          options.removedIds,
        ));
      }
      if (mountedRef.current) setSelectedIds(new Set());
      if (options.advance !== false) await advanceBot(matchId);
      await refreshStatus({ quiet: true });
    },
  ), [addProgress, advanceBot, match, matchId, refreshStatus, runLocked]);

  const selectedCards = useMemo(
    () => hand.filter((card) => selectedIds.has(card.id)),
    [hand, selectedIds],
  );

  const toggleCard = useCallback((cardId) => {
    if (busy) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(cardId)) next.delete(cardId);
      else if (next.size < 4) next.add(cardId);
      return next;
    });
  }, [busy]);

  const playSelected = useCallback(() => {
    if (!match || selectedCards.length < 1 || selectedCards.length > 4) return;
    const removedIds = selectedCards.map((card) => card.id);
    transactThenAdvance(
      'Play cards',
      `Committing ${selectedCards.length} private card rank value(s) while publicly claiming ${RANKS[match.currentRank]}.`,
      (provider) => provider.makePlay({
        cards: selectedCards.map((card) => card.rankIndex),
        claimedRank: match.currentRank,
        claimedCount: selectedCards.length,
        role: 'p1',
        match,
      }),
      { removedIds },
    );
  }, [match, selectedCards, transactThenAdvance]);

  const isP1TurnToPlay = match?.phase === 2 && match.activePlayerIdx === 0;
  const pendingBotClaim = match?.phase === 3
    && match.hasPendingPlay
    && match.lastPlayerIdx === 1
    && !match.isChallenged;
  const p1MustProve = match?.phase === 3
    && match.hasPendingPlay
    && match.lastPlayerIdx === 0
    && (match.isChallenged || /challenge/i.test(lastBotAction));
  const canClaimPayout = CONTRACT_VARIANT !== 'state-only'
    && match?.phase === 4 && match.winner === 1 && !match.escrowReleased;

  // On-chain buttons lock on either signal. `busy` covers this component's own
  // run loop; `activityInFlight` is the store-level duplicate-submit guard
  // that stays true until the SDK call actually settles.
  const onChainLocked = busy || activityInFlight;

  const renderedBalances = Object.entries(balances).map(([token, amount]) => (
    `${shorten(token, 5, 4)}=${String(amount)}`
  ));

  return (
    <section className="testwired-panel" aria-labelledby="testwired-title">
      <header className="testwired-panel__header">
        <div>
          <p className="testwired-panel__eyebrow">You versus the computer · real privacy proofs</p>
          <h2 id="testwired-title">
            Play Proof or Bluff · {NETWORK_LABELS[NETWORK_ID] || NETWORK_ID}
            {' '}
            <span className={`network-badge network-badge--${(NETWORK_BADGES[NETWORK_ID] || NETWORK_BADGES.undeployed).tone}`}>
              {(NETWORK_BADGES[NETWORK_ID] || { text: NETWORK_ID.toUpperCase() }).text}
            </span>
          </h2>
          <p className="testwired-panel__intro">
            {CONTRACT_VARIANT === 'state-only'
              ? 'No-stakes game: public claims, private challenge witnesses, and a committed deal seed. No wagers or payouts. Players still need DUST for transaction fees.'
              : 'This developer control panel uses the local Midnight node, indexer, proof server, and bot. Tokens and wagers belong to the disposable local chain; this is not mainnet.'}
          </p>
        </div>
        <div className="testwired-panel__meta">
          <SiteLinks compact />
        </div>
      </header>

      <div className="guided-game-layout">
      <div className="guided-game-main">
      {!match && (
        <GuidedGameSetup
          step={setupStep}
          networkLabel={NETWORK_LABELS[NETWORK_ID] || NETWORK_ID}
          walletAvailable={walletAvailable}
          botHealth={botHealth}
          walletConnected={Boolean(wallet)}
          hasSavedMatch={hasSavedMatch}
          tableConfigured={NETWORK_ID === 'undeployed' || Boolean(getContractAddress())}
          busy={onChainLocked}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          onContinue={() => setSetupStep(setupStep === 'prepare' ? 'connect' : 'match')}
          onBack={() => setSetupStep(setupStep === 'match' ? 'connect' : 'prepare')}
          onConnect={connect}
          onStart={startMatch}
          onResume={resumeMatch}
        />
      )}

      {walletAvailable === false && (
        <p className="testwired-notice">
          Lace was not detected. Install its Midnight connector, switch it to
          {` ${NETWORK_ID}`}, reload this page, and try again.
        </p>
      )}
      {busyMessage && <p className="testwired-proof-status" role="status">{busyMessage}</p>}
      {error && <p className="testwired-error" role="alert">{error}</p>}

      {/* Honest Midnight activity status: stage, elapsed time, service
          reachability and a transition log. It reads the activity store that
          trackOnChainOperation() writes to, and becomes a modal overlay only
          during stages where clicking other actions would be unsafe. */}
      <MidnightActivityPanel />

      {match && (
        <div className="testwired-match">
          <div className="testwired-match__heading">
            <div>
              <h3>Your game</h3>
              <p>Your cards are private. Claims and scores are public.</p>
            </div>
            <button type="button" onClick={() => runLocked('Refreshing public match status.', refreshStatus)} disabled={busy}>
              Refresh
            </button>
          </div>

          <div className="guided-next-task" role="status">
            <h3>{match.phase === 4 ? 'Game complete' : p1MustProve ? 'The computer challenged you' : pendingBotClaim ? 'Trust the computer or challenge?' : isP1TurnToPlay ? 'Your turn: choose 1 to 4 cards' : 'Waiting for the computer'}</h3>
            <p>{match.phase === 4 ? 'The final scores are below.' : p1MustProve ? 'Click Prove my play. Your proof will reveal whether your claim was true.' : pendingBotClaim ? 'Click Accept claim to trust the claim, or Challenge claim to demand a proof.' : isP1TurnToPlay ? `Click your cards, then Play selected cards. Your public claim will be ${RANKS[match.currentRank]}; bluffing is allowed.` : 'No wallet action is needed right now. Keep this page open.'}</p>
          </div>
          <dl className="testwired-status-grid">
            <div><dt>Phase</dt><dd>{PHASE_NAMES[match.phase]}</dd></div>
            <div><dt>Required rank</dt><dd>{RANKS[match.currentRank]}</dd></div>
            <div><dt>Turn</dt><dd>{match.activePlayerIdx === 0 ? 'You' : 'Computer'}</dd></div>
            <div><dt>Scores</dt><dd>You {match.p1Score} · Computer {match.p2Score}</dd></div>
            <div><dt>Cards remaining</dt><dd>You {match.p1HandSize} · Computer {match.p2HandSize}</dd></div>
            <div><dt>Pile</dt><dd>{match.pileSize}</dd></div>
            <div><dt>Winner</dt><dd>{match.winner === 0 ? 'Not decided' : match.winner === 1 ? 'You' : 'Computer'}</dd></div>
            <div><dt>Pending claim</dt><dd>{match.hasPendingPlay ? `${match.lastClaimCount} as ${RANKS[match.lastClaimRank]}` : 'None'}</dd></div>
          </dl>

          {match.phase === 4 && (
            <button type="button" className="primary" disabled={onChainLocked} onClick={() => {
              providerRef.current.resetGame();
              setHasSavedMatch(false);
              setMatch(null);
              setMatchId(null);
              setHand([]);
              setSetupStep('match');
            }}>Set up another game</button>
          )}
          {dialogue && <blockquote className="testwired-dialogue">{dialogue}</blockquote>}

          <div className="testwired-hand-area">
            <div className="testwired-hand-area__heading">
              <h3>Your private cards</h3>
              <span>{selectedIds.size}/4 selected</span>
            </div>
            {hand.length ? (
              <div className="testwired-hand" aria-label="Player One hand">
                {hand.map((card) => {
                  const selected = selectedIds.has(card.id);
                  return (
                    <button
                      type="button"
                      className={`testwired-card${selected ? ' testwired-card--selected' : ''}`}
                      key={card.id}
                      aria-pressed={selected}
                      aria-label={`${card.rank} · ${SUIT_LABELS[card.suit] || 'private card'}`}
                      onClick={() => toggleCard(card.id)}
                      disabled={busy || !isP1TurnToPlay || (!selected && selectedIds.size >= 4)}
                    >
                      <strong>{card.rank}</strong>
                      <span>{SUIT_LABELS[card.suit] || 'Private'}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="testwired-muted">The P1 hand appears after the combined seed is finalized.</p>
            )}
          </div>

          <div className="testwired-actions" aria-label="Player One actions">
            <button
              type="button"
              className="primary"
              onClick={playSelected}
              disabled={onChainLocked || !isP1TurnToPlay || selectedCards.length < 1 || selectedCards.length > 4}
            >
              Play selected cards ({selectedCards.length}) as {RANKS[match.currentRank]}
            </button>
            {p1MustProve && (
              <button
                type="button"
                className="primary"
                onClick={() => transactThenAdvance('Prove my play', 'Resolving the bot challenge with P1’s private play witness.', (provider) => provider.resolveChallenge())}
                disabled={onChainLocked}
              >
                Prove my play
              </button>
            )}
            {pendingBotClaim && (
              <>
                <button
                  type="button"
                  onClick={() => transactThenAdvance('Accept claim', 'Accepting the P2 bot claim.', (provider) => provider.accept())}
                  disabled={onChainLocked}
                >
                  Accept claim
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => transactThenAdvance('Challenge claim', 'Challenging the P2 bot claim; the bot will resolve its witness next.', (provider) => provider.challenge())}
                  disabled={onChainLocked}
                >
                  Challenge claim
                </button>
              </>
            )}
            {canClaimPayout && (
              <button
                type="button"
                className="primary"
                onClick={() => transactThenAdvance('Claim payout', 'Claiming the P1 local-chain payout.', (provider) => provider.claimPayout(), { advance: false })}
                disabled={onChainLocked}
              >
                Claim payout
              </button>
            )}
          </div>
        </div>
      )}

      </div>
      <aside className="guided-game-sidebar" aria-label="Developer tools">
        <details className="guided-game-tools">
          <summary>Developer controls &amp; diagnostics</summary>
          <p>Optional technical tools. You do not need these to play.</p>
          <dl className="testwired-vitals" aria-label="Connection status">
            <div><dt>Lace</dt><dd>{wallet ? 'Connected' : walletAvailable ? 'Detected' : 'Not detected'}</dd></div>
            <div><dt>Computer service</dt><dd>{botHealth === 'ready' ? 'Reachable (wallet sync separate)' : botHealth}</dd></div>
            <div><dt>Network</dt><dd>{NETWORK_LABELS[NETWORK_ID] || NETWORK_ID}</dd></div>
          </dl>
          {wallet && <p>Wallet: {shorten(wallet.address)} · {renderedBalances.join(', ')}</p>}
          <p>Match: <code>{matchId || 'Not loaded'}</code></p>
          <p>Last transaction: <code>{lastTransactionId || 'Not available'}</code></p>
          <DiagnosticsButton getReport={() => buildTestWiredDiagnosticReport({ wallet, error })} />
          {/* The choice must be made before connecting: the proof provider is
              built once per connection from the selected proof-server URL. */}
          {CONTRACT_VARIANT === 'state-only' && !wallet && <ProofServerChoice disabled={busy} />}
          {/* Which deployed contract to join. Essential on public networks, where
              an unset address makes Start deploy a new copy at the player's
              expense. Locked while any on-chain call is in flight. */}
          <ContractAddressControl disabled={onChainLocked || Boolean(wallet) || hasSavedMatch} />
          {CONTRACT_VARIANT !== 'state-only' && (
            <label>Local test wager
              <input type="number" min="0" step="1" value={wagerInput} onChange={event => setWagerInput(event.target.value)} disabled={onChainLocked} />
            </label>
          )}
      <div className="testwired-log" aria-live="polite" aria-atomic="false">
        <h3>Operation log</h3>
        <ol>
          {progress.length
            ? progress.map((entry) => <li key={entry.id}>{entry.message}</li>)
            : <li>Follow the setup screens in the main panel.</li>}
        </ol>
      </div>
        </details>
      </aside>
      </div>
    </section>
  );
}
