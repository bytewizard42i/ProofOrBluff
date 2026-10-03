// rollup-consent.js — off-chain signing helpers for the rollup's CloseConsent
// authorization (spec §7, contract section 6 in closeGame).
//
// WHAT: each player's identity on the ledger is `playerIdFromPk(pk)` — the
// persistentHash of a Jubjub session key's coordinates. To close a game, both
// players sign the same CloseConsent {sep, gameId, transcriptRoot, scores,
// winner} and the circuit verifies both Schnorr signatures in-circuit.
//
// WHY a separate file: signing is pure math (no network, no ledger), shared by
// the bot (which signs inside finish()), the browser (which signs before
// sending its consent to the bot), and the tests. The one rule from
// midnight-modules/modules/signed-credential/signer.mjs applies verbatim:
// the signer MUST hash exactly like the circuit, so every hash below goes
// through the compiled contract's exported pure circuits
// (closeConsentFor / closeConsentChallenge / closeConsentK) — never a local
// reimplementation.

import { ecMulGenerator, ecAdd, ecMul } from '@midnight-ntwrk/compact-runtime';

// Jubjub prime-order subgroup order. All scalars live mod this. Same constant
// as signed-credential/signer.mjs.
export const JUBJUB_ORDER =
  6554484396890773809930967563523245729705921265872317281365359162392183254199n;
// The circuit truncates the ~255-bit challenge hash to 248 bits
// (SignedCredentials.reduce_challenge).
export const TWO_248 = 1n << 248n;

/**
 * Derive a session key pair from 32 bytes of secret material. The scalar is
 * reduced mod the Jubjub order; zero (astronomically unlikely) is rejected so
 * a broken RNG fails loudly instead of producing an identity anyone can sign
 * for.
 */
export function consentKeyPairFromSecret(secretBytes) {
  if (!(secretBytes instanceof Uint8Array) || secretBytes.length !== 32) {
    throw new TypeError('consent secret must be a 32-byte Uint8Array');
  }
  let sk = 0n;
  for (const byte of secretBytes) sk = (sk << 8n) | BigInt(byte);
  sk %= JUBJUB_ORDER;
  if (sk === 0n) throw new Error('consent secret reduces to zero — pick another');
  return { sk, pk: ecMulGenerator(sk) };
}

/** Convenience: generate a fresh key pair from a caller-supplied RNG. */
export function generateConsentKeyPair(randomBytes32) {
  return consentKeyPairFromSecret(randomBytes32(32));
}

/**
 * The canonical consent payload for a finished game. `pureCircuits` must be
 * the compiled rollup contract's pureCircuits so the separator bytes are the
 * circuit's own pad(32,"pob:close:v1"), not a guess.
 * Result JS shape: { sep: Uint8Array(32), gameId: Uint8Array(32),
 *   transcriptRoot: bigint, p1Score: bigint, p2Score: bigint, winner: bigint }.
 */
export function buildCloseConsent(pureCircuits, { gameId, transcriptRoot, p1Score, p2Score, winner }) {
  if (typeof pureCircuits?.closeConsentFor !== 'function') {
    throw new TypeError('pureCircuits must expose closeConsentFor — recompile the rollup contract');
  }
  return pureCircuits.closeConsentFor(
    gameId, BigInt(transcriptRoot), BigInt(p1Score), BigInt(p2Score), BigInt(winner),
  );
}

/**
 * Schnorr-sign a CloseConsent exactly as SignedCredentials expects:
 *   k = deterministic_k(sk, credential)  (mod Jubjub order)
 *   r = k·G
 *   c = compute_challenge(r, pk, credential) mod 2^248
 *   s = k + c·sk                          (mod Jubjub order)
 * Returns { credential, signature: { r, s }, pk } — the SignedCredential shape
 * the p1CloseConsent / p2CloseConsent witnesses feed to closeGame.
 */
export function signCloseConsent(pureCircuits, consent, keyPair) {
  const k = BigInt(pureCircuits.closeConsentK(keyPair.sk, consent)) % JUBJUB_ORDER;
  const r = ecMulGenerator(k);
  const challengeFull = BigInt(pureCircuits.closeConsentChallenge(r, keyPair.pk, consent));
  const challenge = challengeFull % TWO_248;
  const s = (k + challenge * keyPair.sk) % JUBJUB_ORDER;
  return { credential: consent, signature: { r, s }, pk: keyPair.pk };
}

/**
 * Cheap off-chain sanity check mirroring the circuit's verify(): rejects a
 * malformed/mismatched consent BEFORE it costs a proof attempt. Throws with a
 * human-readable reason; returns the credential on success.
 */
export function verifyCloseConsentOffChain(pureCircuits, signed, expectedConsent, expectedPlayerId) {
  if (!signed?.credential || !signed?.signature || !signed?.pk) {
    throw new TypeError('signed consent must be { credential, signature: { r, s }, pk }');
  }
  for (const field of ['sep', 'gameId', 'transcriptRoot', 'p1Score', 'p2Score', 'winner']) {
    const got = signed.credential[field];
    const want = expectedConsent[field];
    const same = got instanceof Uint8Array
      ? got.length === want.length && got.every((b, i) => b === want[i])
      : BigInt(got) === BigInt(want);
    if (!same) throw new Error(`consent ${field} does not match the game result`);
  }
  const signerId = pureCircuits.playerIdFromPk(signed.pk);
  const wantId = expectedPlayerId;
  const idMatch = signerId.length === wantId.length && signerId.every((b, i) => b === wantId[i]);
  if (!idMatch) throw new Error('consent signer key does not match the registered player identity');
  const challengeFull = BigInt(pureCircuits.closeConsentChallenge(signed.signature.r, signed.pk, signed.credential));
  const challenge = challengeFull % TWO_248;
  const lhs = ecMulGenerator(BigInt(signed.signature.s));
  const rhs = ecAdd(signed.signature.r, ecMul(signed.pk, challenge));
  if (lhs.x !== rhs.x || lhs.y !== rhs.y) throw new Error('consent signature does not verify');
  return signed.credential;
}

/**
 * The witness implementation for the SignedCredentials module's
 * `get_challenge_reduction` — plugged into the rollup contract's witnesses in
 * rollup-contract.js. Computes (quotient, remainder) of the full challenge
 * hash divided by 2^248 on the fly; the circuit asserts the identity itself.
 */
export function challengeReductionWitness(context, fullChallenge) {
  // Test harnesses and non-consent circuits may invoke this with no argument;
  // [0n, 0n] satisfies nothing but also crashes nothing — the circuit asserts
  // the identity itself, so a wrong reduction fails loudly, not cryptically.
  const full = fullChallenge === undefined || fullChallenge === null ? 0n : BigInt(fullChallenge);
  return [context.privateState, [full / TWO_248, full % TWO_248]];
}
