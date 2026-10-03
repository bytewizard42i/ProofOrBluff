/**
 * diagnostics/redact.js — scrub secrets out of anything before it leaves
 * the browser as a diagnostic report.
 *
 * WHY THIS EXISTS
 * A diagnostic report is meant to be pasted into a chat, an issue, or a
 * Discord thread. Anything that reaches it is effectively public. Proof or
 * Bluff handles several things that must NEVER be in such a paste:
 *   - a player's hidden cards / hand salt / shared seed (the whole game),
 *   - wallet seeds, mnemonics, private keys, witness values,
 *   - a Blockfrost `project_id` (it is a billing credential),
 *   - full bech32 wallet addresses (privacy; a 12-char prefix is enough
 *     to tell "which network / which kind" without identifying anyone),
 *   - unknown 64-hex blobs (could be a hash, could be a key — redact unless
 *     the caller explicitly says it is a public id such as a tx hash).
 *
 * Two entry points:
 *   redactSensitiveText(text, { publicIds })  — for one string
 *   redactObjectDeep(value, { publicIds })    — walks a whole object tree
 *
 * Both are pure: they return new values and never mutate their input.
 */

// ---------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------

// A run of 64 or more hex characters, optionally prefixed with 0x.
// 64 hex = 32 bytes = the size of hashes, keys, salts and seeds alike.
// We use `{64,}` (not exactly 64) so a 128-hex signature is also caught.
const LONG_HEX_PATTERN = /\b(?:0x)?[0-9a-fA-F]{64,}\b/g;

// Blockfrost authenticates with a query-string parameter. Match the value
// up to the next `&` or whitespace so the rest of the URL survives.
const BLOCKFROST_PROJECT_ID_PATTERN = /project_id=[^&\s"']+/gi;

// Midnight bech32m addresses look like `mn_addr_preview1qxy...`,
// `mn_shield-addr_undeployed1...`, `mn_dust_preprod1...`. The human-readable
// part (HRP) is lowercase letters, underscores and hyphens; then a literal
// `1` separator; then the base32 data part. Requiring at least 8 data chars
// keeps us from matching a bare HRP in prose.
const MIDNIGHT_BECH32_ADDRESS_PATTERN = /\bmn_[a-z_-]+1[02-9ac-hj-np-z]{8,}/g;

// How much of a bech32 address we keep. 12 chars of `mn_addr_preview1...`
// shows the kind and the network and nothing identifying.
export const ADDRESS_PREFIX_LENGTH = 12;

// Object keys whose VALUES are always replaced wholesale, regardless of
// what the value looks like. Deliberately broad: `hand` also catches
// `walletHandle`, `token` also catches `tokenType`. False positives only
// cost us a little debugging detail; false negatives leak secrets.
export const SENSITIVE_KEY_PATTERN =
  /seed|salt|witness|entropy|secret|password|token|mnemonic|privateKey|cards|hand|ranks/i;

// Keys that specifically hold card data as arrays of small integers
// (ranks 0-12, card indices 0-51). Already covered by SENSITIVE_KEY_PATTERN,
// listed separately so the intent is explicit and testable.
export const CARD_ARRAY_KEY_PATTERN = /^(cards|hand|ranks)$/i;

export const REDACTED_PLACEHOLDER = '[redacted]';
export const REDACTED_HEX_PLACEHOLDER = '[redacted-hex]';
export const ELLIPSIS = '\u2026'; // "…" — one character, so prefix+… is 13 chars

// ---------------------------------------------------------------------
// Allowlist helpers
// ---------------------------------------------------------------------

/**
 * Normalise a public id (tx hash, contract address) so lookups ignore
 * case and an optional 0x prefix. Everything else is left alone.
 */
function normalisePublicId(identifier) {
  if (typeof identifier !== 'string') return '';
  return identifier.trim().replace(/^0x/i, '').toLowerCase();
}

/** Build a Set of normalised allowlisted ids from whatever the caller gave. */
function buildPublicIdSet(publicIds) {
  const normalised = new Set();
  if (!Array.isArray(publicIds)) return normalised;
  for (const identifier of publicIds) {
    const clean = normalisePublicId(identifier);
    if (clean) normalised.add(clean);
  }
  return normalised;
}

// ---------------------------------------------------------------------
// Text redaction
// ---------------------------------------------------------------------

/** Keep only the first ADDRESS_PREFIX_LENGTH chars of a bech32 address. */
export function truncateBech32Address(address) {
  if (typeof address !== 'string') return address;
  if (address.length <= ADDRESS_PREFIX_LENGTH) return address;
  return `${address.slice(0, ADDRESS_PREFIX_LENGTH)}${ELLIPSIS}`;
}

/**
 * Redact one string. Order matters a little: we handle the project_id
 * first so a 64-hex project id is not "double redacted" into something
 * confusing; then long hex; then addresses.
 *
 * @param {string} text
 * @param {{ publicIds?: string[] }} [options]
 * @returns {string}
 */
export function redactSensitiveText(text, options = {}) {
  if (typeof text !== 'string' || text.length === 0) return text;
  const allowlistedIds = buildPublicIdSet(options.publicIds);

  const withoutProjectId = text.replace(
    BLOCKFROST_PROJECT_ID_PATTERN,
    `project_id=${REDACTED_PLACEHOLDER}`,
  );

  const withoutUnknownHex = withoutProjectId.replace(LONG_HEX_PATTERN, (match) => {
    const isAllowlisted = allowlistedIds.has(normalisePublicId(match));
    return isAllowlisted ? match : REDACTED_HEX_PLACEHOLDER;
  });

  const withTruncatedAddresses = withoutUnknownHex.replace(
    MIDNIGHT_BECH32_ADDRESS_PATTERN,
    (match) => truncateBech32Address(match),
  );

  return withTruncatedAddresses;
}

// ---------------------------------------------------------------------
// Deep object redaction
// ---------------------------------------------------------------------

/** True when the key names something we never want to see the value of. */
export function isSensitiveKey(key) {
  return typeof key === 'string' && SENSITIVE_KEY_PATTERN.test(key);
}

/** True for arrays like [3, 11, 7] — card ranks or indices. */
export function isArrayOfSmallIntegers(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => Number.isInteger(item) && item >= 0 && item < 256)
  );
}

/**
 * Walk any JSON-ish value and return a redacted copy.
 *  - strings go through redactSensitiveText
 *  - values under sensitive keys become "[redacted]"
 *  - arrays of small ints under cards/hand/ranks become "[redacted]"
 *    (already implied by the key rule; kept explicit for clarity)
 *  - bigint becomes a string (JSON.stringify would throw otherwise)
 *  - Error objects become their (redacted) message
 *  - circular references become "[circular]" instead of blowing the stack
 *
 * @param {unknown} value
 * @param {{ publicIds?: string[] }} [options]
 */
export function redactObjectDeep(value, options = {}) {
  const seenObjects = new WeakSet();
  return redactNode(value, options, seenObjects);
}

function redactNode(value, options, seenObjects) {
  if (value === null || value === undefined) return value;

  const valueType = typeof value;
  if (valueType === 'string') return redactSensitiveText(value, options);
  if (valueType === 'number' || valueType === 'boolean') return value;
  if (valueType === 'bigint') return value.toString();
  if (valueType === 'function' || valueType === 'symbol') return undefined;

  if (value instanceof Error) {
    return redactSensitiveText(value.message || String(value), options);
  }
  if (value instanceof Date) return value.toISOString();

  if (seenObjects.has(value)) return '[circular]';
  seenObjects.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactNode(item, options, seenObjects));
  }

  const redactedObject = {};
  for (const [key, childValue] of Object.entries(value)) {
    redactedObject[key] = redactChildUnderKey(key, childValue, options, seenObjects);
  }
  return redactedObject;
}

/** Decide what to do with a value based on the key it lives under. */
function redactChildUnderKey(key, childValue, options, seenObjects) {
  if (isSensitiveKey(key)) return REDACTED_PLACEHOLDER;
  if (CARD_ARRAY_KEY_PATTERN.test(key) && isArrayOfSmallIntegers(childValue)) {
    return REDACTED_PLACEHOLDER;
  }
  return redactNode(childValue, options, seenObjects);
}
