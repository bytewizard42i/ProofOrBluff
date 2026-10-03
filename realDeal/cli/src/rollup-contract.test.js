import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ROLLUP_CLAIM_CARD_SLOTS,
  ROLLUP_HAND_RANKS,
  ROLLUP_PRIVATE_STATE_ID,
  ROLLUP_SNAPSHOT_LENGTH,
  ROLLUP_TRANSCRIPT_LENGTH,
  ROLLUP_TIMESTAMP_WINDOW_SECONDS,
  assertCloseGameWitnessShape,
  assertFreshPublicSeed,
  assertMainnetDeployApproved,
  bytesToHex,
  currentTimeSeconds,
  getRollupContractApi,
  hexToBytes32,
  zeroGameState,
  zeroMove,
  zeroWitnessBundle,
} from './rollup-contract.js';

// These are pure unit tests. The midnight-js layer (deployContract,
// findDeployedContract, providers) is replaced through the module's
// `_internals` seam, so nothing here needs Docker, a proof server, funds, or
// network access. The REAL compiled rollup bindings are loaded from
// contracts/managed so a drift in the generated Contract/ledger shape would
// surface here too.

const CONTRACT_ADDRESS = 'ab'.repeat(32);
const GAME_ID_HEX = 'c0ffee'.padEnd(64, '7');
const PLAYER_ONE = new Uint8Array(32).fill(0x11);
const PLAYER_TWO = new Uint8Array(32).fill(0x22);
const FIXED_NOW = 1_800_000_000n;

/**
 * compact-js stores { ctor, witnesses, compiledAssetsPath } under a private
 * Symbol key on the CompiledContract. We dig it out the same way the real
 * midnight-js layer does so the fake deploy can exercise the witnesses.
 */
function witnessesOf(compiledContract) {
  for (const symbol of Object.getOwnPropertySymbols(compiledContract)) {
    const context = compiledContract[symbol];
    if (context && typeof context === 'object' && 'witnesses' in context) return context.witnesses;
  }
  throw new Error('CompiledContract carries no witnesses — did withWitnesses run?');
}

function finalizedTx(result, { txHash = 'deadbeef', blockHeight = 4242 } = {}) {
  return { public: { txHash, txId: txHash, blockHeight, result } };
}

/** Builds a fake midnight-js layer and records every call for assertions. */
function fakeChain({ ledgerGames = new Map(), counters = { opened: 0n, closed: 0n, pruned: 0n }, beforeWitnessRead } = {}) {
  const recorded = { calls: [], witnessSnapshotsDuringCall: [], witnesses: null };
  const fakeLedgerDecoder = () => ({
    games: {
      member: (key) => ledgerGames.has(bytesToHex(key)),
      lookup: (key) => ledgerGames.get(bytesToHex(key)),
      size: () => BigInt(ledgerGames.size),
    },
    totalGamesOpened: counters.opened,
    totalGamesClosed: counters.closed,
    totalGamesPruned: counters.pruned,
  });

  const makeDeployed = (compiledContract, contractAddress) => {
    recorded.witnesses = witnessesOf(compiledContract);
    // Each fake circuit invokes every witness exactly as the runtime would,
    // then records what it saw, so tests can prove the slot was populated
    // DURING the call and cleared AFTER it.
    const circuit = (name, result) => async (...args) => {
      await beforeWitnessRead?.(name, args);
      const context = { privateState: {} };
      const seen = Object.fromEntries(
        Object.entries(recorded.witnesses).map(([witnessName, fn]) => [witnessName, fn(context)[1]]),
      );
      recorded.calls.push({ name, args });
      recorded.witnessSnapshotsDuringCall.push({ name, seen });
      return finalizedTx(result);
    };
    return {
      deployTxData: { public: { contractAddress, txHash: 'deploy-hash', blockHeight: 100 } },
      callTx: {
        openGame: circuit('openGame', hexToBytes32(GAME_ID_HEX)),
        closeGame: circuit('closeGame', []),
        pruneExpired: circuit('pruneExpired', []),
      },
    };
  };

  const internals = {
    buildProviders: vi.fn(async () => ({
      publicDataProvider: {
        queryContractState: vi.fn(async () => ({ data: 'opaque-state' })),
      },
    })),
    deployContract: vi.fn(async (_providers, { compiledContract, privateStateId }) => {
      recorded.privateStateId = privateStateId;
      return makeDeployed(compiledContract, CONTRACT_ADDRESS);
    }),
    findDeployedContract: vi.fn(async (_providers, { compiledContract, contractAddress }) =>
      makeDeployed(compiledContract, contractAddress)),
    now: () => FIXED_NOW,
    // Swap only `ledger` for the fake decoder; keep the real Contract class.
    loadContractModule: async () => {
      const real = await import('../../contracts/managed/proof-or-bluff-rollup/contract/index.js');
      return { Contract: real.Contract, ledger: fakeLedgerDecoder, pureCircuits: real.pureCircuits };
    },
  };
  return { internals, recorded, ledgerGames };
}

function realisticCloseWitnesses() {
  const bundle = zeroWitnessBundle();
  bundle.entropyPair = [new Uint8Array(32).fill(3), new Uint8Array(32).fill(7)];
  bundle.saltPair = ['a1'.repeat(32), 'b2'.repeat(32)]; // hex form must be accepted too
  bundle.transcript[0] = { kind: 1n, rank: 4n, count: 1n, cards: [4n, 0n, 0n, 0n], playSalt: 99n };
  bundle.snapshots[1] = { ...zeroGameState(), score0: 1n, chain: 12345n };
  return bundle;
}

async function attachedApi(overrides = {}) {
  const chain = fakeChain(overrides);
  const api = await getRollupContractApi({ networkId: 'undeployed', _internals: chain.internals });
  await api.joinAt(CONTRACT_ADDRESS);
  return { api, ...chain };
}

function deferred() {
  let resolve;
  const promise = new Promise((complete) => { resolve = complete; });
  return { promise, resolve };
}

function submissionGate() {
  const started = deferred();
  const released = deferred();
  return {
    started: started.promise,
    release: released.resolve,
    async wait() {
      started.resolve();
      await released.promise;
    },
  };
}

function closeRequest(marker) {
  const witnesses = realisticCloseWitnesses();
  witnesses.entropyPair[0].fill(marker);
  witnesses.saltPair[0] = marker.toString(16).padStart(2, '0').repeat(32);
  witnesses.transcript[0].playSalt = BigInt(marker);
  witnesses.snapshots[1].chain = BigInt(marker);
  return {
    gameId: marker.toString(16).padStart(2, '0').repeat(32),
    publicInputs: { transcriptRoot: BigInt(marker), p1Score: marker, p2Score: 0, winner: 1 },
    witnesses,
  };
}

function expectCloseSubmission(recorded, index, request) {
  expect(recorded.calls[index].name).toBe('closeGame');
  expect(recorded.calls[index].args).toEqual([
    hexToBytes32(request.gameId), request.publicInputs.transcriptRoot,
    BigInt(request.publicInputs.p1Score), 0n, 1n, FIXED_NOW,
  ]);
  expect(recorded.witnessSnapshotsDuringCall[index].seen).toEqual({
    ...request.witnesses,
    saltPair: request.witnesses.saltPair.map((value) => hexToBytes32(value)),
    // The challenge-reduction witness is generic: invoked without an argument
    // by the fake harness it returns the [0n, 0n] fallback.
    get_challenge_reduction: [0n, 0n],
  });
}

function openRequest() {
  return {
    playerOne: PLAYER_ONE, playerTwo: PLAYER_TWO, mode: 1,
    p1EntropyCommit: 'aa'.repeat(32), p1SaltCommit: 'bb'.repeat(32),
    p2EntropyCommit: 'cc'.repeat(32), p2SaltCommit: 'dd'.repeat(32),
  };
}

describe('rollup-contract: serialized mutations', () => {
  it('keeps concurrent closeGame inputs paired through lazy witness reads and peer cleanup', async () => {
    const gates = [submissionGate(), submissionGate()];
    let submission = 0;
    const { api, recorded } = await attachedApi({
      beforeWitnessRead: () => gates[submission++].wait(),
    });
    const requests = [closeRequest(3), closeRequest(7)];
    const first = api.closeGame(requests[0]);
    await gates[0].started;
    const second = api.closeGame(requests[1]);
    gates[0].release();
    await first;
    await gates[1].started;
    gates[1].release();
    await second;

    expectCloseSubmission(recorded, 0, requests[0]);
    expectCloseSubmission(recorded, 1, requests[1]);
    expect(api._hasStagedWitnesses()).toBe(false);
  });

  it('continues queued calls after an exception without clearing a peer witness bundle', async () => {
    const gates = [submissionGate(), submissionGate()];
    let submission = 0;
    const { api, recorded } = await attachedApi({
      beforeWitnessRead: async () => {
        const index = submission++;
        await gates[index].wait();
        if (index === 0) throw new Error('failed assert: winner mismatch');
      },
    });
    const first = api.closeGame(closeRequest(3));
    const firstRejected = expect(first).rejects.toThrow(/winner mismatch/);
    await gates[0].started;
    const request = closeRequest(7);
    const second = api.closeGame(request);
    gates[0].release();
    await firstRejected;
    await gates[1].started;
    gates[1].release();
    await second;

    expectCloseSubmission(recorded, 0, request);
    expect(api._hasStagedWitnesses()).toBe(false);
    await expect(api.joinAt('invalid')).rejects.toThrow(/hex contract address/);
    await expect(api.joinAt(CONTRACT_ADDRESS)).resolves.toEqual({ contractAddress: CONTRACT_ADDRESS });
  });

  it.each(['openGame', 'pruneExpired'])('does not stage a queued close while %s holds the lock', async (method) => {
    const gate = submissionGate();
    const { api, recorded } = await attachedApi({
      beforeWitnessRead: (name) => name === method ? gate.wait() : undefined,
    });
    const first = api[method](method === 'openGame' ? openRequest() : { gameId: GAME_ID_HEX });
    await gate.started;
    const request = closeRequest(7);
    const second = api.closeGame(request);
    await Promise.resolve();
    const stagedWhileWaiting = api._hasStagedWitnesses();
    gate.release();
    await Promise.all([first, second]);

    expect(stagedWhileWaiting).toBe(false);
    expect(recorded.witnessSnapshotsDuringCall[0]).toEqual({
      name: method,
      seen: { ...zeroWitnessBundle(), get_challenge_reduction: [0n, 0n] },
    });
    expectCloseSubmission(recorded, 1, request);
  });

  it('queues open and prune behind close and supplies zero witnesses after releasing the lock', async () => {
    const gate = submissionGate();
    const { api, recorded } = await attachedApi({
      beforeWitnessRead: (name) => name === 'closeGame' ? gate.wait() : undefined,
    });
    const request = closeRequest(3);
    const first = api.closeGame(request);
    await gate.started;
    const opened = api.openGame(openRequest());
    const pruned = api.pruneExpired({ gameId: GAME_ID_HEX });
    gate.release();
    await Promise.all([first, opened, pruned]);

    expectCloseSubmission(recorded, 0, request);
    expect(recorded.calls.map(({ name }) => name)).toEqual(['closeGame', 'openGame', 'pruneExpired']);
    const zeroSeen = { ...zeroWitnessBundle(), get_challenge_reduction: [0n, 0n] };
    expect(recorded.witnessSnapshotsDuringCall.slice(1).map(({ seen }) => seen))
      .toEqual([zeroSeen, zeroSeen]);
  });

  it('holds the lock and the same private inputs across a DUST rebuild', async () => {
    vi.useFakeTimers();
    const retryScheduled = deferred();
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => retryScheduled.resolve());
    try {
      const gate = submissionGate();
      const attempts = [];
      const chain = fakeChain({
        beforeWitnessRead: async (_name, args) => {
          if (attempts.length === 0) await gate.wait();
          attempts.push({
            gameId: bytesToHex(args[0]),
            transcript: chain.recorded.witnesses.transcript({ privateState: {} })[1],
          });
          if (attempts.length === 1) throw new Error('1010: Invalid Transaction: Custom error: 170');
        },
      });
      const api = await getRollupContractApi({ networkId: 'undeployed', _internals: chain.internals });
      await api.joinAt(CONTRACT_ADDRESS);
      const requests = [closeRequest(3), closeRequest(7)];
      const first = api.closeGame(requests[0]);
      await gate.started;
      const second = api.closeGame(requests[1]);
      gate.release();
      await retryScheduled.promise;
      expect(attempts).toHaveLength(1);
      expect(api._hasStagedWitnesses()).toBe(true);
      await vi.advanceTimersByTimeAsync(2_000);
      await Promise.all([first, second]);

      expect(attempts.map(({ gameId }) => gameId)).toEqual([
        requests[0].gameId, requests[0].gameId, requests[1].gameId,
      ]);
      expect(attempts.map(({ transcript }) => transcript)).toEqual([
        requests[0].witnesses.transcript, requests[0].witnesses.transcript, requests[1].witnesses.transcript,
      ]);
      expectCloseSubmission(chain.recorded, 0, requests[0]);
      expectCloseSubmission(chain.recorded, 1, requests[1]);
      expect(api._hasStagedWitnesses()).toBe(false);
    } finally {
      warning.mockRestore();
      vi.useRealTimers();
    }
  });

  it('keeps independent API instances out of each other’s queue', async () => {
    const gate = submissionGate();
    const firstInstance = await attachedApi({ beforeWitnessRead: () => gate.wait() });
    const secondInstance = await attachedApi();
    const requests = [closeRequest(3), closeRequest(7)];
    const first = firstInstance.api.closeGame(requests[0]);
    await gate.started;
    await secondInstance.api.closeGame(requests[1]);
    expect(secondInstance.api._hasStagedWitnesses()).toBe(false);
    expect(firstInstance.api._hasStagedWitnesses()).toBe(true);
    expectCloseSubmission(secondInstance.recorded, 0, requests[1]);
    gate.release();
    await first;
    expectCloseSubmission(firstInstance.recorded, 0, requests[0]);
  });

  it('refreshes default timestamps after queueing and preserves explicit timestamps', async () => {
    const gate = submissionGate();
    let now = FIXED_NOW;
    const chain = fakeChain({ beforeWitnessRead: (name) => name === 'closeGame' ? gate.wait() : undefined });
    chain.internals.now = () => now;
    const api = await getRollupContractApi({ networkId: 'undeployed', _internals: chain.internals });
    await api.joinAt(CONTRACT_ADDRESS);
    const first = api.closeGame(closeRequest(3));
    await gate.started;
    const opened = api.openGame(openRequest());
    const pruned = api.pruneExpired({ gameId: GAME_ID_HEX, currentTime: FIXED_NOW });
    now += 300n;
    gate.release();
    await Promise.all([first, opened, pruned]);
    expect(chain.recorded.calls.map(({ args }) => args.at(-1))).toEqual([FIXED_NOW, now, FIXED_NOW]);
  });

  it('does not replace the attached contract until an active close has cleared its witnesses', async () => {
    const gate = submissionGate();
    const { api, internals, recorded } = await attachedApi({ beforeWitnessRead: () => gate.wait() });
    const originalFind = internals.findDeployedContract;
    const stagedOnJoin = [];
    internals.findDeployedContract.mockImplementation(async (_providers, { compiledContract }) => {
      stagedOnJoin.push(api._hasStagedWitnesses());
      expect(witnessesOf(compiledContract).transcript({ privateState: {} })[1]).toEqual(zeroWitnessBundle().transcript);
      return { callTx: {} };
    });
    const closed = api.closeGame(closeRequest(3));
    await gate.started;
    const joined = api.joinAt('cd'.repeat(32));
    await Promise.resolve();
    const addressDuringClose = api.address;
    const callsDuringClose = originalFind.mock.calls.length;
    gate.release();
    await Promise.all([closed, joined]);
    expect(addressDuringClose).toBe(CONTRACT_ADDRESS);
    expect(callsDuringClose).toBe(1);
    expect(stagedOnJoin).toEqual([false]);
    expect(recorded.calls).toHaveLength(1);
    expect(api.address).toBe('cd'.repeat(32));
  });

  it('serializes deploy and join state changes with circuit submissions', async () => {
    const chain = fakeChain();
    const deployGate = submissionGate();
    const joinGate = submissionGate();
    const deployContract = chain.internals.deployContract;
    const findDeployedContract = chain.internals.findDeployedContract;
    chain.internals.deployContract = vi.fn(async (...args) => {
      await deployGate.wait();
      return deployContract(...args);
    });
    chain.internals.findDeployedContract = vi.fn(async (...args) => {
      await joinGate.wait();
      return findDeployedContract(...args);
    });
    const api = await getRollupContractApi({ networkId: 'undeployed', _internals: chain.internals });
    const deployed = api.deploy();
    await deployGate.started;
    const duplicate = api.deploy().then((result) => result, (error) => error);
    const nextAddress = 'cd'.repeat(32);
    const joined = api.joinAt(nextAddress);
    const opened = api.openGame(openRequest());
    const openResult = opened.then((result) => result, (error) => error);
    await Promise.resolve();
    const earlyJoinCount = chain.internals.findDeployedContract.mock.calls.length;
    deployGate.release();
    await deployed;
    const duplicateResult = await duplicate;
    await joinGate.started;
    const addressBeforeJoin = api.address;
    joinGate.release();
    await joined;

    expect(await openResult).toEqual({ gameId: GAME_ID_HEX, txHash: 'deadbeef', blockHeight: 4242 });
    expect(duplicateResult).toBeInstanceOf(Error);
    expect(duplicateResult.message).toMatch(/Already attached/);
    expect(earlyJoinCount).toBe(0);
    expect(addressBeforeJoin).toBe(CONTRACT_ADDRESS);
    expect(api.address).toBe(nextAddress);
    expect(chain.internals.deployContract).toHaveBeenCalledTimes(1);
  });
});

describe('rollup-contract: zero-shaped witnesses', () => {
  it('zeroMove / zeroGameState match the compiled Move / GameState vector widths', () => {
    const move = zeroMove();
    expect(move.cards).toHaveLength(ROLLUP_CLAIM_CARD_SLOTS);
    expect(Object.keys(move).sort()).toEqual(['cards', 'count', 'kind', 'playSalt', 'rank']);
    const snapshot = zeroGameState();
    expect(snapshot.hand0).toHaveLength(ROLLUP_HAND_RANKS);
    expect(snapshot.hand1).toHaveLength(ROLLUP_HAND_RANKS);
    expect(snapshot.claimCards).toHaveLength(ROLLUP_CLAIM_CARD_SLOTS);
    expect(snapshot.pending).toBe(false);
    expect(snapshot.ended).toBe(false);
    for (const value of [...snapshot.hand0, ...snapshot.hand1, ...snapshot.claimCards, ...move.cards]) {
      expect(typeof value).toBe('bigint');
    }
  });

  it('zeroWitnessBundle has Move[64], GameState[65] and two 32-byte pairs', () => {
    const bundle = zeroWitnessBundle();
    expect(bundle.transcript).toHaveLength(ROLLUP_TRANSCRIPT_LENGTH);
    expect(bundle.snapshots).toHaveLength(ROLLUP_SNAPSHOT_LENGTH);
    expect(bundle.entropyPair.map((b) => b.length)).toEqual([32, 32]);
    expect(bundle.saltPair.map((b) => b.length)).toEqual([32, 32]);
    // Every element is its own object so a caller mutating one slot cannot
    // corrupt the rest of the padding.
    expect(bundle.transcript[0]).not.toBe(bundle.transcript[1]);
  });

  it('openGame runs with the zero-shaped bundle (no undefined ever reaches the runtime)', async () => {
    const { api, recorded } = await attachedApi();
    await api.openGame({
      playerOne: PLAYER_ONE, playerTwo: PLAYER_TWO, mode: 1,
      p1EntropyCommit: 'aa'.repeat(32), p1SaltCommit: 'bb'.repeat(32),
      p2EntropyCommit: 'cc'.repeat(32), p2SaltCommit: 'dd'.repeat(32),
    });
    const { seen } = recorded.witnessSnapshotsDuringCall.find((entry) => entry.name === 'openGame');
    expect(seen.transcript).toHaveLength(ROLLUP_TRANSCRIPT_LENGTH);
    expect(seen.snapshots).toHaveLength(ROLLUP_SNAPSHOT_LENGTH);
    expect(seen.snapshots[64].hand0).toHaveLength(ROLLUP_HAND_RANKS);
    expect(seen.entropyPair[0]).toBeInstanceOf(Uint8Array);
    expect(Object.values(seen).every((value) => value !== undefined)).toBe(true);
  });
});

describe('rollup-contract: openGame argument marshalling', () => {
  it('passes 8 arguments in circuit order with Bytes32 / Uint8 bigint / Uint64 bigint types', async () => {
    const { api, recorded } = await attachedApi();
    const result = await api.openGame({
      playerOne: PLAYER_ONE, playerTwo: bytesToHex(PLAYER_TWO), mode: 1,
      p1EntropyCommit: 'aa'.repeat(32), p1SaltCommit: 'bb'.repeat(32),
      p2EntropyCommit: 'cc'.repeat(32), p2SaltCommit: 'dd'.repeat(32),
    });
    const { args } = recorded.calls.find((call) => call.name === 'openGame');
    expect(args).toHaveLength(8);
    expect(args[0]).toEqual(PLAYER_ONE);
    expect(args[1]).toEqual(PLAYER_TWO);
    expect(args[2]).toBe(1n);
    expect(bytesToHex(args[3])).toBe('aa'.repeat(32));
    expect(bytesToHex(args[6])).toBe('dd'.repeat(32));
    expect(args[7]).toBe(FIXED_NOW);
    expect(result).toEqual({ gameId: GAME_ID_HEX, txHash: 'deadbeef', blockHeight: 4242 });
  });

  it('gameId hex round-trips through hexToBytes32 / bytesToHex (with and without 0x)', () => {
    const bytes = hexToBytes32(GAME_ID_HEX);
    expect(bytes).toHaveLength(32);
    expect(bytesToHex(bytes)).toBe(GAME_ID_HEX);
    expect(hexToBytes32(`0x${GAME_ID_HEX}`)).toEqual(bytes);
    expect(() => hexToBytes32('abc', 'gameId')).toThrow(/gameId must be exactly 32 bytes/);
    expect(() => hexToBytes32(42, 'gameId')).toThrow(/64-hex string/);
  });

  it('rejects a mode that does not fit Uint<8> before touching the chain', async () => {
    const { api, recorded } = await attachedApi();
    await expect(api.openGame({
      playerOne: PLAYER_ONE, playerTwo: PLAYER_TWO, mode: 300,
      p1EntropyCommit: 'aa'.repeat(32), p1SaltCommit: 'bb'.repeat(32),
      p2EntropyCommit: 'cc'.repeat(32), p2SaltCommit: 'dd'.repeat(32),
    })).rejects.toThrow(/mode must fit Uint<8>/);
    expect(recorded.calls).toHaveLength(0);
  });
});

describe('rollup-contract: closeGame witness slot', () => {
  it('stages the bundle only for the duration of the call and clears it afterwards', async () => {
    const { api, recorded } = await attachedApi();
    const witnesses = realisticCloseWitnesses();
    expect(api._hasStagedWitnesses()).toBe(false);

    const result = await api.closeGame({
      gameId: GAME_ID_HEX,
      publicInputs: { transcriptRoot: 12345n, p1Score: 15n, p2Score: 9n, winner: 1n },
      witnesses,
    });

    const { seen } = recorded.witnessSnapshotsDuringCall.find((entry) => entry.name === 'closeGame');
    expect(seen.transcript).toBe(witnesses.transcript);          // the referee's exact arrays
    expect(seen.snapshots).toBe(witnesses.snapshots);
    expect(seen.entropyPair[1]).toEqual(new Uint8Array(32).fill(7));
    expect(bytesToHex(seen.saltPair[0])).toBe('a1'.repeat(32));   // hex salt was converted to bytes
    expect(api._hasStagedWitnesses()).toBe(false);                 // cleared in finally
    expect(result).toEqual({ txHash: 'deadbeef', blockHeight: 4242 });

    // A follow-up openGame must NOT see the previous game's private material.
    await api.openGame({
      playerOne: PLAYER_ONE, playerTwo: PLAYER_TWO, mode: 0,
      p1EntropyCommit: 'aa'.repeat(32), p1SaltCommit: 'bb'.repeat(32),
      p2EntropyCommit: 'cc'.repeat(32), p2SaltCommit: 'dd'.repeat(32),
    });
    const afterwards = recorded.witnessSnapshotsDuringCall.at(-1).seen;
    expect(afterwards.transcript[0]).toEqual(zeroMove());
    expect(afterwards.entropyPair[1]).toEqual(new Uint8Array(32));
  });

  it('clears the slot even when the circuit call throws (e.g. a failed circuit assert)', async () => {
    const chain = fakeChain();
    let stagedDuringCall = null;
    chain.internals.findDeployedContract = vi.fn(async (_providers, { compiledContract }) => ({
      deployTxData: { public: { contractAddress: CONTRACT_ADDRESS } },
      callTx: {
        closeGame: async () => {
          stagedDuringCall = witnessesOf(compiledContract).transcript({ privateState: {} })[1];
          throw new Error('failed assert: winner mismatch');
        },
      },
    }));
    const api = await getRollupContractApi({ networkId: 'undeployed', _internals: chain.internals });
    await api.joinAt(CONTRACT_ADDRESS);
    const witnesses = realisticCloseWitnesses();
    await expect(api.closeGame({
      gameId: GAME_ID_HEX,
      publicInputs: { transcriptRoot: 1n, p1Score: 0n, p2Score: 0n, winner: 0n },
      witnesses,
    })).rejects.toThrow(/winner mismatch/);
    expect(stagedDuringCall).toBe(witnesses.transcript); // it WAS staged while the circuit ran
    expect(api._hasStagedWitnesses()).toBe(false);        // and cleared by the finally block
  });

  it('passes publicInputs in circuit order as bigints: gameId, transcriptRoot, p1Score, p2Score, winner, currentTime', async () => {
    const { api, recorded } = await attachedApi();
    await api.closeGame({
      gameId: `0x${GAME_ID_HEX}`,
      // Mixed input types on purpose: numbers and strings must all become bigint.
      publicInputs: { transcriptRoot: '987654321987654321', p1Score: 15, p2Score: '9', winner: 1n },
      witnesses: realisticCloseWitnesses(),
      currentTime: 1_700_000_000,
    });
    const { args } = recorded.calls.find((call) => call.name === 'closeGame');
    expect(args).toHaveLength(6);
    expect(bytesToHex(args[0])).toBe(GAME_ID_HEX);
    expect(args.slice(1)).toEqual([987654321987654321n, 15n, 9n, 1n, 1_700_000_000n]);
    for (const value of args.slice(1)) expect(typeof value).toBe('bigint');
  });

  it('refuses a malformed witness bundle with a next-step hint', async () => {
    const { api, recorded } = await attachedApi();
    const short = realisticCloseWitnesses();
    short.transcript = short.transcript.slice(0, 10);
    await expect(api.closeGame({
      gameId: GAME_ID_HEX,
      publicInputs: { transcriptRoot: 1n, p1Score: 0n, p2Score: 0n, winner: 0n },
      witnesses: short,
    })).rejects.toThrow(/exactly 64 moves .*referee\.pad\(\)/);
    expect(() => assertCloseGameWitnessShape(null)).toThrow(/entropyPair, saltPair, transcript, snapshots/);
    expect(recorded.calls).toHaveLength(0);
    expect(api._hasStagedWitnesses()).toBe(false);
  });
});

describe('rollup-contract: pruneExpired / readGame / stats', () => {
  it('pruneExpired sends gameId bytes and the bigint timestamp', async () => {
    const { api, recorded } = await attachedApi();
    const result = await api.pruneExpired({ gameId: GAME_ID_HEX });
    const { args } = recorded.calls.find((call) => call.name === 'pruneExpired');
    expect(bytesToHex(args[0])).toBe(GAME_ID_HEX);
    expect(args[1]).toBe(FIXED_NOW);
    expect(result).toEqual({ txHash: 'deadbeef', blockHeight: 4242 });
  });

  it('readGame returns null for an unknown gameId and the record for a known one', async () => {
    const record = { closed: true, winner: 2n, p1Score: 3n, p2Score: 15n };
    const ledgerGames = new Map([[GAME_ID_HEX, record]]);
    const { api } = await attachedApi({ ledgerGames });
    expect(await api.readGame('ee'.repeat(32))).toBeNull();
    expect(await api.readGame(GAME_ID_HEX)).toBe(record);
  });

  it('stats surfaces the three counters plus the live map size', async () => {
    const ledgerGames = new Map([[GAME_ID_HEX, {}]]);
    const { api } = await attachedApi({ ledgerGames, counters: { opened: 5n, closed: 3n, pruned: 1n } });
    expect(await api.stats()).toEqual({
      totalGamesOpened: 5n, totalGamesClosed: 3n, totalGamesPruned: 1n, openGames: 1n,
    });
  });

  it('every circuit method fails loudly before deploy()/joinAt()', async () => {
    const chain = fakeChain();
    const api = await getRollupContractApi({ networkId: 'undeployed', _internals: chain.internals });
    await expect(api.readGame(GAME_ID_HEX)).rejects.toThrow(/before deploy\(\) or joinAt/);
    await expect(api.pruneExpired({ gameId: GAME_ID_HEX })).rejects.toThrow(/before deploy\(\) or joinAt/);
    expect(api.address).toBeNull();
  });
});

describe('rollup-contract: network guards', () => {
  const originalApproval = process.env.POB_ALLOW_MAINNET_DEPLOY;
  beforeEach(() => { delete process.env.POB_ALLOW_MAINNET_DEPLOY; });
  afterEach(() => {
    if (originalApproval === undefined) delete process.env.POB_ALLOW_MAINNET_DEPLOY;
    else process.env.POB_ALLOW_MAINNET_DEPLOY = originalApproval;
  });

  it('deploy() on mainnet is locked without POB_ALLOW_MAINNET_DEPLOY=I_APPROVE_MAINNET_DEPLOYMENT', async () => {
    const chain = fakeChain();
    const api = await getRollupContractApi({ networkId: 'mainnet', _internals: chain.internals });
    await expect(api.deploy()).rejects.toThrow(/Mainnet deployment is locked/);
    expect(chain.internals.deployContract).not.toHaveBeenCalled();
  });

  it('deploy() on mainnet proceeds only with the exact approval token', async () => {
    process.env.POB_ALLOW_MAINNET_DEPLOY = 'yes please';
    expect(() => assertMainnetDeployApproved('mainnet')).toThrow(/Mainnet deployment is locked/);
    process.env.POB_ALLOW_MAINNET_DEPLOY = 'I_APPROVE_MAINNET_DEPLOYMENT';
    expect(() => assertMainnetDeployApproved('mainnet')).not.toThrow();
    const chain = fakeChain();
    const api = await getRollupContractApi({ networkId: 'mainnet', _internals: chain.internals });
    const deployed = await api.deploy();
    expect(deployed).toEqual({ contractAddress: CONTRACT_ADDRESS, txHash: 'deploy-hash', blockHeight: 100 });
    expect(chain.recorded.privateStateId).toBe(ROLLUP_PRIVATE_STATE_ID);
    expect(api.address).toBe(CONTRACT_ADDRESS);
  });

  it('joinAt() on mainnet needs no approval (attaching sends no transaction)', async () => {
    const chain = fakeChain();
    const api = await getRollupContractApi({ networkId: 'mainnet', _internals: chain.internals });
    await expect(api.joinAt(CONTRACT_ADDRESS)).resolves.toEqual({ contractAddress: CONTRACT_ADDRESS });
    expect(chain.internals.deployContract).not.toHaveBeenCalled();
  });

  it('refuses a committed local test seed on a public network, allows it locally', () => {
    const environment = { POB_SEED_P1: `${'0'.repeat(63)}2` };
    expect(() => assertFreshPublicSeed(`${'0'.repeat(63)}2`, 'preprod', environment))
      .toThrow(/Refusing to use a committed local test seed/);
    expect(() => assertFreshPublicSeed('not-hex', 'preview', environment)).toThrow(/fresh, private 64-hex seed/);
    expect(() => assertFreshPublicSeed('f'.repeat(64), 'preprod', environment)).not.toThrow();
    expect(() => assertFreshPublicSeed(`${'0'.repeat(63)}2`, 'undeployed', environment)).not.toThrow();
  });

  it('rejects unknown network ids before building any provider', async () => {
    const chain = fakeChain();
    await expect(getRollupContractApi({ networkId: 'devnet', _internals: chain.internals }))
      .rejects.toThrow(/Unsupported network: devnet/);
    expect(chain.internals.buildProviders).not.toHaveBeenCalled();
  });
});

describe('rollup-contract: currentTimeSeconds', () => {
  it('returns whole seconds as a bigint and documents the 120s window', () => {
    expect(currentTimeSeconds(1_800_000_000_999)).toBe(1_800_000_000n);
    expect(typeof currentTimeSeconds()).toBe('bigint');
    expect(ROLLUP_TIMESTAMP_WINDOW_SECONDS).toBe(120);
  });
});
