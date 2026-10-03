import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  HISTORY_LIMIT,
  failOperation,
  finishOperation,
  getState,
  isBlockingStageInFlight,
  isOperationInFlight,
  resetActivityStoreForTests,
  setActivityClockForTests,
  setStage,
  startOperation,
  subscribe,
} from './activityStore.js';

const PUBLIC_TX_ID = 'ab'.repeat(32);

describe('activityStore', () => {
  beforeEach(() => {
    resetActivityStoreForTests();
  });

  it('starts idle and reports no operation in flight', () => {
    expect(getState().current).toBeNull();
    expect(getState().history).toEqual([]);
    expect(isOperationInFlight()).toBe(false);
  });

  it('tracks a happy-path operation through stages and archives it as confirmed', () => {
    let fakeNow = 1_000;
    setActivityClockForTests(() => fakeNow);

    const operationId = startOperation('Play cards');
    expect(isOperationInFlight()).toBe(true);
    expect(getState().current.stage).toBe('preparing');

    fakeNow = 2_000;
    setStage(operationId, 'proving');
    expect(getState().current.stage).toBe('proving');

    fakeNow = 3_000;
    finishOperation(operationId, { txId: PUBLIC_TX_ID });

    expect(isOperationInFlight()).toBe(false);
    expect(getState().current).toBeNull();
    const [archived] = getState().history;
    expect(archived.stage).toBe('confirmed');
    expect(archived.txId).toBe(PUBLIC_TX_ID);
    expect(archived.log.map((entry) => entry.stage)).toEqual(['preparing', 'proving', 'confirmed']);
    expect(archived.log.map((entry) => entry.at)).toEqual([1_000, 2_000, 3_000]);
  });

  it('retains the tagged transaction identifier returned by Midnight', () => {
    const transactionIdentifier = `00ff${PUBLIC_TX_ID}`;
    const operationId = startOperation('Create match');
    finishOperation(operationId, { txId: transactionIdentifier });
    expect(getState().history[0].txId).toBe(transactionIdentifier);
  });

  it('archives a failed operation with the plain error string', () => {
    const operationId = startOperation('Challenge');
    failOperation(operationId, 'Bot unreachable');
    expect(isOperationInFlight()).toBe(false);
    expect(getState().history[0].stage).toBe('failed');
    expect(getState().history[0].error).toBe('Bot unreachable');
  });

  it('ignores stage updates from a stale operation id', () => {
    const firstId = startOperation('First');
    finishOperation(firstId);
    const secondId = startOperation('Second');
    setStage(firstId, 'submitting');
    expect(getState().current.id).toBe(secondId);
    expect(getState().current.stage).toBe('preparing');
  });

  it('supersedes a forgotten in-flight operation when a new one starts', () => {
    startOperation('Forgotten');
    startOperation('Fresh');
    expect(getState().current.operation).toBe('Fresh');
    expect(getState().history).toHaveLength(1);
    expect(getState().history[0].stage).toBe('failed');
    expect(getState().history[0].error).toMatch(/superseded/i);
  });

  it('rejects unknown stage names loudly', () => {
    const operationId = startOperation('Typo');
    expect(() => setStage(operationId, 'provng')).toThrow(/Unknown activity stage/);
  });

  it('reports blocking stages so the UI can switch to the overlay', () => {
    const operationId = startOperation('Accept');
    expect(isBlockingStageInFlight()).toBe(false);
    setStage(operationId, 'submitting');
    expect(isBlockingStageInFlight()).toBe(true);
  });

  it('notifies subscribers on every change and stops after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    const operationId = startOperation('Reveal seed');
    setStage(operationId, 'proving');
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    finishOperation(operationId);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps only the most recent history entries', () => {
    for (let index = 0; index < HISTORY_LIMIT + 5; index += 1) {
      const operationId = startOperation(`Op ${index}`);
      finishOperation(operationId);
    }
    const { history } = getState();
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[0].operation).toBe('Op 5');
    expect(history[history.length - 1].operation).toBe(`Op ${HISTORY_LIMIT + 4}`);
  });

  it('refuses to store non-string fields or malformed tx ids (privacy backstop)', () => {
    const privateLookingObject = { seed: 'deadbeef', salt: 'secret' };
    const operationId = startOperation(privateLookingObject);
    setStage(operationId, 'proving', { message: privateLookingObject, txId: 'not-a-tx' });
    const { current } = getState();
    expect(current.operation).toBe('On-chain action');
    expect(current.message).toBe('');
    expect(current.txId).toBeNull();
    expect(JSON.stringify(getState())).not.toMatch(/deadbeef|secret/);
  });
});
