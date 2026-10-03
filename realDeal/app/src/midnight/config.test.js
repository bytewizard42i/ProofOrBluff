import { afterEach, describe, expect, it, vi } from 'vitest';

const address = 'ab'.repeat(32);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function loadConfig(value) {
  vi.resetModules();
  vi.stubEnv('VITE_NETWORK_ID', 'preview');
  vi.stubEnv('VITE_CONTRACT_VARIANT', 'state-only');
  vi.stubEnv('VITE_CONTRACT_ADDRESS', value);
  return import('./config.js');
}

describe('published Preview table configuration', () => {
  it('uses the published address without requiring a browser paste', async () => {
    vi.stubGlobal('window', { localStorage: { getItem: () => null } });
    const config = await loadConfig(address.toUpperCase());
    expect(config.getContractAddress()).toBe(address);
    expect(config.NETWORK_ID).toBe('preview');
  });

  it('preserves the existing browser address for match recovery', async () => {
    const saved = 'cd'.repeat(32);
    vi.stubGlobal('window', { localStorage: { getItem: () => saved } });
    const config = await loadConfig(address);
    expect(config.getContractAddress()).toBe(saved);
  });

  it('rejects malformed published addresses', async () => {
    await expect(loadConfig('wrong')).rejects.toThrow('64-character hexadecimal');
  });
});
