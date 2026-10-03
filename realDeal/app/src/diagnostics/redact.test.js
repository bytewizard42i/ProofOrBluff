import { describe, expect, it } from 'vitest';
import {
  ADDRESS_PREFIX_LENGTH,
  REDACTED_HEX_PLACEHOLDER,
  REDACTED_PLACEHOLDER,
  isArrayOfSmallIntegers,
  isSensitiveKey,
  redactObjectDeep,
  redactSensitiveText,
  truncateBech32Address,
} from './redact.js';

// Realistic-looking fixtures. None of these are real secrets.
const PUBLIC_TX_ID = 'a3f1c9e2b7d4061f8e5a2c3b4d5e6f70819a2b3c4d5e6f708192a3b4c5d6e7f8';
const SECRET_SEED = '0000000000000000000000000000000000000000000000000000000000000042';
const PREVIEW_ADDRESS = 'mn_addr_preview1qpzry9x8gf2tvdw0s3jn54khce6mua7lmqqqxw';
const SHIELD_ADDRESS = 'mn_shield-addr_undeployed1zry9x8gf2tvdw0s3jn54khce6mua7lqazxcv';
const DUST_ADDRESS = 'mn_dust_preprod1qpzry9x8gf2tvdw0s3jn54khce6mua7l';

describe('redactSensitiveText — 64-hex strings', () => {
  it('redacts an unknown 64-hex string', () => {
    const output = redactSensitiveText(`seed was ${SECRET_SEED} ok`);
    expect(output).toBe(`seed was ${REDACTED_HEX_PLACEHOLDER} ok`);
    expect(output).not.toContain(SECRET_SEED);
  });

  it('redacts a 0x-prefixed 64-hex string', () => {
    const output = redactSensitiveText(`key 0x${SECRET_SEED}`);
    expect(output).not.toContain(SECRET_SEED);
  });

  it('redacts hex runs longer than 64 (e.g. a 128-hex signature)', () => {
    const signature = SECRET_SEED + SECRET_SEED;
    expect(redactSensitiveText(signature)).toBe(REDACTED_HEX_PLACEHOLDER);
  });

  it('keeps an allowlisted tx id', () => {
    const output = redactSensitiveText(`tx ${PUBLIC_TX_ID} landed`, { publicIds: [PUBLIC_TX_ID] });
    expect(output).toBe(`tx ${PUBLIC_TX_ID} landed`);
  });

  it('allowlist is case-insensitive and ignores a 0x prefix', () => {
    const output = redactSensitiveText(`0x${PUBLIC_TX_ID.toUpperCase()}`, { publicIds: [PUBLIC_TX_ID] });
    expect(output).toContain(PUBLIC_TX_ID.toUpperCase());
  });

  it('keeps the allowlisted id but still redacts a different hex in the same string', () => {
    const output = redactSensitiveText(`${PUBLIC_TX_ID} / ${SECRET_SEED}`, { publicIds: [PUBLIC_TX_ID] });
    expect(output).toContain(PUBLIC_TX_ID);
    expect(output).not.toContain(SECRET_SEED);
  });

  it('leaves short hex alone (a 40-hex value is not our target)', () => {
    const shortHex = 'abcdef0123456789abcdef0123456789abcdef01';
    expect(redactSensitiveText(shortHex)).toBe(shortHex);
  });
});

describe('redactSensitiveText — Blockfrost project_id', () => {
  it('redacts the project_id query parameter value', () => {
    const url = 'https://midnight-mainnet.blockfrost.io/api/v0?project_id=mainnetAbC123secret&x=1';
    const output = redactSensitiveText(url);
    expect(output).toBe(`https://midnight-mainnet.blockfrost.io/api/v0?project_id=${REDACTED_PLACEHOLDER}&x=1`);
    expect(output).not.toContain('mainnetAbC123secret');
  });

  it('redacts project_id at the end of a string and when upper-cased', () => {
    const output = redactSensitiveText('PROJECT_ID=abc');
    expect(output).not.toContain('abc');
    expect(output.toLowerCase()).toBe(`project_id=${REDACTED_PLACEHOLDER}`);
  });
});

describe('redactSensitiveText — bech32 Midnight addresses', () => {
  it('truncates an mn_addr_ address to a 12-char prefix plus ellipsis', () => {
    const output = redactSensitiveText(`player ${PREVIEW_ADDRESS}`);
    expect(output).toBe(`player ${PREVIEW_ADDRESS.slice(0, ADDRESS_PREFIX_LENGTH)}\u2026`);
    expect(output).not.toContain(PREVIEW_ADDRESS);
  });

  it('truncates mn_shield-addr_ and mn_dust addresses too', () => {
    const output = redactSensitiveText(`${SHIELD_ADDRESS} ${DUST_ADDRESS}`);
    expect(output).not.toContain(SHIELD_ADDRESS);
    expect(output).not.toContain(DUST_ADDRESS);
    expect(output).toContain('mn_shield-ad\u2026');
    expect(output).toContain('mn_dust_prep\u2026');
  });

  it('truncateBech32Address keeps already-short strings as-is', () => {
    expect(truncateBech32Address('mn_addr')).toBe('mn_addr');
  });
});

describe('redactSensitiveText — edge cases', () => {
  it('returns non-strings and empty strings untouched', () => {
    expect(redactSensitiveText('')).toBe('');
    expect(redactSensitiveText(null)).toBe(null);
    expect(redactSensitiveText(42)).toBe(42);
  });

  it('leaves harmless prose alone', () => {
    const prose = 'createMatch stage=proving latency 1200ms on preview';
    expect(redactSensitiveText(prose)).toBe(prose);
  });
});

describe('isSensitiveKey / isArrayOfSmallIntegers', () => {
  it('matches every required key family, case-insensitively', () => {
    for (const key of [
      'seed', 'sharedSeed', 'handSalt', 'salt', 'witness', 'witnesses', 'entropy',
      'secret', 'clientSecret', 'password', 'token', 'accessToken', 'mnemonic',
      'privateKey', 'cards', 'hand', 'ranks', 'PRIVATEKEY',
    ]) {
      expect(isSensitiveKey(key), key).toBe(true);
    }
  });

  it('does not match ordinary report keys', () => {
    for (const key of ['timestamp', 'networkId', 'stage', 'operation', 'txId', 'latencyMs', 'blockHeight']) {
      expect(isSensitiveKey(key), key).toBe(false);
    }
  });

  it('recognises arrays of small integers', () => {
    expect(isArrayOfSmallIntegers([3, 11, 7])).toBe(true);
    expect(isArrayOfSmallIntegers([])).toBe(false);
    expect(isArrayOfSmallIntegers([1, 'x'])).toBe(false);
    expect(isArrayOfSmallIntegers([1, 9999])).toBe(false);
  });
});

describe('redactObjectDeep', () => {
  it('replaces values under sensitive keys, at any depth', () => {
    const input = {
      match: {
        sharedSeed: SECRET_SEED,
        handSalt: 'abc',
        nested: { mnemonic: 'word word word', privateKey: 'k' },
      },
      token: 12345,
    };
    const output = redactObjectDeep(input);
    expect(output.match.sharedSeed).toBe(REDACTED_PLACEHOLDER);
    expect(output.match.handSalt).toBe(REDACTED_PLACEHOLDER);
    expect(output.match.nested.mnemonic).toBe(REDACTED_PLACEHOLDER);
    expect(output.match.nested.privateKey).toBe(REDACTED_PLACEHOLDER);
    expect(output.token).toBe(REDACTED_PLACEHOLDER);
  });

  it('redacts arrays of small integers under cards / hand / ranks', () => {
    const output = redactObjectDeep({ cards: [3, 11, 7], hand: [0, 51], ranks: [12] });
    expect(output.cards).toBe(REDACTED_PLACEHOLDER);
    expect(output.hand).toBe(REDACTED_PLACEHOLDER);
    expect(output.ranks).toBe(REDACTED_PLACEHOLDER);
  });

  it('redacts secrets inside strings in arrays and keeps allowlisted tx ids', () => {
    const input = {
      activity: [
        { operation: 'createMatch', txId: PUBLIC_TX_ID, note: `leaked ${SECRET_SEED}` },
        { operation: 'joinMatch', url: 'https://x.io/api/v0?project_id=abc' },
      ],
      player: PREVIEW_ADDRESS,
    };
    const output = redactObjectDeep(input, { publicIds: [PUBLIC_TX_ID] });
    expect(output.activity[0].txId).toBe(PUBLIC_TX_ID);
    expect(output.activity[0].note).not.toContain(SECRET_SEED);
    expect(output.activity[1].url).toBe(`https://x.io/api/v0?project_id=${REDACTED_PLACEHOLDER}`);
    expect(output.player).toBe(`${PREVIEW_ADDRESS.slice(0, 12)}\u2026`);
  });

  it('does not mutate its input', () => {
    const input = { seed: 'x', list: [SECRET_SEED] };
    const snapshot = JSON.stringify(input);
    redactObjectDeep(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('handles bigint, Date, Error, functions and circular references', () => {
    const circular = { name: 'loop' };
    circular.self = circular;
    const output = redactObjectDeep({
      amount: 10n,
      when: new Date('2026-10-02T00:00:00.000Z'),
      failure: new Error(`boom ${SECRET_SEED}`),
      callback: () => {},
      circular,
    });
    expect(output.amount).toBe('10');
    expect(output.when).toBe('2026-10-02T00:00:00.000Z');
    expect(output.failure).toBe(`boom ${REDACTED_HEX_PLACEHOLDER}`);
    expect(output.callback).toBeUndefined();
    expect(output.circular.self).toBe('[circular]');
    expect(() => JSON.stringify(output)).not.toThrow();
  });

  it('passes through null, numbers and booleans', () => {
    expect(redactObjectDeep(null)).toBe(null);
    expect(redactObjectDeep(7)).toBe(7);
    expect(redactObjectDeep(true)).toBe(true);
  });
});
