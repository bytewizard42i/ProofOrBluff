import { describe, expect, it, vi } from 'vitest';
import { readPublicMatch } from './publicMatch.js';

const matchId = 'ab'.repeat(32);
const contractAddress = 'cd'.repeat(32);

function fixtures() {
  const state = { data: {} };
  const publicDataProvider = { queryContractState: vi.fn().mockResolvedValue(state) };
  const match = { phase: 2n, p2Score: 3n };
  const matches = { member: vi.fn().mockReturnValue(true), lookup: vi.fn().mockReturnValue(match) };
  const decodeLedger = vi.fn().mockReturnValue({ matches });
  return { publicDataProvider, decodeLedger, matches, state, match };
}

describe('indexer-only match reads', () => {
  it('reads the map from public state without a wallet, prover, or transaction API', async () => {
    const fixture = fixtures();
    const result = await readPublicMatch(fixture.publicDataProvider, fixture.decodeLedger, contractAddress, matchId);
    expect(result).toEqual(fixture.match);
    expect(fixture.publicDataProvider.queryContractState).toHaveBeenCalledWith(contractAddress);
    expect(fixture.decodeLedger).toHaveBeenCalledWith(fixture.state.data);
    expect(fixture.matches.lookup).toHaveBeenCalledWith(new Uint8Array(32).fill(0xab));
  });

  it('rejects invalid match IDs before querying', async () => {
    const fixture = fixtures();
    await expect(readPublicMatch(fixture.publicDataProvider, fixture.decodeLedger, contractAddress, 'bad')).rejects.toThrow('64 hexadecimal');
    expect(fixture.publicDataProvider.queryContractState).not.toHaveBeenCalled();
  });

  it('fails clearly when the contract or match is missing', async () => {
    const fixture = fixtures();
    fixture.publicDataProvider.queryContractState.mockResolvedValueOnce(null);
    await expect(readPublicMatch(fixture.publicDataProvider, fixture.decodeLedger, contractAddress, matchId)).rejects.toThrow('indexer');
    fixture.matches.member.mockReturnValue(false);
    await expect(readPublicMatch(fixture.publicDataProvider, fixture.decodeLedger, contractAddress, matchId)).rejects.toThrow('not found');
    expect(fixture.matches.lookup).not.toHaveBeenCalled();
  });
});
