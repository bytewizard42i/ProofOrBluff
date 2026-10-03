/**
 * Game tickets: a short code that entitles its holder to one sponsored game.
 *
 * A ticket is NOT a key. It never signs anything and it cannot move funds.
 * It is an allowance: "the Proof or Bluff sponsor will pay DUST for up to N
 * transactions from the session that redeems this code, on one match, until
 * the expiry". The player's own session key signs their moves; our sponsor
 * key stays on our server.
 *
 * Storage is a small JSON file under the CLI state directory. Codes are
 * stored only as SHA-256 hashes, so a leaked tickets file does not leak
 * usable codes. The plaintext code is shown exactly once, when minted.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const TICKET_DEFAULTS = Object.freeze({
  // A standard match to 15 points is roughly 10–20 player transactions
  // (plays, accepts, challenges, resolves) plus create + reveal. 40 leaves
  // headroom for a long game without turning one code into a faucet.
  maxTransactions: 40,
  ttlMs: 7 * 24 * 60 * 60 * 1000,
});

// Unambiguous alphabet: no 0/O, 1/I/L.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_PATTERN = /^POB-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

export class TicketError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function normalizeCode(input) {
  if (typeof input !== 'string') return null;
  const upper = input.trim().toUpperCase().replace(/[\s_]/g, '-');
  const compact = upper.replace(/-/g, '');
  const withPrefix = compact.startsWith('POB') ? compact.slice(3) : compact;
  if (!/^[A-Z2-9]{8}$/.test(withPrefix)) return null;
  const code = `POB-${withPrefix.slice(0, 4)}-${withPrefix.slice(4)}`;
  return CODE_PATTERN.test(code) ? code : null;
}

export function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function randomCode() {
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `POB-${out.slice(0, 4)}-${out.slice(4)}`;
}

/**
 * Create a ticket store rooted at `file`. All methods are synchronous and
 * rewrite the file atomically; volume is tiny (hundreds of tickets), so a
 * database would be ceremony.
 */
export function createTicketStore({ file, now = Date.now } = {}) {
  if (!file) throw new Error('createTicketStore requires a file path.');

  function load() {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      return parsed && typeof parsed === 'object' && parsed.tickets ? parsed : { version: 1, tickets: {} };
    } catch {
      return { version: 1, tickets: {} };
    }
  }
  function save(db) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(db, null, 2)}\n`);
    fs.renameSync(tmp, file);
  }

  function mint({ maxTransactions = TICKET_DEFAULTS.maxTransactions, ttlMs = TICKET_DEFAULTS.ttlMs, note = '' } = {}) {
    if (!Number.isInteger(maxTransactions) || maxTransactions < 1 || maxTransactions > 500) {
      throw new TicketError(400, 'maxTransactions must be an integer from 1 through 500.');
    }
    const db = load();
    let code = randomCode();
    while (db.tickets[hashCode(code)]) code = randomCode();
    const record = {
      createdAt: now(),
      expiresAt: now() + ttlMs,
      maxTransactions,
      used: 0,
      matchId: null,
      sessionKey: null,
      note: String(note).slice(0, 120),
      revoked: false,
    };
    db.tickets[hashCode(code)] = record;
    save(db);
    return { code, ...record };
  }

  function lookup(codeInput) {
    const code = normalizeCode(codeInput);
    if (!code) throw new TicketError(400, 'That does not look like a game code (format POB-XXXX-XXXX).');
    const db = load();
    const record = db.tickets[hashCode(code)];
    if (!record) throw new TicketError(404, 'Game code not found. Check the code or ask for a new one.');
    return { code, record, db };
  }

  /** Read-only validity check for the UI. Returns remaining allowance. */
  function inspect(codeInput) {
    const { record } = lookup(codeInput);
    const expired = now() > record.expiresAt;
    const remaining = Math.max(0, record.maxTransactions - record.used);
    return {
      valid: !record.revoked && !expired && remaining > 0,
      expired,
      revoked: record.revoked,
      remaining,
      maxTransactions: record.maxTransactions,
      matchId: record.matchId,
      expiresAt: record.expiresAt,
    };
  }

  /**
   * Consume one allowance. `matchId` binds the ticket to its first match;
   * `sessionKey` (the player's coin public key hex) binds it to the first
   * session so a leaked code cannot be shared across players. Match may be
   * null for the create-match transaction itself (no id exists yet).
   */
  function consume(codeInput, { matchId = null, sessionKey = null } = {}) {
    const { code, record, db } = lookup(codeInput);
    if (record.revoked) throw new TicketError(403, 'This game code has been revoked.');
    if (now() > record.expiresAt) throw new TicketError(403, 'This game code has expired.');
    if (record.used >= record.maxTransactions) throw new TicketError(403, 'This game code has used up its allowance.');
    if (record.sessionKey && sessionKey && record.sessionKey !== sessionKey) {
      throw new TicketError(403, 'This game code is already in use by another player session.');
    }
    if (record.matchId && matchId && record.matchId !== matchId) {
      throw new TicketError(403, 'This game code is tied to a different match.');
    }
    record.used += 1;
    if (!record.sessionKey && sessionKey) record.sessionKey = sessionKey;
    if (!record.matchId && matchId) record.matchId = matchId;
    db.tickets[hashCode(code)] = record;
    save(db);
    return { remaining: record.maxTransactions - record.used, matchId: record.matchId };
  }

  function revoke(codeInput) {
    const { code, record, db } = lookup(codeInput);
    record.revoked = true;
    db.tickets[hashCode(code)] = record;
    save(db);
    return true;
  }

  function list() {
    const db = load();
    return Object.entries(db.tickets).map(([hash, r]) => ({
      hash: hash.slice(0, 12),
      used: r.used,
      maxTransactions: r.maxTransactions,
      expiresAt: r.expiresAt,
      revoked: r.revoked,
      matchId: r.matchId ? `${r.matchId.slice(0, 8)}…` : null,
      note: r.note,
    }));
  }

  return { mint, inspect, consume, revoke, list, file };
}
