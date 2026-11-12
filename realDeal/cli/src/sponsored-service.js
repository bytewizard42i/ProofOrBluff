#!/usr/bin/env node
// Sponsored (wallet-free) game service — api.prooforbluff.app/v1
// (docs/SPONSORED_GAME_API.md). Season 1: players never see a wallet; this
// process plays the bot seat, holds the operator wallet and pays all DUST.
//
// Three parts, kept separate so each is testable without the others:
//   * createSponsoredHttpApp()  — the HTTP routes over an in-memory game table.
//     Talks to the chain ONLY through the `chain` object it is given.
//   * createChainQueue()        — ONE serialized queue of chain steps for the
//     one operator wallet (deploy / proveRound / closeGame). Each step is
//     persisted to POB_SPONSORED_STATE_DIR before it runs and marked done after,
//     so a crash mid-proof resumes instead of losing the proof.
//   * main()                    — wires the real v3p contract API + wallet.
//
// Trust boundary: loopback only (Caddy terminates TLS and locks CORS at the
// edge; we re-check Origin here too). JSON bodies are tiny (moves). Game ids
// are 32 random bytes — the only handle a player ever holds.

import http from 'node:http';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { createSponsoredGame, GAME_STATUS, GameError, MODES, DIFFICULTIES } from './sponsored-game.js';
import { createFiveUpGame, FIVE_UP_MODES, GAME_TYPE as FIVE_UP } from './five-up-game.js';
import { createProviderMeter, installProviderMeter, sendProviderAlert } from './provider-meter.js';

// The two tables. `original` = the Cheat-style rollup (v3p/v4, picked by
// POB_CONTRACT_VERSION); `fiveup` = 5 Up 2 Down. Each game remembers its type
// so the chain queue asks for the right contract binding.
export const GAME_TYPES = Object.freeze(['original', FIVE_UP]);

// Use the current SDK verdict and expire observations if the stream stalls.
// An old positive DUST balance does not establish that the wallet can transact.
export function walletObservation(state, now = Date.now()) {
  return {
    balance: state.dust?.balance(new Date(now)) ?? 0n,
    synced: state.isSynced === true,
    at: new Date(now).toISOString(),
  };
}

/**
 * Re-sample the wallet's CURRENT state once. The facade's `state()` is a
 * combineLatest over replaying sub-wallet states, so a fresh subscription
 * emits the latest value immediately even when nothing has changed. A quiet
 * Mainnet wallet (no events for this address) otherwise emits NOTHING for
 * long stretches, so a push-only observation went stale after 5 minutes and
 * readiness flapped between ok and "paused" (2026-11-12 incident: players
 * were refused mid-evening while the wallet was perfectly healthy).
 * Returns a promise of the observation, or null if the stream stays silent
 * for `timeoutMs` — the caller then leaves the staleness expiry to stand.
 */
export function sampleWalletObservation(state$, timeoutMs = 5_000, now = Date.now) {
  return new Promise((resolve) => {
    let done = false;
    let subscription = null;
    const finish = (value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      queueMicrotask(() => subscription?.unsubscribe());
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    timer.unref?.();
    subscription = state$.subscribe({
      next: (st) => finish(walletObservation(st, now())),
      error: () => finish(null),
      complete: () => finish(null),
    });
    if (done) subscription.unsubscribe();
  });
}

export function walletIsCurrent(observation, now = Date.now()) {
  const age = now - Date.parse(observation.at);
  return observation.synced && age >= 0 && age < 5 * 60_000;
}

/** One bounded request before starting the SDK's background subscriptions. */
export async function checkIndexerAvailability(indexerUrl, fetchRequest = fetch) {
  const response = await fetchRequest(indexerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ block { height protocolVersion } }' }),
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 402 || response.status === 429) {
    throw new Error(`Indexer access paused (HTTP ${response.status}): check the Blockfrost quota before restarting the API.`);
  }
  if (!response.ok) throw new Error(`Indexer unavailable (HTTP ${response.status}); wallet sync was not started.`);
  const body = await response.json();
  if (!body.data?.block || body.errors?.length) throw new Error('Indexer did not return a valid block; wallet sync was not started.');
}

// Bind address. Loopback by default (local dev, or a bare-metal box where Caddy
// runs on the same host). Inside the Docker stack (ops/vps/compose.yaml) Caddy
// lives in ANOTHER container and reaches us over the compose network, so the
// container sets POB_API_HOST=0.0.0.0 — still unreachable from the internet
// because the port is `expose`d to the compose network only, never published.
const LOOPBACK_HOST = process.env.POB_API_HOST || '127.0.0.1';
const DEFAULT_PORT = 3020;
const MAX_JSON_BODY_BYTES = 4 * 1024;
const MAX_OPEN_GAMES = 200;
const GAME_TTL_MS = 6 * 60 * 60 * 1000;   // finished games are forgotten after 6 h
// A LIVE game with no request for this long is abandoned (player closed the
// tab without the beacon landing, lost power, walked away). Nothing is saved.
const IDLE_ABANDON_MS = Number(process.env.POB_IDLE_ABANDON_MS || 10 * 60 * 1000);
const DEFAULT_ALLOWED_ORIGINS = ['https://prooforbluff.app', 'http://localhost:3016', 'http://127.0.0.1:3016', 'http://localhost:5173'];

const log = (m) => console.log(`${new Date().toISOString()}  ${m}`);

// ---------------------------------------------------------------------------
// HTTP helpers (same shape as bot.js; kept local so the two services stay independent)
// ---------------------------------------------------------------------------
class HttpError extends Error {
  constructor(statusCode, message) { super(message); this.statusCode = statusCode; }
}

/**
 * Comma-separated bare origins. An entry may start with `https://*` to allow
 * a suffix (e.g. `https://*-enterpisezk-labs-projects.vercel.app` for our own
 * Vercel preview deployments — never a bare `https://*`).
 */
export function allowedOriginsFromEnvironment(env = process.env) {
  if (!env.POB_ALLOWED_ORIGINS) return new Set(DEFAULT_ALLOWED_ORIGINS);
  return new Set(env.POB_ALLOWED_ORIGINS.split(',').map((raw) => {
    const o = raw.trim();
    if (o.startsWith('https://*')) {
      if (o.length < 'https://*.x.yz'.length || o.includes('/', 8)) throw new Error(`POB_ALLOWED_ORIGINS wildcard "${o}" must be https://*<suffix> with a real suffix.`);
      return o;
    }
    const origin = new URL(o).origin;
    if (origin !== o.replace(/\/$/, '')) throw new Error(`POB_ALLOWED_ORIGINS entry "${o}" must be a bare origin.`);
    return origin;
  }));
}

export function originAllowed(origin, allowedOrigins) {
  if (allowedOrigins.has(origin)) return true;
  for (const a of allowedOrigins) {
    if (a.startsWith('https://*') && origin.startsWith('https://') && origin.endsWith(a.slice('https://*'.length)) && !origin.includes('/', 8)) return true;
  }
  return false;
}

function applyCors(request, response, allowedOrigins) {
  const origin = request.headers.origin;
  response.setHeader('Vary', 'Origin');
  if (!origin) return;
  if (!originAllowed(origin, allowedOrigins)) throw new HttpError(403, 'Origin not allowed.');
  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Max-Age', '86400');
}

/** bigint → string / Number so views are plain JSON. */
export function toJsonSafe(value) {
  if (typeof value === 'bigint') return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();
  if (value instanceof Uint8Array) return Buffer.from(value).toString('hex');
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toJsonSafe(v)]));
  return value;
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(toJsonSafe(payload));
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

async function readJsonBody(request, maxBytes = MAX_JSON_BODY_BYTES) {
  const contentType = request.headers['content-type'];
  if (typeof contentType !== 'string' || !contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'POST requests require Content-Type: application/json.');
  }
  const chunks = []; let received = 0;
  for await (const chunk of request) {
    received += chunk.length;
    if (received > maxBytes) throw new HttpError(413, `JSON body exceeds ${maxBytes} bytes.`);
    chunks.push(chunk);
  }
  if (received === 0) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'Body is not valid JSON.'); }
}

function safeErrorMessage(error, env = process.env) {
  // Include the whole cause chain: midnight.js wraps node rejections as
  // "Transaction submission error" with the real reason in error.cause.
  const parts = [];
  for (let e = error, depth = 0; e && depth < 6; e = e.cause, depth += 1) {
    parts.push(String(e?.message ?? e));
    if (e?.response?.statusText) parts.push(`http ${e.response.status} ${e.response.statusText}`);
    if (e?.data) parts.push(JSON.stringify(e.data).slice(0, 400));
  }
  const message = parts.join(' ← ') || String(error);
  const projectId = env.BLOCKFROST_PROJECT_ID?.trim();
  return projectId ? message.replaceAll(projectId, '[redacted]') : message;
}

/** Wrap console.* so a secret token can never reach the log stream. */
export function installConsoleRedaction(secret, target = console) {
  if (!secret) return () => {};
  const scrub = (v) => (typeof v === 'string' ? v.replaceAll(secret, '[redacted]') : v instanceof Error ? Object.assign(v, { message: scrub(v.message) }) : v);
  const originals = {};
  for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
    originals[level] = target[level];
    target[level] = (...args) => originals[level].apply(target, args.map(scrub));
  }
  return () => Object.assign(target, originals);
}

// ---------------------------------------------------------------------------
// Chain queue — one wallet, strictly serialized, persisted, resumable
// ---------------------------------------------------------------------------
/**
 * @param {object} options
 * @param {object} options.chain          { deployGame(args) → {contractAddress,txHash,blockHeight},
 *                                          proveRound({round,witnesses}) → {txHash,blockHeight},
 *                                          closeGame(args) → {txHash,blockHeight} }
 *                                        One per game; obtained via options.chainForGame(gameId, contractAddress|null, gameType).
 * @param {string} [options.stateDir]     where pending/done step files live (null = memory only)
 * @param {function} options.onReceipt    (gameId, receipt) → void
 * @param {function} [options.beforeStep]   async (gameId, step) → void, awaited inside the
 *                                        serialized tail before each step runs. Used by main()
 *                                        to wait for spendable DUST so chained transactions
 *                                        cannot outrun the wallet's fee-UTXO tracking.
 *                                        Throwing fails the step loudly (recorded + logged).
 */
export function createChainQueue({ chainForGame, stateDir = null, onReceipt, onError = () => {}, serializeStep = defaultSerializeStep, beforeStep = async () => {}, maxAttempts = 3, retryDelayMs = 20_000 }) {
  let tail = Promise.resolve();
  const stats = { submitted: 0, failed: 0, cancelled: 0, lastError: null, seconds: [] };
  const inFlight = new Set();
  /** gameIds whose not-yet-started steps must be skipped (player quit). */
  const cancelled = new Set();
  /** gameIds whose chain is broken (a step failed for good): later steps skip. */
  const dead = new Set();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function persist(gameId, step, status) {
    if (!stateDir) return;
    const dir = path.join(stateDir, status);
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${gameId}.${step.step}${step.round ? `.${step.round}` : ''}.json`);
    await writeFile(file, JSON.stringify(serializeStep(step)), 'utf8');
    return file;
  }
  async function markDone(gameId, step) {
    if (!stateDir) return;
    const name = `${gameId}.${step.step}${step.round ? `.${step.round}` : ''}.json`;
    await mkdir(path.join(stateDir, 'done'), { recursive: true });
    await rename(path.join(stateDir, 'pending', name), path.join(stateDir, 'done', name)).catch(() => {});
  }

  function enqueue(gameId, step, { contractAddressRef }) {
    const key = `${gameId}:${step.step}:${step.round ?? ''}`;
    inFlight.add(key);
    tail = tail.then(async () => {
      if (cancelled.has(gameId)) {
        // The player quit before this step started: drop it. No proof, no
        // DUST, no transaction — exactly like a step that never existed.
        stats.cancelled += 1; inFlight.delete(key);
        await persist(gameId, step, 'abandoned');
        log(`chain ${gameId.slice(0, 8)} ${step.step}${step.round ? `(${step.round})` : ''} skipped — game abandoned`);
        return;
      }
      if (dead.has(gameId)) {
        // An earlier step for this game failed for good (e.g. its deploy never
        // landed): dependents can never succeed, so drop them without burning
        // a proof or a transaction.
        stats.cancelled += 1; inFlight.delete(key);
        await persist(gameId, step, 'abandoned');
        log(`chain ${gameId.slice(0, 8)} ${step.step}${step.round ? `(${step.round})` : ''} skipped — earlier step failed`);
        return;
      }
      await persist(gameId, step, 'pending');
      const started = Date.now();
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        // beforeStep runs inside try: a throw must fail THIS step only — a
        // rejection outside try would reject `tail` and skip every later step.
        await beforeStep(gameId, step);
        const api = await chainForGame(gameId, contractAddressRef.current, contractAddressRef.gameType ?? 'original');
        let receipt;
        if (step.step === 'deploy') {
          const r = await api.deployGame(step.args);
          contractAddressRef.current = r.contractAddress;
          receipt = { step: 'deploy', ...r };
        } else if (step.step === 'proveRound') {
          const r = await api.proveRound({ round: step.round, witnesses: step.witnesses });
          receipt = { step: 'proveRound', round: step.round, txHash: r.txHash, blockHeight: r.blockHeight };
        } else if (step.step === 'closeGame') {
          if (!contractAddressRef.current) throw new Error('closeGame queued before the deploy receipt — deploy failed?');
          const r = await api.closeGame(step.build ? step.build(contractAddressRef.current) : step.args);
          receipt = { step: 'closeGame', ...r };
        } else throw new Error(`unknown chain step ${step.step}`);
        receipt.seconds = Number(((Date.now() - started) / 1000).toFixed(1));
        stats.submitted += 1; stats.seconds.push(receipt.seconds);
        await markDone(gameId, step);
        onReceipt(gameId, receipt);
        log(`chain ${gameId.slice(0, 8)} ${step.step}${step.round ? `(${step.round})` : ''} tx=${receipt.txHash} block=${receipt.blockHeight} ${receipt.seconds}s`);
        break;
      } catch (error) {
        // Player quit while we were sleeping between attempts: drop the step
        // quietly — it's an abandonment, not a failure.
        if (cancelled.has(gameId)) {
          stats.cancelled += 1;
          await persist(gameId, step, 'abandoned');
          log(`chain ${gameId.slice(0, 8)} ${step.step}${step.round ? `(${step.round})` : ''} dropped — game abandoned during retry`);
          break;
        }
        // A step that never submitted is safe to retry (the tx was rejected
        // before inclusion). A tx that might have landed is retried too: the
        // contract's own phase guards reject a true duplicate, which then
        // fails loudly instead of silently double-applying.
        if (attempt < maxAttempts) {
          log(`chain ${gameId.slice(0, 8)} ${step.step}${step.round ? `(${step.round})` : ''} attempt ${attempt}/${maxAttempts} failed: ${safeErrorMessage(error)} — retrying in ${Math.round(retryDelayMs / 1000)}s`);
          await sleep(retryDelayMs);
          continue;
        }
        stats.failed += 1; stats.lastError = { at: new Date().toISOString(), step: step.step, message: safeErrorMessage(error) };
        dead.add(gameId);
        log(`chain ${gameId.slice(0, 8)} ${step.step} FAILED after ${attempt} attempt${attempt > 1 ? 's' : ''}: ${safeErrorMessage(error)} — later steps for this game will be skipped`);
        onError(gameId, step, error);
      }
      }
      inFlight.delete(key);
    });
    return tail;
  }

  /** Skip every queued-but-unstarted step for `gameId`. A step mid-proof finishes; its receipt is ignored by the service. */
  function cancel(gameId) { cancelled.add(gameId); }

  return {
    enqueue,
    cancel,
    get pending() { return inFlight.size; },
    get stats() { return { ...stats, avgSeconds: stats.seconds.length ? Number((stats.seconds.reduce((a, b) => a + b, 0) / stats.seconds.length).toFixed(1)) : null }; },
    /** Resolves once everything queued so far has run (tests / shutdown). */
    idle: () => tail,
  };
}

/** Steps hold bigints and Uint8Arrays; make them JSON for the pending/ files. */
function defaultSerializeStep(step) { return toJsonSafe({ ...step, witnesses: step.witnesses ? '[witnesses omitted from disk]' : undefined }); }

// ---------------------------------------------------------------------------
// HTTP app
// ---------------------------------------------------------------------------
/**
 * @param {object} options
 * @param {object} options.pureCircuits
 * @param {object} options.queue           from createChainQueue
 * @param {function} [options.readiness]   () → { ok, reason } — 503 on game creation when !ok
 * @param {Set<string>} [options.allowedOrigins]
 * @param {function} [options.now]
 * @param {function} [options.healthExtra]  () → object merged into /v1/health
 *                                        (main() uses it for the provider meter)
 */
export function createSponsoredHttpApp({
  pureCircuits, fiveUpPureCircuits = null, queue, readiness = () => ({ ok: true }), allowedOrigins = new Set(DEFAULT_ALLOWED_ORIGINS), now = Date.now, ai, random,
  network = process.env.POB_NETWORK_ID || 'undeployed', walletAddress = null, walletExtra = () => ({}), healthExtra = () => ({}),
  contractVersion = process.env.POB_CONTRACT_VERSION || 'v3p',
}) {
  /** gameId → { game, contractAddressRef, touchedAt } */
  const games = new Map();
  const totals = { created: 0, ended: 0, closed: 0, abandoned: 0, wins: { human: 0, bot: 0, draw: 0 } };

  /** Quit a live game: drop its unstarted chain steps and forget it. Idempotent; safe on unknown ids. */
  function abandonGame(gameId, reason = 'quit') {
    const entry = games.get(gameId);
    if (!entry) return null;
    const wasLive = entry.game.status === GAME_STATUS.PLAYING;
    const view = entry.game.abandon();
    if (wasLive) {
      queue.cancel(gameId);
      totals.abandoned += 1;
      log(`game ${gameId.slice(0, 8)} abandoned (${reason})`);
    }
    games.delete(gameId);
    return withNetwork(view);
  }

  /**
   * Housekeeping, run on every createGame and from a timer in main():
   *  - live games nobody has touched for IDLE_ABANDON_MS are abandoned
   *    (the browser-closed-without-beacon case);
   *  - finished games older than GAME_TTL_MS with no chain work left are forgotten.
   */
  function sweep() {
    const t = now();
    for (const [id, entry] of games) {
      if (entry.game.status === GAME_STATUS.PLAYING) {
        if (entry.touchedAt < t - IDLE_ABANDON_MS) abandonGame(id, 'idle');
      } else if (entry.touchedAt < t - GAME_TTL_MS && entry.game.view().chain.pending.length === 0) {
        games.delete(id);
      }
    }
  }

  function drain(entry) {
    for (const step of entry.game.takePendingChainSteps()) {
      queue.enqueue(entry.game.gameId, step, { contractAddressRef: entry.contractAddressRef });
    }
  }

  function receipt(gameId, r) {
    const entry = games.get(gameId);
    if (!entry) return;
    entry.game.recordReceipt(r);
    if (r.step === 'closeGame') totals.closed += 1;
  }

  function getGame(gameId) {
    const entry = games.get(gameId);
    if (!entry) throw new HttpError(404, 'Unknown game.');
    entry.touchedAt = now();
    return entry;
  }

  function createGame(body) {
    const ready = readiness();
    if (!ready.ok) throw new HttpError(503, ready.reason || 'Service not ready.');
    sweep();
    if (games.size >= MAX_OPEN_GAMES) throw new HttpError(429, 'Too many open games right now; try again in a minute.');
    const gameType = body.game ?? 'original';
    if (!GAME_TYPES.includes(gameType)) throw new HttpError(400, `game must be one of ${GAME_TYPES.join(', ')}.`);
    const mode = body.mode ?? 1;
    const difficulty = body.difficulty ?? 'medium';
    if (!DIFFICULTIES.includes(difficulty)) throw new HttpError(400, 'difficulty must be easy, medium or hard.');
    const gameId = randomBytes(32).toString('hex');
    let game;
    if (gameType === FIVE_UP) {
      if (!fiveUpPureCircuits) throw new HttpError(503, '5 Up 2 Down is not enabled on this server yet.');
      if (!FIVE_UP_MODES.includes(mode)) throw new HttpError(400, 'mode must be 0 (Casual) or 1 (Standard) for 5 Up 2 Down.');
      game = createFiveUpGame({ gameId, mode, difficulty, pureCircuits: fiveUpPureCircuits, random });
    } else {
      if (!MODES.includes(mode)) throw new HttpError(400, 'mode must be 0, 1 or 4.');
      game = createSponsoredGame({ gameId, mode, difficulty, pureCircuits, ai, random, contractVersion });
    }
    const entry = { game, contractAddressRef: { current: null, gameType }, touchedAt: now() };
    games.set(gameId, entry);
    totals.created += 1;
    queue.enqueue(gameId, { step: 'deploy', args: game.constructorArgs() }, { contractAddressRef: entry.contractAddressRef });
    return game.view();
  }

  function act(entry, fn) {
    const before = entry.game.status;
    try {
      const view = fn(entry.game);
      drain(entry);
      if (before === GAME_STATUS.PLAYING && entry.game.status !== GAME_STATUS.PLAYING) {
        totals.ended += 1; totals.wins[view.winner] += 1;
      }
      return withNetwork(view);
    } catch (error) {
      if (error instanceof GameError) throw new HttpError(error.status, error.message);
      throw error;
    }
  }
  const withNetwork = (view) => ({ ...view, chain: { network, ...view.chain } });

  function health() {
    const ready = readiness();
    return {
      ok: ready.ok, reason: ready.ok ? undefined : ready.reason, network,
      wallet: { address: walletAddress, dustReady: ready.ok, ...walletExtra() },
      proofQueue: { pending: queue.pending },
      // `openGames` counts LIVE games only. Finished games stay in the map
      // for the transcript/receipt endpoints and sweep after GAME_TTL_MS, so
      // counting `games.size` made dropped games look "open" (2026-11-12).
      openGames: [...games.values()].filter((e) => e.game.status === GAME_STATUS.PLAYING).length,
      retainedGames: games.size,
      ...healthExtra(),
    };
  }
  function statsView() {
    const live = [...games.values()].filter((e) => e.game.status === GAME_STATUS.PLAYING).length;
    return { ...totals, openGames: live, retainedGames: games.size, chain: queue.stats, uptimeSeconds: Math.round(process.uptime()) };
  }

  async function handle(request, response) {
    try {
      applyCors(request, response, allowedOrigins);
      if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
      const url = new URL(request.url, 'http://localhost');
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] !== 'v1') throw new HttpError(404, 'Not found.');

      if (parts[1] === 'health' && request.method === 'GET') return sendJson(response, 200, health());
      if (parts[1] === 'stats' && request.method === 'GET') return sendJson(response, 200, statsView());
      if (parts[1] !== 'games') throw new HttpError(404, 'Not found.');

      if (parts.length === 2 && request.method === 'POST') {
        const body = await readJsonBody(request);
        return sendJson(response, 201, withNetwork(createGame(body)));
      }
      const gameId = parts[2];
      if (!/^[0-9a-f]{64}$/.test(gameId ?? '')) throw new HttpError(404, 'Unknown game.');
      // Quit. Also the target of navigator.sendBeacon on tab close, so the
      // body may be empty / text/plain and the game may already be gone —
      // never require JSON and never 404 here.
      if (parts[3] === 'abandon' && request.method === 'POST') {
        await readJsonBody(request).catch(() => ({}));
        return sendJson(response, 200, abandonGame(gameId, 'quit') ?? { gameId, status: 'abandoned' });
      }
      const entry = getGame(gameId);
      if (parts.length === 3 && request.method === 'GET') return sendJson(response, 200, withNetwork(entry.game.view()));
      if (parts[3] === 'transcript' && request.method === 'GET') return sendJson(response, 200, act(entry, (g) => g.transcript()));
      if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
      const action = parts[3];
      if (action === 'play') {
        const body = await readJsonBody(request);
        return sendJson(response, 200, act(entry, (g) => {
          if (!g.humanPlay) throw new GameError(409, 'this table takes claims, not plays — POST /claim');
          return g.humanPlay({ rank: body.rank, count: body.count, cards: body.cards });
        }));
      }
      if (action === 'claim') {
        const body = await readJsonBody(request);
        return sendJson(response, 200, act(entry, (g) => {
          if (!g.humanClaim) throw new GameError(409, 'this table takes plays, not claims — POST /play');
          return g.humanClaim({ count: body.count, ranks: body.ranks });
        }));
      }
      if (action === 'accept') { await readJsonBody(request).catch(() => ({})); return sendJson(response, 200, act(entry, (g) => g.humanAccept())); }
      if (action === 'challenge') { await readJsonBody(request).catch(() => ({})); return sendJson(response, 200, act(entry, (g) => g.humanChallenge())); }
      if (action === 'pass' || action === 'next') {
        await readJsonBody(request).catch(() => ({}));
        return sendJson(response, 200, act(entry, (g) => {
          // pass is 5U2D-only; next is shared — both tables hold a finished
          // hand until the player deals the next one.
          if (action === 'pass' && !g.humanPass) throw new GameError(409, 'this table has no pass action');
          if (action === 'next' && !g.nextRound) throw new GameError(409, 'this table has no next action');
          return action === 'pass' ? g.humanPass() : g.nextRound();
        }));
      }
      throw new HttpError(404, 'Not found.');
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      if (status === 500) log(`500: ${safeErrorMessage(error)}`);
      sendJson(response, status, { error: status === 500 ? 'Internal error.' : safeErrorMessage(error) });
    }
  }

  return { handle, receipt, health, stats: statsView, sweep, _games: games };
}

// ---------------------------------------------------------------------------
// main — real wallet + v3p contract API
// ---------------------------------------------------------------------------
async function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.join(here, '..', '.env') });
  dotenv.config({ path: path.join(here, '..', '.env.local'), override: true });

  const networkId = process.env.POB_NETWORK_ID || 'preview';
  if (networkId === 'mainnet' && !process.env.BLOCKFROST_PROJECT_ID) throw new Error('Mainnet needs BLOCKFROST_PROJECT_ID.');
  const seedHex = process.env[`POB_PUBLIC_SEED_${networkId.toUpperCase()}_P2`] || process.env.POB_PUBLIC_SEED_P2;
  if (!seedHex) throw new Error(`Set POB_PUBLIC_SEED_${networkId.toUpperCase()}_P2 (operator wallet).`);
  const proofServer = process.env.POB_PROOF_SERVER || 'http://127.0.0.1:6300';
  const stateDir = process.env.POB_SPONSORED_STATE_DIR || path.join(here, '..', '.sponsored-state');
  const port = Number(process.env.POB_API_PORT || DEFAULT_PORT);

  // The Blockfrost token rides in the endpoint URLs, and third-party libraries
  // (polkadot RPC reconnect notices, etc.) print those URLs verbatim. Scrub it
  // from everything that reaches stdout/stderr so container logs stay clean.
  installConsoleRedaction(process.env.BLOCKFROST_PROJECT_ID?.trim());

  // Keep liveness separate from readiness, including DURING wallet startup.
  // A quota/configuration failure must not crash into Docker/watchdog restarts.
  let app, queue, walletHandle, walletSubscription, walletGuardTimer, walletRefreshTimer;
  let walletStoppedReason = null;
  // Live DUST view — declared here (not beside the wallet subscription below)
  // so the provider-budget stop path can mark it unsynced before a wallet
  // even exists.
  let dust = { balance: 0n, synced: false, at: new Date().toISOString() };
  let startupReason = 'Wallet is starting; games are paused.';

  // Provider request meter — installed BEFORE any wallet/provider traffic so
  // every outbound call is counted from the first one. Buckets persist to
  // <stateDir>/provider-usage.json (60 s + shutdown) so a restart does not
  // reset the daily budget. 'stop' level aborts providerStop (passed to
  // buildWalletFromSeed) and shuts a running wallet down via stopWallet().
  const envCount = (name, fallback) => {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
  };
  const providerMeter = createProviderMeter({
    hourlyWarn: envCount('POB_PROVIDER_HOURLY_WARN', 1500),
    dailyWarn: envCount('POB_PROVIDER_DAILY_WARN', 25000),
    dailyStop: envCount('POB_PROVIDER_DAILY_STOP', 40000),
    onAlert: (level, snap) => {
      handleProviderAlert(level, snap).catch((error) => log(`provider alert handler failed: ${safeErrorMessage(error)}`));
    },
  });
  const providerUsagePath = path.join(stateDir, 'provider-usage.json');
  try {
    providerMeter.restore(JSON.parse(await readFile(providerUsagePath, 'utf8')));
  } catch { /* first run or unreadable file — start with empty buckets */ }
  const providerHealth = () => {
    const snap = providerMeter.snapshot();
    return { lastHour: snap.lastHour.total, last24h: snap.last24h.total, level: snap.level, lastWsClose: snap.lastWsClose };
  };
  const uninstallProviderMeter = installProviderMeter(providerMeter, { log });
  const providerStop = new AbortController();
  const persistProviderUsage = async () => {
    try {
      await mkdir(stateDir, { recursive: true });
      await writeFile(`${providerUsagePath}.tmp`, JSON.stringify(providerMeter.serialize()), 'utf8');
      await rename(`${providerUsagePath}.tmp`, providerUsagePath);
    } catch { /* usage persistence is best-effort — never break the service */ }
  };
  const providerPersistTimer = setInterval(() => { persistProviderUsage().catch(() => {}); }, 60_000);
  providerPersistTimer.unref();
  const providerLogTimer = setInterval(() => {
    const snap = providerMeter.snapshot();
    log(`provider usage: lastHour=${snap.lastHour.total} (http=${snap.lastHour.http} ws=${snap.lastHour.wsOpen}) last24h=${snap.last24h.total} level=${snap.level}`);
  }, 3_600_000);
  providerLogTimer.unref();

  // Readiness notifier: pushes ONCE when the service first reports
  // ok+dustReady (the long cold-sync case — nobody should have to poll
  // /v1/health by hand). Re-arms if readiness drops again. Best-effort:
  // a failed probe or webhook never affects the service.
  const readinessWebhook = process.env.POB_ALERT_WEBHOOK_URL?.trim();
  if (readinessWebhook) {
    let webhookHost = 'webhook';
    try { webhookHost = new URL(readinessWebhook).hostname; } catch { /* keep generic label */ }
    log(`readiness notifier armed → ${webhookHost}`);
  }
  let wasReady = false;
  const readinessTimer = setInterval(async () => {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/v1/health`, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return;
      const body = await res.json();
      const ready = body?.ok === true && body?.wallet?.dustReady === true;
      if (ready && !wasReady) {
        wasReady = true;
        const message = `Proof or Bluff is live on ${networkId}: wallet synced, games are open.`;
        log(message);
        if (readinessWebhook) {
          const delivered = await sendProviderAlert(readinessWebhook, message, fetch, { priority: 'high' });
          if (!delivered) log('readiness alert webhook failed (check POB_ALERT_WEBHOOK_URL)');
        }
      } else if (!ready) {
        wasReady = false;
      }
    } catch { /* health probe is best-effort */ }
  }, 60_000);
  readinessTimer.unref();

  // The ONE place that stops the wallet's network activity: both the
  // 10-minute unavailability guard and the provider-budget 'stop' level land
  // here. Idempotent — the process stays alive in paused mode either way.
  async function stopWallet(reason) {
    const message = typeof reason === 'string' ? reason : (reason?.message ?? String(reason));
    if (walletStoppedReason) return;
    walletStoppedReason = message;
    if (walletGuardTimer) { clearInterval(walletGuardTimer); walletGuardTimer = null; }
    if (walletRefreshTimer) { clearInterval(walletRefreshTimer); walletRefreshTimer = null; }
    walletSubscription?.unsubscribe();
    dust = { ...dust, synced: false };
    log(`Wallet stopped: ${message}`);
    await walletHandle?.shutdown?.().catch(() => {});
  }

  // Provider-meter upward transitions: log, optionally webhook, and on
  // 'stop' abort the wallet (in-flight sync rejects with the reason; a
  // running wallet is shut down). The process stays alive and paused.
  async function handleProviderAlert(level, snap) {
    const lastHour = snap.lastHour.total;
    const last24h = snap.last24h.total;
    log(`PROVIDER ALERT level=${level} lastHour=${lastHour} last24h=${last24h}`);
    const webhook = process.env.POB_ALERT_WEBHOOK_URL?.trim();
    if (webhook) {
      const message = `Proof or Bluff provider alert: level=${level} lastHour=${lastHour} last24h=${last24h} on ${networkId}`;
      const delivered = await sendProviderAlert(webhook, message, fetch, {
        priority: level === 'stop' ? 'urgent' : 'high',
        email: process.env.POB_ALERT_EMAIL?.trim() || undefined,
      });
      if (!delivered) log('provider alert webhook failed (check POB_ALERT_WEBHOOK_URL)');
    }
    if (level === 'stop') {
      const reason = new Error('Provider request budget exceeded (24 h); wallet stopped to protect the quota.');
      providerStop.abort(reason);
      await stopWallet(reason);
    }
  }

  const server = http.createServer((request, response) => {
    if (app) return app.handle(request, response);
    try {
      applyCors(request, response, allowedOriginsFromEnvironment());
      if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
      if (request.method === 'GET' && request.url === '/v1/health') {
        return sendJson(response, 200, { ok: false, network: networkId, reason: startupReason, wallet: { synced: false }, provider: providerHealth() });
      }
      return sendJson(response, 503, { error: 'Games are temporarily paused. Please try again later.' });
    } catch (error) { sendJson(response, error.statusCode ?? 500, { error: 'Request refused.' }); }
  });
  server.keepAliveTimeout = 75_000;
  server.headersTimeout = 80_000;
  server.listen(port, LOOPBACK_HOST, () => log(`listening on http://${LOOPBACK_HOST}:${port}/v1`));
  const shutdown = async (signal) => {
    log(`${signal}: draining chain queue…`);
    server.close();
    if (walletGuardTimer) clearInterval(walletGuardTimer);
    if (walletRefreshTimer) clearInterval(walletRefreshTimer);
    clearInterval(providerPersistTimer);
    clearInterval(providerLogTimer);
    uninstallProviderMeter();
    await persistProviderUsage();
    if (queue) await Promise.race([queue.idle(), new Promise((r) => setTimeout(r, 120_000))]);
    walletSubscription?.unsubscribe();
    await walletHandle?.shutdown?.();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
  const { buildWalletFromSeed } = await import('./wallet-node.js');
  // Only the active v4 table has ledger-9 artifacts. Older bindings remain
  // available for historical regression tests, never as a Mainnet fallback.
  const contractVersion = process.env.POB_CONTRACT_VERSION || 'v4';
  if (contractVersion !== 'v4') throw new Error('The ledger-9 sponsored service requires POB_CONTRACT_VERSION=v4 and its regenerated artifacts.');
  const contractModule = contractVersion === 'v4' ? './rollup-v4-contract.js' : './rollup-v3p-contract.js';
  const contractApi = await import(contractModule);
  const getContractApi = contractVersion === 'v4' ? contractApi.getV4ContractApi : contractApi.getV3pContractApi;
  const managedDir = contractVersion === 'v4' ? contractApi.DEFAULT_V4_MANAGED_DIR : contractApi.DEFAULT_V3P_MANAGED_DIR;
  const { pureCircuits } = await import(path.join(managedDir, 'contract', 'index.js'));
  // 5 Up 2 Down rides alongside whichever Original contract is active. It is
  // enabled when its bindings + keys are present (POB_FIVE_UP=off disables).
  const fiveUp = await import('./five-up-contract.js');
  let fiveUpPureCircuits = null;
  if (process.env.POB_FIVE_UP !== 'off' && await fiveUp.hasKeys()) {
    ({ pureCircuits: fiveUpPureCircuits } = await import(path.join(fiveUp.DEFAULT_FIVE_UP_MANAGED_DIR, 'contract', 'index.js')));
  }
  log(`5 Up 2 Down: ${fiveUpPureCircuits ? 'enabled' : 'disabled (no keys)'}`);

  const endpoints = networkId === 'mainnet'
    ? (() => { const t = (u) => `${u}?project_id=${encodeURIComponent(process.env.BLOCKFROST_PROJECT_ID.trim())}`; return { node: t('https://rpc.midnight-mainnet.blockfrost.io'), indexer: t('https://midnight-mainnet.blockfrost.io/api/v0'), indexerWs: t('wss://midnight-mainnet.blockfrost.io/api/v0/ws'), proofServer }; })()
    : { node: `https://rpc.${networkId}.midnight.network`, indexer: `https://indexer.${networkId}.midnight.network/api/v4/graphql`, indexerWs: `wss://indexer.${networkId}.midnight.network/api/v4/graphql/ws`, proofServer };

  log(`sponsored service network=${networkId} proofServer=${proofServer} stateDir=${stateDir}`);
  // While the provider quota is exhausted (402/429) stay in paused mode and
  // re-check once per POB_INDEXER_RECHECK_MS (default 15 min) — one request
  // per check, so a day-long outage costs ~100 requests instead of ~40,000.
  // Any other indexer failure is left to the operator (no automatic retry).
  const INDEXER_RECHECK_MS = Number(process.env.POB_INDEXER_RECHECK_MS || 15 * 60_000);
  for (;;) {
    // A provider-budget 'stop' must also end the paused re-check loop —
    // otherwise a quota-protected service would keep polling all day.
    if (providerStop.signal.aborted) throw providerStop.signal.reason;
    try { await checkIndexerAvailability(endpoints.indexer); break; }
    catch (error) {
      if (!/access paused/.test(error.message)) throw error;
      startupReason = `${safeErrorMessage(error)} Re-checking in ${Math.round(INDEXER_RECHECK_MS / 60_000)} min.`;
      log(`Startup paused: ${startupReason}`);
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, INDEXER_RECHECK_MS);
        timer.unref?.();
        providerStop.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(providerStop.signal.reason ?? new Error('Provider request budget exceeded.'));
        }, { once: true });
      });
    }
  }
  startupReason = 'Wallet is syncing; games are paused.';
  // Sync snapshot on the state volume: restart = ~40 s instead of a ~20 min cold
  // sync (measured on Preview: 737 s cold → 37 s restored).
  const snapshotPath = process.env.POB_WALLET_SNAPSHOT || path.join(stateDir, `wallet-${networkId}.snapshot.json`);
  walletHandle = await buildWalletFromSeed({ seed: seedHex, endpoints, networkId, snapshotPath, signal: providerStop.signal });

  // One contract API instance per game (each binds to one contract address).
  const apis = new Map();
  const chainForGame = async (gameId, contractAddress, gameType = 'original') => {
    let api = apis.get(gameId);
    if (!api) {
      const factory = gameType === 'fiveup' ? fiveUp.getFiveUpContractApi : getContractApi;
      api = await factory({ networkId, walletHandle, endpoints, seedHex });
      if (contractAddress) await api.joinAt(contractAddress);
      apis.set(gameId, api);
    }
    return api;
  };

  // Live DUST view: a game costs several transactions, so refuse to open new
  // games unless the operator wallet can pay for at least one. Mirrors the
  // wallet facade's state stream; cheap to read on every /v1/health.
  // (`dust` itself is declared beside the other wallet lets above so the
  // provider-stop path can reach it before the wallet exists.)
  walletSubscription = walletHandle.api.state().subscribe({
    next: (st) => { dust = walletObservation(st); },
    error: () => { dust = { ...dust, synced: false }; log('Wallet state stream failed; games are paused.'); },
    complete: () => { dust = { ...dust, synced: false }; },
  });
  // The push stream above only fires on CHANGE. Re-sample once a minute so a
  // quiet-but-healthy wallet keeps a fresh observation (see
  // sampleWalletObservation); a dead stream still expires after 5 minutes.
  walletRefreshTimer = setInterval(async () => {
    if (walletStoppedReason) return;
    const fresh = await sampleWalletObservation(walletHandle.api.state());
    if (fresh) dust = fresh;
  }, 60_000);
  walletRefreshTimer.unref();
  // After initial sync, a prolonged failure stops network activity until an
  // operator restarts us. Keeping HTTP alive avoids automatic retry storms.
  let unavailableSince = null;
  walletGuardTimer = setInterval(async () => {
    if (walletIsCurrent(dust)) { unavailableSince = null; return; }
    unavailableSince ??= Date.now();
    if (Date.now() - unavailableSince < 10 * 60_000) return;
    await stopWallet('Wallet unavailable for 10 minutes: stopping sync to protect the provider quota. Inspect logs and provider status before manually restarting.');
  }, 30_000);
  walletGuardTimer.unref();
  const MIN_DUST_FOR_A_GAME = BigInt(process.env.POB_MIN_DUST_FOR_GAME || '1000000000000000'); // 1 DUST in specks (1 DUST = 1e15)
  const readiness = () => {
    if (walletStoppedReason) return { ok: false, reason: walletStoppedReason };
    if (!walletIsCurrent(dust)) return { ok: false, reason: 'Wallet sync is unavailable; games are paused.' };
    if (dust.balance < MIN_DUST_FOR_A_GAME) return { ok: false, reason: 'Operator wallet has no DUST yet; games are paused.' };
    return { ok: true };
  };

  // Gate every chain step on spendable DUST. The operator wallet pays fees
  // from ONE DUST UTXO: each submitted tx spends it and the wallet must spot
  // the change UTXO before the next step can balance a fee. 2026-10-06 incident:
  // seven rapid confirmed spends left the local view at 0 (indexer showed the
  // capacity), and closeGame died with "could not balance dust". So: never fire
  // a step while dust reads below the minimum — wait for the wallet view to
  // recover, and fail loudly (with the fix) if it never does.
  // POB_DUST_STEP_WAIT_MS bounds the wait (default 10 min; one poll / 15 s).
  const DUST_STEP_WAIT_MS = Number(process.env.POB_DUST_STEP_WAIT_MS || 10 * 60_000);
  let dustLowSince = null;
  const waitDustReady = async (gameId, step) => {
    if (walletIsCurrent(dust) && dust.balance >= MIN_DUST_FOR_A_GAME) { dustLowSince = null; return; }
    const label = `${step.step}${step.round != null ? `(${step.round})` : ''}`;
    if (!dustLowSince) { dustLowSince = new Date(); log(`chain ${gameId.slice(0, 8)} ${label}: spendable DUST=${dust.balance} — waiting for the wallet view to catch up…`); }
    const deadline = Date.now() + DUST_STEP_WAIT_MS;
    while (!walletIsCurrent(dust) || dust.balance < MIN_DUST_FOR_A_GAME) {
      if (Date.now() >= deadline) {
        throw new Error(`wallet-unready: sync or DUST remained unavailable for ${DUST_STEP_WAIT_MS / 1000}s before ${label}. Inspect wallet/indexer logs before restarting; do not repeatedly resync.`);
      }
      await new Promise((resolve) => setTimeout(resolve, 15_000));
    }
    log(`chain ${gameId.slice(0, 8)} ${label}: DUST back (${dust.balance}) after ${Math.round((Date.now() - dustLowSince.getTime()) / 1000)}s — proceeding`);
    dustLowSince = null;
  };

  queue = createChainQueue({ chainForGame, stateDir, onReceipt: (gameId, r) => app.receipt(gameId, r), beforeStep: waitDustReady });
  app = createSponsoredHttpApp({
    pureCircuits, fiveUpPureCircuits, queue, network: networkId, allowedOrigins: allowedOriginsFromEnvironment(),
    walletAddress: walletHandle.address ?? null,
    readiness, contractVersion,
    walletExtra: () => ({ dust: dust.balance.toString(), synced: walletIsCurrent(dust), observedAt: dust.at, dustLowSince: dustLowSince?.toISOString() ?? null }),
    healthExtra: () => ({ provider: providerHealth() }),
  });

  // Abandon live games nobody has touched for IDLE_ABANDON_MS (closed laptop,
  // lost tab, no beacon). Checked every minute; unref so it never holds the
  // process open on shutdown.
  setInterval(() => app.sweep(), 60_000).unref();

  } catch (error) {
    startupReason = safeErrorMessage(error);
    log(`Startup paused: ${startupReason}`);
    if (walletGuardTimer) clearInterval(walletGuardTimer);
    if (walletRefreshTimer) clearInterval(walletRefreshTimer);
    walletSubscription?.unsubscribe();
    await walletHandle?.shutdown?.().catch(() => {});
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(safeErrorMessage(error)); process.exit(1); });
}
