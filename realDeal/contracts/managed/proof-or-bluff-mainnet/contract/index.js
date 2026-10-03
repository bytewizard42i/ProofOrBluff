import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

export var GameMode;
(function (GameMode) {
  GameMode[GameMode['CASUAL'] = 0] = 'CASUAL';
  GameMode[GameMode['STANDARD'] = 1] = 'STANDARD';
  GameMode[GameMode['STRATEGIC'] = 2] = 'STRATEGIC';
  GameMode[GameMode['CLASSIC'] = 3] = 'CLASSIC';
  GameMode[GameMode['CASINO'] = 4] = 'CASINO';
})(GameMode || (GameMode = {}));

export var MatchPhase;
(function (MatchPhase) {
  MatchPhase[MatchPhase['WAITING_FOR_PLAYER_TWO'] = 0] = 'WAITING_FOR_PLAYER_TWO';
  MatchPhase[MatchPhase['WAITING_FOR_ENTROPY_REVEAL'] = 1] = 'WAITING_FOR_ENTROPY_REVEAL';
  MatchPhase[MatchPhase['PLAYING'] = 2] = 'PLAYING';
  MatchPhase[MatchPhase['AWAITING_RESPONSE'] = 3] = 'AWAITING_RESPONSE';
  MatchPhase[MatchPhase['GAMEOVER'] = 4] = 'GAMEOVER';
})(MatchPhase || (MatchPhase = {}));

const _descriptor_0 = new __compactRuntime.CompactTypeBytes(32);

class _ZswapCoinPublicKey_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_1 = new _ZswapCoinPublicKey_0();

const _descriptor_2 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_3 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_4 = __compactRuntime.CompactTypeBoolean;

const _descriptor_5 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

class _MatchState_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_3.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_4.alignment().concat(_descriptor_5.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_3.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_4.alignment().concat(_descriptor_3.alignment().concat(_descriptor_4.alignment().concat(_descriptor_5.alignment().concat(_descriptor_5.alignment().concat(_descriptor_5.alignment().concat(_descriptor_5.alignment().concat(_descriptor_5.alignment().concat(_descriptor_2.alignment()))))))))))))))))))))))))))))))));
  }
  fromValue(value_0) {
    return {
      playerOne: _descriptor_1.fromValue(value_0),
      playerTwo: _descriptor_1.fromValue(value_0),
      mode: _descriptor_2.fromValue(value_0),
      winThreshold: _descriptor_2.fromValue(value_0),
      createdAt: _descriptor_3.fromValue(value_0),
      p1EntropyCommit: _descriptor_0.fromValue(value_0),
      p2EntropyCommit: _descriptor_0.fromValue(value_0),
      p1SaltCommit: _descriptor_0.fromValue(value_0),
      p2SaltCommit: _descriptor_0.fromValue(value_0),
      seedCommitment: _descriptor_0.fromValue(value_0),
      seedFinalized: _descriptor_4.fromValue(value_0),
      round: _descriptor_5.fromValue(value_0),
      p1HandCommit: _descriptor_0.fromValue(value_0),
      p2HandCommit: _descriptor_0.fromValue(value_0),
      p1HandDrawn: _descriptor_4.fromValue(value_0),
      p2HandDrawn: _descriptor_4.fromValue(value_0),
      phase: _descriptor_2.fromValue(value_0),
      activePlayerIdx: _descriptor_2.fromValue(value_0),
      currentRank: _descriptor_2.fromValue(value_0),
      lastActionAt: _descriptor_3.fromValue(value_0),
      lastClaimRank: _descriptor_2.fromValue(value_0),
      lastClaimCount: _descriptor_2.fromValue(value_0),
      lastPlayCommit: _descriptor_0.fromValue(value_0),
      lastPlayerIdx: _descriptor_2.fromValue(value_0),
      hasPendingPlay: _descriptor_4.fromValue(value_0),
      challengeCalledAt: _descriptor_3.fromValue(value_0),
      isChallenged: _descriptor_4.fromValue(value_0),
      pileSize: _descriptor_5.fromValue(value_0),
      p1Score: _descriptor_5.fromValue(value_0),
      p2Score: _descriptor_5.fromValue(value_0),
      p1HandSize: _descriptor_5.fromValue(value_0),
      p2HandSize: _descriptor_5.fromValue(value_0),
      winner: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.playerOne).concat(_descriptor_1.toValue(value_0.playerTwo).concat(_descriptor_2.toValue(value_0.mode).concat(_descriptor_2.toValue(value_0.winThreshold).concat(_descriptor_3.toValue(value_0.createdAt).concat(_descriptor_0.toValue(value_0.p1EntropyCommit).concat(_descriptor_0.toValue(value_0.p2EntropyCommit).concat(_descriptor_0.toValue(value_0.p1SaltCommit).concat(_descriptor_0.toValue(value_0.p2SaltCommit).concat(_descriptor_0.toValue(value_0.seedCommitment).concat(_descriptor_4.toValue(value_0.seedFinalized).concat(_descriptor_5.toValue(value_0.round).concat(_descriptor_0.toValue(value_0.p1HandCommit).concat(_descriptor_0.toValue(value_0.p2HandCommit).concat(_descriptor_4.toValue(value_0.p1HandDrawn).concat(_descriptor_4.toValue(value_0.p2HandDrawn).concat(_descriptor_2.toValue(value_0.phase).concat(_descriptor_2.toValue(value_0.activePlayerIdx).concat(_descriptor_2.toValue(value_0.currentRank).concat(_descriptor_3.toValue(value_0.lastActionAt).concat(_descriptor_2.toValue(value_0.lastClaimRank).concat(_descriptor_2.toValue(value_0.lastClaimCount).concat(_descriptor_0.toValue(value_0.lastPlayCommit).concat(_descriptor_2.toValue(value_0.lastPlayerIdx).concat(_descriptor_4.toValue(value_0.hasPendingPlay).concat(_descriptor_3.toValue(value_0.challengeCalledAt).concat(_descriptor_4.toValue(value_0.isChallenged).concat(_descriptor_5.toValue(value_0.pileSize).concat(_descriptor_5.toValue(value_0.p1Score).concat(_descriptor_5.toValue(value_0.p2Score).concat(_descriptor_5.toValue(value_0.p1HandSize).concat(_descriptor_5.toValue(value_0.p2HandSize).concat(_descriptor_2.toValue(value_0.winner)))))))))))))))))))))))))))))))));
  }
}

const _descriptor_6 = new _MatchState_0();

const _descriptor_7 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_8 = new __compactRuntime.CompactTypeVector(13, _descriptor_2);

class _PlayRevealWitness_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment()))))))));
  }
  fromValue(value_0) {
    return {
      count: _descriptor_2.fromValue(value_0),
      rank0: _descriptor_2.fromValue(value_0),
      salt0: _descriptor_0.fromValue(value_0),
      rank1: _descriptor_2.fromValue(value_0),
      salt1: _descriptor_0.fromValue(value_0),
      rank2: _descriptor_2.fromValue(value_0),
      salt2: _descriptor_0.fromValue(value_0),
      rank3: _descriptor_2.fromValue(value_0),
      salt3: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.count).concat(_descriptor_2.toValue(value_0.rank0).concat(_descriptor_0.toValue(value_0.salt0).concat(_descriptor_2.toValue(value_0.rank1).concat(_descriptor_0.toValue(value_0.salt1).concat(_descriptor_2.toValue(value_0.rank2).concat(_descriptor_0.toValue(value_0.salt2).concat(_descriptor_2.toValue(value_0.rank3).concat(_descriptor_0.toValue(value_0.salt3)))))))));
  }
}

const _descriptor_9 = new _PlayRevealWitness_0();

const _descriptor_10 = new __compactRuntime.CompactTypeVector(7, _descriptor_2);

const _descriptor_11 = new __compactRuntime.CompactTypeVector(32, _descriptor_2);

class _MatchIdInput_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_3.alignment())));
  }
  fromValue(value_0) {
    return {
      separator: _descriptor_0.fromValue(value_0),
      playerOne: _descriptor_1.fromValue(value_0),
      mode: _descriptor_2.fromValue(value_0),
      createdAt: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.separator).concat(_descriptor_1.toValue(value_0.playerOne).concat(_descriptor_2.toValue(value_0.mode).concat(_descriptor_3.toValue(value_0.createdAt))));
  }
}

const _descriptor_12 = new _MatchIdInput_0();

class _HandCommitInput_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_8.alignment().concat(_descriptor_0.alignment().concat(_descriptor_5.alignment())));
  }
  fromValue(value_0) {
    return {
      separator: _descriptor_0.fromValue(value_0),
      counts: _descriptor_8.fromValue(value_0),
      salt: _descriptor_0.fromValue(value_0),
      round: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.separator).concat(_descriptor_8.toValue(value_0.counts).concat(_descriptor_0.toValue(value_0.salt).concat(_descriptor_5.toValue(value_0.round))));
  }
}

const _descriptor_13 = new _HandCommitInput_0();

class _DealInput_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_5.alignment())));
  }
  fromValue(value_0) {
    return {
      separator: _descriptor_0.fromValue(value_0),
      salt: _descriptor_0.fromValue(value_0),
      seed: _descriptor_0.fromValue(value_0),
      round: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.separator).concat(_descriptor_0.toValue(value_0.salt).concat(_descriptor_0.toValue(value_0.seed).concat(_descriptor_5.toValue(value_0.round))));
  }
}

const _descriptor_14 = new _DealInput_0();

class _SeedCommitInput_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment());
  }
  fromValue(value_0) {
    return {
      separator: _descriptor_0.fromValue(value_0),
      seed: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.separator).concat(_descriptor_0.toValue(value_0.seed));
  }
}

const _descriptor_15 = new _SeedCommitInput_0();

class _HandSaltCommitInput_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment());
  }
  fromValue(value_0) {
    return {
      separator: _descriptor_0.fromValue(value_0),
      salt: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.separator).concat(_descriptor_0.toValue(value_0.salt));
  }
}

const _descriptor_16 = new _HandSaltCommitInput_0();

class _EntropyCommitInput_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment());
  }
  fromValue(value_0) {
    return {
      separator: _descriptor_0.fromValue(value_0),
      entropy: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.separator).concat(_descriptor_0.toValue(value_0.entropy));
  }
}

const _descriptor_17 = new _EntropyCommitInput_0();

class _SeedInput_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      separator: _descriptor_0.fromValue(value_0),
      p1Entropy: _descriptor_0.fromValue(value_0),
      p2Entropy: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.separator).concat(_descriptor_0.toValue(value_0.p1Entropy).concat(_descriptor_0.toValue(value_0.p2Entropy)));
  }
}

const _descriptor_18 = new _SeedInput_0();

class _Either_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_4.fromValue(value_0),
      left: _descriptor_0.fromValue(value_0),
      right: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.is_left).concat(_descriptor_0.toValue(value_0.left).concat(_descriptor_0.toValue(value_0.right)));
  }
}

const _descriptor_19 = new _Either_0();

const _descriptor_20 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_21 = new _ContractAddress_0();

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    if (typeof(witnesses_0.handSalt) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named handSalt');
    }
    if (typeof(witnesses_0.sharedSeed) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named sharedSeed');
    }
    if (typeof(witnesses_0.currentHandCounts) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named currentHandCounts');
    }
    if (typeof(witnesses_0.nextPlay) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named nextPlay');
    }
    if (typeof(witnesses_0.revealLastPlay) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named revealLastPlay');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      commitEntropy(context, ...args_1) {
        return { result: pureCircuits.commitEntropy(...args_1), context };
      },
      commitPlay(context, ...args_1) {
        return { result: pureCircuits.commitPlay(...args_1), context };
      },
      combineEntropy(context, ...args_1) {
        return { result: pureCircuits.combineEntropy(...args_1), context };
      },
      commitSeed(context, ...args_1) {
        return { result: pureCircuits.commitSeed(...args_1), context };
      },
      commitHandSalt(context, ...args_1) {
        return { result: pureCircuits.commitHandSalt(...args_1), context };
      },
      commitHandCounts(context, ...args_1) {
        return { result: pureCircuits.commitHandCounts(...args_1), context };
      },
      dealHandRanks(context, ...args_1) {
        return { result: pureCircuits.dealHandRanks(...args_1), context };
      },
      handCountsFromRanks(context, ...args_1) {
        return { result: pureCircuits.handCountsFromRanks(...args_1), context };
      },
      removePlayed(context, ...args_1) {
        return { result: pureCircuits.removePlayed(...args_1), context };
      },
      createMatch: (...args_1) => {
        if (args_1.length !== 5) {
          throw new __compactRuntime.CompactError(`createMatch: expected 5 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const mode_0 = args_1[1];
        const p1EntropyCommit_0 = args_1[2];
        const p1SaltCommit_0 = args_1[3];
        const currentTime_0 = args_1[4];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('createMatch',
                                     'argument 1 (as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 363 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(mode_0) === 'bigint' && mode_0 >= 0n && mode_0 <= 255n)) {
          __compactRuntime.typeError('createMatch',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 363 char 1',
                                     'Uint<0..256>',
                                     mode_0)
        }
        if (!(p1EntropyCommit_0.buffer instanceof ArrayBuffer && p1EntropyCommit_0.BYTES_PER_ELEMENT === 1 && p1EntropyCommit_0.length === 32)) {
          __compactRuntime.typeError('createMatch',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 363 char 1',
                                     'Bytes<32>',
                                     p1EntropyCommit_0)
        }
        if (!(p1SaltCommit_0.buffer instanceof ArrayBuffer && p1SaltCommit_0.BYTES_PER_ELEMENT === 1 && p1SaltCommit_0.length === 32)) {
          __compactRuntime.typeError('createMatch',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 363 char 1',
                                     'Bytes<32>',
                                     p1SaltCommit_0)
        }
        if (!(typeof(currentTime_0) === 'bigint' && currentTime_0 >= 0n && currentTime_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('createMatch',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 363 char 1',
                                     'Uint<0..18446744073709551616>',
                                     currentTime_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(mode_0).concat(_descriptor_0.toValue(p1EntropyCommit_0).concat(_descriptor_0.toValue(p1SaltCommit_0).concat(_descriptor_3.toValue(currentTime_0)))),
            alignment: _descriptor_2.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment())))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._createMatch_0(context,
                                             partialProofData,
                                             mode_0,
                                             p1EntropyCommit_0,
                                             p1SaltCommit_0,
                                             currentTime_0);
        partialProofData.output = { value: _descriptor_0.toValue(result_0), alignment: _descriptor_0.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      joinMatch: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`joinMatch: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const matchId_0 = args_1[1];
        const p2EntropyCommit_0 = args_1[2];
        const p2SaltCommit_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('joinMatch',
                                     'argument 1 (as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 395 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(matchId_0.buffer instanceof ArrayBuffer && matchId_0.BYTES_PER_ELEMENT === 1 && matchId_0.length === 32)) {
          __compactRuntime.typeError('joinMatch',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 395 char 1',
                                     'Bytes<32>',
                                     matchId_0)
        }
        if (!(p2EntropyCommit_0.buffer instanceof ArrayBuffer && p2EntropyCommit_0.BYTES_PER_ELEMENT === 1 && p2EntropyCommit_0.length === 32)) {
          __compactRuntime.typeError('joinMatch',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 395 char 1',
                                     'Bytes<32>',
                                     p2EntropyCommit_0)
        }
        if (!(p2SaltCommit_0.buffer instanceof ArrayBuffer && p2SaltCommit_0.BYTES_PER_ELEMENT === 1 && p2SaltCommit_0.length === 32)) {
          __compactRuntime.typeError('joinMatch',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 395 char 1',
                                     'Bytes<32>',
                                     p2SaltCommit_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(matchId_0).concat(_descriptor_0.toValue(p2EntropyCommit_0).concat(_descriptor_0.toValue(p2SaltCommit_0))),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._joinMatch_0(context,
                                           partialProofData,
                                           matchId_0,
                                           p2EntropyCommit_0,
                                           p2SaltCommit_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      revealSeed: (...args_1) => {
        if (args_1.length !== 6) {
          throw new __compactRuntime.CompactError(`revealSeed: expected 6 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const matchId_0 = args_1[1];
        const p1Entropy_0 = args_1[2];
        const p2Entropy_0 = args_1[3];
        const startingRank_0 = args_1[4];
        const currentTime_0 = args_1[5];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('revealSeed',
                                     'argument 1 (as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 419 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(matchId_0.buffer instanceof ArrayBuffer && matchId_0.BYTES_PER_ELEMENT === 1 && matchId_0.length === 32)) {
          __compactRuntime.typeError('revealSeed',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 419 char 1',
                                     'Bytes<32>',
                                     matchId_0)
        }
        if (!(p1Entropy_0.buffer instanceof ArrayBuffer && p1Entropy_0.BYTES_PER_ELEMENT === 1 && p1Entropy_0.length === 32)) {
          __compactRuntime.typeError('revealSeed',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 419 char 1',
                                     'Bytes<32>',
                                     p1Entropy_0)
        }
        if (!(p2Entropy_0.buffer instanceof ArrayBuffer && p2Entropy_0.BYTES_PER_ELEMENT === 1 && p2Entropy_0.length === 32)) {
          __compactRuntime.typeError('revealSeed',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 419 char 1',
                                     'Bytes<32>',
                                     p2Entropy_0)
        }
        if (!(typeof(startingRank_0) === 'bigint' && startingRank_0 >= 0n && startingRank_0 <= 255n)) {
          __compactRuntime.typeError('revealSeed',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 419 char 1',
                                     'Uint<0..256>',
                                     startingRank_0)
        }
        if (!(typeof(currentTime_0) === 'bigint' && currentTime_0 >= 0n && currentTime_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('revealSeed',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 419 char 1',
                                     'Uint<0..18446744073709551616>',
                                     currentTime_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(matchId_0).concat(_descriptor_0.toValue(p1Entropy_0).concat(_descriptor_0.toValue(p2Entropy_0).concat(_descriptor_2.toValue(startingRank_0).concat(_descriptor_3.toValue(currentTime_0))))),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_3.alignment()))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._revealSeed_0(context,
                                            partialProofData,
                                            matchId_0,
                                            p1Entropy_0,
                                            p2Entropy_0,
                                            startingRank_0,
                                            currentTime_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      playCards: (...args_1) => {
        if (args_1.length !== 6) {
          throw new __compactRuntime.CompactError(`playCards: expected 6 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const matchId_0 = args_1[1];
        const playCommit_0 = args_1[2];
        const claimedRank_0 = args_1[3];
        const claimedCount_0 = args_1[4];
        const currentTime_0 = args_1[5];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('playCards',
                                     'argument 1 (as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 452 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(matchId_0.buffer instanceof ArrayBuffer && matchId_0.BYTES_PER_ELEMENT === 1 && matchId_0.length === 32)) {
          __compactRuntime.typeError('playCards',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 452 char 1',
                                     'Bytes<32>',
                                     matchId_0)
        }
        if (!(playCommit_0.buffer instanceof ArrayBuffer && playCommit_0.BYTES_PER_ELEMENT === 1 && playCommit_0.length === 32)) {
          __compactRuntime.typeError('playCards',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 452 char 1',
                                     'Bytes<32>',
                                     playCommit_0)
        }
        if (!(typeof(claimedRank_0) === 'bigint' && claimedRank_0 >= 0n && claimedRank_0 <= 255n)) {
          __compactRuntime.typeError('playCards',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 452 char 1',
                                     'Uint<0..256>',
                                     claimedRank_0)
        }
        if (!(typeof(claimedCount_0) === 'bigint' && claimedCount_0 >= 0n && claimedCount_0 <= 255n)) {
          __compactRuntime.typeError('playCards',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 452 char 1',
                                     'Uint<0..256>',
                                     claimedCount_0)
        }
        if (!(typeof(currentTime_0) === 'bigint' && currentTime_0 >= 0n && currentTime_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('playCards',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 452 char 1',
                                     'Uint<0..18446744073709551616>',
                                     currentTime_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(matchId_0).concat(_descriptor_0.toValue(playCommit_0).concat(_descriptor_2.toValue(claimedRank_0).concat(_descriptor_2.toValue(claimedCount_0).concat(_descriptor_3.toValue(currentTime_0))))),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_3.alignment()))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._playCards_0(context,
                                           partialProofData,
                                           matchId_0,
                                           playCommit_0,
                                           claimedRank_0,
                                           claimedCount_0,
                                           currentTime_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      acceptClaim: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`acceptClaim: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const matchId_0 = args_1[1];
        const currentTime_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('acceptClaim',
                                     'argument 1 (as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 522 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(matchId_0.buffer instanceof ArrayBuffer && matchId_0.BYTES_PER_ELEMENT === 1 && matchId_0.length === 32)) {
          __compactRuntime.typeError('acceptClaim',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 522 char 1',
                                     'Bytes<32>',
                                     matchId_0)
        }
        if (!(typeof(currentTime_0) === 'bigint' && currentTime_0 >= 0n && currentTime_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('acceptClaim',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 522 char 1',
                                     'Uint<0..18446744073709551616>',
                                     currentTime_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(matchId_0).concat(_descriptor_3.toValue(currentTime_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_3.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._acceptClaim_0(context,
                                             partialProofData,
                                             matchId_0,
                                             currentTime_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      challengeClaim: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`challengeClaim: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const matchId_0 = args_1[1];
        const currentTime_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('challengeClaim',
                                     'argument 1 (as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 558 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(matchId_0.buffer instanceof ArrayBuffer && matchId_0.BYTES_PER_ELEMENT === 1 && matchId_0.length === 32)) {
          __compactRuntime.typeError('challengeClaim',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 558 char 1',
                                     'Bytes<32>',
                                     matchId_0)
        }
        if (!(typeof(currentTime_0) === 'bigint' && currentTime_0 >= 0n && currentTime_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('challengeClaim',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 558 char 1',
                                     'Uint<0..18446744073709551616>',
                                     currentTime_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(matchId_0).concat(_descriptor_3.toValue(currentTime_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_3.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._challengeClaim_0(context,
                                                partialProofData,
                                                matchId_0,
                                                currentTime_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      resolveChallenge: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`resolveChallenge: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const matchId_0 = args_1[1];
        const currentTime_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('resolveChallenge',
                                     'argument 1 (as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 589 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(matchId_0.buffer instanceof ArrayBuffer && matchId_0.BYTES_PER_ELEMENT === 1 && matchId_0.length === 32)) {
          __compactRuntime.typeError('resolveChallenge',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 589 char 1',
                                     'Bytes<32>',
                                     matchId_0)
        }
        if (!(typeof(currentTime_0) === 'bigint' && currentTime_0 >= 0n && currentTime_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('resolveChallenge',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 589 char 1',
                                     'Uint<0..18446744073709551616>',
                                     currentTime_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(matchId_0).concat(_descriptor_3.toValue(currentTime_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_3.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._resolveChallenge_0(context,
                                                  partialProofData,
                                                  matchId_0,
                                                  currentTime_0);
        partialProofData.output = { value: _descriptor_4.toValue(result_0), alignment: _descriptor_4.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      cancelUnjoinedMatch: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`cancelUnjoinedMatch: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const matchId_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('cancelUnjoinedMatch',
                                     'argument 1 (as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 641 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(matchId_0.buffer instanceof ArrayBuffer && matchId_0.BYTES_PER_ELEMENT === 1 && matchId_0.length === 32)) {
          __compactRuntime.typeError('cancelUnjoinedMatch',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 641 char 1',
                                     'Bytes<32>',
                                     matchId_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(matchId_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._cancelUnjoinedMatch_0(context,
                                                     partialProofData,
                                                     matchId_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      forfeitAbandonedMatch: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`forfeitAbandonedMatch: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const matchId_0 = args_1[1];
        const currentTime_0 = args_1[2];
        const timeoutSeconds_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('forfeitAbandonedMatch',
                                     'argument 1 (as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 663 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(matchId_0.buffer instanceof ArrayBuffer && matchId_0.BYTES_PER_ELEMENT === 1 && matchId_0.length === 32)) {
          __compactRuntime.typeError('forfeitAbandonedMatch',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 663 char 1',
                                     'Bytes<32>',
                                     matchId_0)
        }
        if (!(typeof(currentTime_0) === 'bigint' && currentTime_0 >= 0n && currentTime_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('forfeitAbandonedMatch',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 663 char 1',
                                     'Uint<0..18446744073709551616>',
                                     currentTime_0)
        }
        if (!(typeof(timeoutSeconds_0) === 'bigint' && timeoutSeconds_0 >= 0n && timeoutSeconds_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('forfeitAbandonedMatch',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 663 char 1',
                                     'Uint<0..18446744073709551616>',
                                     timeoutSeconds_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(matchId_0).concat(_descriptor_3.toValue(currentTime_0).concat(_descriptor_3.toValue(timeoutSeconds_0))),
            alignment: _descriptor_0.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._forfeitAbandonedMatch_0(context,
                                                       partialProofData,
                                                       matchId_0,
                                                       currentTime_0,
                                                       timeoutSeconds_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      forfeitStalledChallenge: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`forfeitStalledChallenge: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const matchId_0 = args_1[1];
        const currentTime_0 = args_1[2];
        const timeoutSeconds_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('forfeitStalledChallenge',
                                     'argument 1 (as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 692 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(matchId_0.buffer instanceof ArrayBuffer && matchId_0.BYTES_PER_ELEMENT === 1 && matchId_0.length === 32)) {
          __compactRuntime.typeError('forfeitStalledChallenge',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 692 char 1',
                                     'Bytes<32>',
                                     matchId_0)
        }
        if (!(typeof(currentTime_0) === 'bigint' && currentTime_0 >= 0n && currentTime_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('forfeitStalledChallenge',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 692 char 1',
                                     'Uint<0..18446744073709551616>',
                                     currentTime_0)
        }
        if (!(typeof(timeoutSeconds_0) === 'bigint' && timeoutSeconds_0 >= 0n && timeoutSeconds_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('forfeitStalledChallenge',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 692 char 1',
                                     'Uint<0..18446744073709551616>',
                                     timeoutSeconds_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(matchId_0).concat(_descriptor_3.toValue(currentTime_0).concat(_descriptor_3.toValue(timeoutSeconds_0))),
            alignment: _descriptor_0.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._forfeitStalledChallenge_0(context,
                                                         partialProofData,
                                                         matchId_0,
                                                         currentTime_0,
                                                         timeoutSeconds_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      getMatch: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`getMatch: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const matchId_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('getMatch',
                                     'argument 1 (as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 732 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(matchId_0.buffer instanceof ArrayBuffer && matchId_0.BYTES_PER_ELEMENT === 1 && matchId_0.length === 32)) {
          __compactRuntime.typeError('getMatch',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 732 char 1',
                                     'Bytes<32>',
                                     matchId_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(matchId_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._getMatch_0(context, partialProofData, matchId_0);
        partialProofData.output = { value: _descriptor_6.toValue(result_0), alignment: _descriptor_6.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      getMatchPhase: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`getMatchPhase: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const matchId_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('getMatchPhase',
                                     'argument 1 (as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 736 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(matchId_0.buffer instanceof ArrayBuffer && matchId_0.BYTES_PER_ELEMENT === 1 && matchId_0.length === 32)) {
          __compactRuntime.typeError('getMatchPhase',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 736 char 1',
                                     'Bytes<32>',
                                     matchId_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(matchId_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._getMatchPhase_0(context,
                                               partialProofData,
                                               matchId_0);
        partialProofData.output = { value: _descriptor_2.toValue(result_0), alignment: _descriptor_2.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      getWinner: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`getWinner: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const matchId_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('getWinner',
                                     'argument 1 (as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 740 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(matchId_0.buffer instanceof ArrayBuffer && matchId_0.BYTES_PER_ELEMENT === 1 && matchId_0.length === 32)) {
          __compactRuntime.typeError('getWinner',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'proof-or-bluff-mainnet.compact line 740 char 1',
                                     'Bytes<32>',
                                     matchId_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(matchId_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._getWinner_0(context, partialProofData, matchId_0);
        partialProofData.output = { value: _descriptor_2.toValue(result_0), alignment: _descriptor_2.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      createMatch: this.circuits.createMatch,
      joinMatch: this.circuits.joinMatch,
      revealSeed: this.circuits.revealSeed,
      playCards: this.circuits.playCards,
      acceptClaim: this.circuits.acceptClaim,
      challengeClaim: this.circuits.challengeClaim,
      resolveChallenge: this.circuits.resolveChallenge,
      cancelUnjoinedMatch: this.circuits.cancelUnjoinedMatch,
      forfeitAbandonedMatch: this.circuits.forfeitAbandonedMatch,
      forfeitStalledChallenge: this.circuits.forfeitStalledChallenge,
      getMatch: this.circuits.getMatch,
      getMatchPhase: this.circuits.getMatchPhase,
      getWinner: this.circuits.getWinner
    };
    this.provableCircuits = {
      createMatch: this.circuits.createMatch,
      joinMatch: this.circuits.joinMatch,
      revealSeed: this.circuits.revealSeed,
      playCards: this.circuits.playCards,
      acceptClaim: this.circuits.acceptClaim,
      challengeClaim: this.circuits.challengeClaim,
      resolveChallenge: this.circuits.resolveChallenge,
      cancelUnjoinedMatch: this.circuits.cancelUnjoinedMatch,
      forfeitAbandonedMatch: this.circuits.forfeitAbandonedMatch,
      forfeitStalledChallenge: this.circuits.forfeitStalledChallenge,
      getMatch: this.circuits.getMatch,
      getMatchPhase: this.circuits.getMatchPhase,
      getWinner: this.circuits.getWinner
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialPrivateState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialPrivateState' in argument 1 (as invoked from Typescript)`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('createMatch', new __compactRuntime.ContractOperation());
    state_0.setOperation('joinMatch', new __compactRuntime.ContractOperation());
    state_0.setOperation('revealSeed', new __compactRuntime.ContractOperation());
    state_0.setOperation('playCards', new __compactRuntime.ContractOperation());
    state_0.setOperation('acceptClaim', new __compactRuntime.ContractOperation());
    state_0.setOperation('challengeClaim', new __compactRuntime.ContractOperation());
    state_0.setOperation('resolveChallenge', new __compactRuntime.ContractOperation());
    state_0.setOperation('cancelUnjoinedMatch', new __compactRuntime.ContractOperation());
    state_0.setOperation('forfeitAbandonedMatch', new __compactRuntime.ContractOperation());
    state_0.setOperation('forfeitStalledChallenge', new __compactRuntime.ContractOperation());
    state_0.setOperation('getMatch', new __compactRuntime.ContractOperation());
    state_0.setOperation('getMatchPhase', new __compactRuntime.ContractOperation());
    state_0.setOperation('getWinner', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(0n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(1n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(2n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(3n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _blockTimeLt_0(context, partialProofData, time_0) {
    return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 2 } },
                                                                      { idx: { cached: true,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_2.toValue(2n),
                                                                                                 alignment: _descriptor_2.alignment() } }] } },
                                                                      { push: { storage: false,
                                                                                value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(time_0),
                                                                                                                             alignment: _descriptor_3.alignment() }).encode() } },
                                                                      'lt',
                                                                      { popeq: { cached: true,
                                                                                 result: undefined } }]).value);
  }
  _blockTimeGte_0(context, partialProofData, time_0) {
    return !this._blockTimeLt_0(context, partialProofData, time_0);
  }
  _blockTimeGt_0(context, partialProofData, time_0) {
    return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { push: { storage: false,
                                                                                value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(time_0),
                                                                                                                             alignment: _descriptor_3.alignment() }).encode() } },
                                                                      { dup: { n: 3 } },
                                                                      { idx: { cached: true,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_2.toValue(2n),
                                                                                                 alignment: _descriptor_2.alignment() } }] } },
                                                                      'lt',
                                                                      { popeq: { cached: true,
                                                                                 result: undefined } }]).value);
  }
  _blockTimeLte_0(context, partialProofData, time_0) {
    return !this._blockTimeGt_0(context, partialProofData, time_0);
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_17, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_18, value_0);
    return result_0;
  }
  _persistentHash_2(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_15, value_0);
    return result_0;
  }
  _persistentHash_3(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_16, value_0);
    return result_0;
  }
  _persistentHash_4(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_13, value_0);
    return result_0;
  }
  _persistentHash_5(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_14, value_0);
    return result_0;
  }
  _persistentHash_6(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_12, value_0);
    return result_0;
  }
  _persistentHash_7(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_9, value_0);
    return result_0;
  }
  _ownPublicKey_0(context, partialProofData) {
    const result_0 = __compactRuntime.ownPublicKey(context);
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_1.toValue(result_0),
      alignment: _descriptor_1.alignment()
    });
    return result_0;
  }
  _handSalt_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.handSalt(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('handSalt',
                                 'return value',
                                 'proof-or-bluff-mainnet.compact line 142 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _sharedSeed_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.sharedSeed(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('sharedSeed',
                                 'return value',
                                 'proof-or-bluff-mainnet.compact line 143 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _currentHandCounts_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.currentHandCounts(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 13 && result_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 255n))) {
      __compactRuntime.typeError('currentHandCounts',
                                 'return value',
                                 'proof-or-bluff-mainnet.compact line 144 char 1',
                                 'Vector<13, Uint<0..256>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_8.toValue(result_0),
      alignment: _descriptor_8.alignment()
    });
    return result_0;
  }
  _nextPlay_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.nextPlay(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && typeof(result_0.count) === 'bigint' && result_0.count >= 0n && result_0.count <= 255n && typeof(result_0.rank0) === 'bigint' && result_0.rank0 >= 0n && result_0.rank0 <= 255n && result_0.salt0.buffer instanceof ArrayBuffer && result_0.salt0.BYTES_PER_ELEMENT === 1 && result_0.salt0.length === 32 && typeof(result_0.rank1) === 'bigint' && result_0.rank1 >= 0n && result_0.rank1 <= 255n && result_0.salt1.buffer instanceof ArrayBuffer && result_0.salt1.BYTES_PER_ELEMENT === 1 && result_0.salt1.length === 32 && typeof(result_0.rank2) === 'bigint' && result_0.rank2 >= 0n && result_0.rank2 <= 255n && result_0.salt2.buffer instanceof ArrayBuffer && result_0.salt2.BYTES_PER_ELEMENT === 1 && result_0.salt2.length === 32 && typeof(result_0.rank3) === 'bigint' && result_0.rank3 >= 0n && result_0.rank3 <= 255n && result_0.salt3.buffer instanceof ArrayBuffer && result_0.salt3.BYTES_PER_ELEMENT === 1 && result_0.salt3.length === 32)) {
      __compactRuntime.typeError('nextPlay',
                                 'return value',
                                 'proof-or-bluff-mainnet.compact line 145 char 1',
                                 'struct PlayRevealWitness<count: Uint<0..256>, rank0: Uint<0..256>, salt0: Bytes<32>, rank1: Uint<0..256>, salt1: Bytes<32>, rank2: Uint<0..256>, salt2: Bytes<32>, rank3: Uint<0..256>, salt3: Bytes<32>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_9.toValue(result_0),
      alignment: _descriptor_9.alignment()
    });
    return result_0;
  }
  _revealLastPlay_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.revealLastPlay(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && typeof(result_0.count) === 'bigint' && result_0.count >= 0n && result_0.count <= 255n && typeof(result_0.rank0) === 'bigint' && result_0.rank0 >= 0n && result_0.rank0 <= 255n && result_0.salt0.buffer instanceof ArrayBuffer && result_0.salt0.BYTES_PER_ELEMENT === 1 && result_0.salt0.length === 32 && typeof(result_0.rank1) === 'bigint' && result_0.rank1 >= 0n && result_0.rank1 <= 255n && result_0.salt1.buffer instanceof ArrayBuffer && result_0.salt1.BYTES_PER_ELEMENT === 1 && result_0.salt1.length === 32 && typeof(result_0.rank2) === 'bigint' && result_0.rank2 >= 0n && result_0.rank2 <= 255n && result_0.salt2.buffer instanceof ArrayBuffer && result_0.salt2.BYTES_PER_ELEMENT === 1 && result_0.salt2.length === 32 && typeof(result_0.rank3) === 'bigint' && result_0.rank3 >= 0n && result_0.rank3 <= 255n && result_0.salt3.buffer instanceof ArrayBuffer && result_0.salt3.BYTES_PER_ELEMENT === 1 && result_0.salt3.length === 32)) {
      __compactRuntime.typeError('revealLastPlay',
                                 'return value',
                                 'proof-or-bluff-mainnet.compact line 146 char 1',
                                 'struct PlayRevealWitness<count: Uint<0..256>, rank0: Uint<0..256>, salt0: Bytes<32>, rank1: Uint<0..256>, salt1: Bytes<32>, rank2: Uint<0..256>, salt2: Bytes<32>, rank3: Uint<0..256>, salt3: Bytes<32>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_9.toValue(result_0),
      alignment: _descriptor_9.alignment()
    });
    return result_0;
  }
  _commitEntropy_0(entropy_0) {
    return this._persistentHash_0({ separator:
                                      new Uint8Array([112, 111, 98, 58, 101, 110, 116, 114, 111, 112, 121, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    entropy: entropy_0 });
  }
  _commitPlay_0(reveal_0) { return this._persistentHash_7(reveal_0); }
  _combineEntropy_0(p1Entropy_0, p2Entropy_0) {
    return this._persistentHash_1({ separator:
                                      new Uint8Array([112, 111, 98, 58, 115, 101, 101, 100, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    p1Entropy: p1Entropy_0,
                                    p2Entropy: p2Entropy_0 });
  }
  _commitSeed_0(seed_0) {
    return this._persistentHash_2({ separator:
                                      new Uint8Array([112, 111, 98, 58, 115, 101, 101, 100, 45, 99, 111, 109, 109, 105, 116, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    seed: seed_0 });
  }
  _commitHandSalt_0(salt_0) {
    return this._persistentHash_3({ separator:
                                      new Uint8Array([112, 111, 98, 58, 104, 97, 110, 100, 45, 115, 97, 108, 116, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    salt: salt_0 });
  }
  _commitHandCounts_0(counts_0, salt_0, round_0) {
    return this._persistentHash_4({ separator:
                                      new Uint8Array([112, 111, 98, 58, 104, 97, 110, 100, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    counts: counts_0,
                                    salt: salt_0,
                                    round: round_0 });
  }
  _boundedDraw_0(hi_0, lo_0, m_0) {
    const u_0 = ((t1) => {
                  if (t1 > 65535n) {
                    throw new __compactRuntime.CompactError('proof-or-bluff-mainnet.compact line 205 char 13: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 65535');
                  }
                  return t1;
                })(hi_0 * 256n + lo_0);
    const p_0 = ((t1) => {
                  if (t1 > 4294967295n) {
                    throw new __compactRuntime.CompactError('proof-or-bluff-mainnet.compact line 206 char 13: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                  }
                  return t1;
                })(u_0 * m_0);
    const pb_0 = Array.from(__compactRuntime.convertFieldToBytes(32,
                                                                 p_0,
                                                                 'proof-or-bluff-mainnet.compact line 207 char 15'),
                            BigInt);
    return pb_0[2];
  }
  _cardToRank_0(c_0) {
    return (c_0 >= 4n ? 1n : 0n) + (c_0 >= 8n ? 1n : 0n)
           +
           (c_0 >= 12n ? 1n : 0n)
           +
           (c_0 >= 16n ? 1n : 0n)
           +
           (c_0 >= 20n ? 1n : 0n)
           +
           (c_0 >= 24n ? 1n : 0n)
           +
           (c_0 >= 28n ? 1n : 0n)
           +
           (c_0 >= 32n ? 1n : 0n)
           +
           (c_0 >= 36n ? 1n : 0n)
           +
           (c_0 >= 40n ? 1n : 0n)
           +
           (c_0 >= 44n ? 1n : 0n)
           +
           (c_0 >= 48n ? 1n : 0n);
  }
  _dealSeven_0(b_0) {
    const c0_0 = this._boundedDraw_0(b_0[0], b_0[1], 46n);
    const t1_0 = this._boundedDraw_0(b_0[2], b_0[3], 47n);
    const c1_0 = this._equal_0(t1_0, c0_0) ? 46n : t1_0;
    const t2_0 = this._boundedDraw_0(b_0[4], b_0[5], 48n);
    const c2_0 = this._equal_1(t2_0, c0_0) || this._equal_2(t2_0, c1_0) ?
                 47n :
                 t2_0;
    const t3_0 = this._boundedDraw_0(b_0[6], b_0[7], 49n);
    const c3_0 = this._equal_3(t3_0, c0_0) || this._equal_4(t3_0, c1_0)
                 ||
                 this._equal_5(t3_0, c2_0)
                 ?
                 48n :
                 t3_0;
    const t4_0 = this._boundedDraw_0(b_0[8], b_0[9], 50n);
    const c4_0 = this._equal_6(t4_0, c0_0) || this._equal_7(t4_0, c1_0)
                 ||
                 this._equal_8(t4_0, c2_0)
                 ||
                 this._equal_9(t4_0, c3_0)
                 ?
                 49n :
                 t4_0;
    const t5_0 = this._boundedDraw_0(b_0[10], b_0[11], 51n);
    const c5_0 = this._equal_10(t5_0, c0_0) || this._equal_11(t5_0, c1_0)
                 ||
                 this._equal_12(t5_0, c2_0)
                 ||
                 this._equal_13(t5_0, c3_0)
                 ||
                 this._equal_14(t5_0, c4_0)
                 ?
                 50n :
                 t5_0;
    const t6_0 = this._boundedDraw_0(b_0[12], b_0[13], 52n);
    const c6_0 = this._equal_15(t6_0, c0_0) || this._equal_16(t6_0, c1_0)
                 ||
                 this._equal_17(t6_0, c2_0)
                 ||
                 this._equal_18(t6_0, c3_0)
                 ||
                 this._equal_19(t6_0, c4_0)
                 ||
                 this._equal_20(t6_0, c5_0)
                 ?
                 51n :
                 t6_0;
    return [this._cardToRank_0(c0_0),
            this._cardToRank_0(c1_0),
            this._cardToRank_0(c2_0),
            this._cardToRank_0(c3_0),
            this._cardToRank_0(c4_0),
            this._cardToRank_0(c5_0),
            this._cardToRank_0(c6_0)];
  }
  _dealFive_0(b_0) {
    let c0_0, t1_0, c1_0, t2_0, c2_0, t3_0, c3_0, t4_0, c4_0;
    return c0_0 = this._boundedDraw_0(b_0[0], b_0[1], 48n),
           (t1_0 = this._boundedDraw_0(b_0[2], b_0[3], 49n),
            (c1_0 = this._equal_21(t1_0, c0_0) ? 48n : t1_0,
             (t2_0 = this._boundedDraw_0(b_0[4], b_0[5], 50n),
              (c2_0 = this._equal_22(t2_0, c0_0) || this._equal_23(t2_0, c1_0) ?
                      49n :
                      t2_0,
               (t3_0 = this._boundedDraw_0(b_0[6], b_0[7], 51n),
                (c3_0 = this._equal_24(t3_0, c0_0) || this._equal_25(t3_0, c1_0)
                        ||
                        this._equal_26(t3_0, c2_0)
                        ?
                        50n :
                        t3_0,
                 (t4_0 = this._boundedDraw_0(b_0[8], b_0[9], 52n),
                  (c4_0 = this._equal_27(t4_0, c0_0)
                          ||
                          this._equal_28(t4_0, c1_0)
                          ||
                          this._equal_29(t4_0, c2_0)
                          ||
                          this._equal_30(t4_0, c3_0)
                          ?
                          51n :
                          t4_0,
                   [this._cardToRank_0(c0_0),
                    this._cardToRank_0(c1_0),
                    this._cardToRank_0(c2_0),
                    this._cardToRank_0(c3_0),
                    this._cardToRank_0(c4_0),
                    0n,
                    0n]))))))));
  }
  _dealHandRanks_0(salt_0, seed_0, round_0, size_0) {
    const digest_0 = this._persistentHash_5({ separator:
                                                new Uint8Array([112, 111, 98, 58, 100, 101, 97, 108, 58, 118, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                              salt: salt_0,
                                              seed: seed_0,
                                              round: round_0 });
    const b_0 = Array.from(digest_0, BigInt);
    if (this._equal_31(size_0, 5n)) {
      return this._dealFive_0(b_0);
    } else {
      return this._dealSeven_0(b_0);
    }
  }
  _countRank_0(ranks_0, size_0, target_0) {
    const c0_0 = size_0 >= 1n && this._equal_32(ranks_0[0], target_0) ? 1n : 0n;
    const c1_0 = size_0 >= 2n && this._equal_33(ranks_0[1], target_0) ? 1n : 0n;
    const c2_0 = size_0 >= 3n && this._equal_34(ranks_0[2], target_0) ? 1n : 0n;
    const c3_0 = size_0 >= 4n && this._equal_35(ranks_0[3], target_0) ? 1n : 0n;
    const c4_0 = size_0 >= 5n && this._equal_36(ranks_0[4], target_0) ? 1n : 0n;
    const c5_0 = size_0 >= 6n && this._equal_37(ranks_0[5], target_0) ? 1n : 0n;
    const c6_0 = size_0 >= 7n && this._equal_38(ranks_0[6], target_0) ? 1n : 0n;
    return ((t1) => {
             if (t1 > 255n) {
               throw new __compactRuntime.CompactError('proof-or-bluff-mainnet.compact line 286 char 10: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
             }
             return t1;
           })(c0_0 + c1_0 + c2_0 + c3_0 + c4_0 + c5_0 + c6_0);
  }
  _handCountsFromRanks_0(ranks_0, size_0) {
    return [this._countRank_0(ranks_0, size_0, 0n),
            this._countRank_0(ranks_0, size_0, 1n),
            this._countRank_0(ranks_0, size_0, 2n),
            this._countRank_0(ranks_0, size_0, 3n),
            this._countRank_0(ranks_0, size_0, 4n),
            this._countRank_0(ranks_0, size_0, 5n),
            this._countRank_0(ranks_0, size_0, 6n),
            this._countRank_0(ranks_0, size_0, 7n),
            this._countRank_0(ranks_0, size_0, 8n),
            this._countRank_0(ranks_0, size_0, 9n),
            this._countRank_0(ranks_0, size_0, 10n),
            this._countRank_0(ranks_0, size_0, 11n),
            this._countRank_0(ranks_0, size_0, 12n)];
  }
  _matchingRanks_0(reveal_0, target_0) {
    let t_0;
    const r0_0 = (t_0 = reveal_0.count, t_0 >= 1n)
                 &&
                 this._equal_39(reveal_0.rank0, target_0)
                 ?
                 1n :
                 0n;
    let t_1;
    const r1_0 = (t_1 = reveal_0.count, t_1 >= 2n)
                 &&
                 this._equal_40(reveal_0.rank1, target_0)
                 ?
                 1n :
                 0n;
    let t_2;
    const r2_0 = (t_2 = reveal_0.count, t_2 >= 3n)
                 &&
                 this._equal_41(reveal_0.rank2, target_0)
                 ?
                 1n :
                 0n;
    let t_3;
    const r3_0 = (t_3 = reveal_0.count, t_3 >= 4n)
                 &&
                 this._equal_42(reveal_0.rank3, target_0)
                 ?
                 1n :
                 0n;
    return ((t1) => {
             if (t1 > 255n) {
               throw new __compactRuntime.CompactError('proof-or-bluff-mainnet.compact line 303 char 10: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
             }
             return t1;
           })(r0_0 + r1_0 + r2_0 + r3_0);
  }
  _holdsPlayed_0(counts_0, play_0) {
    let t_11, t_12, t_9, t_10, t_7, t_8, t_5, t_6, t_3, t_4, t_1, t_2, t_0;
    return (t_0 = counts_0[0], t_0 >= this._matchingRanks_0(play_0, 0n))
           &&
           (t_2 = counts_0[1], t_2 >= this._matchingRanks_0(play_0, 1n))
           &&
           (t_1 = counts_0[2], t_1 >= this._matchingRanks_0(play_0, 2n))
           &&
           (t_4 = counts_0[3], t_4 >= this._matchingRanks_0(play_0, 3n))
           &&
           (t_3 = counts_0[4], t_3 >= this._matchingRanks_0(play_0, 4n))
           &&
           (t_6 = counts_0[5], t_6 >= this._matchingRanks_0(play_0, 5n))
           &&
           (t_5 = counts_0[6], t_5 >= this._matchingRanks_0(play_0, 6n))
           &&
           (t_8 = counts_0[7], t_8 >= this._matchingRanks_0(play_0, 7n))
           &&
           (t_7 = counts_0[8], t_7 >= this._matchingRanks_0(play_0, 8n))
           &&
           (t_10 = counts_0[9], t_10 >= this._matchingRanks_0(play_0, 9n))
           &&
           (t_9 = counts_0[10], t_9 >= this._matchingRanks_0(play_0, 10n))
           &&
           (t_12 = counts_0[11], t_12 >= this._matchingRanks_0(play_0, 11n))
           &&
           (t_11 = counts_0[12], t_11 >= this._matchingRanks_0(play_0, 12n));
  }
  _removePlayed_0(counts_0, play_0) {
    let t_24,
        t_25,
        t_22,
        t_23,
        t_20,
        t_21,
        t_18,
        t_19,
        t_16,
        t_17,
        t_14,
        t_15,
        t_12,
        t_13,
        t_10,
        t_11,
        t_8,
        t_9,
        t_6,
        t_7,
        t_4,
        t_5,
        t_2,
        t_3,
        t_0,
        t_1;
    return [(t_22 = counts_0[0],
             (t_23 = this._matchingRanks_0(play_0, 0n),
              (__compactRuntime.assert(t_22 >= t_23,
                                       'result of subtraction would be negative'),
               t_22 - t_23))),
            (t_24 = counts_0[1],
             (t_25 = this._matchingRanks_0(play_0, 1n),
              (__compactRuntime.assert(t_24 >= t_25,
                                       'result of subtraction would be negative'),
               t_24 - t_25))),
            (t_18 = counts_0[2],
             (t_19 = this._matchingRanks_0(play_0, 2n),
              (__compactRuntime.assert(t_18 >= t_19,
                                       'result of subtraction would be negative'),
               t_18 - t_19))),
            (t_20 = counts_0[3],
             (t_21 = this._matchingRanks_0(play_0, 3n),
              (__compactRuntime.assert(t_20 >= t_21,
                                       'result of subtraction would be negative'),
               t_20 - t_21))),
            (t_14 = counts_0[4],
             (t_15 = this._matchingRanks_0(play_0, 4n),
              (__compactRuntime.assert(t_14 >= t_15,
                                       'result of subtraction would be negative'),
               t_14 - t_15))),
            (t_16 = counts_0[5],
             (t_17 = this._matchingRanks_0(play_0, 5n),
              (__compactRuntime.assert(t_16 >= t_17,
                                       'result of subtraction would be negative'),
               t_16 - t_17))),
            (t_10 = counts_0[6],
             (t_11 = this._matchingRanks_0(play_0, 6n),
              (__compactRuntime.assert(t_10 >= t_11,
                                       'result of subtraction would be negative'),
               t_10 - t_11))),
            (t_12 = counts_0[7],
             (t_13 = this._matchingRanks_0(play_0, 7n),
              (__compactRuntime.assert(t_12 >= t_13,
                                       'result of subtraction would be negative'),
               t_12 - t_13))),
            (t_6 = counts_0[8],
             (t_7 = this._matchingRanks_0(play_0, 8n),
              (__compactRuntime.assert(t_6 >= t_7,
                                       'result of subtraction would be negative'),
               t_6 - t_7))),
            (t_8 = counts_0[9],
             (t_9 = this._matchingRanks_0(play_0, 9n),
              (__compactRuntime.assert(t_8 >= t_9,
                                       'result of subtraction would be negative'),
               t_8 - t_9))),
            (t_2 = counts_0[10],
             (t_3 = this._matchingRanks_0(play_0, 10n),
              (__compactRuntime.assert(t_2 >= t_3,
                                       'result of subtraction would be negative'),
               t_2 - t_3))),
            (t_4 = counts_0[11],
             (t_5 = this._matchingRanks_0(play_0, 11n),
              (__compactRuntime.assert(t_4 >= t_5,
                                       'result of subtraction would be negative'),
               t_4 - t_5))),
            (t_0 = counts_0[12],
             (t_1 = this._matchingRanks_0(play_0, 12n),
              (__compactRuntime.assert(t_0 >= t_1,
                                       'result of subtraction would be negative'),
               t_0 - t_1)))];
  }
  _selectCounts_0(useFirst_0, a_0, b_0) {
    return [useFirst_0 ? a_0[0] : b_0[0],
            useFirst_0 ? a_0[1] : b_0[1],
            useFirst_0 ? a_0[2] : b_0[2],
            useFirst_0 ? a_0[3] : b_0[3],
            useFirst_0 ? a_0[4] : b_0[4],
            useFirst_0 ? a_0[5] : b_0[5],
            useFirst_0 ? a_0[6] : b_0[6],
            useFirst_0 ? a_0[7] : b_0[7],
            useFirst_0 ? a_0[8] : b_0[8],
            useFirst_0 ? a_0[9] : b_0[9],
            useFirst_0 ? a_0[10] : b_0[10],
            useFirst_0 ? a_0[11] : b_0[11],
            useFirst_0 ? a_0[12] : b_0[12]];
  }
  _nextRank_0(rank_0) {
    if (rank_0 >= 12n) {
      return 0n;
    } else {
      return ((t1) => {
               if (t1 > 255n) {
                 throw new __compactRuntime.CompactError('proof-or-bluff-mainnet.compact line 337 char 40: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
               }
               return t1;
             })(rank_0 + 1n);
    }
  }
  _handSize_0(mode_0) { return this._equal_43(mode_0, 0n) ? 5n : 7n; }
  _winThreshold_0(mode_0) {
    return this._equal_44(mode_0, 0n) ?
           10n :
           this._equal_45(mode_0, 1n) ? 15n : 20n;
  }
  _clampSubtract_0(a_0, b_0) {
    if (a_0 <= b_0) {
      return 0n;
    } else {
      __compactRuntime.assert(a_0 >= b_0,
                              'result of subtraction would be negative');
      return a_0 - b_0;
    }
  }
  _assertRecentBlockTime_0(context, partialProofData, currentTime_0) {
    __compactRuntime.assert(this._blockTimeGte_0(context,
                                                 partialProofData,
                                                 currentTime_0),
                            'Timestamp is in the future');
    __compactRuntime.assert(this._blockTimeLte_0(context,
                                                 partialProofData,
                                                 ((t1) => {
                                                   if (t1 > 18446744073709551615n) {
                                                     throw new __compactRuntime.CompactError('proof-or-bluff-mainnet.compact line 355 char 32: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                                   }
                                                   return t1;
                                                 })(currentTime_0 + 120n)),
                            'Timestamp is too old');
    return [];
  }
  _assertTimeout_0(context, partialProofData, timeoutSeconds_0, lastActionAt_0)
  {
    let t_0, t_1;
    __compactRuntime.assert((t_1 = timeoutSeconds_0, t_1 >= 3600n)
                            &&
                            (t_0 = timeoutSeconds_0, t_0 <= 604800n),
                            'Timeout must be between one hour and seven days');
    __compactRuntime.assert(this._blockTimeGte_0(context,
                                                 partialProofData,
                                                 ((t1) => {
                                                   if (t1 > 18446744073709551615n) {
                                                     throw new __compactRuntime.CompactError('proof-or-bluff-mainnet.compact line 360 char 32: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                                   }
                                                   return t1;
                                                 })(lastActionAt_0
                                                    +
                                                    timeoutSeconds_0)),
                            'Timeout window still open');
    return [];
  }
  _createMatch_0(context,
                 partialProofData,
                 mode_0,
                 p1EntropyCommit_0,
                 p1SaltCommit_0,
                 currentTime_0)
  {
    this._assertRecentBlockTime_0(context, partialProofData, currentTime_0);
    __compactRuntime.assert(this._equal_46(mode_0, 0n)
                            ||
                            this._equal_47(mode_0, 1n)
                            ||
                            this._equal_48(mode_0, 4n),
                            'Only score-based modes (CASUAL, STANDARD, CASINO) are enabled in this edition');
    const caller_0 = this._ownPublicKey_0(context, partialProofData);
    const matchId_0 = this._persistentHash_6({ separator:
                                                 new Uint8Array([112, 111, 98, 58, 109, 97, 116, 99, 104, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                               playerOne: caller_0,
                                               mode: mode_0,
                                               createdAt: currentTime_0 });
    __compactRuntime.assert(!_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_2.toValue(0n),
                                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'Match already exists');
    const size_0 = this._handSize_0(mode_0);
    const state_0 = { playerOne: caller_0,
                      playerTwo: caller_0,
                      mode: mode_0,
                      winThreshold: this._winThreshold_0(mode_0),
                      createdAt: currentTime_0,
                      p1EntropyCommit: p1EntropyCommit_0,
                      p2EntropyCommit:
                        new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                      p1SaltCommit: p1SaltCommit_0,
                      p2SaltCommit:
                        new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                      seedCommitment:
                        new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                      seedFinalized: false,
                      round: 0n,
                      p1HandCommit:
                        new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                      p2HandCommit:
                        new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                      p1HandDrawn: false,
                      p2HandDrawn: false,
                      phase: 0n,
                      activePlayerIdx: 0n,
                      currentRank: 0n,
                      lastActionAt: currentTime_0,
                      lastClaimRank: 0n,
                      lastClaimCount: 0n,
                      lastPlayCommit:
                        new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                      lastPlayerIdx: 0n,
                      hasPendingPlay: false,
                      challengeCalledAt: 0n,
                      isChallenged: false,
                      pileSize: 0n,
                      p1Score: 0n,
                      p2Score: 0n,
                      p1HandSize: size_0,
                      p2HandSize: size_0,
                      winner: 0n };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(0n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(state_0),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_0 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(1n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_7.toValue(tmp_0),
                                                                alignment: _descriptor_7.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return matchId_0;
  }
  _joinMatch_0(context,
               partialProofData,
               matchId_0,
               p2EntropyCommit_0,
               p2SaltCommit_0)
  {
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(0n),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Match not found');
    const m_0 = _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_2.toValue(0n),
                                                                                                      alignment: _descriptor_2.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(matchId_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(this._equal_49(m_0.phase, 0n), 'Match not open');
    const joiner_0 = this._ownPublicKey_0(context, partialProofData);
    __compactRuntime.assert(!this._equal_50(joiner_0, m_0.playerOne),
                            'Creator cannot join as player two');
    const updated_0 = { playerOne: m_0.playerOne,
                        playerTwo: joiner_0,
                        mode: m_0.mode,
                        winThreshold: m_0.winThreshold,
                        createdAt: m_0.createdAt,
                        p1EntropyCommit: m_0.p1EntropyCommit,
                        p2EntropyCommit: p2EntropyCommit_0,
                        p1SaltCommit: m_0.p1SaltCommit,
                        p2SaltCommit: p2SaltCommit_0,
                        seedCommitment: m_0.seedCommitment,
                        seedFinalized: false,
                        round: 0n,
                        p1HandCommit:
                          new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                        p2HandCommit:
                          new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                        p1HandDrawn: false,
                        p2HandDrawn: false,
                        phase: 1n,
                        activePlayerIdx: 0n,
                        currentRank: m_0.currentRank,
                        lastActionAt: m_0.lastActionAt,
                        lastClaimRank: 0n,
                        lastClaimCount: 0n,
                        lastPlayCommit: m_0.lastPlayCommit,
                        lastPlayerIdx: 0n,
                        hasPendingPlay: false,
                        challengeCalledAt: 0n,
                        isChallenged: false,
                        pileSize: 0n,
                        p1Score: 0n,
                        p2Score: 0n,
                        p1HandSize: m_0.p1HandSize,
                        p2HandSize: m_0.p2HandSize,
                        winner: 0n };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(0n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(updated_0),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _revealSeed_0(context,
                partialProofData,
                matchId_0,
                p1Entropy_0,
                p2Entropy_0,
                startingRank_0,
                currentTime_0)
  {
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(0n),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Match not found');
    const m_0 = _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_2.toValue(0n),
                                                                                                      alignment: _descriptor_2.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(matchId_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(this._equal_51(m_0.phase, 1n),
                            'Match not awaiting seeds');
    this._assertRecentBlockTime_0(context, partialProofData, currentTime_0);
    let t_0;
    __compactRuntime.assert((t_0 = startingRank_0, t_0 <= 12n),
                            'Starting rank out of range');
    __compactRuntime.assert(this._equal_52(this._commitEntropy_0(p1Entropy_0),
                                           m_0.p1EntropyCommit),
                            'P1 entropy mismatch');
    __compactRuntime.assert(this._equal_53(this._commitEntropy_0(p2Entropy_0),
                                           m_0.p2EntropyCommit),
                            'P2 entropy mismatch');
    const combined_0 = this._combineEntropy_0(p1Entropy_0, p2Entropy_0);
    const updated_0 = { playerOne: m_0.playerOne,
                        playerTwo: m_0.playerTwo,
                        mode: m_0.mode,
                        winThreshold: m_0.winThreshold,
                        createdAt: m_0.createdAt,
                        p1EntropyCommit: m_0.p1EntropyCommit,
                        p2EntropyCommit: m_0.p2EntropyCommit,
                        p1SaltCommit: m_0.p1SaltCommit,
                        p2SaltCommit: m_0.p2SaltCommit,
                        seedCommitment: this._commitSeed_0(combined_0),
                        seedFinalized: true,
                        round: 1n,
                        p1HandCommit:
                          new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                        p2HandCommit:
                          new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                        p1HandDrawn: false,
                        p2HandDrawn: false,
                        phase: 2n,
                        activePlayerIdx: 0n,
                        currentRank: startingRank_0,
                        lastActionAt: currentTime_0,
                        lastClaimRank: 0n,
                        lastClaimCount: 0n,
                        lastPlayCommit: m_0.lastPlayCommit,
                        lastPlayerIdx: 0n,
                        hasPendingPlay: false,
                        challengeCalledAt: 0n,
                        isChallenged: false,
                        pileSize: 0n,
                        p1Score: 0n,
                        p2Score: 0n,
                        p1HandSize: m_0.p1HandSize,
                        p2HandSize: m_0.p2HandSize,
                        winner: 0n };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(0n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(updated_0),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _playCards_0(context,
               partialProofData,
               matchId_0,
               playCommit_0,
               claimedRank_0,
               claimedCount_0,
               currentTime_0)
  {
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(0n),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Match not found');
    const m_0 = _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_2.toValue(0n),
                                                                                                      alignment: _descriptor_2.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(matchId_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(this._equal_54(m_0.phase, 2n),
                            'Match not in PLAYING phase');
    this._assertRecentBlockTime_0(context, partialProofData, currentTime_0);
    const caller_0 = this._ownPublicKey_0(context, partialProofData);
    __compactRuntime.assert(this._equal_55(caller_0, m_0.playerOne)
                            ||
                            this._equal_56(caller_0, m_0.playerTwo),
                            'Not a player');
    const callerIdx_0 = this._equal_57(caller_0, m_0.playerOne) ? 0n : 1n;
    const isP1_0 = this._equal_58(callerIdx_0, 0n);
    __compactRuntime.assert(this._equal_59(callerIdx_0, m_0.activePlayerIdx),
                            'Not your turn');
    __compactRuntime.assert(this._equal_60(claimedRank_0, m_0.currentRank),
                            'Wrong claimed rank');
    let t_0, t_1;
    __compactRuntime.assert((t_1 = claimedCount_0, t_1 >= 1n)
                            &&
                            (t_0 = claimedCount_0, t_0 <= 4n),
                            'Must play 1-4 cards');
    const available_0 = isP1_0 ? m_0.p1HandSize : m_0.p2HandSize;
    let t_2;
    __compactRuntime.assert((t_2 = available_0, t_2 >= claimedCount_0),
                            'Not enough cards');
    const play_0 = this._nextPlay_0(context, partialProofData);
    __compactRuntime.assert(this._equal_61(this._persistentHash_7(play_0),
                                           playCommit_0),
                            'Play does not open its commitment');
    __compactRuntime.assert(this._equal_62(play_0.count, claimedCount_0),
                            'Play count does not match claim');
    const salt_0 = this._handSalt_0(context, partialProofData);
    __compactRuntime.assert(this._equal_63(this._commitHandSalt_0(salt_0),
                                           isP1_0 ?
                                           m_0.p1SaltCommit :
                                           m_0.p2SaltCommit),
                            'Hand salt does not match commitment');
    const seed_0 = this._sharedSeed_0(context, partialProofData);
    __compactRuntime.assert(this._equal_64(this._commitSeed_0(seed_0),
                                           m_0.seedCommitment),
                            'Seed does not match commitment');
    const drawn_0 = isP1_0 ? m_0.p1HandDrawn : m_0.p2HandDrawn;
    const dealt_0 = this._handCountsFromRanks_0(this._dealHandRanks_0(salt_0,
                                                                      seed_0,
                                                                      m_0.round,
                                                                      this._handSize_0(m_0.mode)),
                                                this._handSize_0(m_0.mode));
    const claimed_0 = this._currentHandCounts_0(context, partialProofData);
    __compactRuntime.assert(!drawn_0
                            ||
                            this._equal_65(this._commitHandCounts_0(claimed_0,
                                                                    salt_0,
                                                                    m_0.round),
                                           isP1_0 ?
                                           m_0.p1HandCommit :
                                           m_0.p2HandCommit),
                            'Hand does not match commitment');
    const before_0 = this._selectCounts_0(drawn_0, claimed_0, dealt_0);
    __compactRuntime.assert(this._holdsPlayed_0(before_0, play_0),
                            'Played cards are not in your hand');
    const after_0 = this._removePlayed_0(before_0, play_0);
    const newHandCommit_0 = this._commitHandCounts_0(after_0, salt_0, m_0.round);
    const updated_0 = { playerOne: m_0.playerOne,
                        playerTwo: m_0.playerTwo,
                        mode: m_0.mode,
                        winThreshold: m_0.winThreshold,
                        createdAt: m_0.createdAt,
                        p1EntropyCommit: m_0.p1EntropyCommit,
                        p2EntropyCommit: m_0.p2EntropyCommit,
                        p1SaltCommit: m_0.p1SaltCommit,
                        p2SaltCommit: m_0.p2SaltCommit,
                        seedCommitment: m_0.seedCommitment,
                        seedFinalized: true,
                        round: m_0.round,
                        p1HandCommit:
                          isP1_0 ? newHandCommit_0 : m_0.p1HandCommit,
                        p2HandCommit:
                          isP1_0 ? m_0.p2HandCommit : newHandCommit_0,
                        p1HandDrawn: isP1_0 || m_0.p1HandDrawn,
                        p2HandDrawn: isP1_0 ? m_0.p2HandDrawn : true,
                        phase: 3n,
                        activePlayerIdx: isP1_0 ? 1n : 0n,
                        currentRank: m_0.currentRank,
                        lastActionAt: currentTime_0,
                        lastClaimRank: claimedRank_0,
                        lastClaimCount: claimedCount_0,
                        lastPlayCommit: playCommit_0,
                        lastPlayerIdx: callerIdx_0,
                        hasPendingPlay: true,
                        challengeCalledAt: 0n,
                        isChallenged: false,
                        pileSize: m_0.pileSize,
                        p1Score: m_0.p1Score,
                        p2Score: m_0.p2Score,
                        p1HandSize:
                          isP1_0 ?
                          this._clampSubtract_0(m_0.p1HandSize, claimedCount_0)
                          :
                          m_0.p1HandSize,
                        p2HandSize:
                          isP1_0 ?
                          m_0.p2HandSize :
                          this._clampSubtract_0(m_0.p2HandSize, claimedCount_0),
                        winner: m_0.winner };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(0n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(updated_0),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _acceptClaim_0(context, partialProofData, matchId_0, currentTime_0) {
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(0n),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Match not found');
    const m_0 = _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_2.toValue(0n),
                                                                                                      alignment: _descriptor_2.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(matchId_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(this._equal_66(m_0.phase, 3n) && m_0.hasPendingPlay
                            &&
                            !m_0.isChallenged,
                            'No pending claim to accept');
    this._assertRecentBlockTime_0(context, partialProofData, currentTime_0);
    const caller_0 = this._ownPublicKey_0(context, partialProofData);
    __compactRuntime.assert(this._equal_67(caller_0, m_0.playerOne)
                            ||
                            this._equal_68(caller_0, m_0.playerTwo),
                            'Not a player');
    const callerIdx_0 = this._equal_69(caller_0, m_0.playerOne) ? 0n : 1n;
    __compactRuntime.assert(!this._equal_70(callerIdx_0, m_0.lastPlayerIdx),
                            'Only opponent may accept');
    const roundOver_0 = this._equal_71(m_0.p1HandSize, 0n)
                        ||
                        this._equal_72(m_0.p2HandSize, 0n);
    const size_0 = this._handSize_0(m_0.mode);
    const updated_0 = { playerOne: m_0.playerOne,
                        playerTwo: m_0.playerTwo,
                        mode: m_0.mode,
                        winThreshold: m_0.winThreshold,
                        createdAt: m_0.createdAt,
                        p1EntropyCommit: m_0.p1EntropyCommit,
                        p2EntropyCommit: m_0.p2EntropyCommit,
                        p1SaltCommit: m_0.p1SaltCommit,
                        p2SaltCommit: m_0.p2SaltCommit,
                        seedCommitment: m_0.seedCommitment,
                        seedFinalized: true,
                        round:
                          roundOver_0 ?
                          ((t1) => {
                            if (t1 > 4294967295n) {
                              throw new __compactRuntime.CompactError('proof-or-bluff-mainnet.compact line 540 char 24: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                            }
                            return t1;
                          })(m_0.round + 1n)
                          :
                          m_0.round,
                        p1HandCommit:
                          roundOver_0 ?
                          new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
                          :
                          m_0.p1HandCommit,
                        p2HandCommit:
                          roundOver_0 ?
                          new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
                          :
                          m_0.p2HandCommit,
                        p1HandDrawn: roundOver_0 ? false : m_0.p1HandDrawn,
                        p2HandDrawn: roundOver_0 ? false : m_0.p2HandDrawn,
                        phase: 2n,
                        activePlayerIdx: callerIdx_0,
                        currentRank: this._nextRank_0(m_0.currentRank),
                        lastActionAt: currentTime_0,
                        lastClaimRank: 0n,
                        lastClaimCount: 0n,
                        lastPlayCommit:
                          new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                        lastPlayerIdx: 0n,
                        hasPendingPlay: false,
                        challengeCalledAt: 0n,
                        isChallenged: false,
                        pileSize:
                          roundOver_0 ?
                          0n :
                          ((t1) => {
                            if (t1 > 4294967295n) {
                              throw new __compactRuntime.CompactError('proof-or-bluff-mainnet.compact line 549 char 31: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                            }
                            return t1;
                          })(m_0.pileSize + m_0.lastClaimCount),
                        p1Score: m_0.p1Score,
                        p2Score: m_0.p2Score,
                        p1HandSize: roundOver_0 ? size_0 : m_0.p1HandSize,
                        p2HandSize: roundOver_0 ? size_0 : m_0.p2HandSize,
                        winner: m_0.winner };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(0n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(updated_0),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _challengeClaim_0(context, partialProofData, matchId_0, currentTime_0) {
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(0n),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Match not found');
    const m_0 = _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_2.toValue(0n),
                                                                                                      alignment: _descriptor_2.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(matchId_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(this._equal_73(m_0.phase, 3n) && m_0.hasPendingPlay
                            &&
                            !m_0.isChallenged,
                            'No pending claim to challenge');
    this._assertRecentBlockTime_0(context, partialProofData, currentTime_0);
    const caller_0 = this._ownPublicKey_0(context, partialProofData);
    __compactRuntime.assert(this._equal_74(caller_0, m_0.playerOne)
                            ||
                            this._equal_75(caller_0, m_0.playerTwo),
                            'Not a player');
    const callerIdx_0 = this._equal_76(caller_0, m_0.playerOne) ? 0n : 1n;
    __compactRuntime.assert(!this._equal_77(callerIdx_0, m_0.lastPlayerIdx),
                            'Only opponent may challenge');
    const updated_0 = { playerOne: m_0.playerOne,
                        playerTwo: m_0.playerTwo,
                        mode: m_0.mode,
                        winThreshold: m_0.winThreshold,
                        createdAt: m_0.createdAt,
                        p1EntropyCommit: m_0.p1EntropyCommit,
                        p2EntropyCommit: m_0.p2EntropyCommit,
                        p1SaltCommit: m_0.p1SaltCommit,
                        p2SaltCommit: m_0.p2SaltCommit,
                        seedCommitment: m_0.seedCommitment,
                        seedFinalized: true,
                        round: m_0.round,
                        p1HandCommit: m_0.p1HandCommit,
                        p2HandCommit: m_0.p2HandCommit,
                        p1HandDrawn: m_0.p1HandDrawn,
                        p2HandDrawn: m_0.p2HandDrawn,
                        phase: m_0.phase,
                        activePlayerIdx: m_0.activePlayerIdx,
                        currentRank: m_0.currentRank,
                        lastActionAt: currentTime_0,
                        lastClaimRank: m_0.lastClaimRank,
                        lastClaimCount: m_0.lastClaimCount,
                        lastPlayCommit: m_0.lastPlayCommit,
                        lastPlayerIdx: m_0.lastPlayerIdx,
                        hasPendingPlay: true,
                        challengeCalledAt: currentTime_0,
                        isChallenged: true,
                        pileSize: m_0.pileSize,
                        p1Score: m_0.p1Score,
                        p2Score: m_0.p2Score,
                        p1HandSize: m_0.p1HandSize,
                        p2HandSize: m_0.p2HandSize,
                        winner: m_0.winner };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(0n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(updated_0),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_0 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(3n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_7.toValue(tmp_0),
                                                                alignment: _descriptor_7.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _resolveChallenge_0(context, partialProofData, matchId_0, currentTime_0) {
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(0n),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Match not found');
    const m_0 = _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_2.toValue(0n),
                                                                                                      alignment: _descriptor_2.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(matchId_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(this._equal_78(m_0.phase, 3n) && m_0.hasPendingPlay
                            &&
                            m_0.isChallenged,
                            'No active challenge');
    this._assertRecentBlockTime_0(context, partialProofData, currentTime_0);
    const caller_0 = this._ownPublicKey_0(context, partialProofData);
    __compactRuntime.assert(this._equal_79(caller_0, m_0.playerOne)
                            ||
                            this._equal_80(caller_0, m_0.playerTwo),
                            'Not a player');
    const callerIdx_0 = this._equal_81(caller_0, m_0.playerOne) ? 0n : 1n;
    __compactRuntime.assert(this._equal_82(callerIdx_0, m_0.lastPlayerIdx),
                            'Only challenged player can resolve');
    const reveal_0 = this._revealLastPlay_0(context, partialProofData);
    __compactRuntime.assert(this._equal_83(reveal_0.count, m_0.lastClaimCount),
                            'Reveal count mismatch');
    __compactRuntime.assert(this._equal_84(this._persistentHash_7(reveal_0),
                                           m_0.lastPlayCommit),
                            'Reveal does not match commitment');
    const claimWasTrue_0 = this._equal_85(this._matchingRanks_0(reveal_0,
                                                                m_0.lastClaimRank),
                                          m_0.lastClaimCount);
    const challengerIdx_0 = this._equal_86(m_0.lastPlayerIdx, 0n) ? 1n : 0n;
    const nextP1Score_0 = !claimWasTrue_0 && this._equal_87(challengerIdx_0, 0n)
                          ?
                          ((t1) => {
                            if (t1 > 4294967295n) {
                              throw new __compactRuntime.CompactError('proof-or-bluff-mainnet.compact line 604 char 7: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                            }
                            return t1;
                          })(m_0.p1Score + 3n)
                          :
                          claimWasTrue_0 && this._equal_88(challengerIdx_0, 0n)
                          ?
                          this._clampSubtract_0(m_0.p1Score, 1n) :
                          m_0.p1Score;
    const nextP2Score_0 = !claimWasTrue_0 && this._equal_89(challengerIdx_0, 1n)
                          ?
                          ((t1) => {
                            if (t1 > 4294967295n) {
                              throw new __compactRuntime.CompactError('proof-or-bluff-mainnet.compact line 607 char 7: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                            }
                            return t1;
                          })(m_0.p2Score + 3n)
                          :
                          claimWasTrue_0 && this._equal_90(challengerIdx_0, 1n)
                          ?
                          this._clampSubtract_0(m_0.p2Score, 1n) :
                          m_0.p2Score;
    const p1Wins_0 = nextP1Score_0 >= m_0.winThreshold;
    const p2Wins_0 = nextP2Score_0 >= m_0.winThreshold;
    const winner_0 = p1Wins_0 ? 1n : p2Wins_0 ? 2n : 0n;
    const roundOver_0 = this._equal_91(m_0.p1HandSize, 0n)
                        ||
                        this._equal_92(m_0.p2HandSize, 0n);
    const size_0 = this._handSize_0(m_0.mode);
    const updated_0 = { playerOne: m_0.playerOne,
                        playerTwo: m_0.playerTwo,
                        mode: m_0.mode,
                        winThreshold: m_0.winThreshold,
                        createdAt: m_0.createdAt,
                        p1EntropyCommit: m_0.p1EntropyCommit,
                        p2EntropyCommit: m_0.p2EntropyCommit,
                        p1SaltCommit: m_0.p1SaltCommit,
                        p2SaltCommit: m_0.p2SaltCommit,
                        seedCommitment: m_0.seedCommitment,
                        seedFinalized: true,
                        round:
                          roundOver_0 ?
                          ((t1) => {
                            if (t1 > 4294967295n) {
                              throw new __compactRuntime.CompactError('proof-or-bluff-mainnet.compact line 620 char 24: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                            }
                            return t1;
                          })(m_0.round + 1n)
                          :
                          m_0.round,
                        p1HandCommit:
                          roundOver_0 ?
                          new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
                          :
                          m_0.p1HandCommit,
                        p2HandCommit:
                          roundOver_0 ?
                          new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
                          :
                          m_0.p2HandCommit,
                        p1HandDrawn: roundOver_0 ? false : m_0.p1HandDrawn,
                        p2HandDrawn: roundOver_0 ? false : m_0.p2HandDrawn,
                        phase: this._equal_93(winner_0, 0n) ? 2n : 4n,
                        activePlayerIdx: challengerIdx_0,
                        currentRank: this._nextRank_0(m_0.currentRank),
                        lastActionAt: currentTime_0,
                        lastClaimRank: 0n,
                        lastClaimCount: 0n,
                        lastPlayCommit:
                          new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                        lastPlayerIdx: 0n,
                        hasPendingPlay: false,
                        challengeCalledAt: 0n,
                        isChallenged: false,
                        pileSize: 0n,
                        p1Score: nextP1Score_0,
                        p2Score: nextP2Score_0,
                        p1HandSize: roundOver_0 ? size_0 : m_0.p1HandSize,
                        p2HandSize: roundOver_0 ? size_0 : m_0.p2HandSize,
                        winner: winner_0 };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(0n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(updated_0),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    if (!this._equal_94(winner_0, 0n)) {
      const tmp_0 = 1n;
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_2.toValue(2n),
                                                                    alignment: _descriptor_2.alignment() } }] } },
                                         { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                                { value: _descriptor_7.toValue(tmp_0),
                                                                  alignment: _descriptor_7.alignment() }
                                                                  .value
                                                              )) } },
                                         { ins: { cached: true, n: 1 } }]);
    }
    return claimWasTrue_0;
  }
  _cancelUnjoinedMatch_0(context, partialProofData, matchId_0) {
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(0n),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Match not found');
    const m_0 = _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_2.toValue(0n),
                                                                                                      alignment: _descriptor_2.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(matchId_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(this._equal_95(m_0.phase, 0n),
                            'Match already joined');
    __compactRuntime.assert(this._equal_96(this._ownPublicKey_0(context,
                                                                partialProofData),
                                           m_0.playerOne),
                            'Only creator can cancel');
    const updated_0 = { playerOne: m_0.playerOne,
                        playerTwo: m_0.playerTwo,
                        mode: m_0.mode,
                        winThreshold: m_0.winThreshold,
                        createdAt: m_0.createdAt,
                        p1EntropyCommit: m_0.p1EntropyCommit,
                        p2EntropyCommit: m_0.p2EntropyCommit,
                        p1SaltCommit: m_0.p1SaltCommit,
                        p2SaltCommit: m_0.p2SaltCommit,
                        seedCommitment: m_0.seedCommitment,
                        seedFinalized: false,
                        round: 0n,
                        p1HandCommit:
                          new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                        p2HandCommit:
                          new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                        p1HandDrawn: false,
                        p2HandDrawn: false,
                        phase: 4n,
                        activePlayerIdx: 0n,
                        currentRank: 0n,
                        lastActionAt: m_0.lastActionAt,
                        lastClaimRank: 0n,
                        lastClaimCount: 0n,
                        lastPlayCommit:
                          new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                        lastPlayerIdx: 0n,
                        hasPendingPlay: false,
                        challengeCalledAt: 0n,
                        isChallenged: false,
                        pileSize: 0n,
                        p1Score: 0n,
                        p2Score: 0n,
                        p1HandSize: m_0.p1HandSize,
                        p2HandSize: m_0.p2HandSize,
                        winner: 0n };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(0n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(updated_0),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _forfeitAbandonedMatch_0(context,
                           partialProofData,
                           matchId_0,
                           currentTime_0,
                           timeoutSeconds_0)
  {
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(0n),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Match not found');
    const m_0 = _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_2.toValue(0n),
                                                                                                      alignment: _descriptor_2.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(matchId_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(this._equal_97(m_0.phase, 2n) && !m_0.hasPendingPlay,
                            'Not an idle turn');
    this._assertRecentBlockTime_0(context, partialProofData, currentTime_0);
    this._assertTimeout_0(context,
                          partialProofData,
                          timeoutSeconds_0,
                          m_0.lastActionAt);
    const updated_0 = { playerOne: m_0.playerOne,
                        playerTwo: m_0.playerTwo,
                        mode: m_0.mode,
                        winThreshold: m_0.winThreshold,
                        createdAt: m_0.createdAt,
                        p1EntropyCommit: m_0.p1EntropyCommit,
                        p2EntropyCommit: m_0.p2EntropyCommit,
                        p1SaltCommit: m_0.p1SaltCommit,
                        p2SaltCommit: m_0.p2SaltCommit,
                        seedCommitment: m_0.seedCommitment,
                        seedFinalized: true,
                        round: m_0.round,
                        p1HandCommit: m_0.p1HandCommit,
                        p2HandCommit: m_0.p2HandCommit,
                        p1HandDrawn: m_0.p1HandDrawn,
                        p2HandDrawn: m_0.p2HandDrawn,
                        phase: 4n,
                        activePlayerIdx: m_0.activePlayerIdx,
                        currentRank: m_0.currentRank,
                        lastActionAt: currentTime_0,
                        lastClaimRank: 0n,
                        lastClaimCount: 0n,
                        lastPlayCommit:
                          new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                        lastPlayerIdx: 0n,
                        hasPendingPlay: false,
                        challengeCalledAt: 0n,
                        isChallenged: false,
                        pileSize: m_0.pileSize,
                        p1Score: m_0.p1Score,
                        p2Score: m_0.p2Score,
                        p1HandSize: m_0.p1HandSize,
                        p2HandSize: m_0.p2HandSize,
                        winner:
                          this._equal_98(m_0.activePlayerIdx, 0n) ? 2n : 1n };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(0n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(updated_0),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_0 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(2n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_7.toValue(tmp_0),
                                                                alignment: _descriptor_7.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _forfeitStalledChallenge_0(context,
                             partialProofData,
                             matchId_0,
                             currentTime_0,
                             timeoutSeconds_0)
  {
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(0n),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Match not found');
    const m_0 = _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_2.toValue(0n),
                                                                                                      alignment: _descriptor_2.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(matchId_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(this._equal_99(m_0.phase, 3n) && m_0.hasPendingPlay
                            &&
                            m_0.isChallenged,
                            'No stalled challenge');
    this._assertRecentBlockTime_0(context, partialProofData, currentTime_0);
    this._assertTimeout_0(context,
                          partialProofData,
                          timeoutSeconds_0,
                          m_0.challengeCalledAt);
    const challengerIdx_0 = this._equal_100(m_0.lastPlayerIdx, 0n) ? 1n : 0n;
    const nextP1Score_0 = this._equal_101(challengerIdx_0, 0n) ?
                          ((t1) => {
                            if (t1 > 4294967295n) {
                              throw new __compactRuntime.CompactError('proof-or-bluff-mainnet.compact line 701 char 57: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                            }
                            return t1;
                          })(m_0.p1Score + 3n)
                          :
                          m_0.p1Score;
    const nextP2Score_0 = this._equal_102(challengerIdx_0, 1n) ?
                          ((t1) => {
                            if (t1 > 4294967295n) {
                              throw new __compactRuntime.CompactError('proof-or-bluff-mainnet.compact line 702 char 57: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                            }
                            return t1;
                          })(m_0.p2Score + 3n)
                          :
                          m_0.p2Score;
    const winner_0 = nextP1Score_0 >= m_0.winThreshold ?
                     1n :
                     nextP2Score_0 >= m_0.winThreshold ? 2n : 0n;
    const roundOver_0 = this._equal_103(m_0.p1HandSize, 0n)
                        ||
                        this._equal_104(m_0.p2HandSize, 0n);
    const size_0 = this._handSize_0(m_0.mode);
    const updated_0 = { playerOne: m_0.playerOne,
                        playerTwo: m_0.playerTwo,
                        mode: m_0.mode,
                        winThreshold: m_0.winThreshold,
                        createdAt: m_0.createdAt,
                        p1EntropyCommit: m_0.p1EntropyCommit,
                        p2EntropyCommit: m_0.p2EntropyCommit,
                        p1SaltCommit: m_0.p1SaltCommit,
                        p2SaltCommit: m_0.p2SaltCommit,
                        seedCommitment: m_0.seedCommitment,
                        seedFinalized: true,
                        round:
                          roundOver_0 ?
                          ((t1) => {
                            if (t1 > 4294967295n) {
                              throw new __compactRuntime.CompactError('proof-or-bluff-mainnet.compact line 713 char 24: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                            }
                            return t1;
                          })(m_0.round + 1n)
                          :
                          m_0.round,
                        p1HandCommit:
                          roundOver_0 ?
                          new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
                          :
                          m_0.p1HandCommit,
                        p2HandCommit:
                          roundOver_0 ?
                          new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
                          :
                          m_0.p2HandCommit,
                        p1HandDrawn: roundOver_0 ? false : m_0.p1HandDrawn,
                        p2HandDrawn: roundOver_0 ? false : m_0.p2HandDrawn,
                        phase: this._equal_105(winner_0, 0n) ? 2n : 4n,
                        activePlayerIdx: challengerIdx_0,
                        currentRank: this._nextRank_0(m_0.currentRank),
                        lastActionAt: currentTime_0,
                        lastClaimRank: 0n,
                        lastClaimCount: 0n,
                        lastPlayCommit:
                          new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                        lastPlayerIdx: 0n,
                        hasPendingPlay: false,
                        challengeCalledAt: 0n,
                        isChallenged: false,
                        pileSize: 0n,
                        p1Score: nextP1Score_0,
                        p2Score: nextP2Score_0,
                        p1HandSize: roundOver_0 ? size_0 : m_0.p1HandSize,
                        p2HandSize: roundOver_0 ? size_0 : m_0.p2HandSize,
                        winner: winner_0 };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(0n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(updated_0),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    if (!this._equal_106(winner_0, 0n)) {
      const tmp_0 = 1n;
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_2.toValue(2n),
                                                                    alignment: _descriptor_2.alignment() } }] } },
                                         { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                                { value: _descriptor_7.toValue(tmp_0),
                                                                  alignment: _descriptor_7.alignment() }
                                                                  .value
                                                              )) } },
                                         { ins: { cached: true, n: 1 } }]);
    }
    return [];
  }
  _getMatch_0(context, partialProofData, matchId_0) {
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(0n),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Match not found');
    return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 0 } },
                                                                      { idx: { cached: false,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_2.toValue(0n),
                                                                                                 alignment: _descriptor_2.alignment() } }] } },
                                                                      { idx: { cached: false,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_0.toValue(matchId_0),
                                                                                                 alignment: _descriptor_0.alignment() } }] } },
                                                                      { popeq: { cached: false,
                                                                                 result: undefined } }]).value);
  }
  _getMatchPhase_0(context, partialProofData, matchId_0) {
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(0n),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Match not found');
    return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 0 } },
                                                                      { idx: { cached: false,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_2.toValue(0n),
                                                                                                 alignment: _descriptor_2.alignment() } }] } },
                                                                      { idx: { cached: false,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_0.toValue(matchId_0),
                                                                                                 alignment: _descriptor_0.alignment() } }] } },
                                                                      { popeq: { cached: false,
                                                                                 result: undefined } }]).value).phase;
  }
  _getWinner_0(context, partialProofData, matchId_0) {
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(0n),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(matchId_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Match not found');
    return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 0 } },
                                                                      { idx: { cached: false,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_2.toValue(0n),
                                                                                                 alignment: _descriptor_2.alignment() } }] } },
                                                                      { idx: { cached: false,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_0.toValue(matchId_0),
                                                                                                 alignment: _descriptor_0.alignment() } }] } },
                                                                      { popeq: { cached: false,
                                                                                 result: undefined } }]).value).winner;
  }
  _equal_0(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_2(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_3(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_4(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_5(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_6(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_7(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_8(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_9(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_10(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_11(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_12(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_13(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_14(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_15(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_16(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_17(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_18(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_19(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_20(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_21(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_22(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_23(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_24(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_25(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_26(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_27(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_28(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_29(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_30(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_31(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_32(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_33(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_34(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_35(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_36(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_37(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_38(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_39(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_40(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_41(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_42(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_43(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_44(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_45(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_46(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_47(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_48(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_49(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_50(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_51(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_52(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_53(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_54(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_55(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_56(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_57(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_58(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_59(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_60(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_61(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_62(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_63(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_64(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_65(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_66(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_67(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_68(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_69(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_70(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_71(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_72(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_73(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_74(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_75(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_76(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_77(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_78(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_79(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_80(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_81(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_82(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_83(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_84(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_85(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_86(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_87(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_88(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_89(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_90(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_91(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_92(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_93(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_94(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_95(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_96(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_97(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_98(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_99(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_100(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_101(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_102(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_103(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_104(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_105(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_106(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    matches: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(0n),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                                                                 alignment: _descriptor_3.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(0n),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'proof-or-bluff-mainnet.compact line 148 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(0n),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'proof-or-bluff-mainnet.compact line 148 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(0n),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[0];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_6.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    get totalMatchesCreated() {
      return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_2.toValue(1n),
                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    },
    get totalMatchesCompleted() {
      return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_2.toValue(2n),
                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    },
    get totalChallengesIssued() {
      return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_2.toValue(3n),
                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({
  handSalt: (...args) => undefined,
  sharedSeed: (...args) => undefined,
  currentHandCounts: (...args) => undefined,
  nextPlay: (...args) => undefined,
  revealLastPlay: (...args) => undefined
});
export const pureCircuits = {
  commitEntropy: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`commitEntropy: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const entropy_0 = args_0[0];
    if (!(entropy_0.buffer instanceof ArrayBuffer && entropy_0.BYTES_PER_ELEMENT === 1 && entropy_0.length === 32)) {
      __compactRuntime.typeError('commitEntropy',
                                 'argument 1',
                                 'proof-or-bluff-mainnet.compact line 155 char 1',
                                 'Bytes<32>',
                                 entropy_0)
    }
    return _dummyContract._commitEntropy_0(entropy_0);
  },
  commitPlay: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`commitPlay: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const reveal_0 = args_0[0];
    if (!(typeof(reveal_0) === 'object' && typeof(reveal_0.count) === 'bigint' && reveal_0.count >= 0n && reveal_0.count <= 255n && typeof(reveal_0.rank0) === 'bigint' && reveal_0.rank0 >= 0n && reveal_0.rank0 <= 255n && reveal_0.salt0.buffer instanceof ArrayBuffer && reveal_0.salt0.BYTES_PER_ELEMENT === 1 && reveal_0.salt0.length === 32 && typeof(reveal_0.rank1) === 'bigint' && reveal_0.rank1 >= 0n && reveal_0.rank1 <= 255n && reveal_0.salt1.buffer instanceof ArrayBuffer && reveal_0.salt1.BYTES_PER_ELEMENT === 1 && reveal_0.salt1.length === 32 && typeof(reveal_0.rank2) === 'bigint' && reveal_0.rank2 >= 0n && reveal_0.rank2 <= 255n && reveal_0.salt2.buffer instanceof ArrayBuffer && reveal_0.salt2.BYTES_PER_ELEMENT === 1 && reveal_0.salt2.length === 32 && typeof(reveal_0.rank3) === 'bigint' && reveal_0.rank3 >= 0n && reveal_0.rank3 <= 255n && reveal_0.salt3.buffer instanceof ArrayBuffer && reveal_0.salt3.BYTES_PER_ELEMENT === 1 && reveal_0.salt3.length === 32)) {
      __compactRuntime.typeError('commitPlay',
                                 'argument 1',
                                 'proof-or-bluff-mainnet.compact line 160 char 1',
                                 'struct PlayRevealWitness<count: Uint<0..256>, rank0: Uint<0..256>, salt0: Bytes<32>, rank1: Uint<0..256>, salt1: Bytes<32>, rank2: Uint<0..256>, salt2: Bytes<32>, rank3: Uint<0..256>, salt3: Bytes<32>>',
                                 reveal_0)
    }
    return _dummyContract._commitPlay_0(reveal_0);
  },
  combineEntropy: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`combineEntropy: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const p1Entropy_0 = args_0[0];
    const p2Entropy_0 = args_0[1];
    if (!(p1Entropy_0.buffer instanceof ArrayBuffer && p1Entropy_0.BYTES_PER_ELEMENT === 1 && p1Entropy_0.length === 32)) {
      __compactRuntime.typeError('combineEntropy',
                                 'argument 1',
                                 'proof-or-bluff-mainnet.compact line 163 char 1',
                                 'Bytes<32>',
                                 p1Entropy_0)
    }
    if (!(p2Entropy_0.buffer instanceof ArrayBuffer && p2Entropy_0.BYTES_PER_ELEMENT === 1 && p2Entropy_0.length === 32)) {
      __compactRuntime.typeError('combineEntropy',
                                 'argument 2',
                                 'proof-or-bluff-mainnet.compact line 163 char 1',
                                 'Bytes<32>',
                                 p2Entropy_0)
    }
    return _dummyContract._combineEntropy_0(p1Entropy_0, p2Entropy_0);
  },
  commitSeed: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`commitSeed: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const seed_0 = args_0[0];
    if (!(seed_0.buffer instanceof ArrayBuffer && seed_0.BYTES_PER_ELEMENT === 1 && seed_0.length === 32)) {
      __compactRuntime.typeError('commitSeed',
                                 'argument 1',
                                 'proof-or-bluff-mainnet.compact line 169 char 1',
                                 'Bytes<32>',
                                 seed_0)
    }
    return _dummyContract._commitSeed_0(seed_0);
  },
  commitHandSalt: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`commitHandSalt: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const salt_0 = args_0[0];
    if (!(salt_0.buffer instanceof ArrayBuffer && salt_0.BYTES_PER_ELEMENT === 1 && salt_0.length === 32)) {
      __compactRuntime.typeError('commitHandSalt',
                                 'argument 1',
                                 'proof-or-bluff-mainnet.compact line 174 char 1',
                                 'Bytes<32>',
                                 salt_0)
    }
    return _dummyContract._commitHandSalt_0(salt_0);
  },
  commitHandCounts: (...args_0) => {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`commitHandCounts: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const counts_0 = args_0[0];
    const salt_0 = args_0[1];
    const round_0 = args_0[2];
    if (!(Array.isArray(counts_0) && counts_0.length === 13 && counts_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 255n))) {
      __compactRuntime.typeError('commitHandCounts',
                                 'argument 1',
                                 'proof-or-bluff-mainnet.compact line 179 char 1',
                                 'Vector<13, Uint<0..256>>',
                                 counts_0)
    }
    if (!(salt_0.buffer instanceof ArrayBuffer && salt_0.BYTES_PER_ELEMENT === 1 && salt_0.length === 32)) {
      __compactRuntime.typeError('commitHandCounts',
                                 'argument 2',
                                 'proof-or-bluff-mainnet.compact line 179 char 1',
                                 'Bytes<32>',
                                 salt_0)
    }
    if (!(typeof(round_0) === 'bigint' && round_0 >= 0n && round_0 <= 4294967295n)) {
      __compactRuntime.typeError('commitHandCounts',
                                 'argument 3',
                                 'proof-or-bluff-mainnet.compact line 179 char 1',
                                 'Uint<0..4294967296>',
                                 round_0)
    }
    return _dummyContract._commitHandCounts_0(counts_0, salt_0, round_0);
  },
  dealHandRanks: (...args_0) => {
    if (args_0.length !== 4) {
      throw new __compactRuntime.CompactError(`dealHandRanks: expected 4 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const salt_0 = args_0[0];
    const seed_0 = args_0[1];
    const round_0 = args_0[2];
    const size_0 = args_0[3];
    if (!(salt_0.buffer instanceof ArrayBuffer && salt_0.BYTES_PER_ELEMENT === 1 && salt_0.length === 32)) {
      __compactRuntime.typeError('dealHandRanks',
                                 'argument 1',
                                 'proof-or-bluff-mainnet.compact line 269 char 1',
                                 'Bytes<32>',
                                 salt_0)
    }
    if (!(seed_0.buffer instanceof ArrayBuffer && seed_0.BYTES_PER_ELEMENT === 1 && seed_0.length === 32)) {
      __compactRuntime.typeError('dealHandRanks',
                                 'argument 2',
                                 'proof-or-bluff-mainnet.compact line 269 char 1',
                                 'Bytes<32>',
                                 seed_0)
    }
    if (!(typeof(round_0) === 'bigint' && round_0 >= 0n && round_0 <= 4294967295n)) {
      __compactRuntime.typeError('dealHandRanks',
                                 'argument 3',
                                 'proof-or-bluff-mainnet.compact line 269 char 1',
                                 'Uint<0..4294967296>',
                                 round_0)
    }
    if (!(typeof(size_0) === 'bigint' && size_0 >= 0n && size_0 <= 4294967295n)) {
      __compactRuntime.typeError('dealHandRanks',
                                 'argument 4',
                                 'proof-or-bluff-mainnet.compact line 269 char 1',
                                 'Uint<0..4294967296>',
                                 size_0)
    }
    return _dummyContract._dealHandRanks_0(salt_0, seed_0, round_0, size_0);
  },
  handCountsFromRanks: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`handCountsFromRanks: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const ranks_0 = args_0[0];
    const size_0 = args_0[1];
    if (!(Array.isArray(ranks_0) && ranks_0.length === 7 && ranks_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 255n))) {
      __compactRuntime.typeError('handCountsFromRanks',
                                 'argument 1',
                                 'proof-or-bluff-mainnet.compact line 289 char 1',
                                 'Vector<7, Uint<0..256>>',
                                 ranks_0)
    }
    if (!(typeof(size_0) === 'bigint' && size_0 >= 0n && size_0 <= 4294967295n)) {
      __compactRuntime.typeError('handCountsFromRanks',
                                 'argument 2',
                                 'proof-or-bluff-mainnet.compact line 289 char 1',
                                 'Uint<0..4294967296>',
                                 size_0)
    }
    return _dummyContract._handCountsFromRanks_0(ranks_0, size_0);
  },
  removePlayed: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`removePlayed: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const counts_0 = args_0[0];
    const play_0 = args_0[1];
    if (!(Array.isArray(counts_0) && counts_0.length === 13 && counts_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 255n))) {
      __compactRuntime.typeError('removePlayed',
                                 'argument 1',
                                 'proof-or-bluff-mainnet.compact line 315 char 1',
                                 'Vector<13, Uint<0..256>>',
                                 counts_0)
    }
    if (!(typeof(play_0) === 'object' && typeof(play_0.count) === 'bigint' && play_0.count >= 0n && play_0.count <= 255n && typeof(play_0.rank0) === 'bigint' && play_0.rank0 >= 0n && play_0.rank0 <= 255n && play_0.salt0.buffer instanceof ArrayBuffer && play_0.salt0.BYTES_PER_ELEMENT === 1 && play_0.salt0.length === 32 && typeof(play_0.rank1) === 'bigint' && play_0.rank1 >= 0n && play_0.rank1 <= 255n && play_0.salt1.buffer instanceof ArrayBuffer && play_0.salt1.BYTES_PER_ELEMENT === 1 && play_0.salt1.length === 32 && typeof(play_0.rank2) === 'bigint' && play_0.rank2 >= 0n && play_0.rank2 <= 255n && play_0.salt2.buffer instanceof ArrayBuffer && play_0.salt2.BYTES_PER_ELEMENT === 1 && play_0.salt2.length === 32 && typeof(play_0.rank3) === 'bigint' && play_0.rank3 >= 0n && play_0.rank3 <= 255n && play_0.salt3.buffer instanceof ArrayBuffer && play_0.salt3.BYTES_PER_ELEMENT === 1 && play_0.salt3.length === 32)) {
      __compactRuntime.typeError('removePlayed',
                                 'argument 2',
                                 'proof-or-bluff-mainnet.compact line 315 char 1',
                                 'struct PlayRevealWitness<count: Uint<0..256>, rank0: Uint<0..256>, salt0: Bytes<32>, rank1: Uint<0..256>, salt1: Bytes<32>, rank2: Uint<0..256>, salt2: Bytes<32>, rank3: Uint<0..256>, salt3: Bytes<32>>',
                                 play_0)
    }
    return _dummyContract._removePlayed_0(counts_0, play_0);
  }
};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
