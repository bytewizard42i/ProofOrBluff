import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  createSessionWallet,
  loadOrCreateSessionSeed,
  forgetSessionSeed,
  submitViaSponsor,
  SESSION_SEED_KEY,
} from './sessionWallet.js';

setNetworkId('preview');

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

describe('session seed persistence', () => {
  it('creates a 32-byte seed once and reuses it across reloads', () => {
    const storage = memoryStorage();
    const a = loadOrCreateSessionSeed(storage);
    const b = loadOrCreateSessionSeed(storage);
    expect(a).toHaveLength(32);
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(storage.getItem(SESSION_SEED_KEY)).toMatch(/^[0-9a-f]{64}$/);
  });
  it('forgets on request', () => {
    const storage = memoryStorage();
    const a = loadOrCreateSessionSeed(storage);
    forgetSessionSeed(storage);
    const b = loadOrCreateSessionSeed(storage);
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });
});

describe('createSessionWallet', () => {
  const seed = Uint8Array.from({ length: 32 }, (_, i) => i + 1);

  it('derives stable Zswap keys from the seed and never exposes an address or balance', () => {
    const w1 = createSessionWallet({ ticketCode: 'POB-AAAA-2222', botUrl: 'http://bot', seed });
    const w2 = createSessionWallet({ ticketCode: 'POB-AAAA-2222', botUrl: 'http://bot', seed });
    expect(typeof w1.coinPublicKey).toBe('string');
    expect(w1.coinPublicKey).toBe(w2.coinPublicKey);
    expect(w1.adapter.getCoinPublicKey()).toBe(w1.coinPublicKey);
    expect(w1.adapter.getEncryptionPublicKey()).toBe(w1.encryptionPublicKey);
    expect(w1.kind).toBe('session');
    expect(w1.address).toBeNull();
    expect(w1.balances).toEqual({});
  });

  it('requires a ticket code', () => {
    expect(() => createSessionWallet({ botUrl: 'http://bot', seed })).toThrow(/game code/);
  });

  it('balanceTx binds without paying fees', async () => {
    const w = createSessionWallet({ ticketCode: 'POB-AAAA-2222', botUrl: 'http://bot', seed });
    const bound = { tag: 'bound' };
    const proven = { bind: vi.fn(() => bound) };
    await expect(w.adapter.balanceTx(proven)).resolves.toBe(bound);
    expect(proven.bind).toHaveBeenCalledTimes(1);
  });

  it('submitTx posts the serialized tx, ticket, match and session key to the sponsor', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({ status: 'ok', txId: 'ab'.repeat(32), ticket: { remaining: 39 } }),
    });
    const onSponsored = vi.fn();
    const w = createSessionWallet({
      ticketCode: 'POB-AAAA-2222', botUrl: 'http://bot', seed, fetchImpl, onSponsored, getMatchId: () => 'cd'.repeat(32),
    });
    const finalized = { serialize: () => Uint8Array.from([0xde, 0xad]) };
    await expect(w.adapter.submitTx(finalized)).resolves.toBe('ab'.repeat(32));
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://bot/api/sponsor/submit');
    const body = JSON.parse(init.body);
    expect(body).toEqual({ code: 'POB-AAAA-2222', txHex: 'dead', matchId: 'cd'.repeat(32), sessionKey: w.coinPublicKey });
    expect(onSponsored).toHaveBeenCalledWith(expect.objectContaining({ ticket: { remaining: 39 } }));
  });

  it('surfaces sponsor refusals with their status', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false, status: 403, json: async () => ({ status: 'error', error: 'This game code has expired.' }),
    });
    await expect(submitViaSponsor({ botUrl: 'http://bot', code: 'x', txHex: 'aa', fetchImpl }))
      .rejects.toMatchObject({ statusCode: 403, message: /expired/ });
  });
});
