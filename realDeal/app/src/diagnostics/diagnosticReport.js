/**
 * diagnostics/diagnosticReport.js — assemble a sanitized, copy-pasteable
 * snapshot of "what is this app talking to and what just happened".
 *
 * WHY
 * When a judge, tester or John hits a wall ("proof failed", "tx never
 * landed"), the fastest way to help is a single JSON blob that answers:
 *   which network? which contract variant? which hosts? what operations
 *   ran, in what order, how long did they take, which tx ids resulted?
 *   is the proof server / indexer reachable? what errors were seen?
 * ...WITHOUT leaking cards, seeds, wallet addresses or Blockfrost tokens.
 *
 * This module is pure (no React, no fetch). The caller gathers the raw
 * inputs; we shape and redact them. Everything funnels through
 * redactObjectDeep at the end as a last line of defence, so even a field
 * we forgot to sanitize individually still gets scrubbed.
 *
 * Shape of the result — see README.md in this folder.
 */

import appPackageJson from '../../package.json';
import { ADDRESS_PREFIX_LENGTH, redactObjectDeep, redactSensitiveText } from './redact.js';

// Keep error strings short so one runaway stack trace does not bloat the
// paste. 600 chars comfortably holds a message plus the top of a stack.
const MAX_ERROR_LENGTH = 600;

// Hard cap on timeline entries included. Newest entries win.
const MAX_ACTIVITY_ENTRIES = 200;

export const DIAGNOSTIC_REPORT_SCHEMA_VERSION = 1;

/**
 * Build the report.
 *
 * @param {object} input
 * @param {string}  input.networkId         e.g. 'undeployed' | 'preview' | 'preprod'
 * @param {string}  input.contractVariant   e.g. 'wagered' | 'state-only'
 * @param {object}  input.endpoints         { node, indexer, indexerWs, proofServer } full URLs
 * @param {Array}   [input.activityHistory] operation timeline entries (see normaliseActivityEntry)
 * @param {object|null} [input.walletSummary] { connected, networkLabel, address | addressPrefix }
 * @param {object|null} [input.healthSnapshot] { proofServer: {...}, indexer: {...}, node?: {...} }
 * @param {Array}   [input.errors]          strings or Error objects
 * @param {string}  [input.userAgent]       navigator.userAgent (caller passes it; keeps us pure)
 * @param {string}  [input.appVersion]      override for package.json version
 * @param {string|null} [input.contractAddress] public contract address (kept, allowlisted)
 * @param {string[]} [input.publicIds]      extra public 64-hex ids to keep (tx hashes etc.)
 * @param {Date}    [input.now]             injectable clock for tests
 * @returns {object} plain JSON-serializable object
 */
export function buildDiagnosticReport(input = {}) {
  const {
    networkId = 'unknown',
    contractVariant = 'unknown',
    endpoints = {},
    activityHistory = [],
    walletSummary = null,
    healthSnapshot = null,
    errors = [],
    userAgent = 'unknown',
    appVersion = appPackageJson.version,
    contractAddress = null,
    publicIds = [],
    now = new Date(),
  } = input;

  const normalisedActivity = normaliseActivityHistory(activityHistory);

  // Tx ids and the contract address are public on-chain facts. Collect them
  // into the allowlist so the final redaction pass keeps them readable.
  const allowlistedPublicIds = collectPublicIds({
    explicitPublicIds: publicIds,
    contractAddress,
    activityEntries: normalisedActivity,
  });

  const rawReport = {
    schemaVersion: DIAGNOSTIC_REPORT_SCHEMA_VERSION,
    timestamp: now.toISOString(),
    appVersion: String(appVersion),
    networkId: String(networkId),
    contractVariant: String(contractVariant),
    contractAddress: contractAddress || null,
    endpointHosts: extractEndpointOrigins(endpoints),
    activityHistory: normalisedActivity,
    walletSummary: summariseWallet(walletSummary),
    healthSnapshot: summariseHealth(healthSnapshot),
    errors: sanitizeErrors(errors, allowlistedPublicIds),
    userAgent: String(userAgent),
  };

  // Last line of defence: scrub the whole tree, keeping only public ids.
  return redactObjectDeep(rawReport, { publicIds: allowlistedPublicIds });
}

// ---------------------------------------------------------------------
// Endpoints — hosts only, never paths or query strings
// ---------------------------------------------------------------------

/**
 * Reduce a URL to its origin (scheme + host + port). A Blockfrost
 * `?project_id=…` lives in the query string, which `origin` drops entirely.
 * Anything unparseable becomes a fixed marker rather than being echoed.
 */
export function extractEndpointOrigin(url) {
  if (typeof url !== 'string' || url.trim() === '') return null;
  try {
    const parsed = new URL(url);
    // `origin` is "null" for unusual schemes; fall back to host in that case.
    if (parsed.origin && parsed.origin !== 'null') return parsed.origin;
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '[unparseable-endpoint]';
  }
}

/** Map every endpoint the caller gave us to its origin. */
export function extractEndpointOrigins(endpoints) {
  const origins = {};
  if (!endpoints || typeof endpoints !== 'object') return origins;
  // Object.entries triggers getters (config.js exposes proofServer lazily).
  for (const [name, url] of Object.entries(endpoints)) {
    origins[name] = extractEndpointOrigin(url);
  }
  return origins;
}

// ---------------------------------------------------------------------
// Activity history — the operation timeline
// ---------------------------------------------------------------------

/** Take the first defined value among several possible field names. */
function firstDefined(...candidates) {
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null) return candidate;
  }
  return null;
}

/** Accept a Date, ISO string or epoch ms; return ISO string or null. */
export function toIsoTimestamp(value) {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Cap on short free-text fields copied from an activity entry.
const MAX_DETAIL_LENGTH = 300;

/** Clip a string to MAX_DETAIL_LENGTH; anything non-string becomes null. */
function toShortText(value) {
  return typeof value === 'string' && value !== '' ? value.slice(0, MAX_DETAIL_LENGTH) : null;
}

/**
 * The activity store keeps a per-operation transition log:
 * `[{ at, stage, message, txId }]`. Only the stage name and its timestamp
 * are kept here — that is exactly what you need to see "proving took 18 s,
 * submit took 0.4 s". Messages are already on the parent entry.
 */
function normaliseStageLog(log) {
  if (!Array.isArray(log)) return [];
  return log
    .filter((logEntry) => logEntry && typeof logEntry === 'object')
    .map((logEntry) => ({
      at: toIsoTimestamp(firstDefined(logEntry.at, logEntry.timestamp)),
      stage: String(firstDefined(logEntry.stage, 'unknown')),
    }));
}

/**
 * Normalise one timeline entry. Matches the shape produced by
 * `src/activity/activityStore.js` (`{ id, operation, stage, message, txId,
 * error, startedAt, finishedAt, log }`) but also accepts a few plausible
 * aliases so the two modules can evolve independently. Only public facts
 * survive: label, stage, timestamps, duration, public tx id, short
 * message/error/detail text (all redacted later), and the stage log.
 * Unknown keys (e.g. a stray `cards` field) are dropped, not copied.
 */
export function normaliseActivityEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const startedAt = toIsoTimestamp(firstDefined(entry.startedAt, entry.start, entry.timestamp, entry.at));
  const finishedAt = toIsoTimestamp(firstDefined(entry.finishedAt, entry.endedAt, entry.end, entry.completedAt));
  const explicitDuration = firstDefined(entry.durationMs, entry.elapsedMs);
  const derivedDuration =
    startedAt && finishedAt ? new Date(finishedAt).getTime() - new Date(startedAt).getTime() : null;

  return {
    id: firstDefined(entry.id, null),
    operation: String(firstDefined(entry.operation, entry.label, entry.name, entry.circuit, 'unknown')),
    stage: String(firstDefined(entry.stage, entry.status, entry.state, 'unknown')),
    startedAt,
    finishedAt,
    durationMs: explicitDuration !== null ? Number(explicitDuration) : derivedDuration,
    txId: firstDefined(entry.txId, entry.txHash, entry.transactionId, entry.transactionHash),
    message: toShortText(entry.message),
    error: toShortText(entry.error),
    detail: toShortText(entry.detail),
    stageLog: normaliseStageLog(entry.log),
  };
}

export function normaliseActivityHistory(activityHistory) {
  if (!Array.isArray(activityHistory)) return [];
  return activityHistory
    .slice(-MAX_ACTIVITY_ENTRIES)
    .map(normaliseActivityEntry)
    .filter((entry) => entry !== null);
}

/** Gather every public id so redaction keeps them. */
function collectPublicIds({ explicitPublicIds, contractAddress, activityEntries }) {
  const ids = [];
  if (Array.isArray(explicitPublicIds)) ids.push(...explicitPublicIds.filter((id) => typeof id === 'string'));
  if (typeof contractAddress === 'string' && contractAddress) ids.push(contractAddress);
  for (const entry of activityEntries) {
    if (typeof entry.txId === 'string' && entry.txId) ids.push(entry.txId);
  }
  return ids;
}

// ---------------------------------------------------------------------
// Wallet — connected? which network? 12-char address prefix only
// ---------------------------------------------------------------------

/** Only ever expose the first 12 chars of a bech32 address. */
export function toAddressPrefix(addressOrPrefix) {
  if (typeof addressOrPrefix !== 'string' || addressOrPrefix === '') return null;
  // Only Midnight bech32 addresses (mn_…) get a prefix; anything else is
  // dropped so a stray hex key can never ride along in this field.
  if (!addressOrPrefix.startsWith('mn_')) return null;
  return addressOrPrefix.slice(0, ADDRESS_PREFIX_LENGTH);
}

export function summariseWallet(walletSummary) {
  if (!walletSummary || typeof walletSummary !== 'object') {
    return { connected: false, networkLabel: null, addressPrefix: null };
  }
  return {
    connected: Boolean(walletSummary.connected),
    networkLabel: walletSummary.networkLabel ? String(walletSummary.networkLabel) : null,
    addressPrefix: toAddressPrefix(firstDefined(walletSummary.addressPrefix, walletSummary.address)),
  };
}

// ---------------------------------------------------------------------
// Health — reachable? latency? block height?
// ---------------------------------------------------------------------

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : null;
}

function summariseServiceHealth(service, { includeBlockHeight = false } = {}) {
  if (!service || typeof service !== 'object') {
    return includeBlockHeight
      ? { reachable: null, blockHeight: null, latencyMs: null }
      : { reachable: null, latencyMs: null };
  }
  const summary = {
    reachable: typeof service.reachable === 'boolean' ? service.reachable : null,
    latencyMs: toNumberOrNull(firstDefined(service.latencyMs, service.elapsedMs)),
  };
  if (includeBlockHeight) {
    summary.blockHeight = toNumberOrNull(firstDefined(service.blockHeight, service.height));
  }
  return summary;
}

export function summariseHealth(healthSnapshot) {
  if (!healthSnapshot || typeof healthSnapshot !== 'object') return null;
  const summary = {
    checkedAt: toIsoTimestamp(firstDefined(healthSnapshot.checkedAt, healthSnapshot.at)),
    proofServer: summariseServiceHealth(healthSnapshot.proofServer),
    indexer: summariseServiceHealth(healthSnapshot.indexer, { includeBlockHeight: true }),
  };
  if (healthSnapshot.node) {
    summary.node = summariseServiceHealth(healthSnapshot.node, { includeBlockHeight: true });
  }
  return summary;
}

// ---------------------------------------------------------------------
// Errors — short, stringified, redacted
// ---------------------------------------------------------------------

export function sanitizeErrors(errors, publicIds = []) {
  if (!Array.isArray(errors)) return [];
  return errors
    .map((error) => errorToString(error))
    .filter((text) => text.length > 0)
    .map((text) => redactSensitiveText(text.slice(0, MAX_ERROR_LENGTH), { publicIds }));
}

function errorToString(error) {
  if (error === null || error === undefined) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === 'object' && typeof error.message === 'string') return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
