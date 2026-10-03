/**
 * activity/MidnightActivityPanel.jsx — the honest "Midnight activity" panel.
 *
 * WHAT: Shows the player what the app is actually waiting on during an
 * on-chain action: the current stage, a ticking elapsed clock, the last time
 * we checked the network services, and a plain log of stage transitions.
 *
 * WHY "honest": the spinner is driven only by the real in-flight operation
 * recorded in activityStore. There is no fake percentage, no timer-driven
 * progress bar, and no timer ever declares failure. After 90 seconds in a
 * slow stage we only add a reassurance note.
 *
 * Health pings (proof server + indexer) run every 15 s while an operation is
 * in flight. They tell the player whether the services are reachable; they
 * are deliberately NOT presented as proof progress because reachability says
 * nothing about how far along a proof is.
 *
 * Rendering modes:
 *   - compact inline panel (default, including when idle)
 *   - modal overlay while a BLOCKING stage is in flight (signature, submit,
 *     confirm). The overlay can be minimized, and the text makes clear that
 *     minimizing never cancels a transaction.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

import {
  ACTIVITY_STAGE_LABELS,
  BLOCKING_STAGES,
  POLLING_STAGES,
  getState,
  subscribe,
} from './activityStore.js';
import { ENDPOINTS } from '../midnight/config.js';

/** How often we ping the proof server and indexer while an operation runs. */
export const HEALTH_PING_INTERVAL_MS = 15_000;

/** After this long in `proving` or `confirming` we show the "taking longer" note. */
export const SLOW_STAGE_NOTICE_MS = 90_000;

/** Stages that get the reassurance note when they run long. */
const SLOW_NOTICE_STAGES = Object.freeze(['proving', 'confirming']);

const SLOW_NOTICE_TEXT = 'Taking longer than usual — this is normal on public testnets';
const NOT_CANCELLED_TEXT = 'Closing this does not cancel a submitted transaction';

// ---------------------------------------------------------------------------
// Pure formatting helpers (exported so tests can check them directly)
// ---------------------------------------------------------------------------

/** Formats a duration in milliseconds as mm:ss, e.g. 75_000 -> "01:15". */
export function formatElapsed(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor((Number(milliseconds) || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Formats a timestamp as a 24-hour HH:MM:SS wall-clock time in the player's local zone. */
export function formatClockTime(timestamp) {
  if (!Number.isFinite(timestamp)) return '--:--:--';
  const date = new Date(timestamp);
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Shortens a 64-hex tx id for display; the full id stays in the title attribute. */
function shortenTransactionId(transactionId) {
  if (!transactionId) return '';
  return `${transactionId.slice(0, 8)}…${transactionId.slice(-6)}`;
}

// ---------------------------------------------------------------------------
// Health probes (pure async functions; injectable fetch so tests stay offline)
// ---------------------------------------------------------------------------

/**
 * Pings the proof server with a plain GET.
 * Any HTTP response at all (even 404) proves the server is reachable; only a
 * network error (fetch rejecting) means unreachable.
 */
export async function probeProofServer(fetchImpl, proofServerUrl) {
  try {
    await fetchImpl(proofServerUrl, { method: 'GET', cache: 'no-store' });
    return { status: 'reachable' };
  } catch {
    return { status: 'unreachable' };
  }
}

/**
 * Asks the indexer for the latest block height via GraphQL.
 * Returns the block height when the response parses; otherwise "unreachable".
 */
export async function probeIndexer(fetchImpl, indexerUrl) {
  try {
    const response = await fetchImpl(indexerUrl, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: '{ block { height } }' }),
    });
    const payload = await response.json();
    const height = payload?.data?.block?.height;
    if (height === null || height === undefined) return { status: 'unreachable', blockHeight: null };
    return { status: 'reachable', blockHeight: Number(height) };
  } catch {
    return { status: 'unreachable', blockHeight: null };
  }
}

/**
 * Runs both probes together and stamps the result with the check time.
 * The proof server URL is read lazily so a toggle between local and hosted
 * proof servers is honored on the very next ping.
 */
export async function probeMidnightHealth(fetchImpl, now = () => Date.now()) {
  const [proofServer, indexer] = await Promise.all([
    probeProofServer(fetchImpl, ENDPOINTS.proofServer),
    probeIndexer(fetchImpl, ENDPOINTS.indexer),
  ]);
  return { proofServer, indexer, checkedAt: now() };
}

/** Default fetch: window.fetch when in a browser, otherwise a rejecting stub. */
function defaultFetch(...args) {
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    return window.fetch(...args);
  }
  return Promise.reject(new Error('fetch is not available in this environment.'));
}

// ---------------------------------------------------------------------------
// Derived view-model helpers
// ---------------------------------------------------------------------------

/** When did the current stage begin? The newest log entry for that stage tells us. */
function findStageEnteredAt(operation) {
  for (let index = operation.log.length - 1; index >= 0; index -= 1) {
    if (operation.log[index].stage === operation.stage) return operation.log[index].at;
  }
  return operation.startedAt;
}

/** Decides whether the long-running reassurance note should appear. */
function shouldShowSlowNotice(operation, now) {
  if (!SLOW_NOTICE_STAGES.includes(operation.stage)) return false;
  return now - findStageEnteredAt(operation) >= SLOW_STAGE_NOTICE_MS;
}

/** Human text for the proof-server health line. */
function describeProofServerHealth(health) {
  if (!health) return 'proof server: not checked yet';
  return `proof server: ${health.proofServer.status}`;
}

/** Human text for the indexer health line. */
function describeIndexerHealth(health) {
  if (!health) return 'indexer: not checked yet';
  if (health.indexer.status === 'reachable' && Number.isFinite(health.indexer.blockHeight)) {
    return `indexer: block ${health.indexer.blockHeight}`;
  }
  return 'indexer: unreachable';
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

/** CSS-only spinner. The reduced-motion fallback lives in styles.css. */
function Spinner({ active }) {
  return (
    <span
      className={`pob-activity-spinner${active ? ' pob-activity-spinner--active' : ''}`}
      aria-hidden="true"
    />
  );
}

/** One row of the transition log. Tx ids are public so they are safe to show. */
function LogEntry({ entry }) {
  return (
    <li className="pob-activity-log__entry">
      <time dateTime={new Date(entry.at).toISOString()}>{formatClockTime(entry.at)}</time>
      <span className="pob-activity-log__stage">{entry.stage}</span>
      <span>{entry.message}</span>
      {entry.txId && (
        <code title={entry.txId}>tx {shortenTransactionId(entry.txId)}</code>
      )}
    </li>
  );
}

/** The "Details" disclosure: current operation log followed by recent history. */
function DetailsDisclosure({ current, history }) {
  const operationsToShow = [...history, ...(current ? [current] : [])];
  if (operationsToShow.length === 0) return null;
  return (
    <details className="pob-activity-details">
      <summary>Details</summary>
      {operationsToShow.map((operation) => (
        <section key={operation.id} className="pob-activity-log">
          <h4>
            {operation.operation}
            {operation.txId && (
              <code title={operation.txId}> tx {shortenTransactionId(operation.txId)}</code>
            )}
          </h4>
          <ol>
            {operation.log.map((entry, index) => (
              <LogEntry key={`${operation.id}-${index}`} entry={entry} />
            ))}
          </ol>
        </section>
      ))}
    </details>
  );
}

/** Reachability lines. Labeled plainly so nobody mistakes them for progress. */
function HealthLines({ health, pollingStage }) {
  return (
    <ul className="pob-activity-health" aria-label="Service reachability (not proof progress)">
      <li>{describeProofServerHealth(health)}</li>
      <li>{describeIndexerHealth(health)}</li>
      {pollingStage && (
        <li>
          {health ? `last checked ${formatClockTime(health.checkedAt)}` : 'last checked: not yet'}
        </li>
      )}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// The panel
// ---------------------------------------------------------------------------

/**
 * @param {object} props
 * @param {Function} [props.fetchImpl]        injectable fetch for health pings (tests pass a fake)
 * @param {number}   [props.now]              fixed timestamp for deterministic tests; omit in production
 * @param {object}   [props.initialHealth]    pre-seeded health snapshot for tests
 * @param {number}   [props.healthIntervalMs] ping cadence; defaults to 15 s
 */
export default function MidnightActivityPanel({
  fetchImpl = defaultFetch,
  now: fixedNow,
  initialHealth = null,
  healthIntervalMs = HEALTH_PING_INTERVAL_MS,
}) {
  // Subscribe to the framework-free store. The third argument is the server
  // snapshot, which lets renderToStaticMarkup (used by our tests) work.
  const activityState = useSyncExternalStore(subscribe, getState, getState);
  const { current, history } = activityState;

  const [tickNow, setTickNow] = useState(() => Date.now());
  const [health, setHealth] = useState(initialHealth);
  const [overlayMinimizedForOperationId, setOverlayMinimizedForOperationId] = useState(null);

  const now = fixedNow ?? tickNow;
  const inFlight = current !== null;
  const isBlockingStage = inFlight && BLOCKING_STAGES.includes(current.stage);
  const isPollingStage = inFlight && POLLING_STAGES.includes(current.stage);

  // Tick once per second ONLY while something is running, so the elapsed
  // clock moves honestly and the panel is silent when idle.
  useEffect(() => {
    if (!inFlight || fixedNow !== undefined) return undefined;
    setTickNow(Date.now());
    const timer = window.setInterval(() => setTickNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [inFlight, fixedNow]);

  // Health pings ONLY while an operation is in flight. One immediately, then
  // every 15 s. Results arriving after unmount or after the operation ended
  // are dropped so we never show stale "reachable" for an idle panel.
  useEffect(() => {
    if (!inFlight) return undefined;
    let cancelled = false;
    const runProbe = async () => {
      const snapshot = await probeMidnightHealth(fetchImpl);
      if (!cancelled) setHealth(snapshot);
    };
    runProbe();
    const timer = window.setInterval(runProbe, healthIntervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [inFlight, fetchImpl, healthIntervalMs]);

  const minimizeOverlay = useCallback(() => {
    if (current) setOverlayMinimizedForOperationId(current.id);
  }, [current]);

  // A new operation gets a fresh (non-minimized) overlay automatically because
  // the minimized flag is keyed by operation id.
  const overlayMinimized = inFlight && overlayMinimizedForOperationId === current.id;
  const showOverlay = isBlockingStage && !overlayMinimized;

  const statusText = useMemo(() => {
    if (!current) return 'Idle — no Midnight activity';
    const label = ACTIVITY_STAGE_LABELS[current.stage] || current.stage;
    return current.message ? `${label}. ${current.message}` : label;
  }, [current]);

  const elapsedText = inFlight ? formatElapsed(now - current.startedAt) : null;
  const slowNotice = inFlight && shouldShowSlowNotice(current, now);
  const lastFinished = history.length ? history[history.length - 1] : null;

  // Shared body used by both the inline panel and the overlay.
  const body = (
    <>
      <div className="pob-activity-headline">
        <Spinner active={inFlight} />
        <div>
          <p className="pob-activity-operation">
            {inFlight ? current.operation : (lastFinished ? `Last: ${lastFinished.operation}` : 'Midnight activity')}
          </p>
          <p className="pob-activity-status" role="status" aria-live="polite">
            {inFlight ? statusText : (
              lastFinished
                ? `${ACTIVITY_STAGE_LABELS[lastFinished.stage]}${lastFinished.error ? ` — ${lastFinished.error}` : ''}`
                : statusText
            )}
          </p>
        </div>
        {elapsedText && (
          <span className="pob-activity-elapsed" aria-label="Elapsed time">{elapsedText}</span>
        )}
      </div>
      {slowNotice && <p className="pob-activity-slow">{SLOW_NOTICE_TEXT}</p>}
      {inFlight && <HealthLines health={health} pollingStage={isPollingStage} />}
      <DetailsDisclosure current={current} history={history} />
    </>
  );

  if (showOverlay) {
    return (
      <div className="pob-activity-overlay">
        <div
          className="pob-activity-panel pob-activity-panel--modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pob-activity-overlay-title"
        >
          <h3 id="pob-activity-overlay-title">Midnight is working on your move</h3>
          {body}
          <p className="pob-activity-not-cancelled">{NOT_CANCELLED_TEXT}</p>
          <button type="button" className="pob-activity-minimize" onClick={minimizeOverlay}>
            Minimize
          </button>
        </div>
      </div>
    );
  }

  return (
    <aside
      className={`pob-activity-panel${inFlight ? ' pob-activity-panel--active' : ''}`}
      aria-label="Midnight activity"
    >
      {body}
      {overlayMinimized && <p className="pob-activity-not-cancelled">{NOT_CANCELLED_TEXT}</p>}
    </aside>
  );
}
