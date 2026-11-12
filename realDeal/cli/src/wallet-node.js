/**
 * wallet-node.js — headless seed-based wallet for the CLI, wallet-sdk 2.0.0.
 *
 * WHAT: builds a WalletFacade over the three sub-wallets — Shielded (Zswap),
 * Unshielded (NIGHT), Dust — all derived from ONE master seed, and waits for
 * it to sync.
 *
 * WHY the shapes below (post-ledger-9):
 *   * Seeds, not keys: `WalletSeeds.fromMasterSeed` walks the same HD path the
 *     1.x SDK did (account 0, index 0, roles Zswap/NightExternal/Dust) — the
 *     derive-check scripts proved byte-identical addresses — but returns
 *     version-agnostic seed bytes, the only key material that crosses a
 *     protocol boundary.
 *   * `facade.start(seeds)` replaces `start(shieldedSecretKeys, dustSecretKey)`;
 *     no transacting method takes secret keys in 2.0.0.
 *   * Signing is async: `keystore.signDataAsync` is handed to `signRecipe` /
 *     `registerNightUtxosForDustGeneration` directly.
 *   * Tx fees are still paid in DUST generated FROM unshielded NIGHT UTXOs,
 *     registered once via `registerNightUtxosForDustGeneration` — now
 *     self-signing, so the recipe comes back ready to finalize.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { WebSocket } from 'ws';
import * as Rx from 'rxjs';
import * as ledger from '@midnightntwrk/ledger-v9';
// Single-barrel wallet SDK (@midnightntwrk scope — the new protocol packages
// moved there; midnight-js-* stays on @midnight-ntwrk).
import {
  WalletSeeds,
  WalletFacade,
  ShieldedWallet,
  DustWallet,
  createKeystore,
  PublicKey as UnshieldedPublicKey,
  UnshieldedWallet,
} from '@midnightntwrk/wallet-sdk';
import { Buffer } from 'buffer';

import { log } from './log.js';

// Apollo's GraphQL subscription client uses globalThis.WebSocket. Node
// doesn't ship one, so polyfill from `ws` before any wallet code runs.
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket;
}

/**
 * Derive the three per-wallet seeds from a 32-byte hex master seed.
 * WalletSeeds.fromMasterSeed defaults to account 0 / index 0 /
 * Roles.NightExternal — the same path the 1.x HDWallet.selectRoles()
 * derivation walked (verified identical by scripts/derive-check*.mjs).
 */
function deriveSeedsFromMasterSeed(hexSeed) {
  if (!/^[0-9a-fA-F]{64}$/.test(hexSeed)) {
    throw new Error(
      'Seed must be a 64-character hex string (32 bytes). '
      + 'Generate with: node -e "console.log(require(\\\"crypto\\\").randomBytes(32).toString(\\\"hex\\\"))"'
    );
  }
  return WalletSeeds.fromMasterSeed(Buffer.from(hexSeed, 'hex'));
}

/**
 * Derive the public unshielded (NIGHT) address for a seed on a network with
 * NO network access — pure key derivation. Use this to learn where to send
 * faucet funds before the first (slow) public-network sync.
 */
export function deriveUnshieldedAddress(seed, networkId) {
  const seeds = deriveSeedsFromMasterSeed(seed);
  return createKeystore({ kind: 'schnorr', secret: seeds.unshielded }, networkId)
    .getBech32Address().asString();
}

function buildFacadeConfig(networkId, endpoints) {
  return {
    networkId,
    indexerClientConnection: {
      indexerHttpUrl: endpoints.indexer,
      indexerWsUrl: endpoints.indexerWs,
    },
    provingServerUrl: new URL(endpoints.proofServer),
    relayURL: new URL(endpoints.node.replace(/^http/, 'ws')),
    costParameters: {
      additionalFeeOverhead: 300_000_000_000_000n,
      feeBlocksMargin: 5,
    },
    // `forks` is deliberately left out: the facade presets
    // DefaultForkSchedule (ledger-v9 at the protocol version a 2.x node
    // reports), which is where Mainnet already is.
    // txHistoryStorage is gone from DefaultConfiguration in facade 5.0.0 —
    // history is held inside the per-wallet snapshots we already persist.
  };
}

/**
 * One-line wallet sync progress for the 'syncing…' heartbeat. Field names
 * come from the wallet-sdk 2 FacadeState: shielded/dust progress is
 * index-based (appliedIndex / highestRelevantWalletIndex / isConnected),
 * unshielded is transaction-id-based (appliedId / highestTransactionId /
 * isConnected). Never throws — a half-built state prints '?' instead of
 * killing the sync loop that called it.
 */
export function describeSyncProgress(state) {
  try {
    const pair = (p, applied, target) => {
      const a = p?.[applied];
      const t = p?.[target];
      return `${a == null ? '?' : String(a)}/${t == null ? '?' : String(t)}`;
    };
    const conn = (p) => (p?.isConnected == null ? '?' : String(p.isConnected));
    const shielded = state?.shielded?.progress;
    const dust = state?.dust?.progress;
    const unshielded = state?.unshielded?.progress;
    return `shielded ${pair(shielded, 'appliedIndex', 'highestRelevantWalletIndex')} `
      + `dust ${pair(dust, 'appliedIndex', 'highestRelevantWalletIndex')} `
      + `unshielded ${pair(unshielded, 'appliedId', 'highestTransactionId')} `
      + `(connected: s=${conn(shielded)} d=${conn(dust)} u=${conn(unshielded)})`;
  } catch {
    return 'sync progress unavailable';
  }
}

/** signal.reason as an Error — AbortSignal.reason may be any value. */
function abortReasonError(signal) {
  const reason = signal?.reason;
  return reason instanceof Error ? reason : new Error(String(reason ?? 'Wallet sync aborted.'));
}

/** '36 h' / '15 min' / '2 min' — for the sync-limit log and timeout text. */
function formatSyncLimit(ms) {
  const hours = ms / 3_600_000;
  if (Number.isInteger(hours)) return `${hours} h`;
  return `${Math.round(ms / 60_000)} min`;
}

/**
 * The three sync cursors as one comparable string. A stall is "the cursors
 * stopped moving" — NOT "no state emissions", because the SDK emits progress
 * updates that change nothing. Missing fields read as '?', like
 * describeSyncProgress.
 */
function syncSignature(state) {
  const cursor = (v) => (v == null ? '?' : String(v));
  return [
    cursor(state?.shielded?.progress?.appliedIndex),
    cursor(state?.dust?.progress?.appliedIndex),
    cursor(state?.unshielded?.progress?.appliedId),
  ].join('|');
}

/**
 * Stall detector for the sync wait: subscribes to the state stream and
 * ERRORS with the last seen progress description when the cursor signature
 * has not changed for `stallMs`. Never emits a value (ignoreElements), so it
 * can sit in the same merge as the real wait — an error tears the wait down,
 * a healthy sync is untouched. The timeout runs from subscription, so a
 * sync that never emits at all stalls too.
 */
export function syncStall$(state$, stallMs) {
  let lastState = null;
  return state$.pipe(
    Rx.tap((s) => { lastState = s; }),
    Rx.map(syncSignature),
    Rx.distinctUntilChanged(),
    Rx.timeout({
      each: stallMs,
      with: () => Rx.throwError(() => new Error(
        `Wallet sync made no progress for ${formatSyncLimit(stallMs)} (${describeSyncProgress(lastState)}).`,
      )),
    }),
    Rx.ignoreElements(),
  );
}

/**
 * Observable that errors with signal.reason the moment `signal` aborts —
 * merged into the sync wait so an abort rejects firstValueFrom with the
 * caller's reason instead of hanging until the sync timeout.
 */
function abortSync$(signal) {
  return Rx.defer(() => {
    if (signal.aborted) throw abortReasonError(signal);
    return Rx.fromEvent(signal, 'abort').pipe(
      Rx.map(() => { throw abortReasonError(signal); }),
    );
  });
}

/**
 * Build the wallet handle (facade + unshielded keystore) and wait for it to
 * sync. Returns a `walletHandle` whose `.ctx` shape is what providers.js
 * expects.
 *
 * `signal` (optional AbortSignal): aborting during the sync wait rejects
 * with signal.reason so the caller's catch can stop the facade — used by
 * the provider-budget guard in sponsored-service.js.
 */
export async function buildWalletFromSeed({
  seed,
  endpoints,
  networkId,
  snapshotPath = process.env.POB_WALLET_SNAPSHOT || null,
  signal = null,
}) {
  // Never print even a prefix of a production seed. Wallet addresses are
  // public; seed material is not, including in development logs.
  log.step(`Building wallet on ${networkId}`);
  const seeds = deriveSeedsFromMasterSeed(seed);
  const unshieldedKeystore = createKeystore({ kind: 'schnorr', secret: seeds.unshielded }, networkId);

  const configuration = buildFacadeConfig(networkId, endpoints);

  // Sync snapshot: without it every process start replays the whole chain
  // for this wallet (~20 min on the 2-vCPU VPS for Mainnet). With it, the
  // three wallets restore their last serialized state and only catch up the
  // tail. The snapshot holds NO secret keys (those come from the seed every
  // time); it is just indexed public state, so a stale/corrupt file is safe
  // to ignore — we log and fall back to a cold start.
  if (signal?.aborted) throw abortReasonError(signal);
  const snapshot = await readWalletSnapshot(snapshotPath, networkId);
  if (snapshot) log.info(`  Restoring wallet sync snapshot from ${snapshotPath} (saved ${snapshot.savedAt})`);

  const facade = await WalletFacade.init({
    configuration,
    shielded: (cfg) => (snapshot
      ? ShieldedWallet(cfg).restore(snapshot.shielded)
      : ShieldedWallet(cfg).startWithSeed(seeds.shielded)),
    unshielded: (cfg) => (snapshot
      ? UnshieldedWallet(cfg).restore(snapshot.unshielded)
      : UnshieldedWallet(cfg).startWithPublicKey(UnshieldedPublicKey.fromKeyStore(unshieldedKeystore))),
    dust: (cfg) => (snapshot
      ? DustWallet(cfg).restore(snapshot.dust)
      : DustWallet(cfg).startWithSeed(seeds.dust)),
  });
  // The snapshot interval is cleared on EVERY exit path: the catch below and
  // the returned handle's shutdown().
  let snapshotTimer = null;
  try {
  await facade.start(seeds);

  const ctx = { wallet: facade, unshieldedKeystore };

  // Persist partial sync progress every 5 min FROM HERE — before the sync
  // wait, not after it. A cold Mainnet sync replays ~2.0M events at
  // ~2,400/min (≈14 h on the VPS); snapshots used to be written only once
  // isSynced flipped, so every restart replayed from zero. serializeState()
  // snapshots the CURRENT state — progress cursor included, no isSynced
  // requirement — and restore resumes at the saved appliedIndex/appliedId
  // (verified in the SDK's Serialization/Sync sources for all three wallets).
  const saveSnapshot = () => writeWalletSnapshot(snapshotPath, networkId, facade);
  let snapshotWriteFailing = false;
  snapshotTimer = snapshotPath ? setInterval(() => {
    saveSnapshot()
      .then(() => { snapshotWriteFailing = false; })
      .catch((error) => {
        // Once per failure streak: a dead disk must not spam a line every
        // 5 min for a 14 h sync, but the first failure is never silent.
        if (!snapshotWriteFailing) {
          snapshotWriteFailing = true;
          log.warn(`  Wallet snapshot write failed: ${error.message} — retrying every 5 min.`);
        }
      });
  }, 5 * 60_000) : null;
  snapshotTimer?.unref?.();

  log.info(`  Unshielded address: ${unshieldedKeystore.getBech32Address().asString()}`);
  // Local chains sync in seconds. Public cold syncs replay the chain's
  // ledger events for a new wallet — measured ~14 h for a full Mainnet
  // replay on the VPS — so the limits are two-fold: a STALL timeout (no
  // progress-cursor movement for stallMs — a wedged sync dies fast instead
  // of burning quota silently, the Nov-9 failure mode) and an absolute CAP
  // (a legitimately slow cold replay must not be killed by a total-time
  // limit sized for Preview). `undeployed` keeps 120 s for both.
  const syncLimits = networkId === 'undeployed'
    ? { stallMs: 120_000, capMs: 120_000 }
    : {
        stallMs: Number(process.env.POB_SYNC_STALL_MS || 15 * 60_000),
        capMs: Number(process.env.POB_SYNC_TIMEOUT_MS || 36 * 60 * 60_000),
      };
  log.info(`  Waiting for wallet sync… (stall timeout ${formatSyncLimit(syncLimits.stallMs)}, absolute cap ${formatSyncLimit(syncLimits.capMs)})`);
  let lastProgressLogAt = 0;
  const syncWait = facade.state().pipe(
    Rx.tap((s) => {
      // 60 s heartbeat — a 14 h cold sync would otherwise write ~5,000
      // lines. The tap runs BEFORE the isSynced filter but does not
      // throttle the stream, so completion is never delayed by logging.
      if (s.isSynced || Date.now() - lastProgressLogAt < 60_000) return;
      lastProgressLogAt = Date.now();
      log.info(`    syncing… ${describeSyncProgress(s)}`);
    }),
    Rx.filter((s) => s.isSynced),
    Rx.take(1),
  );
  // merge (not race): the abort/stall branches only ever error, so the first
  // real emission still wins while either tears the whole wait down. The
  // outer timeout is the absolute cap — `first` is a total-time limit here
  // because the merged stream only ever emits once (the synced state).
  const synced = await Rx.firstValueFrom(
    Rx.merge(
      syncWait,
      signal ? abortSync$(signal) : Rx.EMPTY,
      syncStall$(facade.state(), syncLimits.stallMs),
    ).pipe(
      Rx.timeout({
        first: syncLimits.capMs,
        with: () => Rx.throwError(() => new Error(`Wallet sync exceeded ${formatSyncLimit(syncLimits.capMs)}.`)),
      }),
    )
  );

  const unshieldedNight =
    synced.unshielded?.balances?.[ledger.nativeToken().raw] ?? 0n;
  const shieldedNight =
    synced.shielded?.balances?.[ledger.nativeToken().raw] ?? 0n;
  const dustBalance = synced.dust?.balance(new Date()) ?? 0n;
  log.ok(`  Synced. NIGHT (unshielded): ${unshieldedNight}, NIGHT (shielded): ${shieldedNight}, DUST: ${dustBalance}`);

  // DUST registration — required so the wallet has fees to pay for txs.
  // Skip if there's already DUST or no NIGHT to register.
  if (dustBalance === 0n && unshieldedNight > 0n) {
    log.step('Registering NIGHT UTXOs for DUST generation…');
    await registerNightForDust(ctx, networkId);
  }

  // Final snapshot write once everything (sync + DUST registration) settled;
  // the 5-min interval above has been covering the long sync already.
  await saveSnapshot();

  return {
    api: facade,
    ctx,
    address: unshieldedKeystore.getBech32Address().asString(),
    coinPublicKey: synced.shielded?.coinPublicKey?.toHexString?.() ?? null,
    saveSnapshot,
    async shutdown() {
      if (snapshotTimer) clearInterval(snapshotTimer);
      try { await saveSnapshot(); } catch { /* best effort */ }
      try { await facade.stop(); } catch { /* noop */ }
    },
  };
  } catch (error) {
    // Includes start, sync, registration and snapshot failures: never leave
    // an orphaned wallet retrying after the caller has entered paused mode.
    if (snapshotTimer) clearInterval(snapshotTimer);
    await facade.stop().catch(() => {});
    throw error;
  }
}

async function readWalletSnapshot(snapshotPath, networkId) {
  if (!snapshotPath) return null;
  try {
    const raw = JSON.parse(await fs.readFile(snapshotPath, 'utf8'));
    // version 2 = wallet-sdk 2.0.0 writes. A version-1 (SDK 1.2.0) snapshot is
    // not loadable by the new wallets, so it is a cold start, not an error.
    if (raw.version !== 2) {
      if (raw.version === 1) {
        log.warn(`  Wallet snapshot at ${snapshotPath} was written by wallet-sdk 1.x; cold start (it will be overwritten with a v2 snapshot after sync).`);
        return null;
      }
      log.warn(`  Wallet snapshot at ${snapshotPath} is for another network/version; cold start.`);
      return null;
    }
    if (raw.networkId !== networkId || !raw.shielded || !raw.unshielded || !raw.dust) {
      log.warn(`  Wallet snapshot at ${snapshotPath} is for another network/version; cold start.`);
      return null;
    }
    return raw;
  } catch (error) {
    if (error.code !== 'ENOENT') log.warn(`  Wallet snapshot unreadable (${error.message}); cold start.`);
    return null;
  }
}

async function writeWalletSnapshot(snapshotPath, networkId, facade) {
  if (!snapshotPath) return;
  const [shielded, unshielded, dust] = await Promise.all([
    facade.shielded.serializeState(), facade.unshielded.serializeState(), facade.dust.serializeState(),
  ]);
  const body = JSON.stringify({ version: 2, networkId, savedAt: new Date().toISOString(), shielded, unshielded, dust });
  await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
  await fs.writeFile(`${snapshotPath}.tmp`, body, 'utf8');
  await fs.rename(`${snapshotPath}.tmp`, snapshotPath);
}

/**
 * Register all unregistered NIGHT UTXOs for dust generation. The wallet-sdk
 * 2.0.0 call self-signs via the SignSegment callback and returns an
 * UnprovenTransactionRecipe — finalize + submit only.
 */
async function registerNightForDust(ctx, networkId) {
  const state = await Rx.firstValueFrom(
    ctx.wallet.state().pipe(Rx.filter((s) => s.isSynced))
  );
  const unregistered = (state.unshielded?.availableCoins ?? []).filter(
    (c) => c.meta.registeredForDustGeneration === false,
  );
  if (unregistered.length === 0) {
    log.warn('  No unregistered NIGHT UTXOs found.');
    return false;
  }
  log.info(`  Found ${unregistered.length} unregistered NIGHT UTXO(s)`);
  // The recipe is already signed (the SignSegment is applied inside the call);
  // only finalize + submit remain.
  const recipe = await ctx.wallet.registerNightUtxosForDustGeneration(
    unregistered,
    ctx.unshieldedKeystore.getPublicKey(),
    ctx.unshieldedKeystore.signDataAsync,
  );
  const finalized = await ctx.wallet.finalizeRecipe(recipe);
  const txId = await ctx.wallet.submitTransaction(finalized);
  log.info(`  DUST-registration tx: ${txId}`);
  // DUST generation is linear from zero once the registration lands. On a
  // local chain that is seconds; on Preview the first registration run
  // (2026-10-02) was INCLUDED in block 1128568 yet the wallet still showed
  // DUST 0 for well over 2 minutes. Public networks therefore get a long,
  // env-overridable wait and a periodic heartbeat.
  const dustWaitMs = networkId === 'undeployed'
    ? 120_000
    : Number(process.env.POB_DUST_WAIT_MS || 30 * 60_000);
  log.info(`  Waiting for DUST to accrue… (up to ${Math.round(dustWaitMs / 60_000)} min; tx id above is already submitted — do NOT re-register if this times out)`);
  await Rx.firstValueFrom(
    ctx.wallet.state().pipe(
      Rx.throttleTime(15_000),
      Rx.tap((s) => {
        const dust = s.dust?.balance(new Date()) ?? 0n;
        if (dust === 0n) log.info('    DUST still 0 — generation pending…');
      }),
      Rx.filter((s) => (s.dust?.balance(new Date()) ?? 0n) > 0n),
      Rx.take(1),
      Rx.timeout({ each: dustWaitMs }),
    )
  );
  log.ok('  DUST registered and accruing.');
  return true;
}
