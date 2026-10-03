// Tests for proof receipts (receipts.js). Run from repo root:
//   npx vitest run realDeal/cli/src/receipts.test.js

import { describe, expect, it, vi } from 'vitest';
import {
  createInMemoryReceiptStore, createReceipt, createReceiptDelivery, IDENTITY_KIND, sessionKeyToHex, validateIdentity,
} from './receipts.js';

const SESSION_HEX = 'ab'.repeat(32);
const OTHER_SESSION_HEX = 'cd'.repeat(32);
const TX_HASH = '0x' + '5f'.repeat(32);

function sampleReceipt(overrides = {}) {
  return createReceipt({
    gameId: '11'.repeat(32), mode: 1n, p1Score: 15n, p2Score: 7n, winner: 1n,
    txHash: TX_HASH, network: 'preview', provenAt: 1_800_000_000_000, ...overrides,
  });
}

describe('createReceipt', () => {
  it('holds only the public record and normalises hex / bigint inputs', () => {
    const receipt = sampleReceipt();
    expect(receipt).toEqual({
      version: 1, gameId: '11'.repeat(32), mode: 1, p1Score: 15, p2Score: 7, winner: 1,
      txHash: '5f'.repeat(32), network: 'preview', provenAt: '2027-01-15T08:00:00.000Z', explorerUrl: null,
    });
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(Object.keys(receipt)).not.toContain('cards');
    expect(Object.keys(receipt)).not.toContain('transcript');
  });

  it('builds an explorer link only from a caller-supplied base URL (never a guessed host)', () => {
    expect(sampleReceipt().explorerUrl).toBeNull();
    expect(sampleReceipt({ explorerBaseUrl: 'https://explorer.example/tx/' }).explorerUrl)
      .toBe(`https://explorer.example/tx/${'5f'.repeat(32)}`);
    expect(() => sampleReceipt({ explorerBaseUrl: 'http://insecure.example' })).toThrow(/https/);
  });

  it('rejects malformed fields loudly', () => {
    expect(() => sampleReceipt({ winner: 3 })).toThrow(/winner/);
    expect(() => sampleReceipt({ txHash: 'not-hex' })).toThrow(/txHash/);
    expect(() => sampleReceipt({ p1Score: -1 })).toThrow(/p1Score/);
    expect(() => sampleReceipt({ network: '' })).toThrow(/network/);
    expect(() => sampleReceipt({ provenAt: 0 })).toThrow(/provenAt/);
  });
});

describe('validateIdentity', () => {
  it('accepts the three kinds and normalises them', () => {
    expect(validateIdentity({ kind: 'session', value: '0x' + SESSION_HEX.toUpperCase() })).toEqual({ kind: 'session', value: SESSION_HEX });
    expect(validateIdentity({ kind: 'email', value: 'Player@Example.com' })).toEqual({ kind: 'email', value: 'player@example.com' });
    expect(validateIdentity({ kind: 'did', value: 'did:key:z6Mk' })).toEqual({ kind: 'did', value: 'did:key:z6Mk' });
    expect(sessionKeyToHex(new Uint8Array(32).fill(0xab))).toBe(SESSION_HEX);
  });

  it('rejects unknown kinds and malformed values', () => {
    expect(() => validateIdentity({ kind: 'phone', value: '555' })).toThrow(/kind/);
    expect(() => validateIdentity({ kind: 'session', value: 'abcd' })).toThrow(/32-byte hex/);
    expect(() => validateIdentity({ kind: 'email', value: 'nope' })).toThrow(/email/);
    expect(() => validateIdentity({ kind: 'did', value: 'key:abc' })).toThrow(/did:/);
    expect(() => validateIdentity(null)).toThrow(/identity/);
  });
});

describe('createReceiptDelivery', () => {
  it('stores under the session identity and lists it back', async () => {
    const delivery = createReceiptDelivery();
    const receipt = sampleReceipt();
    const results = await delivery.deliver(receipt, [{ kind: IDENTITY_KIND.SESSION, value: SESSION_HEX }]);
    expect(results).toEqual([{ kind: 'session', delivered: true }]);
    expect(await delivery.listForSession(SESSION_HEX)).toEqual([receipt]);
    expect(await delivery.listForSession('0x' + SESSION_HEX)).toEqual([receipt]); // same key, any hex spelling
    expect(await delivery.listForSession(OTHER_SESSION_HEX)).toEqual([]);
  });

  it('throws when no session identity is given (email alone is never enough)', async () => {
    const delivery = createReceiptDelivery();
    await expect(delivery.deliver(sampleReceipt(), [{ kind: 'email', value: 'p@example.com' }]))
      .rejects.toThrow(/session identity is required/);
    await expect(delivery.deliver(sampleReceipt(), [])).rejects.toThrow(/session identity is required/);
  });

  it('records optional identities as skipped when no channel is configured', async () => {
    const delivery = createReceiptDelivery();
    const results = await delivery.deliver(sampleReceipt(), [
      { kind: 'session', value: SESSION_HEX },
      { kind: 'email', value: 'p@example.com' },
      { kind: 'did', value: 'did:prism:abc' },
    ]);
    expect(results).toEqual([
      { kind: 'session', delivered: true },
      { kind: 'email', delivered: false, skipped: 'channel-not-configured' },
      { kind: 'did', delivered: false, skipped: 'channel-not-configured' },
    ]);
    expect(await delivery.listForSession(SESSION_HEX)).toHaveLength(1);
  });

  it('invokes a configured email channel with the address and the public receipt only', async () => {
    const email = vi.fn(async () => {});
    const delivery = createReceiptDelivery({ channels: { email } });
    const receipt = sampleReceipt();
    const results = await delivery.deliver(receipt, [
      { kind: 'email', value: 'Player@Example.com' },   // listed first on purpose…
      { kind: 'session', value: SESSION_HEX },          // …session is still delivered first
    ]);
    expect(results[0]).toEqual({ kind: 'session', delivered: true });
    expect(results[1]).toEqual({ kind: 'email', delivered: true });
    expect(email).toHaveBeenCalledTimes(1);
    const [address, payload] = email.mock.calls[0];
    expect(address).toBe('player@example.com');
    expect(payload).toBe(receipt);
    expect(Object.keys(payload).sort()).toEqual(
      ['explorerUrl', 'gameId', 'mode', 'network', 'p1Score', 'p2Score', 'provenAt', 'txHash', 'version', 'winner'],
    );
  });

  it('a failing channel is reported without blocking the store or other channels', async () => {
    const email = vi.fn(async () => { throw new Error('smtp down'); });
    const did = vi.fn(async () => {});
    const delivery = createReceiptDelivery({ channels: { email, did } });
    const results = await delivery.deliver(sampleReceipt(), [
      { kind: 'session', value: SESSION_HEX },
      { kind: 'email', value: 'p@example.com' },
      { kind: 'did', value: 'did:prism:abc' },
    ]);
    expect(results).toEqual([
      { kind: 'session', delivered: true },
      { kind: 'email', delivered: false, error: 'smtp down' },
      { kind: 'did', delivered: true },
    ]);
    expect(await delivery.listForSession(SESSION_HEX)).toHaveLength(1);
  });

  it('accepts an injected store and rejects malformed configuration', async () => {
    const appended = [];
    const store = { append: async (key, receipt) => appended.push([key, receipt]), list: async () => [] };
    const delivery = createReceiptDelivery({ store });
    await delivery.deliver(sampleReceipt(), [{ kind: 'session', value: SESSION_HEX }]);
    expect(appended).toHaveLength(1);
    expect(appended[0][0]).toBe(SESSION_HEX);
    expect(() => createReceiptDelivery({ store: {} })).toThrow(/store must expose/);
    expect(() => createReceiptDelivery({ channels: { sms: async () => {} } })).toThrow(/unknown channel/);
    expect(createInMemoryReceiptStore()).toHaveProperty('append');
    await expect(delivery.deliver({ nope: true }, [{ kind: 'session', value: SESSION_HEX }])).rejects.toThrow(/createReceipt/);
  });
});
