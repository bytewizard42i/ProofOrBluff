import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MidnightActivityPanel, {
  formatClockTime,
  formatElapsed,
  probeIndexer,
  probeMidnightHealth,
  probeProofServer,
} from './MidnightActivityPanel.jsx';
import {
  finishOperation,
  resetActivityStoreForTests,
  setActivityClockForTests,
  setStage,
  startOperation,
} from './activityStore.js';

const PUBLIC_TX_ID = 'cd'.repeat(32);
const START_AT = 1_700_000_000_000;

/** Renders with a fixed clock so elapsed time is deterministic and no effects run. */
function render(extraProps = {}) {
  return renderToStaticMarkup(
    <MidnightActivityPanel now={START_AT + 5_000} fetchImpl={vi.fn()} {...extraProps} />,
  );
}

describe('MidnightActivityPanel formatting helpers', () => {
  it('formats elapsed time as mm:ss', () => {
    expect(formatElapsed(0)).toBe('00:00');
    expect(formatElapsed(75_000)).toBe('01:15');
    expect(formatElapsed(-5)).toBe('00:00');
  });

  it('formats wall-clock time as HH:MM:SS', () => {
    expect(formatClockTime(START_AT)).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(formatClockTime(Number.NaN)).toBe('--:--:--');
  });
});

describe('MidnightActivityPanel rendering', () => {
  beforeEach(() => {
    resetActivityStoreForTests();
    setActivityClockForTests(() => START_AT);
  });

  it('renders a compact idle panel with no spinner, no dialog and no fake progress', () => {
    const markup = render();
    expect(markup).toContain('Idle — no Midnight activity');
    expect(markup).not.toContain('pob-activity-spinner--active');
    expect(markup).not.toContain('role="dialog"');
    expect(markup).not.toMatch(/\d+%/);
  });

  it('shows the honest stage label, ticking elapsed time and health lines while proving', () => {
    const operationId = startOperation('Play cards');
    setStage(operationId, 'proving');
    const markup = render({
      initialHealth: {
        proofServer: { status: 'reachable' },
        indexer: { status: 'reachable', blockHeight: 4242 },
        checkedAt: START_AT + 4_000,
      },
    });
    expect(markup).toContain('Play cards');
    expect(markup).toContain('Generating zero-knowledge proof — proof server is working');
    expect(markup).toContain('00:05');
    expect(markup).toContain('pob-activity-spinner--active');
    expect(markup).toContain('proof server: reachable');
    expect(markup).toContain('indexer: block 4242');
    expect(markup).toContain('last checked ');
    expect(markup).toContain('not proof progress');
    // Proving is not a blocking stage, so it stays inline.
    expect(markup).not.toContain('role="dialog"');
  });

  it('reports unreachable services honestly', () => {
    const operationId = startOperation('Accept');
    setStage(operationId, 'proving');
    const markup = render({
      initialHealth: {
        proofServer: { status: 'unreachable' },
        indexer: { status: 'unreachable', blockHeight: null },
        checkedAt: START_AT + 1_000,
      },
    });
    expect(markup).toContain('proof server: unreachable');
    expect(markup).toContain('indexer: unreachable');
  });

  it('becomes a modal overlay only during blocking stages and never implies cancellation', () => {
    const operationId = startOperation('Challenge');
    setStage(operationId, 'submitting');
    const markup = render();
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('Submitting transaction to Midnight');
    expect(markup).toContain('Closing this does not cancel a submitted transaction');
    expect(markup).toContain('Minimize');
  });

  it('shows the long-running note after 90 seconds in proving without declaring failure', () => {
    const operationId = startOperation('Reveal seed');
    setStage(operationId, 'proving');
    const before = render({ now: START_AT + 89_000 });
    expect(before).not.toContain('Taking longer than usual');
    const after = render({ now: START_AT + 91_000 });
    expect(after).toContain('Taking longer than usual — this is normal on public testnets');
    expect(after).not.toMatch(/failed/i);
  });

  it('lists stage transitions with timestamps and the public tx id in Details', () => {
    const operationId = startOperation('Play cards');
    setStage(operationId, 'proving');
    setStage(operationId, 'submitting', { message: 'Proving, signing and submitting via your wallet' });
    finishOperation(operationId, { txId: PUBLIC_TX_ID });
    const markup = render();
    expect(markup).toContain('<summary>Details</summary>');
    expect(markup).toContain('Move confirmed');
    expect(markup).toContain('>preparing<');
    expect(markup).toContain('>proving<');
    expect(markup).toContain('>submitting<');
    expect(markup).toContain('>confirmed<');
    expect(markup).toContain(`title="${PUBLIC_TX_ID}"`);
    expect(markup).toContain('Proving, signing and submitting via your wallet');
  });
});

describe('MidnightActivityPanel health probes', () => {
  it('treats any HTTP response from the proof server as reachable, even an error status', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    expect(await probeProofServer(fetchImpl, 'http://localhost:6300')).toEqual({ status: 'reachable' });
    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:6300', expect.objectContaining({ method: 'GET' }));
  });

  it('treats a network error as unreachable', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await probeProofServer(fetchImpl, 'http://localhost:6300')).toEqual({ status: 'unreachable' });
    expect(await probeIndexer(fetchImpl, 'http://localhost:8088/api/v4/graphql'))
      .toEqual({ status: 'unreachable', blockHeight: null });
  });

  it('reads the block height from the indexer GraphQL response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      json: async () => ({ data: { block: { height: 1234 } } }),
    });
    expect(await probeIndexer(fetchImpl, 'http://indexer/graphql'))
      .toEqual({ status: 'reachable', blockHeight: 1234 });
    const [, options] = fetchImpl.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ query: '{ block { height } }' });
  });

  it('combines both probes and stamps the check time without touching the network', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      json: async () => ({ data: { block: { height: 7 } } }),
    });
    const snapshot = await probeMidnightHealth(fetchImpl, () => 99);
    expect(snapshot.checkedAt).toBe(99);
    expect(snapshot.proofServer.status).toBe('reachable');
    expect(snapshot.indexer.blockHeight).toBe(7);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
