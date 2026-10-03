// Proof receipts for the one-proof-per-game rollup (docs/ZK_GAME_ROLLUP.md §4,
// "Proof receipts"). When closeGame confirms, the player gets a RECEIPT — the
// public record of the game — not the proof blob and never a card.
//
// ---------------------------------------------------------------------------
// PRIVACY RULE (read before changing anything here)
//
//   1. A receipt holds ONLY what the chain already shows: game id, mode, final
//      scores, winner, tx hash, network, timestamp, explorer link. No cards,
//      no claims, no transcript, no salts, no entropy. `createReceipt` builds
//      receipts from an explicit allow-list of fields so nothing else can
//      sneak in by spreading a game object into it.
//   2. Delivery ALWAYS goes to the player's SESSION identity first — the
//      in-app "My Games" list keyed by the 32-byte session key the player
//      already uses to play. This needs no PII and is required: `deliver()`
//      throws if it is missing.
//   3. Email and DID identities are OPTIONAL extras the player opted into
//      (e.g. Pro registration on .com). They are forwarded to a pluggable
//      channel if one is configured and recorded as skipped otherwise. They
//      are never required to play or to receive the receipt.
//   4. Identities are never logged. This module does not import a logger on
//      purpose; callers must not log the `identities` argument either.
// ---------------------------------------------------------------------------

/** Identity kinds a receipt can be delivered to. `session` is the only required one. */
export const IDENTITY_KIND = Object.freeze({ SESSION: 'session', EMAIL: 'email', DID: 'did' });

const HEX_32_BYTES = /^(0x)?[0-9a-fA-F]{64}$/;
const HEX_ANY = /^(0x)?[0-9a-fA-F]+$/;
// Deliberately loose: we only need "looks like an address", not RFC 5322.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DID_SHAPE = /^did:[a-z0-9]+:[^\s]+$/;

/** Winner codes exactly as the circuit records them. */
export const WINNER = Object.freeze({ DRAW: 0, PLAYER_ONE: 1, PLAYER_TWO: 2 });

function requireNonEmptyString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function toSmallInteger(value, name) {
  const number = typeof value === 'bigint' ? Number(value) : value;
  if (!Number.isInteger(number) || number < 0 || number > 255) throw new RangeError(`${name} must be an integer 0..255`);
  return number;
}

/** Lower-case hex without 0x, so the same key always lands in the same store slot. */
function normalizeHex(value, name) {
  const text = requireNonEmptyString(value, name);
  if (!HEX_ANY.test(text)) throw new TypeError(`${name} must be a hex string`);
  return text.replace(/^0x/, '').toLowerCase();
}

/** Uint8Array(32) → hex, for callers holding the raw session key. */
export function sessionKeyToHex(sessionKey) {
  if (!(sessionKey instanceof Uint8Array) || sessionKey.length !== 32) {
    throw new TypeError('sessionKey must be a 32-byte Uint8Array');
  }
  return Buffer.from(sessionKey).toString('hex');
}

/**
 * Build the receipt record. Allow-listed fields only (privacy rule 1).
 *
 * `explorerUrl` is derived from `explorerBaseUrl` if the caller supplies one
 * (e.g. from an env var per network); we do NOT guess an explorer host for a
 * network because an unverified link is worse than none. Left null otherwise.
 */
export function createReceipt({
  gameId, mode, p1Score, p2Score, winner, txHash, network, provenAt, explorerBaseUrl = null,
}) {
  const winnerCode = toSmallInteger(winner, 'winner');
  if (![WINNER.DRAW, WINNER.PLAYER_ONE, WINNER.PLAYER_TWO].includes(winnerCode)) {
    throw new RangeError('winner must be 0 (draw), 1 (player one) or 2 (player two)');
  }
  const normalizedTxHash = normalizeHex(txHash, 'txHash');
  const provenAtMs = provenAt instanceof Date ? provenAt.getTime() : provenAt;
  if (!Number.isFinite(provenAtMs) || provenAtMs <= 0) throw new RangeError('provenAt must be a Date or a positive ms timestamp');

  return Object.freeze({
    version: 1,
    gameId: normalizeHex(gameId, 'gameId'),
    mode: toSmallInteger(mode, 'mode'),
    p1Score: toSmallInteger(p1Score, 'p1Score'),
    p2Score: toSmallInteger(p2Score, 'p2Score'),
    winner: winnerCode,
    txHash: normalizedTxHash,
    network: requireNonEmptyString(network, 'network'),
    provenAt: new Date(provenAtMs).toISOString(),
    explorerUrl: buildExplorerUrl(explorerBaseUrl, normalizedTxHash),
  });
}

function buildExplorerUrl(explorerBaseUrl, txHash) {
  if (explorerBaseUrl === null || explorerBaseUrl === undefined) return null;
  const base = requireNonEmptyString(explorerBaseUrl, 'explorerBaseUrl');
  if (!/^https:\/\//.test(base)) throw new TypeError('explorerBaseUrl must be an https:// URL');
  return `${base.replace(/\/+$/, '')}/${txHash}`;
}

/**
 * Validate one identity from the tagged union
 *   { kind: 'session', value: <hex 32 bytes> } | { kind: 'email', value } | { kind: 'did', value }
 * and return a normalised copy. Throws with the field named on any problem.
 */
export function validateIdentity(identity) {
  if (!identity || typeof identity !== 'object') throw new TypeError('identity must be an object { kind, value }');
  const { kind } = identity;
  if (kind === IDENTITY_KIND.SESSION) {
    const text = requireNonEmptyString(identity.value, 'session identity value');
    if (!HEX_32_BYTES.test(text)) throw new TypeError('session identity value must be a 32-byte hex session key');
    return Object.freeze({ kind, value: normalizeHex(text, 'session identity value') });
  }
  if (kind === IDENTITY_KIND.EMAIL) {
    const text = requireNonEmptyString(identity.value, 'email identity value').toLowerCase();
    if (!EMAIL_SHAPE.test(text)) throw new TypeError('email identity value does not look like an email address');
    return Object.freeze({ kind, value: text });
  }
  if (kind === IDENTITY_KIND.DID) {
    const text = requireNonEmptyString(identity.value, 'did identity value');
    if (!DID_SHAPE.test(text)) throw new TypeError('did identity value must look like did:<method>:<id>');
    return Object.freeze({ kind, value: text });
  }
  throw new TypeError(`identity kind must be one of ${Object.values(IDENTITY_KIND).join(', ')}`);
}

/** Default store: in-memory Map of sessionKeyHex → receipts[]. Swap for a DB in production. */
export function createInMemoryReceiptStore() {
  const receiptsBySession = new Map();
  return {
    async append(sessionKeyHex, receipt) {
      const list = receiptsBySession.get(sessionKeyHex) ?? [];
      list.push(receipt);
      receiptsBySession.set(sessionKeyHex, list);
    },
    async list(sessionKeyHex) {
      return [...(receiptsBySession.get(sessionKeyHex) ?? [])];
    },
  };
}

const SKIPPED_CHANNEL_NOT_CONFIGURED = 'channel-not-configured';

/**
 * Pluggable delivery.
 *
 * @param store     { append(sessionKeyHex, receipt), list(sessionKeyHex) } — in-memory by default
 * @param channels  { email?: async (address, receipt) => any, did?: async (did, receipt) => any }
 *
 * deliver(receipt, identities) stores under the session identity (required),
 * then fans out to each optional identity's channel. One failing channel does
 * not block the others or the store; it is reported per identity.
 */
export function createReceiptDelivery({ store = createInMemoryReceiptStore(), channels = {} } = {}) {
  if (!store || typeof store.append !== 'function' || typeof store.list !== 'function') {
    throw new TypeError('store must expose append(sessionKeyHex, receipt) and list(sessionKeyHex)');
  }
  for (const [kind, channel] of Object.entries(channels)) {
    if (![IDENTITY_KIND.EMAIL, IDENTITY_KIND.DID].includes(kind)) throw new TypeError(`unknown channel '${kind}'`);
    if (typeof channel !== 'function') throw new TypeError(`channel '${kind}' must be a function`);
  }

  async function deliverToOptionalChannel(identity, receipt) {
    const channel = channels[identity.kind];
    if (!channel) return { kind: identity.kind, delivered: false, skipped: SKIPPED_CHANNEL_NOT_CONFIGURED };
    try {
      await channel(identity.value, receipt);
      return { kind: identity.kind, delivered: true };
    } catch (error) {
      // Report the failure; never include the identity value in the message.
      return { kind: identity.kind, delivered: false, error: error?.message ?? String(error) };
    }
  }

  return {
    async deliver(receipt, identities) {
      if (!receipt || typeof receipt !== 'object' || typeof receipt.txHash !== 'string') {
        throw new TypeError('receipt must come from createReceipt()');
      }
      if (!Array.isArray(identities)) throw new TypeError('identities must be an array');
      const validated = identities.map(validateIdentity);
      const sessionIdentities = validated.filter((identity) => identity.kind === IDENTITY_KIND.SESSION);
      if (sessionIdentities.length === 0) {
        throw new Error('a session identity is required: receipts are always delivered to the in-app "My Games" list first');
      }

      // Privacy rule 2: session first, always.
      const results = [];
      for (const identity of sessionIdentities) {
        await store.append(identity.value, receipt);
        results.push({ kind: IDENTITY_KIND.SESSION, delivered: true });
      }
      // Privacy rule 3: optional channels, best effort.
      for (const identity of validated.filter((identity) => identity.kind !== IDENTITY_KIND.SESSION)) {
        results.push(await deliverToOptionalChannel(identity, receipt));
      }
      return results;
    },

    async listForSession(sessionKeyHex) {
      const normalized = validateIdentity({ kind: IDENTITY_KIND.SESSION, value: sessionKeyHex }).value;
      return store.list(normalized);
    },
  };
}
