/**
 * wallet-node.js — headless seed-based wallet for the CLI, v8 SDK.
 *
 * Built around the @midnight-ntwrk/wallet-sdk barrel. Mirrors the canonical
 * pattern from midnightntwrk/example-counter/counter-cli/src/api.ts, the
 * official midnight-local-dev wallet helpers, and Edda Labs' starter
 * (eddalabs/midnight-starter-template counter-cli/src/api.ts, Aug 2026).
 *
 * Three sub-wallets back the facade — Shielded (Zswap), Unshielded
 * (NIGHT), Dust — derived from the same HD seed via role-specific paths.
 * Tx fees are paid in DUST, which is generated FROM unshielded NIGHT
 * UTXOs but only after a one-time `registerNightUtxosForDustGeneration`
 * tx. We do that automatically the first time a wallet has unregistered
 * NIGHT.
 */

import { WebSocket } from 'ws';
import * as Rx from 'rxjs';
import * as ledger from '@midnight-ntwrk/ledger-v8';
// Single-barrel wallet SDK (official public-network matrix: exact 1.2.0).
// It wraps facade 4.x / dust 4.x / unshielded 3.x; importing the split
// packages directly pinned us a major behind and produced transactions the
// current node validated but never included.
import {
  HDWallet,
  Roles,
  WalletFacade,
  ShieldedWallet,
  DustWallet,
  createKeystore,
  InMemoryTransactionHistoryStorage,
  PublicKey as UnshieldedPublicKey,
  UnshieldedWallet,
} from '@midnight-ntwrk/wallet-sdk';
import { Buffer } from 'buffer';

import { log } from './log.js';

// Apollo's GraphQL subscription client uses globalThis.WebSocket. Node
// doesn't ship one, so polyfill from `ws` before any wallet code runs.
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket;
}

/**
 * Derive the three role-specific keys from a 32-byte hex seed.
 * Mirrors the example-counter pattern. Throws if the seed is invalid.
 */
function deriveKeysFromSeed(hexSeed) {
  if (!/^[0-9a-fA-F]{64}$/.test(hexSeed)) {
    throw new Error(
      'Seed must be a 64-character hex string (32 bytes). '
      + 'Generate with: node -e "console.log(require(\\\"crypto\\\").randomBytes(32).toString(\\\"hex\\\"))"'
    );
  }
  const seed = Buffer.from(hexSeed, 'hex');
  const hd = HDWallet.fromSeed(seed);
  if (hd.type !== 'seedOk') {
    throw new Error(`HDWallet.fromSeed failed: ${hd.type}`);
  }
  const derivation = hd.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (derivation.type !== 'keysDerived') {
    throw new Error(`Failed to derive keys: ${derivation.type}`);
  }
  hd.hdWallet.clear();
  return derivation.keys;
}

/**
 * Derive the public unshielded (NIGHT) address for a seed on a network with
 * NO network access — pure key derivation. Use this to learn where to send
 * faucet funds before the first (slow) public-network sync.
 */
export function deriveUnshieldedAddress(seed, networkId) {
  const keys = deriveKeysFromSeed(seed);
  return createKeystore(keys[Roles.NightExternal], networkId).getBech32Address().asString();
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
    txHistoryStorage: new InMemoryTransactionHistoryStorage(),
  };
}

/**
 * Build the WalletContext (facade + secret keys + unshielded keystore)
 * and wait for it to sync. Returns a `walletHandle` whose `.api` shape
 * mirrors what the contract.js layer expects.
 */
export async function buildWalletFromSeed({
  seed,
  endpoints,
  networkId,
}) {
  // Never print even a prefix of a production seed. Wallet addresses are
  // public; seed material is not, including in development logs.
  log.step(`Building wallet on ${networkId}`);
  const keys = deriveKeysFromSeed(seed);
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], networkId);

  const configuration = buildFacadeConfig(networkId, endpoints);

  const facade = await WalletFacade.init({
    configuration,
    shielded: (cfg) => ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (cfg) =>
      UnshieldedWallet(cfg).startWithPublicKey(
        UnshieldedPublicKey.fromKeyStore(unshieldedKeystore),
      ),
    dust: (cfg) =>
      DustWallet(cfg).startWithSecretKey(
        dustSecretKey,
        ledger.LedgerParameters.initialParameters().dust,
      ),
  });
  await facade.start(shieldedSecretKeys, dustSecretKey);

  const ctx = { wallet: facade, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };

  log.info(`  Unshielded address: ${unshieldedKeystore.getBech32Address().asString()}`);
  // Local chains sync in seconds. Public networks replay the chain's ledger
  // events for a new wallet; the Foundation measured ~67 min for a full
  // Preprod sync. Blockfrost also slows idle progress updates, so a short
  // fixed timeout causes false failures. `each` resets on every emission.
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
    await registerNightForDust(ctx);
  }

  return {
    api: facade,
    ctx,
    address: unshieldedKeystore.getBech32Address().asString(),
    coinPublicKey: synced.shielded?.coinPublicKey?.toHexString?.() ?? null,
    async shutdown() {
      try { await facade.stop(); } catch { /* noop */ }
    },
  };
}

/**
 * Register all unregistered NIGHT UTXOs for dust generation. This is a
 * separate on-chain tx that costs no fees (it's the bootstrap path) and
 * unblocks the wallet's ability to pay future tx fees in DUST.
 */
async function registerNightForDust(ctx) {
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
  const recipe = await ctx.wallet.registerNightUtxosForDustGeneration(
    unregistered,
    ctx.unshieldedKeystore.getPublicKey(),
    (payload) => ctx.unshieldedKeystore.signData(payload),
  );
  const finalized = await ctx.wallet.finalizeRecipe(recipe);
  const txId = await ctx.wallet.submitTransaction(finalized);
  log.info(`  DUST-registration tx: ${txId}`);
  await Rx.firstValueFrom(
    ctx.wallet.state().pipe(
      Rx.throttleTime(3_000),
      Rx.filter((s) => (s.dust?.balance(new Date()) ?? 0n) > 0n),
      Rx.take(1),
      Rx.timeout({ each: 120_000 }),
    )
  );
  log.ok('  DUST registered and accruing.');
  return true;
}
