import { describe, expect, it, vi } from 'vitest';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { assertSponsorable, createRateLimiter, createSponsor, SponsorError } from './sponsor.js';

const TABLE = 'cc75d39e2d11096d160be2524dc2bbc9c6a569f2906d0adade33d6227f06a159';
const OTHER = 'ab'.repeat(32);

// Fake ledger shapes: only the fields assertSponsorable reads.
function call(address) {
  const action = Object.create(ledger.ContractCall.prototype);
  Object.defineProperty(action, 'address', { value: address });
  return action;
}
function deploy() {
  return Object.create(ledger.ContractDeploy.prototype);
}
function tx({ actions = [call(TABLE)], intents = 1, unshielded = false, dust = false, shielded = false } = {}) {
  const intentMap = new Map();
  for (let i = 0; i < intents; i += 1) {
    intentMap.set(i + 1, {
      actions,
      guaranteedUnshieldedOffer: unshielded ? {} : undefined,
      fallibleUnshieldedOffer: undefined,
      dustActions: dust ? {} : undefined,
    });
  }
  return { intents: intentMap, guaranteedOffer: shielded ? {} : undefined, fallibleOffer: new Map() };
}

describe('assertSponsorable', () => {
  it('accepts a single call to the published table', () => {
    expect(assertSponsorable(tx(), { contractAddress: TABLE })).toBe(true);
    expect(assertSponsorable(tx({ actions: [call(`0x${TABLE.toUpperCase()}`)] }), { contractAddress: TABLE })).toBe(true);
  });

  it('refuses calls to any other contract', () => {
    expect(() => assertSponsorable(tx({ actions: [call(OTHER)] }), { contractAddress: TABLE })).toThrow(/published Proof or Bluff table/);
    expect(() => assertSponsorable(tx({ actions: [call(TABLE), call(OTHER)] }), { contractAddress: TABLE })).toThrow(SponsorError);
  });

  it('refuses deploys and maintenance', () => {
    expect(() => assertSponsorable(tx({ actions: [deploy()] }), { contractAddress: TABLE })).toThrow(/no deploys/);
  });

  it('refuses value movement and double fee payment', () => {
    expect(() => assertSponsorable(tx({ unshielded: true }), { contractAddress: TABLE })).toThrow(/unshielded/);
    expect(() => assertSponsorable(tx({ shielded: true }), { contractAddress: TABLE })).toThrow(/shielded/);
    expect(() => assertSponsorable(tx({ dust: true }), { contractAddress: TABLE })).toThrow(/already pays/);
  });

  it('refuses multi-intent and empty transactions', () => {
    expect(() => assertSponsorable(tx({ intents: 2 }), { contractAddress: TABLE })).toThrow(/exactly one intent/);
    expect(() => assertSponsorable(tx({ actions: [] }), { contractAddress: TABLE })).toThrow(/no contract call/);
    expect(() => assertSponsorable({}, { contractAddress: TABLE })).toThrow(/no intents/);
  });

  it('fails closed when the table address is misconfigured', () => {
    expect(() => assertSponsorable(tx(), { contractAddress: 'nope' })).toThrow(/misconfigured/);
  });
});

describe('createRateLimiter', () => {
  it('allows the limit per window then refuses, and resets after the window', () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: () => now });
    expect(limiter.check('a')).toBe(true);
    expect(limiter.check('a')).toBe(true);
    expect(limiter.check('a')).toBe(false);
    expect(limiter.check('b')).toBe(true);
    now = 1001;
    expect(limiter.check('a')).toBe(true);
  });
});

describe('createSponsor', () => {
  function fakeWalletCtx(dust = 10n) {
    const finalized = { identifiers: () => ['00ff' + 'cd'.repeat(32)] };
    return {
      wallet: {
        waitForSyncedState: vi.fn().mockResolvedValue({ dust: { balance: () => dust } }),
        balanceFinalizedTransaction: vi.fn().mockResolvedValue('recipe'),
        signRecipe: vi.fn().mockResolvedValue('signed'),
        finalizeRecipe: vi.fn().mockResolvedValue(finalized),
        submitTransaction: vi.fn().mockResolvedValue('id'),
      },
      shieldedSecretKeys: {},
      dustSecretKey: {},
      unshieldedKeystore: { signData: vi.fn() },
    };
  }

  it('rejects garbage before touching the wallet', async () => {
    const ctx = fakeWalletCtx();
    const sponsor = createSponsor({ walletCtx: ctx, networkId: 'preview', contractAddress: TABLE, logger: { log() {} } });
    await expect(sponsor.sponsor({ txHex: 'zz' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(sponsor.sponsor({ txHex: 'abcd' })).rejects.toMatchObject({ statusCode: 400 });
    expect(ctx.wallet.balanceFinalizedTransaction).not.toHaveBeenCalled();
  });

  it('enforces the per-client rate limit', async () => {
    const ctx = fakeWalletCtx();
    const sponsor = createSponsor({
      walletCtx: ctx, networkId: 'preview', contractAddress: TABLE,
      rateLimiter: createRateLimiter({ limit: 0 }), logger: { log() {} },
    });
    await expect(sponsor.sponsor({ txHex: 'abcd', clientKey: 'x' })).rejects.toMatchObject({ statusCode: 429 });
  });

  it('reports DUST availability against the reserve floor', async () => {
    const low = createSponsor({ walletCtx: fakeWalletCtx(5n), networkId: 'preview', contractAddress: TABLE, reserveDust: 5n });
    expect((await low.status()).dustAvailable).toBe(false);
    const ok = createSponsor({ walletCtx: fakeWalletCtx(6n), networkId: 'preview', contractAddress: TABLE, reserveDust: 5n });
    expect((await ok.status()).dustAvailable).toBe(true);
  });
});
