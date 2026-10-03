import { describe, expect, it, vi } from 'vitest';
import { completeMatchSetup } from './matchSetup.js';

function setup(phase, hasEntropy = true) {
  return {
    readMatch: vi.fn().mockResolvedValueOnce({ phase }).mockResolvedValue({ phase: 2 }),
    joinBot: vi.fn().mockResolvedValue({}),
    revealSeed: vi.fn().mockResolvedValue({}),
    hasOpponentEntropy: () => hasEntropy,
  };
}

describe('resuming confirmed match setup', () => {
  it('joins the computer and reveals the seed without creating a new match', async () => {
    const callbacks = setup(0, false);
    expect(await completeMatchSetup(callbacks)).toEqual({ phase: 2 });
    expect(callbacks.joinBot).toHaveBeenCalledTimes(1);
    expect(callbacks.revealSeed).toHaveBeenCalledTimes(1);
  });

  it('does not repeat a completed join', async () => {
    const callbacks = setup(1);
    await completeMatchSetup(callbacks);
    expect(callbacks.joinBot).not.toHaveBeenCalled();
    expect(callbacks.revealSeed).toHaveBeenCalledTimes(1);
  });

  it('retrieves the computer entropy after a lost join response', async () => {
    const callbacks = setup(1, false);
    await completeMatchSetup(callbacks);
    expect(callbacks.joinBot).toHaveBeenCalledTimes(1);
  });

  it.each([2, 3, 4])('performs reads only when the match is already in phase %s', async phase => {
    const callbacks = setup(phase);
    await completeMatchSetup(callbacks);
    expect(callbacks.joinBot).not.toHaveBeenCalled();
    expect(callbacks.revealSeed).not.toHaveBeenCalled();
  });

  it('fails closed on unknown state and does not reveal after a join error', async () => {
    const unknown = setup(9);
    await expect(completeMatchSetup(unknown)).rejects.toThrow('Nothing was submitted');
    expect(unknown.joinBot).not.toHaveBeenCalled();
    const failing = setup(0);
    failing.joinBot.mockRejectedValue(new Error('Unavailable'));
    await expect(completeMatchSetup(failing)).rejects.toThrow('Unavailable');
    expect(failing.revealSeed).not.toHaveBeenCalled();
  });
});
