// Guards the operator wallet identity across wallet SDK generations.
//
// The Mainnet operator wallet was funded under wallet-sdk 1.x. The 2.x seed
// path (WalletSeeds.fromMasterSeed) must derive the same unshielded address
// and the same shielded/dust public keys, or every NIGHT and DUST balance
// would be orphaned on upgrade. The fixture seed below is a public constant,
// never a funded wallet.

import { describe, expect, it } from 'vitest';
import { Buffer } from 'buffer';
import { WalletSeeds, createKeystore } from '@midnightntwrk/wallet-sdk';
import * as ledger from '@midnightntwrk/ledger-v9';
import { deriveUnshieldedAddress } from './wallet-node.js';

const FIXTURE_SEED = '11'.repeat(32);

// Values produced by wallet-sdk 1.2.0 / ledger-v8 (HDWallet account 0, roles
// Zswap / NightExternal / Dust, index 0) for the same fixture seed, recorded
// before the ledger-9 upgrade on 2026-11-08.
const EXPECTED = {
  mainnetAddress: 'mn_addr164t3m7skgcgnjv7r7xmduxhnznvdvz4wu0pw08ks865cg6eu6nss0n8gq8',
  undeployedAddress: 'mn_addr_undeployed164t3m7skgcgnjv7r7xmduxhnznvdvz4wu0pw08ks865cg6eu6nsswufyjp',
  shieldedCoinPublicKey: '4d4e8f04c0ac1cc7af848211cb9e2d8169ab24bf96b8008416845c508a691a20',
  shieldedEncPublicKey: '576affa9008ed8e90e10b9c0ea1c891571094def029ef046393137a65960bc2e',
  dustPublicKey: '0x645a9ef82562b98e1d7efd1b655b224637360ce8fbbb333d1d9fd7c7c08fe446',
};

describe('wallet derivation is unchanged by the wallet-sdk 2 upgrade', () => {
  it('derives the pre-upgrade unshielded addresses', () => {
    expect(deriveUnshieldedAddress(FIXTURE_SEED, 'mainnet')).toBe(EXPECTED.mainnetAddress);
    expect(deriveUnshieldedAddress(FIXTURE_SEED, 'undeployed')).toBe(EXPECTED.undeployedAddress);
  });

  it('derives the pre-upgrade shielded and dust public keys', () => {
    const seeds = WalletSeeds.fromMasterSeed(Buffer.from(FIXTURE_SEED, 'hex'));
    const shielded = ledger.ZswapSecretKeys.fromSeed(seeds.shielded);
    const dust = ledger.DustSecretKey.fromSeed(seeds.dust);
    expect(String(shielded.coinPublicKey)).toBe(EXPECTED.shieldedCoinPublicKey);
    expect(String(shielded.encryptionPublicKey)).toBe(EXPECTED.shieldedEncPublicKey);
    expect(`0x${dust.publicKey.toString(16).padStart(64, '0')}`).toBe(EXPECTED.dustPublicKey);
    expect(createKeystore({ kind: 'schnorr', secret: seeds.unshielded }, 'mainnet').getBech32Address().asString())
      .toBe(EXPECTED.mainnetAddress);
  });

  it('rejects malformed seeds before touching any key material', () => {
    expect(() => deriveUnshieldedAddress('abc', 'mainnet')).toThrow(/64-character hex/);
  });
});
