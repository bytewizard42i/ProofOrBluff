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
 * Build the wallet handle (facade + unshielded keystore) and wait for it to
 * sync. Returns a `walletHandle` whose `.ctx` shape is what providers.js
 * expects.
 */
export async function buildWalletFromSeed({
  seed,
  endpoints,
  networkId,
  snapshotPath = process.env.POB_WALLET_SNAPSHOT || null,
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
  try {
  await facade.start(seeds);

  const ctx = { wallet: facade, unshieldedKeystore };

  log.info(`  Unshielded address: ${unshieldedKeystore.getBech32Address().asString()}`);
  // Local chains sync in seconds. Public networks replay the chain's ledger
  // events for a new wallet; the Foundation measured ~67 min for a full
  // Preprod sync. `each` resets on every emission.
  const syncTimeoutMs = networkId === 'undeployed'
    ? 120_000
    : Number(process.env.POB_SYNC_TIMEOUT_MS || 90 * 60_000);
  log.info(`  Waiting for wallet sync… (timeout ${Math.round(syncTimeoutMs / 60_000)} min)`);
  const synced = await Rx.firstValueFrom(
    facade.state().pipe(
      Rx.throttleTime(10_000),
      Rx.tap((s) => {
        if (!s.isSynced) log.info('    syncing…');
      }),
      Rx.filter((s) => s.isSynced),
      Rx.take(1),
      Rx.timeout({ each: syncTimeoutMs }),
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

  const saveSnapshot = () => writeWalletSnapshot(snapshotPath, networkId, facade);
  await saveSnapshot();
  const snapshotTimer = snapshotPath ? setInterval(() => { saveSnapshot().catch(() => {}); }, 5 * 60_000) : null;
  snapshotTimer?.unref?.();

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
