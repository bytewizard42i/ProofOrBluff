// wallet-sync.test.js — the stall detector that replaces the old total-time
// sync timeout. A cold Mainnet replay runs ~14 h, so "no progress-cursor
// movement for stallMs" is the real failure signal (the Nov-9 silent-sync
// incident), not elapsed time.
//
// Fake timers drive RxJS's asyncScheduler; stallMs is kept at 60 s so the
// log-message formatting stays readable ('1 min').

import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Rx from 'rxjs';
import { syncStall$ } from './wallet-node.js';

const STALL_MS = 60_000;

/** Minimal FacadeState-shaped fake: only the fields the signature reads. */
const state = (shieldedIndex, dustIndex, unshieldedId, extra = {}) => ({
  isSynced: false,
  shielded: { progress: { appliedIndex: BigInt(shieldedIndex) } },
  dust: { progress: { appliedIndex: BigInt(dustIndex) } },
  unshielded: { progress: { appliedId: BigInt(unshieldedId) } },
  ...extra,
});

/** Subscribe and collect the terminal error (the observable never emits). */
function watchStall(state$, stallMs = STALL_MS) {
  const box = { error: null, values: 0 };
  const sub = syncStall$(state$, stallMs).subscribe({
    next: () => { box.values += 1; },
    error: (e) => { box.error = e; },
  });
  return { box, sub };
}

afterEach(() => { vi.useRealTimers(); });

describe('syncStall$', () => {
  it('errors after stallMs when the state stream never emits', async () => {
    vi.useFakeTimers();
    const { box } = watchStall(Rx.NEVER);
    await vi.advanceTimersByTimeAsync(STALL_MS - 1);
    expect(box.error).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(box.error).toBeInstanceOf(Error);
    expect(box.error.message).toMatch(/no progress for 1 min/);
  });

  it('stays alive while the progress signature keeps changing', async () => {
    vi.useFakeTimers();
    const subject = new Rx.Subject();
    const { box } = watchStall(subject);
    // Signature changes every 30 s — half a stall window — for 5 minutes.
    for (let i = 1; i <= 10; i += 1) {
      await vi.advanceTimersByTimeAsync(30_000);
      subject.next(state(i, i, i));
      expect(box.error).toBeNull();
    }
    // Then the cursors stop: the NEXT stallMs of silence must kill it.
    await vi.advanceTimersByTimeAsync(STALL_MS);
    expect(box.error).toBeInstanceOf(Error);
    expect(box.error.message).toMatch(/no progress/);
  });

  it('errors when states keep arriving but the signature never changes', async () => {
    vi.useFakeTimers();
    const subject = new Rx.Subject();
    const { box } = watchStall(subject);
    subject.next(state(5, 5, 5));
    // Emissions continue every 15 s — heartbeats, balances, whatever — but
    // the cursors are identical, so distinctUntilChanged sees ONE value and
    // the stall timer is never reset.
    for (let i = 0; i < 8; i += 1) {
      await vi.advanceTimersByTimeAsync(15_000);
      subject.next(state(5, 5, 5, { tick: i }));
    }
    expect(box.error).toBeInstanceOf(Error);
    expect(box.error.message).toMatch(/no progress for 1 min/);
  });

  it('the error message carries the last progress description', async () => {
    vi.useFakeTimers();
    const subject = new Rx.Subject();
    const { box } = watchStall(subject);
    subject.next({
      isSynced: false,
      shielded: { progress: { appliedIndex: 1200n, highestRelevantWalletIndex: 5000n, isConnected: true } },
      dust: { progress: { appliedIndex: 300n, highestRelevantWalletIndex: 900n, isConnected: false } },
      unshielded: { progress: { appliedId: 10n, highestTransactionId: 40n, isConnected: true } },
    });
    await vi.advanceTimersByTimeAsync(STALL_MS);
    expect(box.error).toBeInstanceOf(Error);
    expect(box.error.message).toContain('shielded 1200/5000 dust 300/900 unshielded 10/40');
    expect(box.error.message).toContain('(connected: s=true d=false u=true)');
  });
});
