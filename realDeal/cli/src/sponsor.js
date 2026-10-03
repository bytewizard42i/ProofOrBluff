/**
 * DUST sponsorship for Proof or Bluff.
 *
 * The player proves, balances (without fees), signs and finalizes a
 * transaction in their own wallet. We receive that finalized transaction,
 * add a DUST fee spend from the sponsor wallet, finalize and submit it.
 * This is the flow documented in the wallet-sdk DUST sponsorship snippet;
 * the sponsor never sees player keys, private state or witnesses — only a
 * sealed transaction it could not alter.
 *
 * Because DUST is finite, the endpoint is deliberately narrow. It refuses:
 *   - anything that is not a Transaction<SignatureEnabled, Proof, Binding>
 *   - transactions that deploy contracts or run maintenance updates
 *   - transactions that call any contract other than the configured table
 *   - transactions carrying unshielded or shielded offers (value movement)
 *   - transactions that already contain dust actions (would double-pay)
 *   - more than one intent
 *   - callers over the per-IP rate limit
 *   - sponsorship that would drop the sponsor below its reserve floor
 */

import * as ledger from '@midnight-ntwrk/ledger-v8';

export const SPONSOR_LIMITS = Object.freeze({
  // A proved playCards transaction is a few hundred KB of hex at most.
  maxBodyBytes: 2 * 1024 * 1024,
  maxTransactionsPerMinutePerIp: 6,
  ttlMs: 30 * 60 * 1000,
});

export class SponsorError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function normalizeHex(value) {
  if (typeof value !== 'string') return null;
  const clean = value.trim().replace(/^0x/i, '');
  return /^[0-9a-fA-F]+$/.test(clean) && clean.length % 2 === 0 ? clean.toLowerCase() : null;
}

function normalizeAddress(address) {
  const clean = normalizeHex(address);
  if (!clean || clean.length !== 64) throw new SponsorError(500, 'Sponsor is misconfigured: no valid table contract address.');
  return clean;
}

function contractAddressOf(action) {
  const raw = action?.address;
  if (typeof raw === 'string') return normalizeHex(raw);
  if (raw instanceof Uint8Array) return Buffer.from(raw).toString('hex');
  if (raw?.bytes instanceof Uint8Array) return Buffer.from(raw.bytes).toString('hex');
  return null;
}

/**
 * Pure policy check. Throws SponsorError(4xx) describing the first reason a
 * transaction cannot be sponsored. Exported for tests with fake transactions.
 */
export function assertSponsorable(transaction, { contractAddress }) {
  const table = normalizeAddress(contractAddress);
  const intents = transaction?.intents;
  if (!intents || typeof intents.size !== 'number') {
    throw new SponsorError(400, 'Transaction has no intents to sponsor.');
  }
  if (intents.size !== 1) {
    throw new SponsorError(400, `Sponsorship covers exactly one intent; received ${intents.size}.`);
  }
  // guaranteedOffer is a ZswapOffer; fallibleOffer is a Map<segment, ZswapOffer>.
  // Either being present means shielded value moves, which we do not pay for.
  const fallible = transaction.fallibleOffer;
  if (transaction.guaranteedOffer || (fallible && typeof fallible.size === 'number' && fallible.size > 0)) {
    throw new SponsorError(400, 'Sponsorship does not cover shielded token transfers.');
  }
  for (const intent of intents.values()) {
    if (intent.guaranteedUnshieldedOffer || intent.fallibleUnshieldedOffer) {
      throw new SponsorError(400, 'Sponsorship does not cover unshielded token transfers.');
    }
    if (intent.dustActions) {
      throw new SponsorError(400, 'Transaction already pays its own fees.');
    }
    const actions = intent.actions || [];
    if (actions.length === 0) {
      throw new SponsorError(400, 'Transaction contains no contract call.');
    }
    for (const action of actions) {
      if (!(action instanceof ledger.ContractCall) && action?.constructor?.name !== 'ContractCall') {
        throw new SponsorError(400, 'Only game-table contract calls are sponsored (no deploys or maintenance).');
      }
      const address = contractAddressOf(action);
      if (address !== table) {
        throw new SponsorError(403, 'Only calls to the published Proof or Bluff table are sponsored.');
      }
    }
  }
  return true;
}

/** Fixed-window per-IP limiter; small and dependency-free. */
export function createRateLimiter({ limit = SPONSOR_LIMITS.maxTransactionsPerMinutePerIp, windowMs = 60_000, now = Date.now } = {}) {
  const buckets = new Map();
  return {
    check(key) {
      const current = now();
      const bucket = buckets.get(key);
      if (!bucket || current - bucket.start >= windowMs) {
        buckets.set(key, { start: current, count: 1 });
        return 1 <= limit;
      }
      bucket.count += 1;
      return bucket.count <= limit;
    },
    size() { return buckets.size; },
  };
}

/**
 * Builds the sponsor against an already-synced wallet context from
 * buildWalletFromSeed(): { wallet, shieldedSecretKeys, dustSecretKey,
 * unshieldedKeystore }. `reserveDust` is the floor we keep for the bot's
 * own moves; below it we stop sponsoring rather than stranding the game.
 */
export function createSponsor({
  walletCtx,
  networkId,
  contractAddress,
  reserveDust = 0n,
  rateLimiter = createRateLimiter(),
  logger = console,
}) {
  if (!walletCtx?.wallet) throw new Error('createSponsor requires a wallet context.');
  const table = normalizeAddress(contractAddress);
  let inFlight = Promise.resolve();

  async function currentDust() {
    const state = await walletCtx.wallet.waitForSyncedState();
    return state.dust?.balance?.(new Date()) ?? 0n;
  }

  function parseTransaction(hex) {
    const clean = normalizeHex(hex);
    if (!clean) throw new SponsorError(400, 'tx must be a hex-encoded finalized transaction.');
    if (clean.length / 2 > SPONSOR_LIMITS.maxBodyBytes) throw new SponsorError(413, 'Transaction is too large to sponsor.');
    try {
      return ledger.Transaction.deserialize('signature', 'proof', 'binding', Buffer.from(clean, 'hex'), networkId);
    } catch (error) {
      throw new SponsorError(400, `Transaction could not be decoded as a finalized Midnight transaction: ${error?.message || error}`);
    }
  }

  /**
   * Sponsor one player transaction. Serialized: the sponsor's DUST UTXO is
   * consumed and recreated by each spend, so concurrent balancing would
   * race on the same input.
   */
  function sponsor({ txHex, clientKey = 'unknown' }) {
    const run = async () => {
      if (!rateLimiter.check(clientKey)) {
        throw new SponsorError(429, 'Too many sponsored transactions from this client. Wait a minute and retry.');
      }
      const transaction = parseTransaction(txHex);
      assertSponsorable(transaction, { contractAddress: table });

      const dust = await currentDust();
      if (dust <= reserveDust) {
        throw new SponsorError(503, 'The sponsor is out of DUST right now. Pay your own fee or retry later.');
      }

      const ttl = new Date(Date.now() + SPONSOR_LIMITS.ttlMs);
      const recipe = await walletCtx.wallet.balanceFinalizedTransaction(
        transaction,
        { shieldedSecretKeys: walletCtx.shieldedSecretKeys, dustSecretKey: walletCtx.dustSecretKey },
        { ttl, tokenKindsToBalance: ['dust'] },
      );
      const signed = await walletCtx.wallet.signRecipe(recipe, (payload) => walletCtx.unshieldedKeystore.signData(payload));
      const finalized = await walletCtx.wallet.finalizeRecipe(signed);
      let txId = null;
      try {
        const ids = finalized.identifiers?.();
        txId = Array.isArray(ids) && ids.length > 0 ? ids[0] : finalized.transactionHash?.();
      } catch { txId = null; }
      await walletCtx.wallet.submitTransaction(finalized);
      logger.log?.(`[sponsor] paid fees for ${txId ?? 'tx'} (client ${clientKey})`);
      return { txId, sponsored: true };
    };
    const result = inFlight.then(run, run);
    inFlight = result.catch(() => undefined);
    return result;
  }

  return {
    sponsor,
    contractAddress: table,
    async status() {
      const dust = await currentDust();
      return { enabled: true, contractAddress: table, dustAvailable: dust > reserveDust, rateLimit: SPONSOR_LIMITS.maxTransactionsPerMinutePerIp };
    },
  };
}
