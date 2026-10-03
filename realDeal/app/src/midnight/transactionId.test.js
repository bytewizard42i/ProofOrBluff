import { describe, expect, it } from 'vitest';
import { normalizeTransactionId, optionalTransactionId } from './transactionId.js';

const hash = 'ab'.repeat(32);
const identifier = `00ff${hash}`;

describe('public transaction references', () => {
  it('accepts both a 32-byte hash and a tagged Midnight identifier', () => {
    expect(normalizeTransactionId(hash)).toBe(hash);
    expect(normalizeTransactionId(identifier)).toBe(identifier);
    expect(normalizeTransactionId(`  0x${identifier.toUpperCase()}  `)).toBe(identifier);
  });

  it('does not abort a confirmed move because optional metadata is missing or malformed', () => {
    for (const value of [null, undefined, {}, 'invalid', 'a'.repeat(65), 'g'.repeat(68)]) {
      expect(normalizeTransactionId(value)).toBeNull();
      expect(optionalTransactionId({ txId: value })).toBeNull();
    }
  });

  it('extracts the public identifier without returning the private result fields', () => {
    expect(optionalTransactionId({ txId: identifier, entropy: 'private' })).toBe(identifier);
    expect(optionalTransactionId({ txHash: hash })).toBe(hash);
    expect(optionalTransactionId({ transactionId: identifier })).toBe(identifier);
  });
});
