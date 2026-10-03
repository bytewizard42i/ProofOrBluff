import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('realDeal/contracts/proof-or-bluff-mainnet.compact', 'utf8');

describe('mainnet state-only contract boundary', () => {
  it('has no value-taking, payout, or escrow operations', () => {
    for (const forbidden of [
      'ShieldedCoinInfo', 'QualifiedShieldedCoinInfo', 'receiveShielded',
      'sendShielded', 'matchPots', 'claimPayout', 'wagerAmount',
      'mergeCoinImmediate', 'escrowReleased', 'potHasCoin',
    ]) {
      expect(source, `forbidden value operation: ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('still commits to private plays and reveals only the challenged truth value', () => {
    expect(source).toContain('witness revealLastPlay(): PlayRevealWitness;');
    expect(source).toContain('persistentHash<PlayRevealWitness>(reveal)');
    expect(source).toContain('export circuit resolveChallenge(');
    expect(source).toContain('return disclose(claimWasTrue);');
    expect(source).toContain('export pure circuit commitEntropy(');
    expect(source).toContain('export pure circuit commitPlay(');
  });

  it('publishes only a seed commitment, not the hand-revealing seed', () => {
    expect(source).toContain('seedCommitment: commitSeed(combined)');
    expect(source).toContain('export pure circuit combineEntropy(');
    expect(source).not.toContain('combinedSeed: combined');
    expect(source).toContain('blockTimeGte(disclose((lastActionAt + timeoutSeconds)');
    expect(source).toContain('Timeout must be between one hour and seven days');
  });

  it('keeps two-player lifecycle, timeout recovery, and public queries', () => {
    for (const circuit of [
      'createMatch', 'joinMatch', 'revealSeed', 'playCards', 'acceptClaim',
      'challengeClaim', 'resolveChallenge', 'cancelUnjoinedMatch',
      'forfeitAbandonedMatch', 'forfeitStalledChallenge', 'getMatch',
      'getMatchPhase', 'getWinner',
    ]) {
      expect(source).toContain(`export circuit ${circuit}(`);
    }
  });
});
