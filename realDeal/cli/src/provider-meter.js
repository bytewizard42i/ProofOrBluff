/**
 * provider-meter.js — counts OUR outbound calls to the chain providers and
 * alerts (then stops the wallet) before a retry storm burns the Blockfrost
 * daily quota again.
 *
 * WHAT: a per-minute bucket counter fed by node:diagnostics_channel, plus a
 * level machine (ok → warn → stop) with env-tunable thresholds, JSON
 * serialize/restore so counts survive restarts, and an optional webhook
 * alerter.
 *
 * WHY diagnostics_channel: the SDK talks to Blockfrost through three
 * different transports — global fetch (undici), node-fetch/cross-fetch and
 * the `ws` package's HTTP upgrade (node:http) — plus Node's built-in
 * WebSocket for subscriptions. Instrumenting each library would mean
 * patching three stacks; the channels below see all of them at the socket
 * layer, once per call.
 *
 * SECURITY: endpoint URLs carry the Blockfrost project token as
 * `?project_id=…`. This module extracts HOSTNAMES only and never logs a
 * URL, path or query string.
 *
 * Verified empirically on Node 22.23 (see provider-meter.test.js):
 *   - `undici:request:create`      { request } — fires for global fetch AND
 *     for the built-in WebSocket handshake (headers contain
 *     `sec-websocket-key`). A handshake counts as one wsOpen and zero
 *     http, at the ATTEMPT — so handshakes the provider rejects are
 *     counted too (`undici:websocket:open` is deliberately not used).
 *   - `undici:websocket:close`     { websocket, code, reason } —
 *     `websocket.url` carries the remote URL; host is re-derived there.
 *   - `http.client.request.start`  { request } — node:http/https clients
 *     (node-fetch, cross-fetch, the `ws` package handshake). A handshake
 *     has `Upgrade: websocket`; it counts as wsOpen, everything else http.
 */

import { channel, subscribe } from 'node:diagnostics_channel';

const MINUTE_MS = 60_000;
const DAY_MINUTES = 24 * 60;
const HOUR_MINUTES = 60;
const LEVEL_RANK = { ok: 0, warn: 1, stop: 2 };
const KINDS = ['http', 'wsOpen', 'wsClose'];

/**
 * Per-minute request meter with warn/stop thresholds.
 * @param {object} [options]
 * @param {() => number} [options.now]           clock (tests inject a fake)
 * @param {number} [options.hourlyWarn]          total (http+wsOpen) per hour → warn
 * @param {number} [options.dailyWarn]           total per 24 h → warn
 * @param {number} [options.dailyStop]           total per 24 h → stop
 * @param {(level: string, snapshot: object) => void} [options.onAlert]
 *        called ONLY on an upward level transition (ok→warn, ok→stop,
 *        warn→stop); a fall back to a lower level re-arms it. Throwing is
 *        swallowed — alerting must never break the app.
 */
export function createProviderMeter({
  now = Date.now,
  hourlyWarn = 1500,
  dailyWarn = 25000,
  dailyStop = 40000,
  onAlert = () => {},
} = {}) {
  /** minute → { http, wsOpen, wsClose }; pruned beyond 24 h on every record. */
  const buckets = new Map();
  let lastWsClose = null;
  let level = 'ok';

  const bucketFor = (minute) => {
    let bucket = buckets.get(minute);
    if (!bucket) {
      bucket = { http: 0, wsOpen: 0, wsClose: 0 };
      buckets.set(minute, bucket);
    }
    return bucket;
  };

  const prune = () => {
    const cutoff = Math.floor(now() / MINUTE_MS) - DAY_MINUTES;
    for (const minute of buckets.keys()) {
      if (minute < cutoff) buckets.delete(minute);
    }
  };

  const windowTotals = (windowMs) => {
    const cutoffMinute = Math.floor((now() - windowMs) / MINUTE_MS);
    const totals = { http: 0, wsOpen: 0, wsClose: 0 };
    for (const [minute, bucket] of buckets) {
      if (minute < cutoffMinute) continue;
      totals.http += bucket.http;
      totals.wsOpen += bucket.wsOpen;
      totals.wsClose += bucket.wsClose;
    }
    // WebSocket closes are informational (the quota counts requests and
    // connections, not close frames), so `total` excludes them.
    totals.total = totals.http + totals.wsOpen;
    return totals;
  };

  const computeLevel = () => {
    const lastHour = windowTotals(HOUR_MINUTES * MINUTE_MS);
    const last24h = windowTotals(DAY_MINUTES * MINUTE_MS);
    if (last24h.total >= dailyStop) return 'stop';
    if (lastHour.total >= hourlyWarn || last24h.total >= dailyWarn) return 'warn';
    return 'ok';
  };

  const snapshot = () => ({
    lastHour: windowTotals(HOUR_MINUTES * MINUTE_MS),
    last24h: windowTotals(DAY_MINUTES * MINUTE_MS),
    level,
    thresholds: { hourlyWarn, dailyWarn, dailyStop },
    lastWsClose,
  });

  const evaluate = () => {
    const next = computeLevel();
    if (LEVEL_RANK[next] > LEVEL_RANK[level]) {
      level = next;
      try {
        onAlert(level, snapshot());
      } catch {
        // Alerting (log/webhook) must never break request handling.
      }
    } else {
      // Equal or falling: store the new level so a later rise re-arms.
      level = next;
    }
  };

  /** Count one outbound provider call. `at` is epoch ms (tests). */
  const record = (kind, at = now()) => {
    if (!KINDS.includes(kind)) return;
    bucketFor(Math.floor(at / MINUTE_MS))[kind] += 1;
    prune();
    evaluate();
  };

  return {
    record,
    /** Record a provider WebSocket close (code + short reason for logs). */
    noteWsClose({ code, reason } = {}) {
      lastWsClose = {
        code: code ?? null,
        reason: String(reason ?? '').slice(0, 120),
        at: new Date(now()).toISOString(),
      };
      record('wsClose');
    },
    snapshot,
    /** JSON-safe view of the buckets for persistence across restarts. */
    serialize() {
      return { buckets: Object.fromEntries(buckets) };
    },
    /**
     * Restore buckets from serialize() output (or a bare {minute: counts}
     * map). Malformed input and buckets older than 24 h are ignored.
     */
    restore(data) {
      const source = data && typeof data === 'object'
        ? (data.buckets && typeof data.buckets === 'object' ? data.buckets : data)
        : null;
      if (!source) return;
      const cutoff = Math.floor(now() / MINUTE_MS) - DAY_MINUTES;
      for (const [key, value] of Object.entries(source)) {
        const minute = Number(key);
        const currentMinute = Math.floor(now() / MINUTE_MS);
        // Integer minutes only: not in the future, not older than 24 h.
        if (!Number.isInteger(minute) || minute < cutoff || minute > currentMinute || !value || typeof value !== 'object') continue;
        const bucket = bucketFor(minute);
        for (const kind of KINDS) {
          const n = Number(value[kind]);
          if (Number.isFinite(n) && n > 0) bucket[kind] += Math.floor(n);
        }
      }
      evaluate();
    },
  };
}

// ---------------------------------------------------------------------------
// Channel plumbing
// ---------------------------------------------------------------------------

/** Hostname from a URL-ish string ('http://h:1', 'ws://h:1/x', 'h:1'). */
function hostnameFrom(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    return new URL(value.includes('://') ? value : `http://${value}`).hostname || null;
  } catch {
    return null;
  }
}

/** Does a headers bag (Headers | flat [k,v,…] array | plain object) have `name`? */
function headersHave(headers, name) {
  if (!headers) return false;
  const wanted = name.toLowerCase();
  if (typeof headers.get === 'function') return headers.get(name) != null || headers.get(wanted) != null;
  if (Array.isArray(headers)) {
    for (let i = 0; i + 1 < headers.length; i += 2) {
      if (String(headers[i]).toLowerCase() === wanted) return true;
    }
    return false;
  }
  return Object.keys(headers).some((k) => k.toLowerCase() === wanted);
}

/** Host for a node:http ClientRequest: Host header first, .host fallback. */
function hostFromClientRequest(request) {
  let raw = null;
  try {
    raw = typeof request.getHeader === 'function' ? request.getHeader('host') : null;
  } catch { /* fall through to .host */ }
  if (!raw && typeof request.host === 'string') raw = request.host;
  return hostnameFrom(raw);
}

/**
 * Subscribe the meter to every transport the SDK uses. Returns uninstall().
 * @param {ReturnType<typeof createProviderMeter>} meter
 * @param {object} [options]
 * @param {RegExp} [options.hostPattern] hostname regex (default: Blockfrost)
 * @param {(line: string) => void} [options.log] sink for the ws-close line
 */
export function installProviderMeter(meter, { hostPattern = /(^|\.)blockfrost\.io$/i, log = null } = {}) {
  const matches = (host) => typeof host === 'string' && hostPattern.test(host);

  // undici emits request:create for the built-in WebSocket handshake too.
  // Count the connection HERE, at the attempt: a handshake the provider
  // rejects (402/429) never reaches websocket:open, and rejected handshakes
  // are exactly what a retry storm looks like.
  const onUndiciRequest = ({ request } = {}) => {
    if (!request) return;
    const host = hostnameFrom(request.origin) ?? hostnameFrom(request.url);
    if (!matches(host)) return;
    meter.record(headersHave(request.headers, 'sec-websocket-key') ? 'wsOpen' : 'http');
  };

  const onUndiciWsClose = ({ websocket, code, reason } = {}) => {
    const host = hostnameFrom(websocket?.url);
    if (!matches(host)) return;
    meter.noteWsClose({ code, reason });
    if (log) {
      log(`provider websocket closed host=${host} code=${code ?? 'unknown'} reason=${String(reason ?? '').slice(0, 120)}`);
    }
  };

  const onHttpClientStart = ({ request } = {}) => {
    if (!request) return;
    const host = hostFromClientRequest(request);
    if (!matches(host)) return;
    let upgrade = null;
    try {
      upgrade = typeof request.getHeader === 'function' ? request.getHeader('upgrade') : null;
    } catch { /* treat as plain http */ }
    if (typeof upgrade === 'string' && upgrade.toLowerCase() === 'websocket') {
      // The `ws` package handshake IS the whole connection setup; the
      // socket's later frames raise no further request events.
      meter.record('wsOpen');
    } else {
      meter.record('http');
    }
  };

  // Node 22's subscribe() returns undefined — removal goes through
  // channel(name).unsubscribe(callback), so keep the (channel, callback)
  // pairs for uninstall().
  const handlers = [
    ['undici:request:create', onUndiciRequest],
    ['undici:websocket:close', onUndiciWsClose],
    ['http.client.request.start', onHttpClientStart],
  ];
  for (const [name, handler] of handlers) subscribe(name, handler);
  return () => {
    for (const [name, handler] of handlers) channel(name).unsubscribe(handler);
  };
}

/**
 * POST a provider alert to an incoming webhook (Slack/Discord/ntfy style:
 * `{ text, content }` carry the same message). Never throws and never logs
 * the URL — webhook URLs are secrets too.
 * @returns {Promise<boolean>} true when the POST was attempted successfully
 */
export async function sendProviderAlert(webhookUrl, message, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message, content: message }),
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok !== false;
  } catch {
    return false;
  }
}
