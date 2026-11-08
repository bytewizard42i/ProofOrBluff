/**
 * cli/src/providers.js — the ONE midnight-js 5.x / ledger-9 provider bridge.
 *
 * WHAT: turns a synced wallet-handle (from wallet-node.js) plus network
 * endpoints into the `MidnightProviders` object every contract adapter needs:
 * privateStateProvider / publicDataProvider / zkConfigProvider /
 * proofProvider / walletProvider / midnightProvider / config.
 *
 * WHY this file exists: before ledger 9 every contract adapter copy-pasted the
 * same ~70-line bridge (createWalletAndMidnightProvider +
 * signTransactionIntents + level/indexer/zk/proof wiring). Under midnight-js
 * 5.x the shape changed in three ways that would have drifted between copies:
 *
 *   1. Transactions cross the providers as `LedgerTransaction` HANDLES (bytes
 *      + era + stage), not ledger objects. `createLedger9WalletProvider` /
 *      `createLedger9MidnightProvider` wrap plain functions and stamp
 *      `supportedEras: ['v9']` — exactly what we want post-fork (Mainnet is
 *      already on ledger 9; there is no v8 path to serve).
 *   2. The network id is no longer a global (`setNetworkId` is gone); it
 *      travels in `providers.config` beside `ttlSeconds`.
 *   3. The old manual `signTransactionIntents` surgery is dead code: the new
 *      facade's `signRecipe(recipe, keystore.signDataAsync)` signs every
 *      segment with the correct markers.
 *
 * Also home to `withDustRetry`, the rebuild-on-stale-fee-proof submit wrapper
 * shared by every adapter (re-exported from contract.js for old imports).
 */

import path from 'node:path';
import { Buffer } from 'buffer';
import * as Rx from 'rxjs';

import {
  createLedger9WalletProvider,
  createLedger9MidnightProvider,
} from '@midnight-ntwrk/midnight-js-types';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';

import * as state from './state.js';

// ---------------------------------------------------------------------------
// Resilient submit (pattern from eddalabs/midnight-starter-template
// counter-cli/src/resilient-submit.ts, Aug 2026).
//
// On public networks a transaction's DUST fee proof can be rejected with
// `1010: Invalid Transaction: Custom error: 170` (InvalidDustSpendProof) when
// it was balanced against a DUST state the chain already advanced past (stale
// wallet checkpoint, or indexer a step behind the node). Resubmitting the SAME
// finalized tx can never clear a 170 — the stale proof is baked in. The only
// fix is to REBUILD the transaction so it re-balances DUST and re-proves.
// Hence this retries the *builder* (deployContract / callTx.x), never a bare
// submit. Anything that is not a transient dust/socket failure is re-thrown
// at once so real contract assertion failures are never masked.
//
// 5.0 wraps provider rejections in ProviderFailedError whose .cause carries
// the original message — the text walk below already descends causes, so the
// same message patterns keep matching.

function flattenErrorText(error) {
  let text = '';
  let current = error;
  while (current) {
    text += ` ${String(current.message ?? current)}`;
    current = current.cause;
  }
  // wallet-sdk 2.x builder failures can surface as AggregateError whose
  // errors[0] is the real cause — fold those in too.
  if (Array.isArray(error?.errors)) {
    for (const inner of error.errors) text += flattenErrorText(inner);
  }
  return text;
}

export async function withDustRetry(label, build, { attempts = 5, backoffMs = 2_000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await build();
    } catch (error) {
      lastError = error;
      const text = flattenErrorText(error);
      // Three distinct transient causes — label them separately in logs so a
      // stuck-funds condition is never mislabeled as a stale fee proof:
      //   170            chain rejected the DUST spend proof as stale → rebuild.
      //   InsufficientFunds / "could not balance dust" / InsufficientDustForFee
      //                  the WALLET can't find a spendable DUST UTXO right now
      //                  (change from the previous tx not indexed yet, or —
      //                  2026-10-06 — tracking lost it). Rebuilding only helps
      //                  once the view recovers, so wait longer than the
      //                  generic backoff to let it catch up.
      //   socket drop    transport hiccup → plain retry.
      const staleProof = /\b170\b/.test(text);
      const lowFunds = /balance dust|InsufficientFunds|InsufficientDustForFee/i.test(text);
      const socketDrop = /Normal Closure|disconnected/i.test(text);
      if (attempt < attempts && (staleProof || lowFunds || socketDrop)) {
        const why = staleProof ? 'stale DUST fee proof — rebuilding'
          : lowFunds ? 'no spendable DUST in wallet view — waiting for the indexer'
            : 'socket drop — retrying';
        // eslint-disable-next-line no-console
        console.warn(`[${label}] attempt ${attempt}/${attempts} failed (${why})`);
        await new Promise((resolve) => setTimeout(resolve, lowFunds ? Math.max(backoffMs, 15_000) : backoffMs));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Private-state store password policy (same as the old bridge): a
// public-key-derived fallback is only acceptable for disposable local
// wallets. Public networks require a private operator-chosen password.

function resolvePrivateStatePassword(networkId, accountId, environment = process.env) {
  const password = networkId === 'undeployed'
    ? environment.POB_PRIVATE_STATE_PASSWORD || `${Buffer.from(accountId, 'hex').toString('base64')}!pob`
    : environment.POB_PRIVATE_STATE_PASSWORD;
  if (!password || password.length < 16) {
    throw new Error('Set POB_PRIVATE_STATE_PASSWORD (at least 16 characters) before connecting to a public network.');
  }
  return password;
}

/**
 * Build the full MidnightProviders set for a ledger-9 contract adapter.
 *
 * @param {object} options
 * @param {object} options.walletHandle   from buildWalletFromSeed() — needs
 *        .ctx.wallet (the WalletFacade) and .ctx.unshieldedKeystore.
 * @param {object} options.endpoints      { indexer, indexerWs, proofServer }
 * @param {string} options.networkId      undeployed | preview | preprod | mainnet
 * @param {string} options.managedDir     compiled contract assets dir — MUST
 *        contain compiler/contract-manifest.json (verify: 'require' is
 *        fail-closed), keys/ and zkir/.
 * @param {string} [options.proofServerUrl]  overrides endpoints.proofServer
 * @param {string} options.storeName      LevelDB store name for private state
 * @param {string} options.storeDirName   LevelDB directory under
 *        state.stateRoot()/networkId/ (per-contract, so locks never collide)
 */
export async function buildLedger9Providers({
  walletHandle, endpoints, networkId, managedDir, proofServerUrl, storeName, storeDirName,
}) {
  const facade = walletHandle?.ctx?.wallet;
  const keystore = walletHandle?.ctx?.unshieldedKeystore;
  if (!facade || !keystore) {
    throw new Error('walletHandle.ctx.{wallet,unshieldedKeystore} missing — build it with buildWalletFromSeed() from wallet-node.js first.');
  }
  if (!endpoints?.indexer || !endpoints?.indexerWs) {
    throw new Error('endpoints.indexer and endpoints.indexerWs are required (see cli.js endpointsFromEnv).');
  }
  const proofServer = proofServerUrl ?? endpoints.proofServer;
  if (!proofServer) {
    throw new Error('No proof server URL. Pass proofServerUrl or endpoints.proofServer (POB_PROOF_SERVER).');
  }

  // Balancing needs the wallet's DUST/coin view to be current. buildWallet-
  // FromSeed already waits for the first sync, but an adapter built later in
  // the process lifetime re-waits cheaply rather than racing a stale view.
  const synced = await Rx.firstValueFrom(facade.state().pipe(Rx.filter((s) => s.isSynced)));

  // The wallet-side providers speak HANDLES: the framework hands us a
  // LedgerTransaction, we give the facade raw bytes (adoptTransaction seals
  // them at the facade's active protocol version), and we hand serialized
  // bytes back. The adapter re-seals them on the way out.
  const walletProvider = createLedger9WalletProvider({
    async balanceTx(tx, ttl) {
      const handle = facade.adoptTransaction(tx.serialize(), 'Unbound');
      const recipe = await facade.balanceUnboundTransaction(
        handle,
        { ttl: ttl ?? new Date(Date.now() + 30 * 60_000) },
      );
      const signedRecipe = await facade.signRecipe(recipe, keystore.signDataAsync);
      const finalized = await facade.finalizeRecipe(signedRecipe);
      return finalized.serialize();
    },
    getCoinPublicKey() { return synced.shielded.coinPublicKey.toHexString(); },
    getEncryptionPublicKey() { return synced.shielded.encryptionPublicKey.toHexString(); },
  });
  const midnightProvider = createLedger9MidnightProvider(
    (tx) => facade.submitTransaction(facade.adoptTransaction(tx.serialize(), 'Finalized')),
  );

  // The level store is keyed by accountId = shielded coin public key, same as
  // the 4.x wiring: keep the value stable or an existing store reads as empty.
  const accountId = synced.shielded.coinPublicKey.toHexString();

  // Midnight.js 5 checks every ZK artifact against compiler/contract-
  // manifest.json — fail-closed by default, so managedDir must ship compiler/.
  const zkConfigProvider = new NodeZkConfigProvider(managedDir, { verify: 'require' });

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: storeName,
      privateStateStorePath: path.join(state.stateRoot(), networkId, storeDirName),
      accountId,
      privateStoragePasswordProvider: () => resolvePrivateStatePassword(networkId, accountId),
    }),
    publicDataProvider: indexerPublicDataProvider(endpoints.indexer, endpoints.indexerWs),
    zkConfigProvider,
    // Large timeout: a round proof is a few seconds on our prover; a cold
    // public server may be slower.
    proofProvider: httpClientProofProvider(proofServer, zkConfigProvider, { timeout: 1_800_000 }),
    walletProvider,
    midnightProvider,
    config: { networkId, ttlSeconds: 1_800 },
  };
}
