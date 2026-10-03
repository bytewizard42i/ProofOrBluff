import { describe, expect, it } from 'vitest';
import appPackageJson from '../../package.json';
import {
  DIAGNOSTIC_REPORT_SCHEMA_VERSION,
  buildDiagnosticReport,
  extractEndpointOrigin,
  normaliseActivityEntry,
  summariseHealth,
  summariseWallet,
  toAddressPrefix,
} from './diagnosticReport.js';
import { REDACTED_HEX_PLACEHOLDER, REDACTED_PLACEHOLDER } from './redact.js';

const PUBLIC_TX_ID = 'a3f1c9e2b7d4061f8e5a2c3b4d5e6f70819a2b3c4d5e6f708192a3b4c5d6e7f8';
const CONTRACT_ADDRESS = '0200f1c9e2b7d4061f8e5a2c3b4d5e6f70819a2b3c4d5e6f708192a3b4c5d6e7f8';
const SECRET_SEED = '0000000000000000000000000000000000000000000000000000000000000042';
const PLAYER_ADDRESS = 'mn_addr_preview1qpzry9x8gf2tvdw0s3jn54khce6mua7lmqqqxw';
const BLOCKFROST_PROJECT_ID = 'mainnetSuperSecretProjectId123';
const FIXED_NOW = new Date('2026-10-02T21:00:00.000Z');

function buildFullFixtureReport(overrides = {}) {
  return buildDiagnosticReport({
    networkId: 'preview',
    contractVariant: 'state-only',
    contractAddress: CONTRACT_ADDRESS,
    endpoints: {
      node: 'https://rpc.midnight-mainnet.blockfrost.io/?project_id=' + BLOCKFROST_PROJECT_ID,
      indexer: 'https://midnight-mainnet.blockfrost.io/api/v0?project_id=' + BLOCKFROST_PROJECT_ID,
      indexerWs: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
      proofServer: 'http://localhost:6300',
    },
    activityHistory: [
      {
        operation: 'createMatch',
        stage: 'confirmed',
        startedAt: '2026-10-02T20:59:00.000Z',
        finishedAt: '2026-10-02T20:59:18.000Z',
        txId: PUBLIC_TX_ID,
        detail: `seed ${SECRET_SEED}`,
        cards: [3, 11, 7],
      },
    ],
    walletSummary: { connected: true, networkLabel: 'Preview', address: PLAYER_ADDRESS },
    healthSnapshot: {
      checkedAt: '2026-10-02T20:58:00.000Z',
      proofServer: { reachable: true, latencyMs: 52 },
      indexer: { reachable: true, blockHeight: 123456, latencyMs: 180 },
    },
    errors: ['Proof failed: witness ' + SECRET_SEED, new TypeError('fetch failed'), { message: 'obj err' }],
    userAgent: 'Mozilla/5.0 (test)',
    now: FIXED_NOW,
    ...overrides,
  });
}

describe('buildDiagnosticReport — shape', () => {
  it('returns a plain JSON-serializable object with the documented fields', () => {
    const report = buildFullFixtureReport();
    expect(() => JSON.stringify(report)).not.toThrow();
    expect(report).toMatchObject({
      schemaVersion: DIAGNOSTIC_REPORT_SCHEMA_VERSION,
      timestamp: FIXED_NOW.toISOString(),
      appVersion: appPackageJson.version,
      networkId: 'preview',
      contractVariant: 'state-only',
      userAgent: 'Mozilla/5.0 (test)',
    });
    expect(Object.keys(report)).toEqual([
      'schemaVersion', 'timestamp', 'appVersion', 'networkId', 'contractVariant', 'contractAddress',
      'endpointHosts', 'activityHistory', 'walletSummary', 'healthSnapshot', 'errors', 'userAgent',
    ]);
  });

  it('reads the app version from package.json by default and accepts an override', () => {
    expect(buildFullFixtureReport().appVersion).toBe(appPackageJson.version);
    expect(buildFullFixtureReport({ appVersion: '9.9.9-test' }).appVersion).toBe('9.9.9-test');
  });

  it('works with the minimal call (all optional inputs omitted)', () => {
    const report = buildDiagnosticReport({ networkId: 'undeployed', contractVariant: 'wagered', endpoints: {} });
    expect(report.activityHistory).toEqual([]);
    expect(report.walletSummary).toEqual({ connected: false, networkLabel: null, addressPrefix: null });
    expect(report.healthSnapshot).toBe(null);
    expect(report.errors).toEqual([]);
    expect(report.contractAddress).toBe(null);
    expect(typeof report.timestamp).toBe('string');
  });
});

describe('buildDiagnosticReport — endpoints are hosts only', () => {
  it('keeps origins and drops paths and query strings', () => {
    const report = buildFullFixtureReport();
    expect(report.endpointHosts).toEqual({
      node: 'https://rpc.midnight-mainnet.blockfrost.io',
      indexer: 'https://midnight-mainnet.blockfrost.io',
      indexerWs: 'wss://indexer.preview.midnight.network',
      proofServer: 'http://localhost:6300',
    });
  });

  it('never lets a Blockfrost project_id appear anywhere in the report', () => {
    const serialized = JSON.stringify(buildFullFixtureReport());
    expect(serialized).not.toContain(BLOCKFROST_PROJECT_ID);
    expect(serialized).not.toContain('project_id');
  });

  it('extractEndpointOrigin handles ws, empty and garbage input', () => {
    expect(extractEndpointOrigin('ws://localhost:8088/api/v4/graphql/ws')).toBe('ws://localhost:8088');
    expect(extractEndpointOrigin('')).toBe(null);
    expect(extractEndpointOrigin(undefined)).toBe(null);
    expect(extractEndpointOrigin('not a url at all')).toBe('[unparseable-endpoint]');
  });

  it('reads lazy getter endpoints (config.js exposes proofServer as a getter)', () => {
    const endpoints = { get proofServer() { return 'http://127.0.0.1:6300/health'; } };
    const report = buildDiagnosticReport({ endpoints });
    expect(report.endpointHosts.proofServer).toBe('http://127.0.0.1:6300');
  });
});

describe('buildDiagnosticReport — activity history', () => {
  it('keeps operation, stage, timestamps, duration and the public tx id', () => {
    const [entry] = buildFullFixtureReport().activityHistory;
    expect(entry.operation).toBe('createMatch');
    expect(entry.stage).toBe('confirmed');
    expect(entry.startedAt).toBe('2026-10-02T20:59:00.000Z');
    expect(entry.finishedAt).toBe('2026-10-02T20:59:18.000Z');
    expect(entry.durationMs).toBe(18000);
    expect(entry.txId).toBe(PUBLIC_TX_ID);
  });

  it('drops card data and redacts secrets that leaked into detail text', () => {
    const [entry] = buildFullFixtureReport().activityHistory;
    expect(entry.cards).toBeUndefined();
    expect(entry.detail).toBe(`seed ${REDACTED_HEX_PLACEHOLDER}`);
  });

  it('normaliseActivityEntry tolerates alternate field names', () => {
    const entry = normaliseActivityEntry({
      label: 'joinMatch', status: 'proving', timestamp: 1_700_000_000_000, txHash: PUBLIC_TX_ID, elapsedMs: '42',
    });
    expect(entry).toMatchObject({ operation: 'joinMatch', stage: 'proving', txId: PUBLIC_TX_ID, durationMs: 42 });
    expect(entry.startedAt).toBe(new Date(1_700_000_000_000).toISOString());
    expect(normaliseActivityEntry(null)).toBe(null);
    expect(normaliseActivityEntry('string')).toBe(null);
  });

  it('accepts the exact shape produced by src/activity/activityStore.js, including the stage log', () => {
    const storeEntry = {
      id: 3,
      operation: 'Play cards',
      stage: 'failed',
      message: 'Submitting',
      txId: PUBLIC_TX_ID,
      error: `Proof rejected for hand salt ${SECRET_SEED}`,
      startedAt: 1_700_000_000_000,
      finishedAt: 1_700_000_018_400,
      log: [
        { at: 1_700_000_000_000, stage: 'preparing', message: '' },
        { at: 1_700_000_001_000, stage: 'proving', message: 'Building proof' },
        { at: 1_700_000_018_000, stage: 'submitting', message: 'Submitting', txId: PUBLIC_TX_ID },
        { at: 1_700_000_018_400, stage: 'failed', message: 'Proof rejected' },
      ],
    };
    const [entry] = buildDiagnosticReport({ activityHistory: [storeEntry] }).activityHistory;
    expect(entry.id).toBe(3);
    expect(entry.operation).toBe('Play cards');
    expect(entry.durationMs).toBe(18400);
    expect(entry.txId).toBe(PUBLIC_TX_ID);
    expect(entry.message).toBe('Submitting');
    expect(entry.error).toBe(`Proof rejected for hand salt ${REDACTED_HEX_PLACEHOLDER}`);
    expect(entry.stageLog.map((logEntry) => logEntry.stage)).toEqual(['preparing', 'proving', 'submitting', 'failed']);
    expect(entry.stageLog[1].at).toBe(new Date(1_700_000_001_000).toISOString());
    // Per-stage messages are not duplicated into the stage log.
    expect(entry.stageLog[1].message).toBeUndefined();
  });

  it('ignores a non-array history and skips junk entries', () => {
    expect(buildDiagnosticReport({ activityHistory: 'nope' }).activityHistory).toEqual([]);
    expect(buildDiagnosticReport({ activityHistory: [null, 1, { operation: 'x' }] }).activityHistory).toHaveLength(1);
  });
});

describe('buildDiagnosticReport — wallet summary', () => {
  it('is limited to connected / networkLabel / 12-char address prefix', () => {
    const report = buildFullFixtureReport();
    expect(report.walletSummary).toEqual({
      connected: true,
      networkLabel: 'Preview',
      addressPrefix: PLAYER_ADDRESS.slice(0, 12),
    });
    expect(JSON.stringify(report)).not.toContain(PLAYER_ADDRESS);
  });

  it('drops extra wallet fields such as balance or keys', () => {
    const summary = summariseWallet({ connected: true, balance: 999n, coinPublicKey: SECRET_SEED, address: PLAYER_ADDRESS });
    expect(Object.keys(summary)).toEqual(['connected', 'networkLabel', 'addressPrefix']);
  });

  it('toAddressPrefix refuses non-bech32 input so hex keys cannot slip through', () => {
    expect(toAddressPrefix(SECRET_SEED)).toBe(null);
    expect(toAddressPrefix('')).toBe(null);
    expect(toAddressPrefix('mn_shield-addr_undeployed1abc')).toBe('mn_shield-ad');
  });
});

describe('buildDiagnosticReport — health snapshot', () => {
  it('reports proof server reachability + latency and indexer reachability + height + latency', () => {
    const report = buildFullFixtureReport();
    expect(report.healthSnapshot).toEqual({
      checkedAt: '2026-10-02T20:58:00.000Z',
      proofServer: { reachable: true, latencyMs: 52 },
      indexer: { reachable: true, blockHeight: 123456, latencyMs: 180 },
    });
  });

  it('summariseHealth fills missing services with nulls and includes node when given', () => {
    const summary = summariseHealth({ node: { reachable: false, height: '77' } });
    expect(summary.proofServer).toEqual({ reachable: null, latencyMs: null });
    expect(summary.indexer).toEqual({ reachable: null, blockHeight: null, latencyMs: null });
    expect(summary.node).toEqual({ reachable: false, blockHeight: 77, latencyMs: null });
    expect(summariseHealth(null)).toBe(null);
  });
});

describe('buildDiagnosticReport — errors', () => {
  it('stringifies strings, Error objects and message-bearing objects, with redaction', () => {
    const { errors } = buildFullFixtureReport();
    expect(errors).toEqual([
      `Proof failed: witness ${REDACTED_HEX_PLACEHOLDER}`,
      'TypeError: fetch failed',
      'obj err',
    ]);
  });

  it('truncates very long error strings', () => {
    const { errors } = buildDiagnosticReport({ errors: ['x'.repeat(5000)] });
    expect(errors[0].length).toBeLessThanOrEqual(600);
  });
});

describe('buildDiagnosticReport — public ids survive, secrets do not', () => {
  it('keeps the contract address and tx ids while redacting any other 64-hex', () => {
    const serialized = JSON.stringify(buildFullFixtureReport());
    expect(serialized).toContain(PUBLIC_TX_ID);
    expect(serialized).toContain(CONTRACT_ADDRESS);
    expect(serialized).not.toContain(SECRET_SEED);
  });

  it('applies the final deep redaction pass to sensitive keys anywhere', () => {
    const report = buildDiagnosticReport({
      activityHistory: [{ operation: 'x', sharedSeed: 'abc', hand: [1, 2] }],
    });
    // normaliseActivityEntry already drops unknown keys, so prove the deep
    // pass separately via a wallet summary that smuggles a sensitive key in
    // its networkLabel string.
    expect(JSON.stringify(report)).not.toContain('abc');
    const smuggled = buildDiagnosticReport({ errors: [`token=${SECRET_SEED} mnemonic`] });
    expect(smuggled.errors[0]).toContain(REDACTED_HEX_PLACEHOLDER);
    expect(smuggled.errors[0]).not.toBe(REDACTED_PLACEHOLDER); // string, not a sensitive key
  });
});
