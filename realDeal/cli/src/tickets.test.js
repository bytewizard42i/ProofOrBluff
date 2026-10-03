import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createTicketStore, normalizeCode, hashCode, TicketError } from './tickets.js';

const MATCH_A = 'a'.repeat(64);
const MATCH_B = 'b'.repeat(64);
const KEY_1 = '1'.repeat(64);
const KEY_2 = '2'.repeat(64);

let dir;
let file;
let clock;
let store;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pob-tickets-'));
  file = path.join(dir, 'tickets.json');
  clock = 1_000_000;
  store = createTicketStore({ file, now: () => clock });
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('normalizeCode', () => {
  it('accepts human-typed variants', () => {
    expect(normalizeCode('pob-abcd-2345')).toBe('POB-ABCD-2345');
    expect(normalizeCode('  ABCD 2345 ')).toBe('POB-ABCD-2345');
    expect(normalizeCode('POBABCD2345')).toBe('POB-ABCD-2345');
  });
  it('rejects ambiguous or malformed input', () => {
    expect(normalizeCode('POB-ABC0-1111')).toBeNull(); // 0 and 1 are not in the alphabet
    expect(normalizeCode('POB-ABCD')).toBeNull();
    expect(normalizeCode(null)).toBeNull();
  });
});

describe('ticket store', () => {
  it('mints a well-formed code and stores only its hash', () => {
    const { code } = store.mint({ note: 'John test' });
    expect(code).toMatch(/^POB-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const raw = fs.readFileSync(file, 'utf8');
    expect(raw).not.toContain(code);
    expect(raw).toContain(hashCode(code));
  });

  it('inspects validity and remaining allowance', () => {
    const { code } = store.mint({ maxTransactions: 3 });
    expect(store.inspect(code)).toMatchObject({ valid: true, remaining: 3, expired: false });
    expect(() => store.inspect('POB-ZZZZ-ZZZZ')).toThrow(TicketError);
  });

  it('consumes allowance and binds to the first match and session', () => {
    const { code } = store.mint({ maxTransactions: 3 });
    expect(store.consume(code, { sessionKey: KEY_1 })).toMatchObject({ remaining: 2, matchId: null });
    expect(store.consume(code, { matchId: MATCH_A, sessionKey: KEY_1 })).toMatchObject({ remaining: 1, matchId: MATCH_A });
    expect(() => store.consume(code, { matchId: MATCH_B, sessionKey: KEY_1 })).toThrow(/different match/);
    expect(() => store.consume(code, { matchId: MATCH_A, sessionKey: KEY_2 })).toThrow(/another player session/);
    store.consume(code, { matchId: MATCH_A, sessionKey: KEY_1 });
    expect(() => store.consume(code, { matchId: MATCH_A, sessionKey: KEY_1 })).toThrow(/used up/);
    expect(store.inspect(code).valid).toBe(false);
  });

  it('expires and revokes', () => {
    const { code } = store.mint({ ttlMs: 10 });
    clock += 11;
    expect(store.inspect(code)).toMatchObject({ valid: false, expired: true });
    expect(() => store.consume(code)).toThrow(/expired/);
    const fresh = store.mint();
    store.revoke(fresh.code);
    expect(() => store.consume(fresh.code)).toThrow(/revoked/);
  });

  it('rejects silly allowances', () => {
    expect(() => store.mint({ maxTransactions: 0 })).toThrow(TicketError);
    expect(() => store.mint({ maxTransactions: 10_000 })).toThrow(TicketError);
  });

  it('lists without exposing codes or full match ids', () => {
    const { code } = store.mint({ note: 'demo' });
    store.consume(code, { matchId: MATCH_A });
    const [row] = store.list();
    expect(JSON.stringify(row)).not.toContain(code);
    expect(row.matchId).toBe('aaaaaaaa…');
    expect(row.note).toBe('demo');
  });
});
