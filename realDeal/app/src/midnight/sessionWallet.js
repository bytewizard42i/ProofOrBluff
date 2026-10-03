import { Transaction, ZswapSecretKeys } from '@midnight-ntwrk/ledger-v8';
import { NETWORK_ID } from './config.js';

/**
 * Session wallet for sponsored play.
 *
 * A player who redeems a game ticket does not need Lace, funds, or DUST. The
 * browser generates a fresh seed, derives Zswap keys from it, and that key
 * pair becomes the player on the contract (ownPublicKey()). Every move is
 * signed here, silently; the Proof or Bluff sponsor pays the DUST.
 *
 * Why this is safe to run with an empty wallet: the state-only contract
 * moves no tokens, so a proved call transaction has nothing to balance.
 * `balanceTx` therefore only binds the proved transaction, and `submitTx`
 * hands it to the sponsor, which adds a DUST fee spend and submits it.
 *
 * The seed lives in localStorage so a reload resumes the same player. It
 * authorises nothing but moves in a no-stakes game; clearing site data
 * forfeits the match, not money. It is never sent anywhere.
 */

export const SESSION_SEED_KEY = `pob:session-seed:${NETWORK_ID}`;

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex) {
  const clean = hex.replace(/^0x/, '');
  return Uint8Array.from(clean.match(/.{2}/g), (pair) => Number.parseInt(pair, 16));
}

export function loadOrCreateSessionSeed(storage = window.localStorage) {
  try {
    const existing = storage.getItem(SESSION_SEED_KEY);
    if (existing && /^[0-9a-f]{64}$/.test(existing)) return hexToBytes(existing);
  } catch { /* fall through to a fresh seed */ }
  const seed = new Uint8Array(32);
  crypto.getRandomValues(seed);
  try { storage.setItem(SESSION_SEED_KEY, bytesToHex(seed)); } catch { /* in-memory only */ }
  return seed;
}

export function forgetSessionSeed(storage = window.localStorage) {
  try { storage.removeItem(SESSION_SEED_KEY); } catch { /* noop */ }
}

/**
 * Submit a finalized transaction through the sponsor. Exported so the UI can
 * surface ticket allowance and the activity panel can label the stage.
 */
export async function submitViaSponsor({ botUrl, code, txHex, matchId, sessionKey, fetchImpl = fetch }) {
  const response = await fetchImpl(`${botUrl}/api/sponsor/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ code, txHex, matchId: matchId ?? null, sessionKey: sessionKey ?? null }),
  });
  let data = {};
  try { data = await response.json(); } catch { /* keep {} */ }
  if (!response.ok || data.status !== 'ok') {
    const reason = data.error || `sponsor returned HTTP ${response.status}`;
    const error = new Error(`Sponsored submission failed: ${reason}`);
    error.statusCode = response.status;
    throw error;
  }
  return data;
}

/**
 * Create a wallet handle with the same shape `connectWallet()` returns, so
 * RealDealGameProvider and the contract layer need no changes.
 *
 * `getMatchId` lets the adapter report the bound match on each submission
 * (null before the create-match transaction has an id).
 */
export function createSessionWallet({
  ticketCode,
  botUrl,
  seed = loadOrCreateSessionSeed(),
  networkId = NETWORK_ID,
  getMatchId = () => null,
  onSponsored = () => {},
  fetchImpl = fetch,
}) {
  if (!ticketCode) throw new Error('A game code is required for sponsored play.');
  const keys = ZswapSecretKeys.fromSeed(seed);
  const coinPublicKey = keys.coinPublicKey;
  const encryptionPublicKey = keys.encryptionPublicKey;

  const adapter = {
    getCoinPublicKey() { return coinPublicKey; },
    getEncryptionPublicKey() { return encryptionPublicKey; },
    // No tokens move in a state-only call, so there is nothing to balance
    // and no fee to pay here: bind the proved transaction and hand it on.
    async balanceTx(provenTx) {
      return provenTx.bind();
    },
    async submitTx(finalizedTx) {
      const txHex = bytesToHex(finalizedTx.serialize());
      const result = await submitViaSponsor({
        botUrl, code: ticketCode, txHex, matchId: getMatchId(), sessionKey: coinPublicKey, fetchImpl,
      });
      onSponsored(result);
      return result.txId ?? null;
    },
  };

  return {
    kind: 'session',
    api: null,
    adapter,
    coinPublicKey,
    encryptionPublicKey,
    shieldedAddress: null,
    address: null,
    balances: {},
    networkId,
    ticketCode,
    // Session keys authorise moves only; expose nothing else.
    clear() { keys.clear(); },
  };
}

// Re-exported for tests that want to confirm round-tripping without a DOM.
export const __internal = { bytesToHex, hexToBytes, Transaction };
