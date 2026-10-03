import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./cli.js', () => ({ openSession: vi.fn() }));
vi.mock('./state.js', () => ({ getEntropy: vi.fn(), setContractAddress: vi.fn(), setActiveMatch: vi.fn() }));

import { openSession } from './cli.js';
import * as state from './state.js';
import { createTestWiredBot } from './bot.js';

const matchId = 'aa'.repeat(32);
const p1Entropy = 'bb'.repeat(32);
const p2Entropy = 'cc'.repeat(32);
let api;

beforeEach(() => {
  vi.resetAllMocks();
  api = { address: 'dd'.repeat(32), getMatch: vi.fn(), importEntropy: vi.fn(), joinMatch: vi.fn() };
  openSession.mockResolvedValue({ variant: 'state-only', api });
});

describe('computer join recovery', () => {
  it('returns the stored entropy after a confirmed join without submitting again', async () => {
    api.getMatch.mockResolvedValue({ phase: 1n });
    state.getEntropy.mockImplementation((id, role) => role === 'p1' ? p1Entropy : p2Entropy);
    const result = await createTestWiredBot().join({ matchId, p1Entropy, wagerAmount: 0 });
    expect(result.status).toBe('already-joined');
    expect(result.p2Entropy).toBe(p2Entropy);
    expect(api.joinMatch).not.toHaveBeenCalled();
    expect(api.importEntropy).not.toHaveBeenCalled();
  });

  it('refuses recovery when the supplied entropy does not match stored state', async () => {
    api.getMatch.mockResolvedValue({ phase: 1n });
    state.getEntropy.mockReturnValue(p2Entropy);
    await expect(createTestWiredBot().join({ matchId, p1Entropy, wagerAmount: 0 })).rejects.toThrow('No join was submitted');
    expect(api.joinMatch).not.toHaveBeenCalled();
  });

  it('joins once when the on-chain match is still awaiting the computer', async () => {
    api.getMatch.mockResolvedValue({ phase: 0n });
    api.joinMatch.mockResolvedValue({ entropy: p2Entropy, txId: '00ff' + matchId });
    const result = await createTestWiredBot().join({ matchId, p1Entropy, wagerAmount: 0 });
    expect(result.status).toBe('joined');
    expect(api.joinMatch).toHaveBeenCalledTimes(1);
  });
});
