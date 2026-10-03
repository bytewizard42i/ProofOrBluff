import { parseCoinPublicKeyToHex } from '@midnight-ntwrk/midnight-js-utils';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

const HEX_64 = /^[0-9a-fA-F]{64}$/;

/**
 * The contract stores a player's ZswapCoinPublicKey as raw 32 bytes; the Lace
 * connector reports the same key as Bech32m (mn_shield-cpk_…). Wallet-match
 * checks must only ever compare normalized 64-character hex — a key of any
 * other size or encoding can never equal an on-chain player key, so this
 * fails closed with a player-readable message instead of leaking a raw
 * parser or length error into the UI.
 */
export function normalizeCoinPublicKeyHex(coinPublicKey) {
  if (typeof coinPublicKey !== 'string' || coinPublicKey.length === 0) {
    throw new Error('Lace did not report a wallet key. Reconnect your wallet and try again.');
  }
  const trimmed = coinPublicKey.trim();
  let decoded;
  try {
    decoded = parseCoinPublicKeyToHex(trimmed, getNetworkId());
  } catch {
    throw new Error('Lace reported a wallet key in a format this build cannot read. Reconnect and try again.');
  }
  const clean = typeof decoded === 'string' && decoded.startsWith('0x') ? decoded.slice(2) : decoded;
  if (typeof clean !== 'string' || !HEX_64.test(clean)) {
    throw new Error('Lace reported a wallet key of unexpected length. Reconnect and try again.');
  }
  return clean.toLowerCase();
}
