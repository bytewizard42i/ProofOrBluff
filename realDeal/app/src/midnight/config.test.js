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

describe('mainnet network identity', () => {
  async function loadMainnetConfig(sponsoredApiUrl) {
    vi.resetModules();
    vi.stubEnv('VITE_NETWORK_ID', 'mainnet');
    vi.stubEnv('VITE_CONTRACT_VARIANT', 'state-only');
    vi.stubEnv('VITE_POB_API_URL', sponsoredApiUrl);
    return import('./config.js');
  }

  it('still refuses browser mainnet without the sponsored service', async () => {
    await expect(loadMainnetConfig('')).rejects.toThrow('Blockfrost token is kept behind a server proxy');
  });

  it('allows mainnet when the sponsored service URL is configured', async () => {
    const config = await loadMainnetConfig('https://api.prooforbluff.app');
    expect(config.NETWORK_ID).toBe('mainnet');
    expect(config.SPONSORED_MODE).toBe(true);
    expect(config.SPONSORED_API_URL).toBe('https://api.prooforbluff.app');
  });

  it('keeps rejecting unknown networks in sponsored mode', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_NETWORK_ID', 'devnet');
    vi.stubEnv('VITE_CONTRACT_VARIANT', 'state-only');
    vi.stubEnv('VITE_POB_API_URL', 'https://api.prooforbluff.app');
    await expect(import('./config.js')).rejects.toThrow('Unsupported VITE_NETWORK_ID');
  });
});
