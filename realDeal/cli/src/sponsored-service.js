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
 *                                        One per game; obtained via options.chainForGame(gameId, contractAddress|null).
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
        const api = await chainForGame(gameId, contractAddressRef.current);
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
 */
export function createSponsoredHttpApp({
  pureCircuits, queue, readiness = () => ({ ok: true }), allowedOrigins = new Set(DEFAULT_ALLOWED_ORIGINS), now = Date.now, ai, random,
  network = process.env.POB_NETWORK_ID || 'undeployed', walletAddress = null, walletExtra = () => ({}),
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
    const mode = body.mode ?? 1;
    const difficulty = body.difficulty ?? 'medium';
    if (!MODES.includes(mode)) throw new HttpError(400, 'mode must be 0, 1 or 4.');
    if (!DIFFICULTIES.includes(difficulty)) throw new HttpError(400, 'difficulty must be easy, medium or hard.');
    const gameId = randomBytes(32).toString('hex');
    const game = createSponsoredGame({ gameId, mode, difficulty, pureCircuits, ai, random });
    const entry = { game, contractAddressRef: { current: null }, touchedAt: now() };
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
      openGames: games.size,
    };
  }
  function statsView() {
    return { ...totals, openGames: games.size, chain: queue.stats, uptimeSeconds: Math.round(process.uptime()) };
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
        return sendJson(response, 200, act(entry, (g) => g.humanPlay({ rank: body.rank, count: body.count, cards: body.cards })));
      }
      if (action === 'accept') { await readJsonBody(request).catch(() => ({})); return sendJson(response, 200, act(entry, (g) => g.humanAccept())); }
      if (action === 'challenge') { await readJsonBody(request).catch(() => ({})); return sendJson(response, 200, act(entry, (g) => g.humanChallenge())); }
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

  const { buildWalletFromSeed } = await import('./wallet-node.js');
  const { getV3pContractApi, DEFAULT_V3P_MANAGED_DIR } = await import('./rollup-v3p-contract.js');
  const { pureCircuits } = await import(path.join(DEFAULT_V3P_MANAGED_DIR, 'contract', 'index.js'));

  const endpoints = networkId === 'mainnet'
    ? (() => { const t = (u) => `${u}?project_id=${encodeURIComponent(process.env.BLOCKFROST_PROJECT_ID.trim())}`; return { node: t('https://rpc.midnight-mainnet.blockfrost.io'), indexer: t('https://midnight-mainnet.blockfrost.io/api/v0'), indexerWs: t('wss://midnight-mainnet.blockfrost.io/api/v0/ws'), proofServer }; })()
    : { node: `https://rpc.${networkId}.midnight.network`, indexer: `https://indexer.${networkId}.midnight.network/api/v4/graphql`, indexerWs: `wss://indexer.${networkId}.midnight.network/api/v4/graphql/ws`, proofServer };

  log(`sponsored service network=${networkId} proofServer=${proofServer} stateDir=${stateDir}`);
  // Sync snapshot on the state volume: restart = ~40 s instead of a ~20 min cold
  // sync (measured on Preview: 737 s cold → 37 s restored).
  const snapshotPath = process.env.POB_WALLET_SNAPSHOT || path.join(stateDir, `wallet-${networkId}.snapshot.json`);
  const walletHandle = await buildWalletFromSeed({ seed: seedHex, endpoints, networkId, snapshotPath });

  // One contract API instance per game (each binds to one contract address).
  const apis = new Map();
  const chainForGame = async (gameId, contractAddress) => {
    let api = apis.get(gameId);
    if (!api) {
      api = await getV3pContractApi({ networkId, walletHandle, endpoints, seedHex });
      if (contractAddress) await api.joinAt(contractAddress);
      apis.set(gameId, api);
    }
    return api;
  };

  // Live DUST view: a game costs several transactions, so refuse to open new
  // games unless the operator wallet can pay for at least one. Mirrors the
  // wallet facade's own state stream; cheap to read on every /v1/health.
  const { default: Rx } = await import('rxjs').then((m) => ({ default: m }));
  // buildWalletFromSeed only returns after the initial sync, so from here on
  // the wallet IS synced; later state emissions don't always re-assert the
  // flag, so don't gate on it — gate on the live DUST balance only.
  let dust = { balance: 0n, synced: true, at: new Date().toISOString() };
  walletHandle.api.state().pipe(Rx.throttleTime(5_000)).subscribe((st) => {
    dust = { balance: st.dust?.balance(new Date()) ?? 0n, synced: true, at: new Date().toISOString() };
  });
  const MIN_DUST_FOR_A_GAME = BigInt(process.env.POB_MIN_DUST_FOR_GAME || '1000000000000000'); // 1 DUST in specks (1 DUST = 1e15)
  const readiness = () => {
    if (!dust.synced) return { ok: false, reason: 'Wallet is syncing; try again in a minute.' };
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
    if (dust.balance >= MIN_DUST_FOR_A_GAME) { dustLowSince = null; return; }
    const label = `${step.step}${step.round != null ? `(${step.round})` : ''}`;
    if (!dustLowSince) { dustLowSince = new Date(); log(`chain ${gameId.slice(0, 8)} ${label}: spendable DUST=${dust.balance} — waiting for the wallet view to catch up…`); }
    const deadline = Date.now() + DUST_STEP_WAIT_MS;
    while (dust.balance < MIN_DUST_FOR_A_GAME) {
      if (Date.now() >= deadline) {
        throw new Error(`dust-unready: spendable DUST stayed ${dust.balance} for ${DUST_STEP_WAIT_MS / 1000}s before ${label} — wallet dust tracking is likely stuck (lost change UTXO). Fix: restart pob-api with the wallet snapshot deleted (cold resync), then retry.`);
      }
      await new Promise((resolve) => setTimeout(resolve, 15_000));
    }
    log(`chain ${gameId.slice(0, 8)} ${label}: DUST back (${dust.balance}) after ${Math.round((Date.now() - dustLowSince.getTime()) / 1000)}s — proceeding`);
    dustLowSince = null;
  };

  let app;
  const queue = createChainQueue({ chainForGame, stateDir, onReceipt: (gameId, r) => app.receipt(gameId, r), beforeStep: waitDustReady });
  app = createSponsoredHttpApp({
    pureCircuits, queue, network: networkId, allowedOrigins: allowedOriginsFromEnvironment(),
    walletAddress: walletHandle.address ?? null,
    readiness,
    walletExtra: () => ({ dust: dust.balance.toString(), synced: dust.synced, observedAt: dust.at, dustLowSince: dustLowSince?.toISOString() ?? null }),
  });

  const server = http.createServer((req, res) => app.handle(req, res));
  // Caddy pools keep-alive upstream connections and can reuse one a fraction
  // of a second after Node's default 5 s keepAliveTimeout has begun closing it
  // → "connection reset by peer" → the player sees a 502 mid-game (observed
  // 2026-10-08). Keep server sockets alive well past the proxy's idle window.
  server.keepAliveTimeout = 75_000;
  server.headersTimeout = 80_000;
  server.listen(port, LOOPBACK_HOST, () => log(`listening on http://${LOOPBACK_HOST}:${port}/v1`));
  // Abandon live games nobody has touched for IDLE_ABANDON_MS (closed laptop,
  // lost tab, no beacon). Checked every minute; unref so it never holds the
  // process open on shutdown.
  setInterval(() => app.sweep(), 60_000).unref();

  const shutdown = async (signal) => {
    log(`${signal}: draining chain queue…`);
    server.close();
    await Promise.race([queue.idle(), new Promise((r) => setTimeout(r, 120_000))]);
    await walletHandle.shutdown?.();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(safeErrorMessage(error)); process.exit(1); });
}
