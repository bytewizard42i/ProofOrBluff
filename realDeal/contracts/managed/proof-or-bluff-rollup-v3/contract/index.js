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

const _descriptor_0 = __compactRuntime.CompactTypeBoolean;

const _descriptor_1 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_2 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_3 = new __compactRuntime.CompactTypeVector(13, _descriptor_2);

const _descriptor_4 = new __compactRuntime.CompactTypeVector(4, _descriptor_2);

const _descriptor_5 = __compactRuntime.CompactTypeField;

class _GameState_0 {
  alignment() {
    return _descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_4.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment().concat(_descriptor_5.alignment())))))))))))));
  }
  fromValue(value_0) {
    return {
      hand0: _descriptor_3.fromValue(value_0),
      hand1: _descriptor_3.fromValue(value_0),
      turn: _descriptor_2.fromValue(value_0),
      currentRank: _descriptor_2.fromValue(value_0),
      pending: _descriptor_0.fromValue(value_0),
      claimRank: _descriptor_2.fromValue(value_0),
      claimCount: _descriptor_2.fromValue(value_0),
      claimCards: _descriptor_4.fromValue(value_0),
      claimer: _descriptor_2.fromValue(value_0),
      score0: _descriptor_2.fromValue(value_0),
      score1: _descriptor_2.fromValue(value_0),
      round: _descriptor_2.fromValue(value_0),
      ended: _descriptor_0.fromValue(value_0),
      chain: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0.hand0).concat(_descriptor_3.toValue(value_0.hand1).concat(_descriptor_2.toValue(value_0.turn).concat(_descriptor_2.toValue(value_0.currentRank).concat(_descriptor_0.toValue(value_0.pending).concat(_descriptor_2.toValue(value_0.claimRank).concat(_descriptor_2.toValue(value_0.claimCount).concat(_descriptor_4.toValue(value_0.claimCards).concat(_descriptor_2.toValue(value_0.claimer).concat(_descriptor_2.toValue(value_0.score0).concat(_descriptor_2.toValue(value_0.score1).concat(_descriptor_2.toValue(value_0.round).concat(_descriptor_0.toValue(value_0.ended).concat(_descriptor_5.toValue(value_0.chain))))))))))))));
  }
}

const _descriptor_6 = new _GameState_0();

class _Move_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_4.alignment().concat(_descriptor_5.alignment()))));
  }
  fromValue(value_0) {
    return {
      kind: _descriptor_2.fromValue(value_0),
      rank: _descriptor_2.fromValue(value_0),
      count: _descriptor_2.fromValue(value_0),
      cards: _descriptor_4.fromValue(value_0),
      playSalt: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.kind).concat(_descriptor_2.toValue(value_0.rank).concat(_descriptor_2.toValue(value_0.count).concat(_descriptor_4.toValue(value_0.cards).concat(_descriptor_5.toValue(value_0.playSalt)))));
  }
}

const _descriptor_7 = new _Move_0();

const _descriptor_8 = new __compactRuntime.CompactTypeVector(6, _descriptor_1);

class _CloseConsent_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_5.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment())))));
  }
  fromValue(value_0) {
    return {
      sep: _descriptor_1.fromValue(value_0),
      gameId: _descriptor_1.fromValue(value_0),
      transcriptRoot: _descriptor_5.fromValue(value_0),
      p1Score: _descriptor_2.fromValue(value_0),
      p2Score: _descriptor_2.fromValue(value_0),
      winner: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.sep).concat(_descriptor_1.toValue(value_0.gameId).concat(_descriptor_5.toValue(value_0.transcriptRoot).concat(_descriptor_2.toValue(value_0.p1Score).concat(_descriptor_2.toValue(value_0.p2Score).concat(_descriptor_2.toValue(value_0.winner))))));
  }
}

const _descriptor_9 = new _CloseConsent_0();

const _descriptor_10 = __compactRuntime.CompactTypeJubjubPoint;

class _Signature_0 {
  alignment() {
    return _descriptor_10.alignment().concat(_descriptor_5.alignment());
  }
  fromValue(value_0) {
    return {
      r: _descriptor_10.fromValue(value_0),
      s: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_10.toValue(value_0.r).concat(_descriptor_5.toValue(value_0.s));
  }
}

const _descriptor_11 = new _Signature_0();

class _SignedCredential_0 {
  alignment() {
    return _descriptor_9.alignment().concat(_descriptor_11.alignment().concat(_descriptor_10.alignment()));
  }
  fromValue(value_0) {
    return {
      credential: _descriptor_9.fromValue(value_0),
      signature: _descriptor_11.fromValue(value_0),
      pk: _descriptor_10.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_9.toValue(value_0.credential).concat(_descriptor_11.toValue(value_0.signature).concat(_descriptor_10.toValue(value_0.pk)));
  }
}

const _descriptor_12 = new _SignedCredential_0();

const _descriptor_13 = new __compactRuntime.CompactTypeVector(27, _descriptor_6);

class _Boundary_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment().concat(_descriptor_5.alignment()))))));
  }
  fromValue(value_0) {
    return {
      turn: _descriptor_2.fromValue(value_0),
      currentRank: _descriptor_2.fromValue(value_0),
      score0: _descriptor_2.fromValue(value_0),
      score1: _descriptor_2.fromValue(value_0),
      round: _descriptor_2.fromValue(value_0),
      ended: _descriptor_0.fromValue(value_0),
      chain: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.turn).concat(_descriptor_2.toValue(value_0.currentRank).concat(_descriptor_2.toValue(value_0.score0).concat(_descriptor_2.toValue(value_0.score1).concat(_descriptor_2.toValue(value_0.round).concat(_descriptor_0.toValue(value_0.ended).concat(_descriptor_5.toValue(value_0.chain)))))));
  }
}

const _descriptor_14 = new _Boundary_0();

class _tuple_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment());
  }
  fromValue(value_0) {
    return [
      _descriptor_1.fromValue(value_0),
      _descriptor_1.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0[0]).concat(_descriptor_1.toValue(value_0[1]));
  }
}

const _descriptor_15 = new _tuple_0();

const _descriptor_16 = new __compactRuntime.CompactTypeVector(26, _descriptor_7);

const _descriptor_17 = new __compactRuntime.CompactTypeVector(7, _descriptor_2);

const _descriptor_18 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

const _descriptor_19 = new __compactRuntime.CompactTypeVector(32, _descriptor_2);

const _descriptor_20 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

class _Nonce_0 {
  alignment() {
    return _descriptor_5.alignment().concat(_descriptor_9.alignment());
  }
  fromValue(value_0) {
    return {
      sk: _descriptor_5.fromValue(value_0),
      credential: _descriptor_9.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_5.toValue(value_0.sk).concat(_descriptor_9.toValue(value_0.credential));
  }
}

const _descriptor_21 = new _Nonce_0();

const _descriptor_22 = new __compactRuntime.CompactTypeUnsignedInteger(452312848583266388373324160190187140051835877600158453279131187530910662655n, 31);

class _tuple_1 {
  alignment() {
    return _descriptor_5.alignment().concat(_descriptor_22.alignment());
  }
  fromValue(value_0) {
    return [
      _descriptor_5.fromValue(value_0),
      _descriptor_22.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_5.toValue(value_0[0]).concat(_descriptor_22.toValue(value_0[1]));
  }
}

const _descriptor_23 = new _tuple_1();

class _BoundaryCommitInput_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_14.alignment());
  }
  fromValue(value_0) {
    return {
      separator: _descriptor_1.fromValue(value_0),
      b: _descriptor_14.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.separator).concat(_descriptor_14.toValue(value_0.b));
  }
}

const _descriptor_24 = new _BoundaryCommitInput_0();

class _ResultCommitInput_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_5.alignment());
  }
  fromValue(value_0) {
    return {
      separator: _descriptor_1.fromValue(value_0),
      chain: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.separator).concat(_descriptor_5.toValue(value_0.chain));
  }
}

const _descriptor_25 = new _ResultCommitInput_0();

class _RoundSecretCommitInput_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_2.alignment()));
  }
  fromValue(value_0) {
    return {
      separator: _descriptor_1.fromValue(value_0),
      secret: _descriptor_1.fromValue(value_0),
      round: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.separator).concat(_descriptor_1.toValue(value_0.secret).concat(_descriptor_2.toValue(value_0.round)));
  }
}

const _descriptor_26 = new _RoundSecretCommitInput_0();

class _PlayerIdPreimage_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_5.alignment().concat(_descriptor_5.alignment()));
  }
  fromValue(value_0) {
    return {
      separator: _descriptor_1.fromValue(value_0),
      x: _descriptor_5.fromValue(value_0),
      y: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.separator).concat(_descriptor_5.toValue(value_0.x).concat(_descriptor_5.toValue(value_0.y)));
  }
}

const _descriptor_27 = new _PlayerIdPreimage_0();

class _EntropyCommitInput_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment());
  }
  fromValue(value_0) {
    return {
      separator: _descriptor_1.fromValue(value_0),
      entropy: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.separator).concat(_descriptor_1.toValue(value_0.entropy));
  }
}

const _descriptor_28 = new _EntropyCommitInput_0();

class _Challenge_0 {
  alignment() {
    return _descriptor_10.alignment().concat(_descriptor_10.alignment().concat(_descriptor_5.alignment()));
  }
  fromValue(value_0) {
    return {
      r: _descriptor_10.fromValue(value_0),
      pk: _descriptor_10.fromValue(value_0),
      ch: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_10.toValue(value_0.r).concat(_descriptor_10.toValue(value_0.pk).concat(_descriptor_5.toValue(value_0.ch)));
  }
}

const _descriptor_29 = new _Challenge_0();

class _DealInput_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_5.alignment().concat(_descriptor_18.alignment())));
  }
  fromValue(value_0) {
    return {
      separator: _descriptor_1.fromValue(value_0),
      salt: _descriptor_1.fromValue(value_0),
      seed: _descriptor_5.fromValue(value_0),
      round: _descriptor_18.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.separator).concat(_descriptor_1.toValue(value_0.salt).concat(_descriptor_5.toValue(value_0.seed).concat(_descriptor_18.toValue(value_0.round))));
  }
}

const _descriptor_30 = new _DealInput_0();

class _SeedInput_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment()));
  }
  fromValue(value_0) {
    return {
      separator: _descriptor_1.fromValue(value_0),
      p1Entropy: _descriptor_1.fromValue(value_0),
      p2Entropy: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.separator).concat(_descriptor_1.toValue(value_0.p1Entropy).concat(_descriptor_1.toValue(value_0.p2Entropy)));
  }
}

const _descriptor_31 = new _SeedInput_0();

class _tuple_2 {
  alignment() {
    return _descriptor_5.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_5.alignment()))));
  }
  fromValue(value_0) {
    return [
      _descriptor_5.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_5.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_5.toValue(value_0[0]).concat(_descriptor_2.toValue(value_0[1]).concat(_descriptor_2.toValue(value_0[2]).concat(_descriptor_2.toValue(value_0[3]).concat(_descriptor_5.toValue(value_0[4])))));
  }
}

const _descriptor_32 = new _tuple_2();

const _descriptor_33 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

class _Either_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_0.fromValue(value_0),
      left: _descriptor_1.fromValue(value_0),
      right: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.is_left).concat(_descriptor_1.toValue(value_0.left).concat(_descriptor_1.toValue(value_0.right)));
  }
}

const _descriptor_34 = new _Either_0();

const _descriptor_35 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_1.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.bytes);
  }
}

const _descriptor_36 = new _ContractAddress_0();

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
    if (typeof(witnesses_0.get_challenge_reduction) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named get_challenge_reduction');
    }
    if (typeof(witnesses_0.entropyPair) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named entropyPair');
    }
    if (typeof(witnesses_0.roundSecrets) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named roundSecrets');
    }
    if (typeof(witnesses_0.roundMoves) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named roundMoves');
    }
    if (typeof(witnesses_0.roundSnapshots) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named roundSnapshots');
    }
    if (typeof(witnesses_0.startBoundary) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named startBoundary');
    }
    if (typeof(witnesses_0.p1CloseConsent) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named p1CloseConsent');
    }
    if (typeof(witnesses_0.p2CloseConsent) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named p2CloseConsent');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      commitEntropy(context, ...args_1) {
        return { result: pureCircuits.commitEntropy(...args_1), context };
      },
      combineEntropy(context, ...args_1) {
        return { result: pureCircuits.combineEntropy(...args_1), context };
      },
      commitRoundSecret(context, ...args_1) {
        return { result: pureCircuits.commitRoundSecret(...args_1), context };
      },
      commitPlayCards(context, ...args_1) {
        return { result: pureCircuits.commitPlayCards(...args_1), context };
      },
      chainMove(context, ...args_1) {
        return { result: pureCircuits.chainMove(...args_1), context };
      },
      playerIdFromPk(context, ...args_1) {
        return { result: pureCircuits.playerIdFromPk(...args_1), context };
      },
      closeConsentFor(context, ...args_1) {
        return { result: pureCircuits.closeConsentFor(...args_1), context };
      },
      closeConsentChallenge(context, ...args_1) {
        return { result: pureCircuits.closeConsentChallenge(...args_1), context };
      },
      closeConsentK(context, ...args_1) {
        return { result: pureCircuits.closeConsentK(...args_1), context };
      },
      dealHandRanks(context, ...args_1) {
        return { result: pureCircuits.dealHandRanks(...args_1), context };
      },
      handCountsFromRanks(context, ...args_1) {
        return { result: pureCircuits.handCountsFromRanks(...args_1), context };
      },
      commitBoundary(context, ...args_1) {
        return { result: pureCircuits.commitBoundary(...args_1), context };
      },
      commitTranscript(context, ...args_1) {
        return { result: pureCircuits.commitTranscript(...args_1), context };
      },
      proveRound: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`proveRound: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const round_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('proveRound',
                                     'argument 1 (as invoked from Typescript)',
                                     'proof-or-bluff-rollup-v3.compact line 383 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(round_0) === 'bigint' && round_0 >= 0n && round_0 <= 255n)) {
          __compactRuntime.typeError('proveRound',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'proof-or-bluff-rollup-v3.compact line 383 char 1',
                                     'Uint<0..256>',
                                     round_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(round_0),
            alignment: _descriptor_2.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._proveRound_0(context, partialProofData, round_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      closeGame: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`closeGame: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const finalP1Score_0 = args_1[1];
        const finalP2Score_0 = args_1[2];
        const finalWinner_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('closeGame',
                                     'argument 1 (as invoked from Typescript)',
                                     'proof-or-bluff-rollup-v3.compact line 446 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(finalP1Score_0) === 'bigint' && finalP1Score_0 >= 0n && finalP1Score_0 <= 255n)) {
          __compactRuntime.typeError('closeGame',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'proof-or-bluff-rollup-v3.compact line 446 char 1',
                                     'Uint<0..256>',
                                     finalP1Score_0)
        }
        if (!(typeof(finalP2Score_0) === 'bigint' && finalP2Score_0 >= 0n && finalP2Score_0 <= 255n)) {
          __compactRuntime.typeError('closeGame',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'proof-or-bluff-rollup-v3.compact line 446 char 1',
                                     'Uint<0..256>',
                                     finalP2Score_0)
        }
        if (!(typeof(finalWinner_0) === 'bigint' && finalWinner_0 >= 0n && finalWinner_0 <= 255n)) {
          __compactRuntime.typeError('closeGame',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'proof-or-bluff-rollup-v3.compact line 446 char 1',
                                     'Uint<0..256>',
                                     finalWinner_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(finalP1Score_0).concat(_descriptor_2.toValue(finalP2Score_0).concat(_descriptor_2.toValue(finalWinner_0))),
            alignment: _descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._closeGame_0(context,
                                           partialProofData,
                                           finalP1Score_0,
                                           finalP2Score_0,
                                           finalWinner_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      proveRound: this.circuits.proveRound,
      closeGame: this.circuits.closeGame
    };
    this.provableCircuits = {
      proveRound: this.circuits.proveRound,
      closeGame: this.circuits.closeGame
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 8) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 8 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    const playerOneId_0 = args_0[1];
    const playerTwoId_0 = args_0[2];
    const gameMode_0 = args_0[3];
    const p1Entropy_0 = args_0[4];
    const p2Entropy_0 = args_0[5];
    const p1Rounds_0 = args_0[6];
    const p2Rounds_0 = args_0[7];
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
    if (!(playerOneId_0.buffer instanceof ArrayBuffer && playerOneId_0.BYTES_PER_ELEMENT === 1 && playerOneId_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 1 (argument 2 as invoked from Typescript)',
                                 'proof-or-bluff-rollup-v3.compact line 284 char 1',
                                 'Bytes<32>',
                                 playerOneId_0)
    }
    if (!(playerTwoId_0.buffer instanceof ArrayBuffer && playerTwoId_0.BYTES_PER_ELEMENT === 1 && playerTwoId_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 2 (argument 3 as invoked from Typescript)',
                                 'proof-or-bluff-rollup-v3.compact line 284 char 1',
                                 'Bytes<32>',
                                 playerTwoId_0)
    }
    if (!(typeof(gameMode_0) === 'bigint' && gameMode_0 >= 0n && gameMode_0 <= 255n)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 3 (argument 4 as invoked from Typescript)',
                                 'proof-or-bluff-rollup-v3.compact line 284 char 1',
                                 'Uint<0..256>',
                                 gameMode_0)
    }
    if (!(p1Entropy_0.buffer instanceof ArrayBuffer && p1Entropy_0.BYTES_PER_ELEMENT === 1 && p1Entropy_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 4 (argument 5 as invoked from Typescript)',
                                 'proof-or-bluff-rollup-v3.compact line 284 char 1',
                                 'Bytes<32>',
                                 p1Entropy_0)
    }
    if (!(p2Entropy_0.buffer instanceof ArrayBuffer && p2Entropy_0.BYTES_PER_ELEMENT === 1 && p2Entropy_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 5 (argument 6 as invoked from Typescript)',
                                 'proof-or-bluff-rollup-v3.compact line 284 char 1',
                                 'Bytes<32>',
                                 p2Entropy_0)
    }
    if (!(Array.isArray(p1Rounds_0) && p1Rounds_0.length === 6 && p1Rounds_0.every((t) => t.buffer instanceof ArrayBuffer && t.BYTES_PER_ELEMENT === 1 && t.length === 32))) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 6 (argument 7 as invoked from Typescript)',
                                 'proof-or-bluff-rollup-v3.compact line 284 char 1',
                                 'Vector<6, Bytes<32>>',
                                 p1Rounds_0)
    }
    if (!(Array.isArray(p2Rounds_0) && p2Rounds_0.length === 6 && p2Rounds_0.every((t) => t.buffer instanceof ArrayBuffer && t.BYTES_PER_ELEMENT === 1 && t.length === 32))) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 7 (argument 8 as invoked from Typescript)',
                                 'proof-or-bluff-rollup-v3.compact line 284 char 1',
                                 'Vector<6, Bytes<32>>',
                                 p2Rounds_0)
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('proveRound', new __compactRuntime.ContractOperation());
    state_0.setOperation('closeGame', new __compactRuntime.ContractOperation());
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
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(1n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(2n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(0n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(3n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(4n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(5n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(new Array(6).fill(new Uint8Array(32))),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(6n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(new Array(6).fill(new Uint8Array(32))),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(7n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(0n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(8n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(9n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(false),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(10n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(false),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(11n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(12n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(0n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(13n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(0n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(14n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(0n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const m_0 = gameMode_0;
    __compactRuntime.assert(this._equal_0(m_0, 0n) || this._equal_1(m_0, 1n)
                            ||
                            this._equal_2(m_0, 4n),
                            'Only score-based modes (CASUAL, STANDARD, CASINO) are enabled');
    const p1_0 = playerOneId_0;
    const p2_0 = playerTwoId_0;
    __compactRuntime.assert(!this._equal_3(p1_0, p2_0), 'Players must differ');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(0n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(p1_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(1n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(p2_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(2n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(m_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(3n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(p1Entropy_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(4n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(p2Entropy_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(5n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(p1Rounds_0),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(6n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(p2Rounds_0),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_0 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(7n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(9n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(false),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(10n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(false),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_1 = this._commitBoundary_0({ turn: 0n,
                                           currentRank: 0n,
                                           score0: 0n,
                                           score1: 0n,
                                           round: 0n,
                                           ended: false,
                                           chain: 0n });
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(8n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_1),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_2 = new Uint8Array(32);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(11n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_2),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_3 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(12n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_3),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_4 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(13n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_4),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_5 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(14n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_5),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _transientHash_0(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_31, value_0);
    return result_0;
  }
  _transientHash_1(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_32, value_0);
    return result_0;
  }
  _transientHash_2(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_21, value_0);
    return result_0;
  }
  _transientHash_3(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_30, value_0);
    return result_0;
  }
  _transientHash_4(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_9, value_0);
    return result_0;
  }
  _transientHash_5(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_29, value_0);
    return result_0;
  }
  _transientCommit_0(value_0, rand_0) {
    const result_0 = __compactRuntime.transientCommit(_descriptor_4,
                                                      value_0,
                                                      rand_0);
    return result_0;
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_28, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_26, value_0);
    return result_0;
  }
  _persistentHash_2(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_27, value_0);
    return result_0;
  }
  _persistentHash_3(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_24, value_0);
    return result_0;
  }
  _persistentHash_4(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_25, value_0);
    return result_0;
  }
  _jubjubPointX_0(np_0) {
    const result_0 = __compactRuntime.jubjubPointX(np_0);
    return result_0;
  }
  _jubjubPointY_0(np_0) {
    const result_0 = __compactRuntime.jubjubPointY(np_0);
    return result_0;
  }
  _ecAdd_0(a_0, b_0) {
    const result_0 = __compactRuntime.ecAdd(a_0, b_0);
    return result_0;
  }
  _ecMul_0(a_0, b_0) {
    const result_0 = __compactRuntime.ecMul(a_0, b_0);
    return result_0;
  }
  _ecMulGenerator_0(b_0) {
    const result_0 = __compactRuntime.ecMulGenerator(b_0);
    return result_0;
  }
  _get_challenge_reduction_0(context, partialProofData, challenge_hash_0) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.get_challenge_reduction(witnessContext_0,
                                                                                  challenge_hash_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 2  && typeof(result_0[0]) === 'bigint' && result_0[0] >= 0 && result_0[0] <= __compactRuntime.MAX_FIELD && typeof(result_0[1]) === 'bigint' && result_0[1] >= 0n && result_0[1] <= 452312848583266388373324160190187140051835877600158453279131187530910662655n)) {
      __compactRuntime.typeError('get_challenge_reduction',
                                 'return value',
                                 'signed_credential.compact line 59 char 3',
                                 '[Field, Uint<0..452312848583266388373324160190187140051835877600158453279131187530910662656>]',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_23.toValue(result_0),
      alignment: _descriptor_23.alignment()
    });
    return result_0;
  }
  _compute_challenge_0(r_0, pk_0, credential_0) {
    const credential_hash_0 = this._transientHash_4(credential_0);
    return this._transientHash_5({ r: r_0, pk: pk_0, ch: credential_hash_0 });
  }
  _deterministic_k_0(nonce_0) { return this._transientHash_2(nonce_0); }
  _reduce_challenge_0(context, partialProofData, full_0) {
    const TWO_248_0 = 452312848583266388373324160190187140051835877600158453279131187530910662656n;
    const __compact_pattern_tmp1_0 = this._get_challenge_reduction_0(context,
                                                                     partialProofData,
                                                                     full_0);
    const q_0 = __compact_pattern_tmp1_0[0];
    const r_0 = __compact_pattern_tmp1_0[1];
    __compactRuntime.assert(__compactRuntime.addField(__compactRuntime.mulField(q_0,
                                                                                TWO_248_0),
                                                      r_0)
                            ===
                            full_0,
                            'signed-credential: invalid challenge reduction');
    return r_0;
  }
  _verify_0(signed_0, challenge_0) {
    const lhs_0 = this._ecMulGenerator_0(signed_0.signature.s);
    const rhs_0 = this._ecAdd_0(signed_0.signature.r,
                                this._ecMul_0(signed_0.pk, challenge_0));
    return this._jubjubPointX_0(lhs_0) === this._jubjubPointX_0(rhs_0)
           &&
           this._jubjubPointY_0(lhs_0) === this._jubjubPointY_0(rhs_0);
  }
  _assert_signed_by_0(context, partialProofData, signed_0, trusted_pk_0) {
    const full_0 = this._compute_challenge_0(signed_0.signature.r,
                                             signed_0.pk,
                                             signed_0.credential);
    const c_0 = this._reduce_challenge_0(context, partialProofData, full_0);
    __compactRuntime.assert(this._verify_0(signed_0, c_0),
                            'signed-credential: signature invalid');
    __compactRuntime.assert(this._jubjubPointX_0(signed_0.pk)
                            ===
                            this._jubjubPointX_0(trusted_pk_0)
                            &&
                            this._jubjubPointY_0(signed_0.pk)
                            ===
                            this._jubjubPointY_0(trusted_pk_0),
                            'signed-credential: not signed by trusted issuer');
    return [];
  }
  _commitEntropy_0(entropy_0) {
    return this._persistentHash_0({ separator:
                                      new Uint8Array([112, 111, 98, 58, 101, 110, 116, 114, 111, 112, 121, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    entropy: entropy_0 });
  }
  _combineEntropy_0(p1Entropy_0, p2Entropy_0) {
    return this._transientHash_0({ separator:
                                     new Uint8Array([112, 111, 98, 58, 115, 101, 101, 100, 58, 118, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   p1Entropy: p1Entropy_0,
                                   p2Entropy: p2Entropy_0 });
  }
  _commitRoundSecret_0(secret_0, round_0) {
    return this._persistentHash_1({ separator:
                                      new Uint8Array([112, 111, 98, 58, 114, 111, 117, 110, 100, 45, 115, 101, 99, 114, 101, 116, 58, 118, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    secret: secret_0,
                                    round: round_0 });
  }
  _commitPlayCards_0(cards_0, playSalt_0) {
    return this._transientCommit_0(cards_0, playSalt_0);
  }
  _chainMove_0(prev_0, kind_0, rank_0, count_0, playCommit_0) {
    return this._transientHash_1([prev_0, kind_0, rank_0, count_0, playCommit_0]);
  }
  _playerIdFromPk_0(pk_0) {
    return this._persistentHash_2({ separator:
                                      new Uint8Array([112, 111, 98, 58, 112, 107, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    x: this._jubjubPointX_0(pk_0),
                                    y: this._jubjubPointY_0(pk_0) });
  }
  _closeConsentFor_0(gameId_0, transcriptRoot_0, p1Score_0, p2Score_0, winner_0)
  {
    return { sep:
               new Uint8Array([112, 111, 98, 58, 99, 108, 111, 115, 101, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
             gameId: gameId_0,
             transcriptRoot: transcriptRoot_0,
             p1Score: p1Score_0,
             p2Score: p2Score_0,
             winner: winner_0 };
  }
  _closeConsentChallenge_0(r_0, pk_0, consent_0) {
    return this._compute_challenge_0(r_0, pk_0, consent_0);
  }
  _closeConsentK_0(sk_0, consent_0) {
    return this._deterministic_k_0({ sk: sk_0, credential: consent_0 });
  }
  _boundedDraw_0(hi_0, lo_0, m_0) {
    const u_0 = ((t1) => {
                  if (t1 > 65535n) {
                    throw new __compactRuntime.CompactError('proof-or-bluff-rollup-v3.compact line 124 char 13: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 65535');
                  }
                  return t1;
                })(hi_0 * 256n + lo_0);
    const p_0 = ((t1) => {
                  if (t1 > 4294967295n) {
                    throw new __compactRuntime.CompactError('proof-or-bluff-rollup-v3.compact line 125 char 13: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                  }
                  return t1;
                })(u_0 * m_0);
    const pb_0 = Array.from(__compactRuntime.convertFieldToBytes(3,
                                                                 p_0,
                                                                 'proof-or-bluff-rollup-v3.compact line 126 char 15'),
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
    const c1_0 = this._equal_4(t1_0, c0_0) ? 46n : t1_0;
    const t2_0 = this._boundedDraw_0(b_0[4], b_0[5], 48n);
    const c2_0 = this._equal_5(t2_0, c0_0) || this._equal_6(t2_0, c1_0) ?
                 47n :
                 t2_0;
    const t3_0 = this._boundedDraw_0(b_0[6], b_0[7], 49n);
    const c3_0 = this._equal_7(t3_0, c0_0) || this._equal_8(t3_0, c1_0)
                 ||
                 this._equal_9(t3_0, c2_0)
                 ?
                 48n :
                 t3_0;
    const t4_0 = this._boundedDraw_0(b_0[8], b_0[9], 50n);
    const c4_0 = this._equal_10(t4_0, c0_0) || this._equal_11(t4_0, c1_0)
                 ||
                 this._equal_12(t4_0, c2_0)
                 ||
                 this._equal_13(t4_0, c3_0)
                 ?
                 49n :
                 t4_0;
    const t5_0 = this._boundedDraw_0(b_0[10], b_0[11], 51n);
    const c5_0 = this._equal_14(t5_0, c0_0) || this._equal_15(t5_0, c1_0)
                 ||
                 this._equal_16(t5_0, c2_0)
                 ||
                 this._equal_17(t5_0, c3_0)
                 ||
                 this._equal_18(t5_0, c4_0)
                 ?
                 50n :
                 t5_0;
    const t6_0 = this._boundedDraw_0(b_0[12], b_0[13], 52n);
    const c6_0 = this._equal_19(t6_0, c0_0) || this._equal_20(t6_0, c1_0)
                 ||
                 this._equal_21(t6_0, c2_0)
                 ||
                 this._equal_22(t6_0, c3_0)
                 ||
                 this._equal_23(t6_0, c4_0)
                 ||
                 this._equal_24(t6_0, c5_0)
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
            (c1_0 = this._equal_25(t1_0, c0_0) ? 48n : t1_0,
             (t2_0 = this._boundedDraw_0(b_0[4], b_0[5], 50n),
              (c2_0 = this._equal_26(t2_0, c0_0) || this._equal_27(t2_0, c1_0) ?
                      49n :
                      t2_0,
               (t3_0 = this._boundedDraw_0(b_0[6], b_0[7], 51n),
                (c3_0 = this._equal_28(t3_0, c0_0) || this._equal_29(t3_0, c1_0)
                        ||
                        this._equal_30(t3_0, c2_0)
                        ?
                        50n :
                        t3_0,
                 (t4_0 = this._boundedDraw_0(b_0[8], b_0[9], 52n),
                  (c4_0 = this._equal_31(t4_0, c0_0)
                          ||
                          this._equal_32(t4_0, c1_0)
                          ||
                          this._equal_33(t4_0, c2_0)
                          ||
                          this._equal_34(t4_0, c3_0)
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
    const digest_0 = this._transientHash_3({ separator:
                                               new Uint8Array([112, 111, 98, 58, 100, 101, 97, 108, 58, 118, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                             salt: salt_0,
                                             seed: seed_0,
                                             round: round_0 });
    const b_0 = Array.from(__compactRuntime.convertFieldToBytes(32,
                                                                digest_0,
                                                                'proof-or-bluff-rollup-v3.compact line 168 char 14'),
                           BigInt);
    if (this._equal_35(size_0, 5n)) {
      return this._dealFive_0(b_0);
    } else {
      return this._dealSeven_0(b_0);
    }
  }
  _countRank_0(ranks_0, size_0, target_0) {
    const c0_0 = size_0 >= 1n && this._equal_36(ranks_0[0], target_0) ? 1n : 0n;
    const c1_0 = size_0 >= 2n && this._equal_37(ranks_0[1], target_0) ? 1n : 0n;
    const c2_0 = size_0 >= 3n && this._equal_38(ranks_0[2], target_0) ? 1n : 0n;
    const c3_0 = size_0 >= 4n && this._equal_39(ranks_0[3], target_0) ? 1n : 0n;
    const c4_0 = size_0 >= 5n && this._equal_40(ranks_0[4], target_0) ? 1n : 0n;
    const c5_0 = size_0 >= 6n && this._equal_41(ranks_0[5], target_0) ? 1n : 0n;
    const c6_0 = size_0 >= 7n && this._equal_42(ranks_0[6], target_0) ? 1n : 0n;
    return ((t1) => {
             if (t1 > 255n) {
               throw new __compactRuntime.CompactError('proof-or-bluff-rollup-v3.compact line 179 char 10: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
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
  _handSize_0(mode_0) { return this._equal_43(mode_0, 0n) ? 5n : 7n; }
  _winThreshold_0(mode_0) {
    return this._equal_44(mode_0, 0n) ?
           10n :
           this._equal_45(mode_0, 1n) ? 15n : 20n;
  }
  _startingRank_0(seed_0) {
    const b_0 = Array.from(__compactRuntime.convertFieldToBytes(32,
                                                                seed_0,
                                                                'proof-or-bluff-rollup-v3.compact line 197 char 14'),
                           BigInt);
    return this._boundedDraw_0(b_0[16], b_0[17], 13n);
  }
  _played_0(cards_0, count_0, target_0) {
    const a_0 = count_0 >= 1n && this._equal_46(cards_0[0], target_0) ? 1n : 0n;
    const b_0 = count_0 >= 2n && this._equal_47(cards_0[1], target_0) ? 1n : 0n;
    const c_0 = count_0 >= 3n && this._equal_48(cards_0[2], target_0) ? 1n : 0n;
    const d_0 = count_0 >= 4n && this._equal_49(cards_0[3], target_0) ? 1n : 0n;
    return ((t1) => {
             if (t1 > 255n) {
               throw new __compactRuntime.CompactError('proof-or-bluff-rollup-v3.compact line 209 char 10: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
             }
             return t1;
           })(a_0 + b_0 + c_0 + d_0);
  }
  _removeFrom_0(hand_0, cards_0, count_0) {
    const taken_0 = [...this._mapper_0(((target_0) =>
                                        {
                                          return this._played_0(cards_0,
                                                                count_0,
                                                                target_0);
                                        }),
                                       [0n,
                                        1n,
                                        2n,
                                        3n,
                                        4n,
                                        5n,
                                        6n,
                                        7n,
                                        8n,
                                        9n,
                                        10n,
                                        11n,
                                        12n])];
    this._folder_0(((t_0, i_0) =>
                    {
                      let t_1;
                      __compactRuntime.assert((t_1 = hand_0[i_0],
                                               t_1 >= taken_0[i_0]),
                                              'card not held');
                      return t_0;
                    }),
                   [],
                   [0n, 1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n, 10n, 11n, 12n]);
    return [...this._mapper_1(((h_0, t_2) =>
                               {
                                 __compactRuntime.assert(h_0 >= t_2,
                                                         'result of subtraction would be negative');
                                 return h_0 - t_2;
                               }),
                              hand_0,
                              taken_0)];
  }
  _handEmpty_0(hand_0) {
    const total_0 = this._folder_1(((acc_0, v_0) =>
                                    {
                                      return ((t1) => {
                                               if (t1 > 255n) {
                                                 throw new __compactRuntime.CompactError('proof-or-bluff-rollup-v3.compact line 219 char 70: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                                               }
                                               return t1;
                                             })(acc_0 + v_0);
                                    }),
                                   0n,
                                   hand_0);
    return this._equal_50(total_0, 0n);
  }
  _nextRankOf_0(rank_0) {
    if (rank_0 >= 12n) {
      return 0n;
    } else {
      return ((t1) => {
               if (t1 > 255n) {
                 throw new __compactRuntime.CompactError('proof-or-bluff-rollup-v3.compact line 222 char 83: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
               }
               return t1;
             })(rank_0 + 1n);
    }
  }
  _minusOneFloor_0(score_0) {
    if (this._equal_51(score_0, 0n)) {
      return 0n;
    } else {
      __compactRuntime.assert(score_0 >= 1n,
                              'result of subtraction would be negative');
      return score_0 - 1n;
    }
  }
  _commitBoundary_0(b_0) {
    return this._persistentHash_3({ separator:
                                      new Uint8Array([112, 111, 98, 58, 98, 111, 117, 110, 100, 97, 114, 121, 58, 118, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    b: b_0 });
  }
  _commitTranscript_0(chain_0) {
    return this._persistentHash_4({ separator:
                                      new Uint8Array([112, 111, 98, 58, 116, 114, 97, 110, 115, 99, 114, 105, 112, 116, 58, 118, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    chain: chain_0 });
  }
  _entropyPair_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.entropyPair(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 2  && result_0[0].buffer instanceof ArrayBuffer && result_0[0].BYTES_PER_ELEMENT === 1 && result_0[0].length === 32 && result_0[1].buffer instanceof ArrayBuffer && result_0[1].BYTES_PER_ELEMENT === 1 && result_0[1].length === 32)) {
      __compactRuntime.typeError('entropyPair',
                                 'return value',
                                 'proof-or-bluff-rollup-v3.compact line 255 char 1',
                                 '[Bytes<32>, Bytes<32>]',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_15.toValue(result_0),
      alignment: _descriptor_15.alignment()
    });
    return result_0;
  }
  _roundSecrets_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.roundSecrets(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 2  && result_0[0].buffer instanceof ArrayBuffer && result_0[0].BYTES_PER_ELEMENT === 1 && result_0[0].length === 32 && result_0[1].buffer instanceof ArrayBuffer && result_0[1].BYTES_PER_ELEMENT === 1 && result_0[1].length === 32)) {
      __compactRuntime.typeError('roundSecrets',
                                 'return value',
                                 'proof-or-bluff-rollup-v3.compact line 256 char 1',
                                 '[Bytes<32>, Bytes<32>]',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_15.toValue(result_0),
      alignment: _descriptor_15.alignment()
    });
    return result_0;
  }
  _roundMoves_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.roundMoves(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 26 && result_0.every((t) => typeof(t) === 'object' && typeof(t.kind) === 'bigint' && t.kind >= 0n && t.kind <= 255n && typeof(t.rank) === 'bigint' && t.rank >= 0n && t.rank <= 255n && typeof(t.count) === 'bigint' && t.count >= 0n && t.count <= 255n && Array.isArray(t.cards) && t.cards.length === 4 && t.cards.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 255n) && typeof(t.playSalt) === 'bigint' && t.playSalt >= 0 && t.playSalt <= __compactRuntime.MAX_FIELD))) {
      __compactRuntime.typeError('roundMoves',
                                 'return value',
                                 'proof-or-bluff-rollup-v3.compact line 257 char 1',
                                 'Vector<26, struct Move<kind: Uint<0..256>, rank: Uint<0..256>, count: Uint<0..256>, cards: Vector<4, Uint<0..256>>, playSalt: Field>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_16.toValue(result_0),
      alignment: _descriptor_16.alignment()
    });
    return result_0;
  }
  _roundSnapshots_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.roundSnapshots(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 27 && result_0.every((t) => typeof(t) === 'object' && Array.isArray(t.hand0) && t.hand0.length === 13 && t.hand0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 255n) && Array.isArray(t.hand1) && t.hand1.length === 13 && t.hand1.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 255n) && typeof(t.turn) === 'bigint' && t.turn >= 0n && t.turn <= 255n && typeof(t.currentRank) === 'bigint' && t.currentRank >= 0n && t.currentRank <= 255n && typeof(t.pending) === 'boolean' && typeof(t.claimRank) === 'bigint' && t.claimRank >= 0n && t.claimRank <= 255n && typeof(t.claimCount) === 'bigint' && t.claimCount >= 0n && t.claimCount <= 255n && Array.isArray(t.claimCards) && t.claimCards.length === 4 && t.claimCards.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 255n) && typeof(t.claimer) === 'bigint' && t.claimer >= 0n && t.claimer <= 255n && typeof(t.score0) === 'bigint' && t.score0 >= 0n && t.score0 <= 255n && typeof(t.score1) === 'bigint' && t.score1 >= 0n && t.score1 <= 255n && typeof(t.round) === 'bigint' && t.round >= 0n && t.round <= 255n && typeof(t.ended) === 'boolean' && typeof(t.chain) === 'bigint' && t.chain >= 0 && t.chain <= __compactRuntime.MAX_FIELD))) {
      __compactRuntime.typeError('roundSnapshots',
                                 'return value',
                                 'proof-or-bluff-rollup-v3.compact line 258 char 1',
                                 'Vector<27, struct GameState<hand0: Vector<13, Uint<0..256>>, hand1: Vector<13, Uint<0..256>>, turn: Uint<0..256>, currentRank: Uint<0..256>, pending: Boolean, claimRank: Uint<0..256>, claimCount: Uint<0..256>, claimCards: Vector<4, Uint<0..256>>, claimer: Uint<0..256>, score0: Uint<0..256>, score1: Uint<0..256>, round: Uint<0..256>, ended: Boolean, chain: Field>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_13.toValue(result_0),
      alignment: _descriptor_13.alignment()
    });
    return result_0;
  }
  _startBoundary_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.startBoundary(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && typeof(result_0.turn) === 'bigint' && result_0.turn >= 0n && result_0.turn <= 255n && typeof(result_0.currentRank) === 'bigint' && result_0.currentRank >= 0n && result_0.currentRank <= 255n && typeof(result_0.score0) === 'bigint' && result_0.score0 >= 0n && result_0.score0 <= 255n && typeof(result_0.score1) === 'bigint' && result_0.score1 >= 0n && result_0.score1 <= 255n && typeof(result_0.round) === 'bigint' && result_0.round >= 0n && result_0.round <= 255n && typeof(result_0.ended) === 'boolean' && typeof(result_0.chain) === 'bigint' && result_0.chain >= 0 && result_0.chain <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('startBoundary',
                                 'return value',
                                 'proof-or-bluff-rollup-v3.compact line 259 char 1',
                                 'struct Boundary<turn: Uint<0..256>, currentRank: Uint<0..256>, score0: Uint<0..256>, score1: Uint<0..256>, round: Uint<0..256>, ended: Boolean, chain: Field>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_14.toValue(result_0),
      alignment: _descriptor_14.alignment()
    });
    return result_0;
  }
  _p1CloseConsent_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.p1CloseConsent(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && typeof(result_0.credential) === 'object' && result_0.credential.sep.buffer instanceof ArrayBuffer && result_0.credential.sep.BYTES_PER_ELEMENT === 1 && result_0.credential.sep.length === 32 && result_0.credential.gameId.buffer instanceof ArrayBuffer && result_0.credential.gameId.BYTES_PER_ELEMENT === 1 && result_0.credential.gameId.length === 32 && typeof(result_0.credential.transcriptRoot) === 'bigint' && result_0.credential.transcriptRoot >= 0 && result_0.credential.transcriptRoot <= __compactRuntime.MAX_FIELD && typeof(result_0.credential.p1Score) === 'bigint' && result_0.credential.p1Score >= 0n && result_0.credential.p1Score <= 255n && typeof(result_0.credential.p2Score) === 'bigint' && result_0.credential.p2Score >= 0n && result_0.credential.p2Score <= 255n && typeof(result_0.credential.winner) === 'bigint' && result_0.credential.winner >= 0n && result_0.credential.winner <= 255n && typeof(result_0.signature) === 'object' && true && typeof(result_0.signature.s) === 'bigint' && result_0.signature.s >= 0 && result_0.signature.s <= __compactRuntime.MAX_FIELD && true)) {
      __compactRuntime.typeError('p1CloseConsent',
                                 'return value',
                                 'proof-or-bluff-rollup-v3.compact line 260 char 1',
                                 'struct SignedCredential<credential: struct CloseConsent<sep: Bytes<32>, gameId: Bytes<32>, transcriptRoot: Field, p1Score: Uint<0..256>, p2Score: Uint<0..256>, winner: Uint<0..256>>, signature: struct Signature<r: Opaque<"JubjubPoint">, s: Field>, pk: Opaque<"JubjubPoint">>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_12.toValue(result_0),
      alignment: _descriptor_12.alignment()
    });
    return result_0;
  }
  _p2CloseConsent_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.p2CloseConsent(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && typeof(result_0.credential) === 'object' && result_0.credential.sep.buffer instanceof ArrayBuffer && result_0.credential.sep.BYTES_PER_ELEMENT === 1 && result_0.credential.sep.length === 32 && result_0.credential.gameId.buffer instanceof ArrayBuffer && result_0.credential.gameId.BYTES_PER_ELEMENT === 1 && result_0.credential.gameId.length === 32 && typeof(result_0.credential.transcriptRoot) === 'bigint' && result_0.credential.transcriptRoot >= 0 && result_0.credential.transcriptRoot <= __compactRuntime.MAX_FIELD && typeof(result_0.credential.p1Score) === 'bigint' && result_0.credential.p1Score >= 0n && result_0.credential.p1Score <= 255n && typeof(result_0.credential.p2Score) === 'bigint' && result_0.credential.p2Score >= 0n && result_0.credential.p2Score <= 255n && typeof(result_0.credential.winner) === 'bigint' && result_0.credential.winner >= 0n && result_0.credential.winner <= 255n && typeof(result_0.signature) === 'object' && true && typeof(result_0.signature.s) === 'bigint' && result_0.signature.s >= 0 && result_0.signature.s <= __compactRuntime.MAX_FIELD && true)) {
      __compactRuntime.typeError('p2CloseConsent',
                                 'return value',
                                 'proof-or-bluff-rollup-v3.compact line 261 char 1',
                                 'struct SignedCredential<credential: struct CloseConsent<sep: Bytes<32>, gameId: Bytes<32>, transcriptRoot: Field, p1Score: Uint<0..256>, p2Score: Uint<0..256>, winner: Uint<0..256>>, signature: struct Signature<r: Opaque<"JubjubPoint">, s: Field>, pk: Opaque<"JubjubPoint">>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_12.toValue(result_0),
      alignment: _descriptor_12.alignment()
    });
    return result_0;
  }
  _selectCommit_0(commits_0, round_0) {
    if (this._equal_52(round_0, 1n)) {
      return commits_0[0];
    } else {
      if (this._equal_53(round_0, 2n)) {
        return commits_0[1];
      } else {
        if (this._equal_54(round_0, 3n)) {
          return commits_0[2];
        } else {
          if (this._equal_55(round_0, 4n)) {
            return commits_0[3];
          } else {
            if (this._equal_56(round_0, 5n)) {
              return commits_0[4];
            } else {
              return commits_0[5];
            }
          }
        }
      }
    }
  }
  _roundFinished_0(s_0) {
    return s_0.ended
           ||
           !s_0.pending
           &&
           (this._handEmpty_0(s_0.hand0) || this._handEmpty_0(s_0.hand1));
  }
  _applyRoundMove_0(s_0, m_0, threshold_0, maxRound_0) {
    const roundDone_0 = this._roundFinished_0(s_0);
    const noop_0 = this._equal_57(m_0.kind, 0n);
    const isPlay_0 = this._equal_58(m_0.kind, 1n);
    const isAccept_0 = this._equal_59(m_0.kind, 2n);
    const isChallenge_0 = this._equal_60(m_0.kind, 3n);
    __compactRuntime.assert(noop_0 || isPlay_0 || isAccept_0 || isChallenge_0,
                            'unknown move kind');
    __compactRuntime.assert(!noop_0 || roundDone_0, 'padding before round end');
    __compactRuntime.assert(noop_0 || !roundDone_0, 'move after round end');
    __compactRuntime.assert(!isPlay_0 || !s_0.pending,
                            'play while claim pending');
    __compactRuntime.assert(!(isAccept_0 || isChallenge_0) || s_0.pending,
                            'response without claim');
    let t_0, t_1;
    __compactRuntime.assert(!isPlay_0
                            ||
                            this._equal_61(m_0.rank, s_0.currentRank)
                            &&
                            (t_1 = m_0.count, t_1 >= 1n)
                            &&
                            (t_0 = m_0.count, t_0 <= 4n),
                            'bad claim');
    let t_7, t_8, t_5, t_6, t_3, t_4, t_2;
    __compactRuntime.assert(!isPlay_0
                            ||
                            (t_2 = m_0.cards[0], t_2 <= 12n)
                            &&
                            (t_4 = m_0.cards[1], t_4 <= 12n)
                            &&
                            (t_3 = m_0.cards[2], t_3 <= 12n)
                            &&
                            (t_6 = m_0.cards[3], t_6 <= 12n)
                            &&
                            ((t_5 = 1n, t_5 < m_0.count)
                             ||
                             this._equal_62(m_0.cards[1], 0n))
                            &&
                            ((t_8 = 2n, t_8 < m_0.count)
                             ||
                             this._equal_63(m_0.cards[2], 0n))
                            &&
                            ((t_7 = 3n, t_7 < m_0.count)
                             ||
                             this._equal_64(m_0.cards[3], 0n)),
                            'played card out of range');
    __compactRuntime.assert(isPlay_0
                            ||
                            this._equal_65(m_0.rank, 0n)
                            &&
                            this._equal_66(m_0.count, 0n),
                            'non-PLAY fields must be zero');
    const moverIs0_0 = this._equal_67(s_0.turn, 0n);
    const playCount_0 = isPlay_0 ? m_0.count : 0n;
    const h0_0 = moverIs0_0 ?
                 this._removeFrom_0(s_0.hand0, m_0.cards, playCount_0) :
                 s_0.hand0;
    const h1_0 = moverIs0_0 ?
                 s_0.hand1 :
                 this._removeFrom_0(s_0.hand1, m_0.cards, playCount_0);
    const truthful_0 = this._equal_68(this._played_0(s_0.claimCards,
                                                     s_0.claimCount,
                                                     s_0.claimRank),
                                      s_0.claimCount);
    const challengerIs0_0 = this._equal_69(s_0.turn, 0n);
    const sc0_0 = !isChallenge_0 ?
                  s_0.score0 :
                  challengerIs0_0 ?
                  truthful_0 ?
                  this._minusOneFloor_0(s_0.score0) :
                  ((t1) => {
                    if (t1 > 255n) {
                      throw new __compactRuntime.CompactError('proof-or-bluff-rollup-v3.compact line 351 char 62: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                    }
                    return t1;
                  })(s_0.score0 + 3n)
                  :
                  s_0.score0;
    const sc1_0 = !isChallenge_0 ?
                  s_0.score1 :
                  challengerIs0_0 ?
                  s_0.score1 :
                  truthful_0 ?
                  this._minusOneFloor_0(s_0.score1) :
                  ((t1) => {
                    if (t1 > 255n) {
                      throw new __compactRuntime.CompactError('proof-or-bluff-rollup-v3.compact line 353 char 73: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                    }
                    return t1;
                  })(s_0.score1 + 3n);
    const resolved_0 = isAccept_0 || isChallenge_0;
    const scored_0 = s_0.ended || sc0_0 >= threshold_0 || sc1_0 >= threshold_0;
    const emptied_0 = resolved_0
                      &&
                      (this._handEmpty_0(h0_0) || this._handEmpty_0(h1_0))
                      &&
                      !scored_0;
    let t_9;
    const outOfRounds_0 = emptied_0 && (t_9 = s_0.round, t_9 >= maxRound_0);
    const gameEnded_0 = scored_0 || outOfRounds_0;
    const playCommit_0 = isPlay_0 ?
                         this._commitPlayCards_0(m_0.cards, m_0.playSalt) :
                         0n;
    const chain_0 = noop_0 ?
                    s_0.chain :
                    this._chainMove_0(s_0.chain,
                                      m_0.kind,
                                      m_0.rank,
                                      m_0.count,
                                      playCommit_0);
    const nextRank_0 = resolved_0 ?
                       this._nextRankOf_0(s_0.currentRank) :
                       s_0.currentRank;
    const nextTurn_0 = noop_0 ?
                       s_0.turn :
                       isPlay_0 ?
                       this._equal_70(s_0.turn, 0n) ? 1n : 0n :
                       s_0.turn;
    return { hand0: noop_0 ? s_0.hand0 : h0_0,
             hand1: noop_0 ? s_0.hand1 : h1_0,
             turn: nextTurn_0,
             currentRank: noop_0 ? s_0.currentRank : nextRank_0,
             pending: noop_0 ? s_0.pending : isPlay_0,
             claimRank: isPlay_0 ? m_0.rank : s_0.claimRank,
             claimCount: isPlay_0 ? m_0.count : s_0.claimCount,
             claimCards: isPlay_0 ? m_0.cards : s_0.claimCards,
             claimer: isPlay_0 ? s_0.turn : s_0.claimer,
             score0: sc0_0,
             score1: sc1_0,
             round: s_0.round,
             ended: noop_0 ? s_0.ended : gameEnded_0,
             chain: chain_0 };
  }
  _proveRound_0(context, partialProofData, round_0) {
    __compactRuntime.assert(!_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_2.toValue(10n),
                                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                                        { popeq: { cached: false,
                                                                                                   result: undefined } }]).value),
                            'Game already closed');
    __compactRuntime.assert(!_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_2.toValue(9n),
                                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                                        { popeq: { cached: false,
                                                                                                   result: undefined } }]).value),
                            'Proven history already reached game end');
    const r_0 = round_0;
    __compactRuntime.assert(r_0 >= 1n && r_0 <= 6n, 'bad round');
    __compactRuntime.assert(this._equal_71(r_0,
                                           ((t1) => {
                                             if (t1 > 255n) {
                                               throw new __compactRuntime.CompactError('proof-or-bluff-rollup-v3.compact line 388 char 16: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                                             }
                                             return t1;
                                           })(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                        partialProofData,
                                                                                                        [
                                                                                                         { dup: { n: 0 } },
                                                                                                         { idx: { cached: false,
                                                                                                                  pushPath: false,
                                                                                                                  path: [
                                                                                                                         { tag: 'value',
                                                                                                                           value: { value: _descriptor_2.toValue(7n),
                                                                                                                                    alignment: _descriptor_2.alignment() } }] } },
                                                                                                         { popeq: { cached: false,
                                                                                                                    result: undefined } }]).value)
                                              +
                                              1n)),
                            'rounds must be proven in order');
    const e_0 = this._entropyPair_0(context, partialProofData);
    __compactRuntime.assert(this._equal_72(this._commitEntropy_0(e_0[0]),
                                           _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_2.toValue(3n),
                                                                                                                                 alignment: _descriptor_2.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'P1 entropy mismatch');
    __compactRuntime.assert(this._equal_73(this._commitEntropy_0(e_0[1]),
                                           _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_2.toValue(4n),
                                                                                                                                 alignment: _descriptor_2.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'P2 entropy mismatch');
    const secrets_0 = this._roundSecrets_0(context, partialProofData);
    __compactRuntime.assert(this._equal_74(this._commitRoundSecret_0(secrets_0[0],
                                                                     r_0),
                                           this._selectCommit_0(_descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                          partialProofData,
                                                                                                                          [
                                                                                                                           { dup: { n: 0 } },
                                                                                                                           { idx: { cached: false,
                                                                                                                                    pushPath: false,
                                                                                                                                    path: [
                                                                                                                                           { tag: 'value',
                                                                                                                                             value: { value: _descriptor_2.toValue(5n),
                                                                                                                                                      alignment: _descriptor_2.alignment() } }] } },
                                                                                                                           { popeq: { cached: false,
                                                                                                                                      result: undefined } }]).value),
                                                                r_0)),
                            'P1 round secret mismatch');
    __compactRuntime.assert(this._equal_75(this._commitRoundSecret_0(secrets_0[1],
                                                                     r_0),
                                           this._selectCommit_0(_descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                          partialProofData,
                                                                                                                          [
                                                                                                                           { dup: { n: 0 } },
                                                                                                                           { idx: { cached: false,
                                                                                                                                    pushPath: false,
                                                                                                                                    path: [
                                                                                                                                           { tag: 'value',
                                                                                                                                             value: { value: _descriptor_2.toValue(6n),
                                                                                                                                                      alignment: _descriptor_2.alignment() } }] } },
                                                                                                                           { popeq: { cached: false,
                                                                                                                                      result: undefined } }]).value),
                                                                r_0)),
                            'P2 round secret mismatch');
    const seed_0 = this._combineEntropy_0(e_0[0], e_0[1]);
    const prev_0 = this._startBoundary_0(context, partialProofData);
    const b0_0 = this._equal_76(r_0, 1n) ?
                 { turn: 0n,
                   currentRank: this._startingRank_0(seed_0),
                   score0: 0n,
                   score1: 0n,
                   round: 0n,
                   ended: false,
                   chain: 0n }
                 :
                 prev_0;
    __compactRuntime.assert(this._equal_77(this._commitBoundary_0(b0_0),
                                           _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_2.toValue(8n),
                                                                                                                                 alignment: _descriptor_2.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'boundary does not open stateRoot');
    __compactRuntime.assert(this._equal_78(b0_0.round,
                                           (__compactRuntime.assert(r_0 >= 1n,
                                                                    'result of subtraction would be negative'),
                                            r_0 - 1n)),
                            'boundary round mismatch');
    const size_0 = this._handSize_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                              partialProofData,
                                                                                              [
                                                                                               { dup: { n: 0 } },
                                                                                               { idx: { cached: false,
                                                                                                        pushPath: false,
                                                                                                        path: [
                                                                                                               { tag: 'value',
                                                                                                                 value: { value: _descriptor_2.toValue(2n),
                                                                                                                          alignment: _descriptor_2.alignment() } }] } },
                                                                                               { popeq: { cached: false,
                                                                                                          result: undefined } }]).value));
    const hand0_0 = this._handCountsFromRanks_0(this._dealHandRanks_0(secrets_0[0],
                                                                      seed_0,
                                                                      r_0,
                                                                      size_0),
                                                size_0);
    const hand1_0 = this._handCountsFromRanks_0(this._dealHandRanks_0(secrets_0[1],
                                                                      seed_0,
                                                                      r_0,
                                                                      size_0),
                                                size_0);
    const states_0 = this._roundSnapshots_0(context, partialProofData);
    const moves_0 = this._roundMoves_0(context, partialProofData);
    const opening_0 = { hand0: hand0_0,
                        hand1: hand1_0,
                        turn: b0_0.turn,
                        currentRank: b0_0.currentRank,
                        pending: false,
                        claimRank: 0n,
                        claimCount: 0n,
                        claimCards: [0n, 0n, 0n, 0n],
                        claimer: 0n,
                        score0: b0_0.score0,
                        score1: b0_0.score1,
                        round: r_0,
                        ended: false,
                        chain: b0_0.chain };
    __compactRuntime.assert(this._equal_79(states_0[0], opening_0),
                            'opening snapshot mismatch');
    const threshold_0 = this._winThreshold_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                       partialProofData,
                                                                                                       [
                                                                                                        { dup: { n: 0 } },
                                                                                                        { idx: { cached: false,
                                                                                                                 pushPath: false,
                                                                                                                 path: [
                                                                                                                        { tag: 'value',
                                                                                                                          value: { value: _descriptor_2.toValue(2n),
                                                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                                                        { popeq: { cached: false,
                                                                                                                   result: undefined } }]).value));
    this._folder_2(context,
                   partialProofData,
                   ((context, partialProofData, t_0, i_0) =>
                    {
                      __compactRuntime.assert(this._equal_80(this._applyRoundMove_0(states_0[i_0],
                                                                                    moves_0[i_0],
                                                                                    threshold_0,
                                                                                    6n),
                                                             states_0[i_0 + 1n]),
                                              'invalid transition');
                      return t_0;
                    }),
                   [],
                   [0n,
                    1n,
                    2n,
                    3n,
                    4n,
                    5n,
                    6n,
                    7n,
                    8n,
                    9n,
                    10n,
                    11n,
                    12n,
                    13n,
                    14n,
                    15n,
                    16n,
                    17n,
                    18n,
                    19n,
                    20n,
                    21n,
                    22n,
                    23n,
                    24n,
                    25n]);
    __compactRuntime.assert(this._roundFinished_0(states_0[26]),
                            'round did not finish');
    const fin_0 = states_0[26];
    const b1_0 = { turn: fin_0.turn,
                   currentRank: fin_0.currentRank,
                   score0: fin_0.score0,
                   score1: fin_0.score1,
                   round: r_0,
                   ended: fin_0.ended,
                   chain: fin_0.chain };
    const tmp_0 = this._commitBoundary_0(b1_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(8n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(7n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(r_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_1 = fin_0.ended;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(9n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    if (this._equal_81(r_0, 6n)) {
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(9n),
                                                                                                alignment: _descriptor_2.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(true),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } }]);
    }
    return [];
  }
  _closeGame_0(context,
               partialProofData,
               finalP1Score_0,
               finalP2Score_0,
               finalWinner_0)
  {
    __compactRuntime.assert(!_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_2.toValue(10n),
                                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                                        { popeq: { cached: false,
                                                                                                   result: undefined } }]).value),
                            'Game already closed');
    __compactRuntime.assert(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(9n),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'Proven history has not reached game end');
    const b_0 = this._startBoundary_0(context, partialProofData);
    __compactRuntime.assert(this._equal_82(this._commitBoundary_0(b_0),
                                           _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_2.toValue(8n),
                                                                                                                                 alignment: _descriptor_2.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'boundary does not open stateRoot');
    __compactRuntime.assert(this._equal_83(b_0.round,
                                           _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_2.toValue(7n),
                                                                                                                                 alignment: _descriptor_2.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'boundary round mismatch');
    const threshold_0 = this._winThreshold_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                       partialProofData,
                                                                                                       [
                                                                                                        { dup: { n: 0 } },
                                                                                                        { idx: { cached: false,
                                                                                                                 pushPath: false,
                                                                                                                 path: [
                                                                                                                        { tag: 'value',
                                                                                                                          value: { value: _descriptor_2.toValue(2n),
                                                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                                                        { popeq: { cached: false,
                                                                                                                   result: undefined } }]).value));
    let t_0, t_1;
    const w_0 = (t_0 = b_0.score0, t_0 >= threshold_0) ?
                1n :
                (t_1 = b_0.score1, t_1 >= threshold_0) ? 2n : 0n;
    __compactRuntime.assert(this._equal_84(finalP1Score_0, b_0.score0)
                            &&
                            this._equal_85(finalP2Score_0, b_0.score1),
                            'final score mismatch');
    __compactRuntime.assert(this._equal_86(finalWinner_0, w_0),
                            'winner mismatch');
    const root_0 = this._commitTranscript_0(b_0.chain);
    const consent1_0 = this._p1CloseConsent_0(context, partialProofData);
    const consent2_0 = this._p2CloseConsent_0(context, partialProofData);
    const expected_0 = this._closeConsentFor_0(root_0,
                                               b_0.chain,
                                               b_0.score0,
                                               b_0.score1,
                                               w_0);
    __compactRuntime.assert(this._equal_87(this._playerIdFromPk_0(consent1_0.pk),
                                           _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_2.toValue(0n),
                                                                                                                                 alignment: _descriptor_2.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'P1 signer is not player one');
    __compactRuntime.assert(this._equal_88(this._playerIdFromPk_0(consent2_0.pk),
                                           _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_2.toValue(1n),
                                                                                                                                 alignment: _descriptor_2.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'P2 signer is not player two');
    __compactRuntime.assert(this._equal_89(consent1_0.credential, expected_0),
                            'P1 signed a different result');
    __compactRuntime.assert(this._equal_90(consent2_0.credential, expected_0),
                            'P2 signed a different result');
    this._assert_signed_by_0(context,
                             partialProofData,
                             consent1_0,
                             consent1_0.pk);
    this._assert_signed_by_0(context,
                             partialProofData,
                             consent2_0,
                             consent2_0.pk);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(11n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(root_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_0 = b_0.score0;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(12n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_1 = b_0.score1;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(13n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_1),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(14n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(w_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(10n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(true),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
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
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
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
  _mapper_0(f, a0) {
    let a = [];
    for (let i = 0; i < 13; i++) { a[i] = f(a0[i]); }
    return a;
  }
  _folder_0(f, x, a0) {
    for (let i = 0; i < 13; i++) { x = f(x, a0[i]); }
    return x;
  }
  _mapper_1(f, a0, a1) {
    let a = [];
    for (let i = 0; i < 13; i++) { a[i] = f(a0[i], a1[i]); }
    return a;
  }
  _folder_1(f, x, a0) {
    for (let i = 0; i < 13; i++) { x = f(x, a0[i]); }
    return x;
  }
  _equal_50(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_51(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_52(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_53(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_54(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_55(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_56(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_57(x0, y0) {
    if (x0 !== y0) { return false; }
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
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_62(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_63(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_64(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_65(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_66(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_67(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_68(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_69(x0, y0) {
    if (x0 !== y0) { return false; }
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
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_73(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_74(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_75(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_76(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_77(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_78(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_79(x0, y0) {
    {
      let x1 = x0.hand0;
      let y1 = y0.hand0;
      for (let i1 = 0; i1 < 13; i1++) {
        let x2 = x1[i1];
        let y2 = y1[i1];
        if (x2 !== y2) { return false; }
      }
    }
    {
      let x1 = x0.hand1;
      let y1 = y0.hand1;
      for (let i1 = 0; i1 < 13; i1++) {
        let x2 = x1[i1];
        let y2 = y1[i1];
        if (x2 !== y2) { return false; }
      }
    }
    {
      let x1 = x0.turn;
      let y1 = y0.turn;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.currentRank;
      let y1 = y0.currentRank;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.pending;
      let y1 = y0.pending;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.claimRank;
      let y1 = y0.claimRank;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.claimCount;
      let y1 = y0.claimCount;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.claimCards;
      let y1 = y0.claimCards;
      for (let i1 = 0; i1 < 4; i1++) {
        let x2 = x1[i1];
        let y2 = y1[i1];
        if (x2 !== y2) { return false; }
      }
    }
    {
      let x1 = x0.claimer;
      let y1 = y0.claimer;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.score0;
      let y1 = y0.score0;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.score1;
      let y1 = y0.score1;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.round;
      let y1 = y0.round;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.ended;
      let y1 = y0.ended;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.chain;
      let y1 = y0.chain;
      if (x1 !== y1) { return false; }
    }
    return true;
  }
  _equal_80(x0, y0) {
    {
      let x1 = x0.hand0;
      let y1 = y0.hand0;
      for (let i1 = 0; i1 < 13; i1++) {
        let x2 = x1[i1];
        let y2 = y1[i1];
        if (x2 !== y2) { return false; }
      }
    }
    {
      let x1 = x0.hand1;
      let y1 = y0.hand1;
      for (let i1 = 0; i1 < 13; i1++) {
        let x2 = x1[i1];
        let y2 = y1[i1];
        if (x2 !== y2) { return false; }
      }
    }
    {
      let x1 = x0.turn;
      let y1 = y0.turn;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.currentRank;
      let y1 = y0.currentRank;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.pending;
      let y1 = y0.pending;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.claimRank;
      let y1 = y0.claimRank;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.claimCount;
      let y1 = y0.claimCount;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.claimCards;
      let y1 = y0.claimCards;
      for (let i1 = 0; i1 < 4; i1++) {
        let x2 = x1[i1];
        let y2 = y1[i1];
        if (x2 !== y2) { return false; }
      }
    }
    {
      let x1 = x0.claimer;
      let y1 = y0.claimer;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.score0;
      let y1 = y0.score0;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.score1;
      let y1 = y0.score1;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.round;
      let y1 = y0.round;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.ended;
      let y1 = y0.ended;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.chain;
      let y1 = y0.chain;
      if (x1 !== y1) { return false; }
    }
    return true;
  }
  _folder_2(context, partialProofData, f, x, a0) {
    for (let i = 0; i < 26; i++) { x = f(context, partialProofData, x, a0[i]); }
    return x;
  }
  _equal_81(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_82(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_83(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_84(x0, y0) {
    if (x0 !== y0) { return false; }
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
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_88(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_89(x0, y0) {
    {
      let x1 = x0.sep;
      let y1 = y0.sep;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    {
      let x1 = x0.gameId;
      let y1 = y0.gameId;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    {
      let x1 = x0.transcriptRoot;
      let y1 = y0.transcriptRoot;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.p1Score;
      let y1 = y0.p1Score;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.p2Score;
      let y1 = y0.p2Score;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.winner;
      let y1 = y0.winner;
      if (x1 !== y1) { return false; }
    }
    return true;
  }
  _equal_90(x0, y0) {
    {
      let x1 = x0.sep;
      let y1 = y0.sep;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    {
      let x1 = x0.gameId;
      let y1 = y0.gameId;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    {
      let x1 = x0.transcriptRoot;
      let y1 = y0.transcriptRoot;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.p1Score;
      let y1 = y0.p1Score;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.p2Score;
      let y1 = y0.p2Score;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.winner;
      let y1 = y0.winner;
      if (x1 !== y1) { return false; }
    }
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
    get playerOne() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_2.toValue(0n),
                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get playerTwo() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_2.toValue(1n),
                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get mode() {
      return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_2.toValue(2n),
                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get p1EntropyCommit() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_2.toValue(3n),
                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get p2EntropyCommit() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_2.toValue(4n),
                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get p1RoundCommits() {
      return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_2.toValue(5n),
                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get p2RoundCommits() {
      return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_2.toValue(6n),
                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get roundsProven() {
      return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_2.toValue(7n),
                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get stateRoot() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_2.toValue(8n),
                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get ended() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_2.toValue(9n),
                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get closed() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_2.toValue(10n),
                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get transcriptRoot() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_2.toValue(11n),
                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get p1Score() {
      return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_2.toValue(12n),
                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get p2Score() {
      return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_2.toValue(13n),
                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get winner() {
      return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_2.toValue(14n),
                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({
  get_challenge_reduction: (...args) => undefined,
  entropyPair: (...args) => undefined,
  roundSecrets: (...args) => undefined,
  roundMoves: (...args) => undefined,
  roundSnapshots: (...args) => undefined,
  startBoundary: (...args) => undefined,
  p1CloseConsent: (...args) => undefined,
  p2CloseConsent: (...args) => undefined
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
                                 'proof-or-bluff-rollup-v3.compact line 67 char 1',
                                 'Bytes<32>',
                                 entropy_0)
    }
    return _dummyContract._commitEntropy_0(entropy_0);
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
                                 'proof-or-bluff-rollup-v3.compact line 72 char 1',
                                 'Bytes<32>',
                                 p1Entropy_0)
    }
    if (!(p2Entropy_0.buffer instanceof ArrayBuffer && p2Entropy_0.BYTES_PER_ELEMENT === 1 && p2Entropy_0.length === 32)) {
      __compactRuntime.typeError('combineEntropy',
                                 'argument 2',
                                 'proof-or-bluff-rollup-v3.compact line 72 char 1',
                                 'Bytes<32>',
                                 p2Entropy_0)
    }
    return _dummyContract._combineEntropy_0(p1Entropy_0, p2Entropy_0);
  },
  commitRoundSecret: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`commitRoundSecret: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const secret_0 = args_0[0];
    const round_0 = args_0[1];
    if (!(secret_0.buffer instanceof ArrayBuffer && secret_0.BYTES_PER_ELEMENT === 1 && secret_0.length === 32)) {
      __compactRuntime.typeError('commitRoundSecret',
                                 'argument 1',
                                 'proof-or-bluff-rollup-v3.compact line 77 char 1',
                                 'Bytes<32>',
                                 secret_0)
    }
    if (!(typeof(round_0) === 'bigint' && round_0 >= 0n && round_0 <= 255n)) {
      __compactRuntime.typeError('commitRoundSecret',
                                 'argument 2',
                                 'proof-or-bluff-rollup-v3.compact line 77 char 1',
                                 'Uint<0..256>',
                                 round_0)
    }
    return _dummyContract._commitRoundSecret_0(secret_0, round_0);
  },
  commitPlayCards: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`commitPlayCards: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const cards_0 = args_0[0];
    const playSalt_0 = args_0[1];
    if (!(Array.isArray(cards_0) && cards_0.length === 4 && cards_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 255n))) {
      __compactRuntime.typeError('commitPlayCards',
                                 'argument 1',
                                 'proof-or-bluff-rollup-v3.compact line 82 char 1',
                                 'Vector<4, Uint<0..256>>',
                                 cards_0)
    }
    if (!(typeof(playSalt_0) === 'bigint' && playSalt_0 >= 0 && playSalt_0 <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('commitPlayCards',
                                 'argument 2',
                                 'proof-or-bluff-rollup-v3.compact line 82 char 1',
                                 'Field',
                                 playSalt_0)
    }
    return _dummyContract._commitPlayCards_0(cards_0, playSalt_0);
  },
  chainMove: (...args_0) => {
    if (args_0.length !== 5) {
      throw new __compactRuntime.CompactError(`chainMove: expected 5 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const prev_0 = args_0[0];
    const kind_0 = args_0[1];
    const rank_0 = args_0[2];
    const count_0 = args_0[3];
    const playCommit_0 = args_0[4];
    if (!(typeof(prev_0) === 'bigint' && prev_0 >= 0 && prev_0 <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('chainMove',
                                 'argument 1',
                                 'proof-or-bluff-rollup-v3.compact line 87 char 1',
                                 'Field',
                                 prev_0)
    }
    if (!(typeof(kind_0) === 'bigint' && kind_0 >= 0n && kind_0 <= 255n)) {
      __compactRuntime.typeError('chainMove',
                                 'argument 2',
                                 'proof-or-bluff-rollup-v3.compact line 87 char 1',
                                 'Uint<0..256>',
                                 kind_0)
    }
    if (!(typeof(rank_0) === 'bigint' && rank_0 >= 0n && rank_0 <= 255n)) {
      __compactRuntime.typeError('chainMove',
                                 'argument 3',
                                 'proof-or-bluff-rollup-v3.compact line 87 char 1',
                                 'Uint<0..256>',
                                 rank_0)
    }
    if (!(typeof(count_0) === 'bigint' && count_0 >= 0n && count_0 <= 255n)) {
      __compactRuntime.typeError('chainMove',
                                 'argument 4',
                                 'proof-or-bluff-rollup-v3.compact line 87 char 1',
                                 'Uint<0..256>',
                                 count_0)
    }
    if (!(typeof(playCommit_0) === 'bigint' && playCommit_0 >= 0 && playCommit_0 <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('chainMove',
                                 'argument 5',
                                 'proof-or-bluff-rollup-v3.compact line 87 char 1',
                                 'Field',
                                 playCommit_0)
    }
    return _dummyContract._chainMove_0(prev_0,
                                       kind_0,
                                       rank_0,
                                       count_0,
                                       playCommit_0);
  },
  playerIdFromPk: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`playerIdFromPk: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const pk_0 = args_0[0];
    return _dummyContract._playerIdFromPk_0(pk_0);
  },
  closeConsentFor: (...args_0) => {
    if (args_0.length !== 5) {
      throw new __compactRuntime.CompactError(`closeConsentFor: expected 5 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const gameId_0 = args_0[0];
    const transcriptRoot_0 = args_0[1];
    const p1Score_0 = args_0[2];
    const p2Score_0 = args_0[3];
    const winner_0 = args_0[4];
    if (!(gameId_0.buffer instanceof ArrayBuffer && gameId_0.BYTES_PER_ELEMENT === 1 && gameId_0.length === 32)) {
      __compactRuntime.typeError('closeConsentFor',
                                 'argument 1',
                                 'proof-or-bluff-rollup-v3.compact line 101 char 1',
                                 'Bytes<32>',
                                 gameId_0)
    }
    if (!(typeof(transcriptRoot_0) === 'bigint' && transcriptRoot_0 >= 0 && transcriptRoot_0 <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('closeConsentFor',
                                 'argument 2',
                                 'proof-or-bluff-rollup-v3.compact line 101 char 1',
                                 'Field',
                                 transcriptRoot_0)
    }
    if (!(typeof(p1Score_0) === 'bigint' && p1Score_0 >= 0n && p1Score_0 <= 255n)) {
      __compactRuntime.typeError('closeConsentFor',
                                 'argument 3',
                                 'proof-or-bluff-rollup-v3.compact line 101 char 1',
                                 'Uint<0..256>',
                                 p1Score_0)
    }
    if (!(typeof(p2Score_0) === 'bigint' && p2Score_0 >= 0n && p2Score_0 <= 255n)) {
      __compactRuntime.typeError('closeConsentFor',
                                 'argument 4',
                                 'proof-or-bluff-rollup-v3.compact line 101 char 1',
                                 'Uint<0..256>',
                                 p2Score_0)
    }
    if (!(typeof(winner_0) === 'bigint' && winner_0 >= 0n && winner_0 <= 255n)) {
      __compactRuntime.typeError('closeConsentFor',
                                 'argument 5',
                                 'proof-or-bluff-rollup-v3.compact line 101 char 1',
                                 'Uint<0..256>',
                                 winner_0)
    }
    return _dummyContract._closeConsentFor_0(gameId_0,
                                             transcriptRoot_0,
                                             p1Score_0,
                                             p2Score_0,
                                             winner_0);
  },
  closeConsentChallenge: (...args_0) => {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`closeConsentChallenge: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const r_0 = args_0[0];
    const pk_0 = args_0[1];
    const consent_0 = args_0[2];
    if (!(typeof(consent_0) === 'object' && consent_0.sep.buffer instanceof ArrayBuffer && consent_0.sep.BYTES_PER_ELEMENT === 1 && consent_0.sep.length === 32 && consent_0.gameId.buffer instanceof ArrayBuffer && consent_0.gameId.BYTES_PER_ELEMENT === 1 && consent_0.gameId.length === 32 && typeof(consent_0.transcriptRoot) === 'bigint' && consent_0.transcriptRoot >= 0 && consent_0.transcriptRoot <= __compactRuntime.MAX_FIELD && typeof(consent_0.p1Score) === 'bigint' && consent_0.p1Score >= 0n && consent_0.p1Score <= 255n && typeof(consent_0.p2Score) === 'bigint' && consent_0.p2Score >= 0n && consent_0.p2Score <= 255n && typeof(consent_0.winner) === 'bigint' && consent_0.winner >= 0n && consent_0.winner <= 255n)) {
      __compactRuntime.typeError('closeConsentChallenge',
                                 'argument 3',
                                 'proof-or-bluff-rollup-v3.compact line 112 char 1',
                                 'struct CloseConsent<sep: Bytes<32>, gameId: Bytes<32>, transcriptRoot: Field, p1Score: Uint<0..256>, p2Score: Uint<0..256>, winner: Uint<0..256>>',
                                 consent_0)
    }
    return _dummyContract._closeConsentChallenge_0(r_0, pk_0, consent_0);
  },
  closeConsentK: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`closeConsentK: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const sk_0 = args_0[0];
    const consent_0 = args_0[1];
    if (!(typeof(sk_0) === 'bigint' && sk_0 >= 0 && sk_0 <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('closeConsentK',
                                 'argument 1',
                                 'proof-or-bluff-rollup-v3.compact line 115 char 1',
                                 'Field',
                                 sk_0)
    }
    if (!(typeof(consent_0) === 'object' && consent_0.sep.buffer instanceof ArrayBuffer && consent_0.sep.BYTES_PER_ELEMENT === 1 && consent_0.sep.length === 32 && consent_0.gameId.buffer instanceof ArrayBuffer && consent_0.gameId.BYTES_PER_ELEMENT === 1 && consent_0.gameId.length === 32 && typeof(consent_0.transcriptRoot) === 'bigint' && consent_0.transcriptRoot >= 0 && consent_0.transcriptRoot <= __compactRuntime.MAX_FIELD && typeof(consent_0.p1Score) === 'bigint' && consent_0.p1Score >= 0n && consent_0.p1Score <= 255n && typeof(consent_0.p2Score) === 'bigint' && consent_0.p2Score >= 0n && consent_0.p2Score <= 255n && typeof(consent_0.winner) === 'bigint' && consent_0.winner >= 0n && consent_0.winner <= 255n)) {
      __compactRuntime.typeError('closeConsentK',
                                 'argument 2',
                                 'proof-or-bluff-rollup-v3.compact line 115 char 1',
                                 'struct CloseConsent<sep: Bytes<32>, gameId: Bytes<32>, transcriptRoot: Field, p1Score: Uint<0..256>, p2Score: Uint<0..256>, winner: Uint<0..256>>',
                                 consent_0)
    }
    return _dummyContract._closeConsentK_0(sk_0, consent_0);
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
                                 'proof-or-bluff-rollup-v3.compact line 166 char 1',
                                 'Bytes<32>',
                                 salt_0)
    }
    if (!(typeof(seed_0) === 'bigint' && seed_0 >= 0 && seed_0 <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('dealHandRanks',
                                 'argument 2',
                                 'proof-or-bluff-rollup-v3.compact line 166 char 1',
                                 'Field',
                                 seed_0)
    }
    if (!(typeof(round_0) === 'bigint' && round_0 >= 0n && round_0 <= 4294967295n)) {
      __compactRuntime.typeError('dealHandRanks',
                                 'argument 3',
                                 'proof-or-bluff-rollup-v3.compact line 166 char 1',
                                 'Uint<0..4294967296>',
                                 round_0)
    }
    if (!(typeof(size_0) === 'bigint' && size_0 >= 0n && size_0 <= 4294967295n)) {
      __compactRuntime.typeError('dealHandRanks',
                                 'argument 4',
                                 'proof-or-bluff-rollup-v3.compact line 166 char 1',
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
                                 'proof-or-bluff-rollup-v3.compact line 181 char 1',
                                 'Vector<7, Uint<0..256>>',
                                 ranks_0)
    }
    if (!(typeof(size_0) === 'bigint' && size_0 >= 0n && size_0 <= 4294967295n)) {
      __compactRuntime.typeError('handCountsFromRanks',
                                 'argument 2',
                                 'proof-or-bluff-rollup-v3.compact line 181 char 1',
                                 'Uint<0..4294967296>',
                                 size_0)
    }
    return _dummyContract._handCountsFromRanks_0(ranks_0, size_0);
  },
  commitBoundary: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`commitBoundary: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const b_0 = args_0[0];
    if (!(typeof(b_0) === 'object' && typeof(b_0.turn) === 'bigint' && b_0.turn >= 0n && b_0.turn <= 255n && typeof(b_0.currentRank) === 'bigint' && b_0.currentRank >= 0n && b_0.currentRank <= 255n && typeof(b_0.score0) === 'bigint' && b_0.score0 >= 0n && b_0.score0 <= 255n && typeof(b_0.score1) === 'bigint' && b_0.score1 >= 0n && b_0.score1 <= 255n && typeof(b_0.round) === 'bigint' && b_0.round >= 0n && b_0.round <= 255n && typeof(b_0.ended) === 'boolean' && typeof(b_0.chain) === 'bigint' && b_0.chain >= 0 && b_0.chain <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('commitBoundary',
                                 'argument 1',
                                 'proof-or-bluff-rollup-v3.compact line 244 char 1',
                                 'struct Boundary<turn: Uint<0..256>, currentRank: Uint<0..256>, score0: Uint<0..256>, score1: Uint<0..256>, round: Uint<0..256>, ended: Boolean, chain: Field>',
                                 b_0)
    }
    return _dummyContract._commitBoundary_0(b_0);
  },
  commitTranscript: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`commitTranscript: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const chain_0 = args_0[0];
    if (!(typeof(chain_0) === 'bigint' && chain_0 >= 0 && chain_0 <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('commitTranscript',
                                 'argument 1',
                                 'proof-or-bluff-rollup-v3.compact line 249 char 1',
                                 'Field',
                                 chain_0)
    }
    return _dummyContract._commitTranscript_0(chain_0);
  }
};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
