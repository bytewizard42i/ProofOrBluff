import { beforeAll, describe, expect, it } from 'vitest';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { ShieldedCoinPublicKey } from '@midnight-ntwrk/wallet-sdk-address-format';
import { normalizeCoinPublicKeyHex } from './coinPublicKey.js';

const keyHex = 'ab'.repeat(32);

beforeAll(() => {
  setNetworkId('preview');
});

describe('normalizeCoinPublicKeyHex', () => {
  it('decodes the Bech32m key Lace reports into the hex the contract stores', () => {
    const key = ShieldedCoinPublicKey.fromHexString(keyHex);
    const bech32 = ShieldedCoinPublicKey.codec.encode('preview', key).asString();
    expect(bech32.startsWith('mn_')).toBe(true);
    expect(normalizeCoinPublicKeyHex(bech32)).toBe(keyHex);
  });

  it('passes a correctly sized hex key through unchanged', () => {
    expect(normalizeCoinPublicKeyHex(keyHex.toUpperCase())).toBe(keyHex);
    expect(normalizeCoinPublicKeyHex(`  ${keyHex}  `)).toBe(keyHex);
  });

  it('rejects incorrectly sized strings instead of comparing them', () => {
    for (const bad of ['ab', 'ab'.repeat(31), 'ab'.repeat(33), '00'.repeat(64)]) {
      expect(() => normalizeCoinPublicKeyHex(bad)).toThrow('unexpected length');
    }
  });

  it('rejects malformed and missing keys with a reconnect message', () => {
    expect(() => normalizeCoinPublicKeyHex('not-a-key')).toThrow('cannot read');
    expect(() => normalizeCoinPublicKeyHex(null)).toThrow('Reconnect');
    expect(() => normalizeCoinPublicKeyHex(undefined)).toThrow('Reconnect');
    expect(() => normalizeCoinPublicKeyHex(1234)).toThrow('Reconnect');
  });
});
