import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cliPath = fileURLToPath(new URL('./cli.js', import.meta.url));
const localFixtureSeed = `${'0'.repeat(63)}2`;

// These are offline preflight tests. They run the real CLI with invalid
// public-network configurations and prove it stops BEFORE opening a wallet
// or submitting a transaction. No Docker, provider, or funds are needed.
function runCli(args, overrides = {}) {
  const environment = { ...process.env, ...overrides };
  delete environment.POB_ALLOW_MAINNET_DEPLOY;
  return spawnSync(process.execPath, [cliPath, ...args], {
    env: environment,
    encoding: 'utf8',
    timeout: 15_000,
  });
}

describe('public-network deployment guardrails', () => {
  it('locks mainnet deployment without John explicitly approving this command', () => {
    const result = runCli(['create-match', '--network', 'mainnet', '--contract', 'state-only', '--player', 'p1']);
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain('Mainnet deployment is locked');
    expect(result.stdout + result.stderr).not.toContain('Building wallet');
  });

  it('forbids the wagered contract on public networks', () => {
    const result = runCli(['create-match', '--network', 'preprod', '--contract', 'wagered', '--player', 'p1']);
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain('wagered contract is disabled');
    expect(result.stdout + result.stderr).not.toContain('Building wallet');
  });

  it('refuses a committed local test seed even if copied into the public seed variable', () => {
    const result = runCli(['create-match', '--network', 'preprod', '--contract', 'state-only', '--player', 'p1'], {
      POB_PUBLIC_SEED_P1: localFixtureSeed,
    });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain('Refusing to use a committed local test seed');
    expect(result.stdout + result.stderr).not.toContain('Building wallet');
  });
});
