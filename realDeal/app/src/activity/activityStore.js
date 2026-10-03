/**
 * activity/activityStore.js — a tiny, framework-free "what is Midnight doing
 * right now" store.
 *
 * WHAT: Holds the single in-flight on-chain operation (if any), its current
 * stage, a plain log of stage transitions with timestamps, and a short
 * history of finished operations. React components subscribe to it; plain
 * async handlers (which are not React) write to it.
 *
 * WHY a hand-rolled store instead of React state or a library:
 *   - The handlers in TestWiredPanel are async functions that outlive any
 *     single render, so a module-level store is the simplest honest source
 *     of truth. No new npm dependency is needed for pub/sub.
 *   - Keeping it framework-free means the store can be unit tested with
 *     plain vitest and no DOM.
 *
 * PRIVACY RULE (non-negotiable): this store only ever accepts a public
 * operation label, a stage name, an optional human message, an optional
 * PUBLIC transaction id and an optional error string. It must never be
 * handed seeds, hand salts, card ranks, witness payloads, entropy or API
 * tokens. `sanitizeText` below is a defensive backstop, not a license to
 * pass private data in.
 */

/** Every stage an operation may move through, in rough chronological order. */
export const ACTIVITY_STAGES = Object.freeze([
  'connecting-wallet',
  'preparing',
  'proving',
  'awaiting-signature',
  'submitting',
  'confirming',
  'confirmed',
  'failed',
]);

/** Human-readable label for each stage. Wording was set by the product owner. */
export const ACTIVITY_STAGE_LABELS = Object.freeze({
  'connecting-wallet': 'Connecting wallet — waiting for Lace',
  preparing: 'Preparing move',
  proving: 'Generating zero-knowledge proof — proof server is working',
  'awaiting-signature': 'Awaiting your signature in Lace',
  submitting: 'Submitting transaction to Midnight',
  confirming: 'Waiting for confirmation from the indexer',
  confirmed: 'Move confirmed',
  failed: 'Failed',
});

/** Stages that mean "the app is talking to something and waiting"; the UI shows a last-checked clock for these. */
export const POLLING_STAGES = Object.freeze(['proving', 'submitting', 'confirming']);

/**
 * Stages during which the player must not click other game actions, because
 * a transaction may already be signed or on its way to the chain.
 */
export const BLOCKING_STAGES = Object.freeze(['awaiting-signature', 'submitting', 'confirming']);

/** Terminal stages: once here, the operation is no longer in flight. */
export const TERMINAL_STAGES = Object.freeze(['confirmed', 'failed']);

/** How many finished operations we remember for the "Details" log. */
export const HISTORY_LIMIT = 20;

/** Longest text we will store for any free-form field, to keep the log readable. */
const MAX_TEXT_LENGTH = 300;

/** Public tx ids on Midnight are 64 hex characters. Anything else is not shown as a tx id. */
const TX_ID_PATTERN = /^(0x)?[0-9a-fA-F]{64}$/;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** Creates the empty state shape. Kept as a function so tests can reset. */
function createEmptyState() {
  return {
    /** The one operation currently running, or null when idle. */
    current: null,
    /** Most recent finished operations, newest last. Capped at HISTORY_LIMIT. */
    history: [],
  };
}

let state = createEmptyState();
let nextOperationNumber = 1;
const listeners = new Set();

/** Lets tests inject a fake clock. Production always uses Date.now. */
let nowProvider = () => Date.now();

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/**
 * Trims free-form text to something safe to display. Non-strings become an
 * empty string rather than being coerced (so an object full of private
 * fields can never be stringified into the log by accident).
 */
function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, MAX_TEXT_LENGTH);
}

/** Accepts only a well-formed public transaction id; returns null otherwise. */
function sanitizeTransactionId(value) {
  if (typeof value !== 'string' || !TX_ID_PATTERN.test(value.trim())) return null;
  return value.trim().replace(/^0x/, '').toLowerCase();
}

/** Throws early so a typo in a stage name is caught in development, not hidden. */
function assertKnownStage(stage) {
  if (!ACTIVITY_STAGES.includes(stage)) {
    throw new Error(`Unknown activity stage "${stage}". Expected one of: ${ACTIVITY_STAGES.join(', ')}.`);
  }
}

/** Tells every subscriber the state changed. Listener errors must not break the game loop. */
function notifyListeners() {
  for (const listener of listeners) {
    try {
      listener(state);
    } catch (listenerError) {
      // A broken listener should never stop the on-chain handler that is
      // reporting progress. Surface it in the console for the developer.
      console.error('activityStore listener threw:', listenerError);
    }
  }
}

/** Replaces state immutably and notifies. Every mutation funnels through here. */
function commit(nextState) {
  state = nextState;
  notifyListeners();
}

/** Appends one timestamped entry to the operation's transition log. */
function appendLogEntry(operation, stage, message, transactionId) {
  const entry = {
    at: nowProvider(),
    stage,
    message: message || ACTIVITY_STAGE_LABELS[stage] || stage,
    ...(transactionId ? { txId: transactionId } : {}),
  };
  return { ...operation, log: [...operation.log, entry] };
}

/** True when the given id names the operation that is currently running. */
function isCurrentOperation(operationId) {
  return state.current !== null && state.current.id === operationId;
}

/** Moves the current operation into history and clears the current slot. */
function archiveCurrentOperation(finishedOperation) {
  const history = [...state.history, finishedOperation].slice(-HISTORY_LIMIT);
  commit({ current: null, history });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Begins tracking a new operation.
 *
 * @param {string} label  Public, player-facing name such as "Play cards".
 * @returns {number} an operation id to pass to setStage / finishOperation / failOperation.
 *
 * WHY return an id: the async handler keeps it in a local variable, so if a
 * stale handler finishes after a newer operation started, its calls are
 * ignored instead of corrupting the newer operation's display.
 */
export function startOperation(label) {
  const operationId = nextOperationNumber;
  nextOperationNumber += 1;
  const startedAt = nowProvider();

  // If something was still marked in flight (e.g., a handler forgot to finish),
  // archive it as failed so the UI can never show two spinners or a stuck one.
  if (state.current) {
    const abandoned = appendLogEntry(
      { ...state.current, stage: 'failed', finishedAt: startedAt, error: 'Superseded by a newer operation.' },
      'failed',
      'Superseded by a newer operation.',
    );
    state = { ...state, current: null, history: [...state.history, abandoned].slice(-HISTORY_LIMIT) };
  }

  const operation = {
    id: operationId,
    operation: sanitizeText(label) || 'On-chain action',
    stage: 'preparing',
    message: '',
    txId: null,
    error: null,
    startedAt,
    finishedAt: null,
    log: [],
  };
  commit({ ...state, current: appendLogEntry(operation, 'preparing', '') });
  return operationId;
}

/**
 * Records that the operation moved to a new stage.
 *
 * @param {number} operationId
 * @param {string} stage      one of ACTIVITY_STAGES
 * @param {{message?: string, txId?: string}} [extra]
 */
export function setStage(operationId, stage, extra = {}) {
  assertKnownStage(stage);
  if (!isCurrentOperation(operationId)) return;

  // Terminal stages have dedicated helpers so they always archive correctly.
  if (stage === 'confirmed') {
    finishOperation(operationId, { txId: extra.txId, message: extra.message });
    return;
  }
  if (stage === 'failed') {
    failOperation(operationId, extra.message || extra.error);
    return;
  }

  const message = sanitizeText(extra.message);
  const transactionId = sanitizeTransactionId(extra.txId) || state.current.txId;
  const updated = appendLogEntry(
    { ...state.current, stage, message, txId: transactionId },
    stage,
    message,
    transactionId,
  );
  commit({ ...state, current: updated });
}

/**
 * Marks the operation confirmed and archives it.
 *
 * @param {number} operationId
 * @param {{txId?: string, message?: string}} [result]
 */
export function finishOperation(operationId, result = {}) {
  if (!isCurrentOperation(operationId)) return;
  const transactionId = sanitizeTransactionId(result.txId) || state.current.txId;
  const message = sanitizeText(result.message);
  const finished = appendLogEntry(
    {
      ...state.current,
      stage: 'confirmed',
      message,
      txId: transactionId,
      finishedAt: nowProvider(),
    },
    'confirmed',
    message,
    transactionId,
  );
  archiveCurrentOperation(finished);
}

/**
 * Marks the operation failed with a player-safe error string and archives it.
 * Pass a string, not an Error object, so the caller decides what is shown.
 */
export function failOperation(operationId, errorMessage) {
  if (!isCurrentOperation(operationId)) return;
  const error = sanitizeText(errorMessage) || 'The operation failed without a message.';
  const failed = appendLogEntry(
    {
      ...state.current,
      stage: 'failed',
      error,
      finishedAt: nowProvider(),
    },
    'failed',
    error,
  );
  archiveCurrentOperation(failed);
}

/**
 * Subscribes to state changes.
 * @param {(state: object) => void} listener
 * @returns {() => void} unsubscribe function
 */
export function subscribe(listener) {
  if (typeof listener !== 'function') {
    throw new Error('activityStore.subscribe expects a listener function.');
  }
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Returns the current immutable state snapshot. */
export function getState() {
  return state;
}

/**
 * True while any operation is running. TestWiredPanel uses this to disable
 * on-chain buttons so a player cannot double-submit the same move.
 */
export function isOperationInFlight() {
  return state.current !== null && !TERMINAL_STAGES.includes(state.current.stage);
}

/** True when the current stage means the player should not click other game actions. */
export function isBlockingStageInFlight() {
  return isOperationInFlight() && BLOCKING_STAGES.includes(state.current.stage);
}

// ---------------------------------------------------------------------------
// Test-only helpers (harmless in production, but not part of the UI contract)
// ---------------------------------------------------------------------------

/** Clears everything. Tests call this in beforeEach so cases stay independent. */
export function resetActivityStoreForTests() {
  state = createEmptyState();
  nextOperationNumber = 1;
  listeners.clear();
  nowProvider = () => Date.now();
}

/** Lets tests control timestamps so log entries are deterministic. */
export function setActivityClockForTests(clockFunction) {
  nowProvider = typeof clockFunction === 'function' ? clockFunction : () => Date.now();
}
