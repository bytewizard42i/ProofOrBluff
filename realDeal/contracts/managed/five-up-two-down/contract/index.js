import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

const _descriptor_0 = __compactRuntime.CompactTypeBoolean;

const _descriptor_1 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_2 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_3 = new __compactRuntime.CompactTypeVector(10, _descriptor_2);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_2.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.bytes);
  }
}

const _descriptor_4 = new _ContractAddress_0();

const _descriptor_5 = __compactRuntime.CompactTypeField;

class _CloseConsent_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_5.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment())))));
  }
  fromValue(value_0) {
    return {
      sep: _descriptor_2.fromValue(value_0),
      gameId: _descriptor_2.fromValue(value_0),
      transcriptRoot: _descriptor_5.fromValue(value_0),
      p1Score: _descriptor_1.fromValue(value_0),
      p2Score: _descriptor_1.fromValue(value_0),
      winner: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.sep).concat(_descriptor_2.toValue(value_0.gameId).concat(_descriptor_5.toValue(value_0.transcriptRoot).concat(_descriptor_1.toValue(value_0.p1Score).concat(_descriptor_1.toValue(value_0.p2Score).concat(_descriptor_1.toValue(value_0.winner))))));
  }
}

const _descriptor_6 = new _CloseConsent_0();

const _descriptor_7 = __compactRuntime.CompactTypeJubjubPoint;

class _Signature_0 {
  alignment() {
    return _descriptor_7.alignment().concat(_descriptor_5.alignment());
  }
  fromValue(value_0) {
    return {
      r: _descriptor_7.fromValue(value_0),
      s: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_7.toValue(value_0.r).concat(_descriptor_5.toValue(value_0.s));
  }
}

const _descriptor_8 = new _Signature_0();

class _SignedCredential_0 {
  alignment() {
    return _descriptor_6.alignment().concat(_descriptor_8.alignment().concat(_descriptor_7.alignment()));
  }
  fromValue(value_0) {
    return {
      credential: _descriptor_6.fromValue(value_0),
      signature: _descriptor_8.fromValue(value_0),
      pk: _descriptor_7.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_6.toValue(value_0.credential).concat(_descriptor_8.toValue(value_0.signature).concat(_descriptor_7.toValue(value_0.pk)));
  }
}

const _descriptor_9 = new _SignedCredential_0();

class _Boundary_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_0.alignment().concat(_descriptor_1.alignment().concat(_descriptor_5.alignment()))))));
  }
  fromValue(value_0) {
    return {
      turn: _descriptor_1.fromValue(value_0),
      score0: _descriptor_1.fromValue(value_0),
      score1: _descriptor_1.fromValue(value_0),
      round: _descriptor_1.fromValue(value_0),
      ended: _descriptor_0.fromValue(value_0),
      winner: _descriptor_1.fromValue(value_0),
      chain: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.turn).concat(_descriptor_1.toValue(value_0.score0).concat(_descriptor_1.toValue(value_0.score1).concat(_descriptor_1.toValue(value_0.round).concat(_descriptor_0.toValue(value_0.ended).concat(_descriptor_1.toValue(value_0.winner).concat(_descriptor_5.toValue(value_0.chain)))))));
  }
}

const _descriptor_10 = new _Boundary_0();

const _descriptor_11 = new __compactRuntime.CompactTypeVector(13, _descriptor_1);

class _Move_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment())));
  }
  fromValue(value_0) {
    return {
      kind: _descriptor_1.fromValue(value_0),
      count: _descriptor_1.fromValue(value_0),
      rankA: _descriptor_1.fromValue(value_0),
      rankB: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.kind).concat(_descriptor_1.toValue(value_0.count).concat(_descriptor_1.toValue(value_0.rankA).concat(_descriptor_1.toValue(value_0.rankB))));
  }
}

const _descriptor_12 = new _Move_0();

const _descriptor_13 = new __compactRuntime.CompactTypeVector(4, _descriptor_12);

const _descriptor_14 = new __compactRuntime.CompactTypeVector(32, _descriptor_1);

class _tuple_0 {
  alignment() {
    return _descriptor_14.alignment().concat(_descriptor_14.alignment().concat(_descriptor_14.alignment()));
  }
  fromValue(value_0) {
    return [
      _descriptor_14.fromValue(value_0),
      _descriptor_14.fromValue(value_0),
      _descriptor_14.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_14.toValue(value_0[0]).concat(_descriptor_14.toValue(value_0[1]).concat(_descriptor_14.toValue(value_0[2])));
  }
}

const _descriptor_15 = new _tuple_0();

class _tuple_1 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_2.alignment());
  }
  fromValue(value_0) {
    return [
      _descriptor_2.fromValue(value_0),
      _descriptor_2.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0[0]).concat(_descriptor_2.toValue(value_0[1]));
  }
}

const _descriptor_16 = new _tuple_1();

const _descriptor_17 = new __compactRuntime.CompactTypeVector(2, _descriptor_1);

const _descriptor_18 = new __compactRuntime.CompactTypeVector(5, _descriptor_1);

class _Outcome_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment())));
  }
  fromValue(value_0) {
    return {
      claimantGain: _descriptor_1.fromValue(value_0),
      claimantLoss: _descriptor_1.fromValue(value_0),
      responderGain: _descriptor_1.fromValue(value_0),
      lies: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.claimantGain).concat(_descriptor_1.toValue(value_0.claimantLoss).concat(_descriptor_1.toValue(value_0.responderGain).concat(_descriptor_1.toValue(value_0.lies))));
  }
}

const _descriptor_19 = new _Outcome_0();

const _descriptor_20 = new __compactRuntime.CompactTypeVector(9, _descriptor_1);

const _descriptor_21 = new __compactRuntime.CompactTypeVector(4, _descriptor_1);

const _descriptor_22 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

const _descriptor_23 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

class _Nonce_0 {
  alignment() {
    return _descriptor_5.alignment().concat(_descriptor_6.alignment());
  }
  fromValue(value_0) {
    return {
      sk: _descriptor_5.fromValue(value_0),
      credential: _descriptor_6.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_5.toValue(value_0.sk).concat(_descriptor_6.toValue(value_0.credential));
  }
}

const _descriptor_24 = new _Nonce_0();

const _descriptor_25 = new __compactRuntime.CompactTypeUnsignedInteger(127n, 1);

const _descriptor_26 = new __compactRuntime.CompactTypeUnsignedInteger(452312848583266388373324160190187140051835877600158453279131187530910662655n, 31);

class _tuple_2 {
  alignment() {
    return _descriptor_25.alignment().concat(_descriptor_26.alignment());
  }
  fromValue(value_0) {
    return [
      _descriptor_25.fromValue(value_0),
      _descriptor_26.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_25.toValue(value_0[0]).concat(_descriptor_26.toValue(value_0[1]));
  }
}

const _descriptor_27 = new _tuple_2();

class _ResultCommitInput_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_5.alignment());
  }
  fromValue(value_0) {
    return {
      separator: _descriptor_2.fromValue(value_0),
      chain: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.separator).concat(_descriptor_5.toValue(value_0.chain));
  }
}

const _descriptor_28 = new _ResultCommitInput_0();

class _PlayerIdPreimage_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_5.alignment().concat(_descriptor_5.alignment()));
  }
  fromValue(value_0) {
    return {
      separator: _descriptor_2.fromValue(value_0),
      x: _descriptor_5.fromValue(value_0),
      y: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.separator).concat(_descriptor_5.toValue(value_0.x).concat(_descriptor_5.toValue(value_0.y)));
  }
}

const _descriptor_29 = new _PlayerIdPreimage_0();

class _BoundaryCommitInput_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_10.alignment());
  }
  fromValue(value_0) {
    return {
      separator: _descriptor_2.fromValue(value_0),
      b: _descriptor_10.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.separator).concat(_descriptor_10.toValue(value_0.b));
  }
}

const _descriptor_30 = new _BoundaryCommitInput_0();

class _EntropyCommitInput_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_2.alignment());
  }
  fromValue(value_0) {
    return {
      separator: _descriptor_2.fromValue(value_0),
      entropy: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.separator).concat(_descriptor_2.toValue(value_0.entropy));
  }
}

const _descriptor_31 = new _EntropyCommitInput_0();

class _RoundSecretCommitInput_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_1.alignment()));
  }
  fromValue(value_0) {
    return {
      separator: _descriptor_2.fromValue(value_0),
      secret: _descriptor_2.fromValue(value_0),
      round: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.separator).concat(_descriptor_2.toValue(value_0.secret).concat(_descriptor_1.toValue(value_0.round)));
  }
}

const _descriptor_32 = new _RoundSecretCommitInput_0();

class _Challenge_0 {
  alignment() {
    return _descriptor_7.alignment().concat(_descriptor_7.alignment().concat(_descriptor_5.alignment()));
  }
  fromValue(value_0) {
    return {
      r: _descriptor_7.fromValue(value_0),
      pk: _descriptor_7.fromValue(value_0),
      ch: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_7.toValue(value_0.r).concat(_descriptor_7.toValue(value_0.pk).concat(_descriptor_5.toValue(value_0.ch)));
  }
}

const _descriptor_33 = new _Challenge_0();

class _DealInput_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_5.alignment().concat(_descriptor_22.alignment()))));
  }
  fromValue(value_0) {
    return {
      separator: _descriptor_2.fromValue(value_0),
      salt0: _descriptor_2.fromValue(value_0),
      salt1: _descriptor_2.fromValue(value_0),
      seed: _descriptor_5.fromValue(value_0),
      round: _descriptor_22.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.separator).concat(_descriptor_2.toValue(value_0.salt0).concat(_descriptor_2.toValue(value_0.salt1).concat(_descriptor_5.toValue(value_0.seed).concat(_descriptor_22.toValue(value_0.round)))));
  }
}

const _descriptor_34 = new _DealInput_0();

class _tuple_3 {
  alignment() {
    return _descriptor_5.alignment().concat(_descriptor_18.alignment());
  }
  fromValue(value_0) {
    return [
      _descriptor_5.fromValue(value_0),
      _descriptor_18.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_5.toValue(value_0[0]).concat(_descriptor_18.toValue(value_0[1]));
  }
}

const _descriptor_35 = new _tuple_3();

class _tuple_4 {
  alignment() {
    return _descriptor_5.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment())))));
  }
  fromValue(value_0) {
    return [
      _descriptor_5.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_1.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_5.toValue(value_0[0]).concat(_descriptor_1.toValue(value_0[1]).concat(_descriptor_1.toValue(value_0[2]).concat(_descriptor_1.toValue(value_0[3]).concat(_descriptor_1.toValue(value_0[4]).concat(_descriptor_1.toValue(value_0[5]))))));
  }
}

const _descriptor_36 = new _tuple_4();

class _SeedInput_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment()));
  }
  fromValue(value_0) {
    return {
      separator: _descriptor_2.fromValue(value_0),
      p1Entropy: _descriptor_2.fromValue(value_0),
      p2Entropy: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.separator).concat(_descriptor_2.toValue(value_0.p1Entropy).concat(_descriptor_2.toValue(value_0.p2Entropy)));
  }
}

const _descriptor_37 = new _SeedInput_0();

const _descriptor_38 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

class _Either_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_0.fromValue(value_0),
      left: _descriptor_2.fromValue(value_0),
      right: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.is_left).concat(_descriptor_2.toValue(value_0.left).concat(_descriptor_2.toValue(value_0.right)));
  }
}

const _descriptor_39 = new _Either_0();

const _descriptor_40 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

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
    if (typeof(witnesses_0.roundDigests) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named roundDigests');
    }
    if (typeof(witnesses_0.dealtCards) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named dealtCards');
    }
    if (typeof(witnesses_0.dealtRanks) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named dealtRanks');
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
      chainBoard(context, ...args_1) {
        return { result: pureCircuits.chainBoard(...args_1), context };
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
      dealDigest(context, ...args_1) {
        return { result: pureCircuits.dealDigest(...args_1), context };
      },
      shuffleDigest(context, ...args_1) {
        return { result: pureCircuits.shuffleDigest(...args_1), context };
      },
      showdownDigest(context, ...args_1) {
        return { result: pureCircuits.showdownDigest(...args_1), context };
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
                                     'five-up-two-down.compact line 470 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(round_0) === 'bigint' && round_0 >= 0n && round_0 <= 255n)) {
          __compactRuntime.typeError('proveRound',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'five-up-two-down.compact line 470 char 1',
                                     'Uint<0..256>',
                                     round_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(round_0),
            alignment: _descriptor_1.alignment()
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
                                     'five-up-two-down.compact line 548 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(finalP1Score_0) === 'bigint' && finalP1Score_0 >= 0n && finalP1Score_0 <= 255n)) {
          __compactRuntime.typeError('closeGame',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'five-up-two-down.compact line 548 char 1',
                                     'Uint<0..256>',
                                     finalP1Score_0)
        }
        if (!(typeof(finalP2Score_0) === 'bigint' && finalP2Score_0 >= 0n && finalP2Score_0 <= 255n)) {
          __compactRuntime.typeError('closeGame',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'five-up-two-down.compact line 548 char 1',
                                     'Uint<0..256>',
                                     finalP2Score_0)
        }
        if (!(typeof(finalWinner_0) === 'bigint' && finalWinner_0 >= 0n && finalWinner_0 <= 255n)) {
          __compactRuntime.typeError('closeGame',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'five-up-two-down.compact line 548 char 1',
                                     'Uint<0..256>',
                                     finalWinner_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(finalP1Score_0).concat(_descriptor_1.toValue(finalP2Score_0).concat(_descriptor_1.toValue(finalWinner_0))),
            alignment: _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment()))
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
                                 'five-up-two-down.compact line 439 char 1',
                                 'Bytes<32>',
                                 playerOneId_0)
    }
    if (!(playerTwoId_0.buffer instanceof ArrayBuffer && playerTwoId_0.BYTES_PER_ELEMENT === 1 && playerTwoId_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 2 (argument 3 as invoked from Typescript)',
                                 'five-up-two-down.compact line 439 char 1',
                                 'Bytes<32>',
                                 playerTwoId_0)
    }
    if (!(typeof(gameMode_0) === 'bigint' && gameMode_0 >= 0n && gameMode_0 <= 255n)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 3 (argument 4 as invoked from Typescript)',
                                 'five-up-two-down.compact line 439 char 1',
                                 'Uint<0..256>',
                                 gameMode_0)
    }
    if (!(p1Entropy_0.buffer instanceof ArrayBuffer && p1Entropy_0.BYTES_PER_ELEMENT === 1 && p1Entropy_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 4 (argument 5 as invoked from Typescript)',
                                 'five-up-two-down.compact line 439 char 1',
                                 'Bytes<32>',
                                 p1Entropy_0)
    }
    if (!(p2Entropy_0.buffer instanceof ArrayBuffer && p2Entropy_0.BYTES_PER_ELEMENT === 1 && p2Entropy_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 5 (argument 6 as invoked from Typescript)',
                                 'five-up-two-down.compact line 439 char 1',
                                 'Bytes<32>',
                                 p2Entropy_0)
    }
    if (!(Array.isArray(p1Rounds_0) && p1Rounds_0.length === 10 && p1Rounds_0.every((t) => t.buffer instanceof ArrayBuffer && t.BYTES_PER_ELEMENT === 1 && t.length === 32))) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 6 (argument 7 as invoked from Typescript)',
                                 'five-up-two-down.compact line 439 char 1',
                                 'Vector<10, Bytes<32>>',
                                 p1Rounds_0)
    }
    if (!(Array.isArray(p2Rounds_0) && p2Rounds_0.length === 10 && p2Rounds_0.every((t) => t.buffer instanceof ArrayBuffer && t.BYTES_PER_ELEMENT === 1 && t.length === 32))) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 7 (argument 8 as invoked from Typescript)',
                                 'five-up-two-down.compact line 439 char 1',
                                 'Vector<10, Bytes<32>>',
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
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(1n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(2n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(3n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(4n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(5n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(new Array(10).fill(new Uint8Array(32))),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(6n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(new Array(10).fill(new Uint8Array(32))),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(7n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(8n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(9n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(false),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(10n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(false),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(11n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(12n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(13n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(14n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const m_0 = gameMode_0;
    __compactRuntime.assert(this._equal_0(m_0, 0n) || this._equal_1(m_0, 1n),
                            'mode must be CASUAL (0) or STANDARD (1)');
    const p1_0 = playerOneId_0;
    const p2_0 = playerTwoId_0;
    __compactRuntime.assert(!this._equal_2(p1_0, p2_0), 'Players must differ');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p1_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(1n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p2_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(2n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(m_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const e1_0 = p1Entropy_0;
    const e2_0 = p2Entropy_0;
    __compactRuntime.assert(!this._equal_3(e1_0, e2_0),
                            'Entropy commitments must differ');
    const r1_0 = p1Rounds_0;
    const r2_0 = p2Rounds_0;
    this._folder_0(context,
                   partialProofData,
                   ((context, partialProofData, t_0, i_0) =>
                    {
                      __compactRuntime.assert(!this._equal_4(r1_0[i_0],
                                                             r2_0[i_0]),
                                              'Round-secret commitments must differ');
                      return t_0;
                    }),
                   [],
                   [0n, 1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(3n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(e1_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(4n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(e2_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(5n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(r1_0),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(6n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(r2_0),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_0 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(7n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(9n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(false),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(10n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(false),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_1 = this._commitBoundary_0({ turn: 0n,
                                           score0: 0n,
                                           score1: 0n,
                                           round: 0n,
                                           ended: false,
                                           winner: 0n,
                                           chain: 0n });
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(8n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_1),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_2 = new Uint8Array(32);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(11n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_2),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_3 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(12n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_3),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_4 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(13n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_4),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_5 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(14n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_5),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _transientHash_0(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_37, value_0);
    return result_0;
  }
  _transientHash_1(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_35, value_0);
    return result_0;
  }
  _transientHash_2(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_36, value_0);
    return result_0;
  }
  _transientHash_3(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_24, value_0);
    return result_0;
  }
  _transientHash_4(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_34, value_0);
    return result_0;
  }
  _transientHash_5(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_6, value_0);
    return result_0;
  }
  _transientHash_6(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_33, value_0);
    return result_0;
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_31, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_32, value_0);
    return result_0;
  }
  _persistentHash_2(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_29, value_0);
    return result_0;
  }
  _persistentHash_3(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_30, value_0);
    return result_0;
  }
  _persistentHash_4(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_28, value_0);
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
    if (!(Array.isArray(result_0) && result_0.length === 2  && typeof(result_0[0]) === 'bigint' && result_0[0] >= 0n && result_0[0] <= 127n && typeof(result_0[1]) === 'bigint' && result_0[1] >= 0n && result_0[1] <= 452312848583266388373324160190187140051835877600158453279131187530910662655n)) {
      __compactRuntime.typeError('get_challenge_reduction',
                                 'return value',
                                 'signed_credential.compact line 64 char 3',
                                 '[Uint<0..128>, Uint<0..452312848583266388373324160190187140051835877600158453279131187530910662656>]',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_27.toValue(result_0),
      alignment: _descriptor_27.alignment()
    });
    return result_0;
  }
  _compute_challenge_0(r_0, pk_0, credential_0) {
    const credential_hash_0 = this._transientHash_5(credential_0);
    return this._transientHash_6({ r: r_0, pk: pk_0, ch: credential_hash_0 });
  }
  _deterministic_k_0(nonce_0) { return this._transientHash_3(nonce_0); }
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
  _chainBoard_0(prev_0, board_0) {
    return this._transientHash_1([prev_0, board_0]);
  }
  _chainMove_0(prev_0, kind_0, count_0, rankA_0, rankB_0, lies_0) {
    return this._transientHash_2([prev_0,
                                  kind_0,
                                  count_0,
                                  rankA_0,
                                  rankB_0,
                                  lies_0]);
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
               new Uint8Array([112, 111, 98, 58, 53, 117, 50, 100, 58, 99, 108, 111, 115, 101, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
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
                    throw new __compactRuntime.CompactError('five-up-two-down.compact line 106 char 13: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 65535');
                  }
                  return t1;
                })(hi_0 * 256n + lo_0);
    const p_0 = ((t1) => {
                  if (t1 > 4294967295n) {
                    throw new __compactRuntime.CompactError('five-up-two-down.compact line 107 char 13: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                  }
                  return t1;
                })(u_0 * m_0);
    const pb_0 = Array.from(__compactRuntime.convertFieldToBytes(3,
                                                                 p_0,
                                                                 'five-up-two-down.compact line 108 char 15'),
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
  _dealNineIdx_0(b_0) {
    const c0_0 = this._boundedDraw_0(b_0[0], b_0[1], 44n);
    const t1_0 = this._boundedDraw_0(b_0[2], b_0[3], 45n);
    const c1_0 = this._equal_5(t1_0, c0_0) ? 44n : t1_0;
    const t2_0 = this._boundedDraw_0(b_0[4], b_0[5], 46n);
    const c2_0 = this._equal_6(t2_0, c0_0) || this._equal_7(t2_0, c1_0) ?
                 45n :
                 t2_0;
    const t3_0 = this._boundedDraw_0(b_0[6], b_0[7], 47n);
    const c3_0 = this._equal_8(t3_0, c0_0) || this._equal_9(t3_0, c1_0)
                 ||
                 this._equal_10(t3_0, c2_0)
                 ?
                 46n :
                 t3_0;
    const t4_0 = this._boundedDraw_0(b_0[8], b_0[9], 48n);
    const c4_0 = this._equal_11(t4_0, c0_0) || this._equal_12(t4_0, c1_0)
                 ||
                 this._equal_13(t4_0, c2_0)
                 ||
                 this._equal_14(t4_0, c3_0)
                 ?
                 47n :
                 t4_0;
    const t5_0 = this._boundedDraw_0(b_0[10], b_0[11], 49n);
    const c5_0 = this._equal_15(t5_0, c0_0) || this._equal_16(t5_0, c1_0)
                 ||
                 this._equal_17(t5_0, c2_0)
                 ||
                 this._equal_18(t5_0, c3_0)
                 ||
                 this._equal_19(t5_0, c4_0)
                 ?
                 48n :
                 t5_0;
    const t6_0 = this._boundedDraw_0(b_0[12], b_0[13], 50n);
    const c6_0 = this._equal_20(t6_0, c0_0) || this._equal_21(t6_0, c1_0)
                 ||
                 this._equal_22(t6_0, c2_0)
                 ||
                 this._equal_23(t6_0, c3_0)
                 ||
                 this._equal_24(t6_0, c4_0)
                 ||
                 this._equal_25(t6_0, c5_0)
                 ?
                 49n :
                 t6_0;
    const t7_0 = this._boundedDraw_0(b_0[14], b_0[15], 51n);
    const c7_0 = this._equal_26(t7_0, c0_0) || this._equal_27(t7_0, c1_0)
                 ||
                 this._equal_28(t7_0, c2_0)
                 ||
                 this._equal_29(t7_0, c3_0)
                 ||
                 this._equal_30(t7_0, c4_0)
                 ||
                 this._equal_31(t7_0, c5_0)
                 ||
                 this._equal_32(t7_0, c6_0)
                 ?
                 50n :
                 t7_0;
    const t8_0 = this._boundedDraw_0(b_0[16], b_0[17], 52n);
    const c8_0 = this._equal_33(t8_0, c0_0) || this._equal_34(t8_0, c1_0)
                 ||
                 this._equal_35(t8_0, c2_0)
                 ||
                 this._equal_36(t8_0, c3_0)
                 ||
                 this._equal_37(t8_0, c4_0)
                 ||
                 this._equal_38(t8_0, c5_0)
                 ||
                 this._equal_39(t8_0, c6_0)
                 ||
                 this._equal_40(t8_0, c7_0)
                 ?
                 51n :
                 t8_0;
    return [c0_0, c1_0, c2_0, c3_0, c4_0, c5_0, c6_0, c7_0, c8_0];
  }
  _shuffle9_0(v_0, s_0) {
    const k0_0 = ((t1) => {
                   if (t1 > 65535n) {
                     throw new __compactRuntime.CompactError('five-up-two-down.compact line 148 char 14: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 65535');
                   }
                   return t1;
                 })(s_0[0] * 256n + s_0[1]);
    const k1_0 = ((t1) => {
                   if (t1 > 65535n) {
                     throw new __compactRuntime.CompactError('five-up-two-down.compact line 149 char 14: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 65535');
                   }
                   return t1;
                 })(s_0[2] * 256n + s_0[3]);
    const k2_0 = ((t1) => {
                   if (t1 > 65535n) {
                     throw new __compactRuntime.CompactError('five-up-two-down.compact line 150 char 14: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 65535');
                   }
                   return t1;
                 })(s_0[4] * 256n + s_0[5]);
    const k3_0 = ((t1) => {
                   if (t1 > 65535n) {
                     throw new __compactRuntime.CompactError('five-up-two-down.compact line 151 char 14: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 65535');
                   }
                   return t1;
                 })(s_0[6] * 256n + s_0[7]);
    const k4_0 = ((t1) => {
                   if (t1 > 65535n) {
                     throw new __compactRuntime.CompactError('five-up-two-down.compact line 152 char 14: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 65535');
                   }
                   return t1;
                 })(s_0[8] * 256n + s_0[9]);
    const k5_0 = ((t1) => {
                   if (t1 > 65535n) {
                     throw new __compactRuntime.CompactError('five-up-two-down.compact line 153 char 14: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 65535');
                   }
                   return t1;
                 })(s_0[10] * 256n + s_0[11]);
    const k6_0 = ((t1) => {
                   if (t1 > 65535n) {
                     throw new __compactRuntime.CompactError('five-up-two-down.compact line 154 char 14: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 65535');
                   }
                   return t1;
                 })(s_0[12] * 256n + s_0[13]);
    const k7_0 = ((t1) => {
                   if (t1 > 65535n) {
                     throw new __compactRuntime.CompactError('five-up-two-down.compact line 155 char 14: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 65535');
                   }
                   return t1;
                 })(s_0[14] * 256n + s_0[15]);
    const k8_0 = ((t1) => {
                   if (t1 > 65535n) {
                     throw new __compactRuntime.CompactError('five-up-two-down.compact line 156 char 14: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 65535');
                   }
                   return t1;
                 })(s_0[16] * 256n + s_0[17]);
    const lt1_0 = k0_0 < k1_0;
    const ka1_0 = lt1_0 ? k0_0 : k1_0;
    const ca1_0 = lt1_0 ? v_0[0] : v_0[1];
    const kb1_0 = lt1_0 ? k1_0 : k0_0;
    const cb1_0 = lt1_0 ? v_0[1] : v_0[0];
    const lt2_0 = k3_0 < k4_0;
    const ka2_0 = lt2_0 ? k3_0 : k4_0;
    const ca2_0 = lt2_0 ? v_0[3] : v_0[4];
    const kb2_0 = lt2_0 ? k4_0 : k3_0;
    const cb2_0 = lt2_0 ? v_0[4] : v_0[3];
    const lt3_0 = k6_0 < k7_0;
    const ka3_0 = lt3_0 ? k6_0 : k7_0;
    const ca3_0 = lt3_0 ? v_0[6] : v_0[7];
    const kb3_0 = lt3_0 ? k7_0 : k6_0;
    const cb3_0 = lt3_0 ? v_0[7] : v_0[6];
    const lt4_0 = kb1_0 < k2_0;
    const ka4_0 = lt4_0 ? kb1_0 : k2_0;
    const ca4_0 = lt4_0 ? cb1_0 : v_0[2];
    const kb4_0 = lt4_0 ? k2_0 : kb1_0;
    const cb4_0 = lt4_0 ? v_0[2] : cb1_0;
    const lt5_0 = kb2_0 < k5_0;
    const ka5_0 = lt5_0 ? kb2_0 : k5_0;
    const ca5_0 = lt5_0 ? cb2_0 : v_0[5];
    const kb5_0 = lt5_0 ? k5_0 : kb2_0;
    const cb5_0 = lt5_0 ? v_0[5] : cb2_0;
    const lt6_0 = kb3_0 < k8_0;
    const ka6_0 = lt6_0 ? kb3_0 : k8_0;
    const ca6_0 = lt6_0 ? cb3_0 : v_0[8];
    const kb6_0 = lt6_0 ? k8_0 : kb3_0;
    const cb6_0 = lt6_0 ? v_0[8] : cb3_0;
    const lt7_0 = ka1_0 < ka4_0;
    const ka7_0 = lt7_0 ? ka1_0 : ka4_0;
    const ca7_0 = lt7_0 ? ca1_0 : ca4_0;
    const kb7_0 = lt7_0 ? ka4_0 : ka1_0;
    const cb7_0 = lt7_0 ? ca4_0 : ca1_0;
    const lt8_0 = ka2_0 < ka5_0;
    const ka8_0 = lt8_0 ? ka2_0 : ka5_0;
    const ca8_0 = lt8_0 ? ca2_0 : ca5_0;
    const kb8_0 = lt8_0 ? ka5_0 : ka2_0;
    const cb8_0 = lt8_0 ? ca5_0 : ca2_0;
    const lt9_0 = ka3_0 < ka6_0;
    const ka9_0 = lt9_0 ? ka3_0 : ka6_0;
    const ca9_0 = lt9_0 ? ca3_0 : ca6_0;
    const kb9_0 = lt9_0 ? ka6_0 : ka3_0;
    const cb9_0 = lt9_0 ? ca6_0 : ca3_0;
    const lt10_0 = kb4_0 < kb5_0;
    const ka10_0 = lt10_0 ? kb4_0 : kb5_0;
    const ca10_0 = lt10_0 ? cb4_0 : cb5_0;
    const kb10_0 = lt10_0 ? kb5_0 : kb4_0;
    const cb10_0 = lt10_0 ? cb5_0 : cb4_0;
    const lt11_0 = ka7_0 < ka8_0;
    const ka11_0 = lt11_0 ? ka7_0 : ka8_0;
    const ca11_0 = lt11_0 ? ca7_0 : ca8_0;
    const kb11_0 = lt11_0 ? ka8_0 : ka7_0;
    const cb11_0 = lt11_0 ? ca8_0 : ca7_0;
    const lt12_0 = kb7_0 < kb8_0;
    const ka12_0 = lt12_0 ? kb7_0 : kb8_0;
    const ca12_0 = lt12_0 ? cb7_0 : cb8_0;
    const kb12_0 = lt12_0 ? kb8_0 : kb7_0;
    const cb12_0 = lt12_0 ? cb8_0 : cb7_0;
    const lt13_0 = kb10_0 < kb6_0;
    const ka13_0 = lt13_0 ? kb10_0 : kb6_0;
    const ca13_0 = lt13_0 ? cb10_0 : cb6_0;
    const kb13_0 = lt13_0 ? kb6_0 : kb10_0;
    const cb13_0 = lt13_0 ? cb6_0 : cb10_0;
    const lt14_0 = kb11_0 < ka9_0;
    const ka14_0 = lt14_0 ? kb11_0 : ka9_0;
    const ca14_0 = lt14_0 ? cb11_0 : ca9_0;
    const kb14_0 = lt14_0 ? ka9_0 : kb11_0;
    const cb14_0 = lt14_0 ? ca9_0 : cb11_0;
    const lt15_0 = kb12_0 < kb9_0;
    const ka15_0 = lt15_0 ? kb12_0 : kb9_0;
    const ca15_0 = lt15_0 ? cb12_0 : cb9_0;
    const kb15_0 = lt15_0 ? kb9_0 : kb12_0;
    const cb15_0 = lt15_0 ? cb9_0 : cb12_0;
    const lt16_0 = ka10_0 < ka13_0;
    const ka16_0 = lt16_0 ? ka10_0 : ka13_0;
    const ca16_0 = lt16_0 ? ca10_0 : ca13_0;
    const kb16_0 = lt16_0 ? ka13_0 : ka10_0;
    const cb16_0 = lt16_0 ? ca13_0 : ca10_0;
    const lt17_0 = ka11_0 < ka14_0;
    const ka17_0 = lt17_0 ? ka11_0 : ka14_0;
    const ca17_0 = lt17_0 ? ca11_0 : ca14_0;
    const kb17_0 = lt17_0 ? ka14_0 : ka11_0;
    const cb17_0 = lt17_0 ? ca14_0 : ca11_0;
    const lt18_0 = ka12_0 < ka15_0;
    const ka18_0 = lt18_0 ? ka12_0 : ka15_0;
    const ca18_0 = lt18_0 ? ca12_0 : ca15_0;
    const kb18_0 = lt18_0 ? ka15_0 : ka12_0;
    const cb18_0 = lt18_0 ? ca15_0 : ca12_0;
    const lt19_0 = kb16_0 < kb15_0;
    const ka19_0 = lt19_0 ? kb16_0 : kb15_0;
    const ca19_0 = lt19_0 ? cb16_0 : cb15_0;
    const kb19_0 = lt19_0 ? kb15_0 : kb16_0;
    const cb19_0 = lt19_0 ? cb15_0 : cb16_0;
    const lt20_0 = ka16_0 < kb14_0;
    const ka20_0 = lt20_0 ? ka16_0 : kb14_0;
    const ca20_0 = lt20_0 ? ca16_0 : cb14_0;
    const kb20_0 = lt20_0 ? kb14_0 : ka16_0;
    const cb20_0 = lt20_0 ? cb14_0 : ca16_0;
    const lt21_0 = ka18_0 < kb17_0;
    const ka21_0 = lt21_0 ? ka18_0 : kb17_0;
    const ca21_0 = lt21_0 ? ca18_0 : cb17_0;
    const kb21_0 = lt21_0 ? kb17_0 : ka18_0;
    const cb21_0 = lt21_0 ? cb17_0 : ca18_0;
    const lt22_0 = kb18_0 < kb20_0;
    const ka22_0 = lt22_0 ? kb18_0 : kb20_0;
    const ca22_0 = lt22_0 ? cb18_0 : cb20_0;
    const kb22_0 = lt22_0 ? kb20_0 : kb18_0;
    const cb22_0 = lt22_0 ? cb20_0 : cb18_0;
    const lt23_0 = ka20_0 < ka22_0;
    const ka23_0 = lt23_0 ? ka20_0 : ka22_0;
    const ca23_0 = lt23_0 ? ca20_0 : ca22_0;
    const kb23_0 = lt23_0 ? ka22_0 : ka20_0;
    const cb23_0 = lt23_0 ? ca22_0 : ca20_0;
    const lt24_0 = ka19_0 < kb22_0;
    const ka24_0 = lt24_0 ? ka19_0 : kb22_0;
    const ca24_0 = lt24_0 ? ca19_0 : cb22_0;
    const kb24_0 = lt24_0 ? kb22_0 : ka19_0;
    const cb24_0 = lt24_0 ? cb22_0 : ca19_0;
    const lt25_0 = ka23_0 < kb21_0;
    const ka25_0 = lt25_0 ? ka23_0 : kb21_0;
    const ca25_0 = lt25_0 ? ca23_0 : cb21_0;
    const kb25_0 = lt25_0 ? kb21_0 : ka23_0;
    const cb25_0 = lt25_0 ? cb21_0 : ca23_0;
    return [ca17_0,
            ca21_0,
            ca25_0,
            cb25_0,
            cb23_0,
            ca24_0,
            cb24_0,
            cb19_0,
            cb13_0];
  }
  _dealNineShuffled_0(dealB_0, shuffleB_0) {
    return this._shuffle9_0(this._dealNineIdx_0(dealB_0), shuffleB_0);
  }
  _dealDigest_0(salt0_0, salt1_0, seed_0, round_0) {
    return __compactRuntime.convertFieldToBytes(32,
                                                this._transientHash_4({ separator:
                                                                          new Uint8Array([112, 111, 98, 58, 53, 117, 50, 100, 58, 100, 101, 97, 108, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                                                        salt0:
                                                                          salt0_0,
                                                                        salt1:
                                                                          salt1_0,
                                                                        seed:
                                                                          seed_0,
                                                                        round:
                                                                          round_0 }),
                                                'five-up-two-down.compact line 241 char 10');
  }
  _shuffleDigest_0(salt0_0, salt1_0, seed_0, round_0) {
    return __compactRuntime.convertFieldToBytes(32,
                                                this._transientHash_4({ separator:
                                                                          new Uint8Array([112, 111, 98, 58, 53, 117, 50, 100, 58, 115, 104, 117, 102, 102, 108, 101, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                                                        salt0:
                                                                          salt0_0,
                                                                        salt1:
                                                                          salt1_0,
                                                                        seed:
                                                                          seed_0,
                                                                        round:
                                                                          round_0 }),
                                                'five-up-two-down.compact line 244 char 10');
  }
  _minU8_0(a_0, b_0) { if (a_0 < b_0) { return a_0; } else { return b_0; } }
  _maxU8_0(a_0, b_0) { if (a_0 < b_0) { return b_0; } else { return a_0; } }
  _sort9_0(v_0) {
    const a1_0 = this._minU8_0(v_0[0], v_0[1]);
    const b1_0 = this._maxU8_0(v_0[0], v_0[1]);
    const a2_0 = this._minU8_0(v_0[3], v_0[4]);
    const b2_0 = this._maxU8_0(v_0[3], v_0[4]);
    const a3_0 = this._minU8_0(v_0[6], v_0[7]);
    const b3_0 = this._maxU8_0(v_0[6], v_0[7]);
    const a4_0 = this._minU8_0(b1_0, v_0[2]);
    const b4_0 = this._maxU8_0(b1_0, v_0[2]);
    const a5_0 = this._minU8_0(b2_0, v_0[5]);
    const b5_0 = this._maxU8_0(b2_0, v_0[5]);
    const a6_0 = this._minU8_0(b3_0, v_0[8]);
    const b6_0 = this._maxU8_0(b3_0, v_0[8]);
    const a7_0 = this._minU8_0(a1_0, a4_0);
    const b7_0 = this._maxU8_0(a1_0, a4_0);
    const a8_0 = this._minU8_0(a2_0, a5_0);
    const b8_0 = this._maxU8_0(a2_0, a5_0);
    const a9_0 = this._minU8_0(a3_0, a6_0);
    const b9_0 = this._maxU8_0(a3_0, a6_0);
    const a10_0 = this._minU8_0(b4_0, b5_0);
    const b10_0 = this._maxU8_0(b4_0, b5_0);
    const a11_0 = this._minU8_0(a7_0, a8_0);
    const b11_0 = this._maxU8_0(a7_0, a8_0);
    const a12_0 = this._minU8_0(b7_0, b8_0);
    const b12_0 = this._maxU8_0(b7_0, b8_0);
    const a13_0 = this._minU8_0(b10_0, b6_0);
    const b13_0 = this._maxU8_0(b10_0, b6_0);
    const a14_0 = this._minU8_0(b11_0, a9_0);
    const b14_0 = this._maxU8_0(b11_0, a9_0);
    const a15_0 = this._minU8_0(b12_0, b9_0);
    const b15_0 = this._maxU8_0(b12_0, b9_0);
    const a16_0 = this._minU8_0(a10_0, a13_0);
    const b16_0 = this._maxU8_0(a10_0, a13_0);
    const a17_0 = this._minU8_0(a11_0, a14_0);
    const b17_0 = this._maxU8_0(a11_0, a14_0);
    const a18_0 = this._minU8_0(a12_0, a15_0);
    const b18_0 = this._maxU8_0(a12_0, a15_0);
    const a19_0 = this._minU8_0(b16_0, b15_0);
    const b19_0 = this._maxU8_0(b16_0, b15_0);
    const a20_0 = this._minU8_0(a16_0, b14_0);
    const b20_0 = this._maxU8_0(a16_0, b14_0);
    const a21_0 = this._minU8_0(a18_0, b17_0);
    const b21_0 = this._maxU8_0(a18_0, b17_0);
    const a22_0 = this._minU8_0(b18_0, b20_0);
    const b22_0 = this._maxU8_0(b18_0, b20_0);
    const a23_0 = this._minU8_0(a20_0, a22_0);
    const b23_0 = this._maxU8_0(a20_0, a22_0);
    const a24_0 = this._minU8_0(a19_0, b22_0);
    const b24_0 = this._maxU8_0(a19_0, b22_0);
    const a25_0 = this._minU8_0(a23_0, b21_0);
    const b25_0 = this._maxU8_0(a23_0, b21_0);
    return [a17_0, a21_0, a25_0, b25_0, b23_0, a24_0, b24_0, b19_0, b13_0];
  }
  _skipDealt_0(k_0, s_0) {
    let t_0;
    const r0_0 = (t_0 = s_0[0], t_0 <= k_0) ?
                 ((t1) => {
                   if (t1 > 255n) {
                     throw new __compactRuntime.CompactError('five-up-two-down.compact line 291 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                   }
                   return t1;
                 })(k_0 + 1n)
                 :
                 k_0;
    let t_1;
    const r1_0 = (t_1 = s_0[1], t_1 <= r0_0) ?
                 ((t1) => {
                   if (t1 > 255n) {
                     throw new __compactRuntime.CompactError('five-up-two-down.compact line 292 char 28: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                   }
                   return t1;
                 })(r0_0 + 1n)
                 :
                 r0_0;
    let t_2;
    const r2_0 = (t_2 = s_0[2], t_2 <= r1_0) ?
                 ((t1) => {
                   if (t1 > 255n) {
                     throw new __compactRuntime.CompactError('five-up-two-down.compact line 293 char 28: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                   }
                   return t1;
                 })(r1_0 + 1n)
                 :
                 r1_0;
    let t_3;
    const r3_0 = (t_3 = s_0[3], t_3 <= r2_0) ?
                 ((t1) => {
                   if (t1 > 255n) {
                     throw new __compactRuntime.CompactError('five-up-two-down.compact line 294 char 28: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                   }
                   return t1;
                 })(r2_0 + 1n)
                 :
                 r2_0;
    let t_4;
    const r4_0 = (t_4 = s_0[4], t_4 <= r3_0) ?
                 ((t1) => {
                   if (t1 > 255n) {
                     throw new __compactRuntime.CompactError('five-up-two-down.compact line 295 char 28: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                   }
                   return t1;
                 })(r3_0 + 1n)
                 :
                 r3_0;
    let t_5;
    const r5_0 = (t_5 = s_0[5], t_5 <= r4_0) ?
                 ((t1) => {
                   if (t1 > 255n) {
                     throw new __compactRuntime.CompactError('five-up-two-down.compact line 296 char 28: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                   }
                   return t1;
                 })(r4_0 + 1n)
                 :
                 r4_0;
    let t_6;
    const r6_0 = (t_6 = s_0[6], t_6 <= r5_0) ?
                 ((t1) => {
                   if (t1 > 255n) {
                     throw new __compactRuntime.CompactError('five-up-two-down.compact line 297 char 28: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                   }
                   return t1;
                 })(r5_0 + 1n)
                 :
                 r5_0;
    let t_7;
    const r7_0 = (t_7 = s_0[7], t_7 <= r6_0) ?
                 ((t1) => {
                   if (t1 > 255n) {
                     throw new __compactRuntime.CompactError('five-up-two-down.compact line 298 char 28: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                   }
                   return t1;
                 })(r6_0 + 1n)
                 :
                 r6_0;
    let t_8;
    if (t_8 = s_0[8], t_8 <= r7_0) {
      return ((t1) => {
               if (t1 > 255n) {
                 throw new __compactRuntime.CompactError('five-up-two-down.compact line 299 char 24: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
               }
               return t1;
             })(r7_0 + 1n);
    } else {
      return r7_0;
    }
  }
  _skipOne_0(k_0, p_0) {
    if (p_0 <= k_0) {
      return ((t1) => {
               if (t1 > 255n) {
                 throw new __compactRuntime.CompactError('five-up-two-down.compact line 302 char 69: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
               }
               return t1;
             })(k_0 + 1n);
    } else {
      return k_0;
    }
  }
  _showdownIdx_0(b_0) {
    const k0_0 = this._boundedDraw_0(b_0[0], b_0[1], 43n);
    const k1_0 = this._skipOne_0(this._boundedDraw_0(b_0[2], b_0[3], 42n), k0_0);
    const lo01_0 = this._minU8_0(k0_0, k1_0);
    const hi01_0 = this._maxU8_0(k0_0, k1_0);
    const k2_0 = this._skipOne_0(this._skipOne_0(this._boundedDraw_0(b_0[4],
                                                                     b_0[5],
                                                                     41n),
                                                 lo01_0),
                                 hi01_0);
    const m0_0 = this._minU8_0(lo01_0, k2_0);
    const m2_0 = this._maxU8_0(hi01_0, k2_0);
    const m1_0 = this._maxU8_0(lo01_0, this._minU8_0(hi01_0, k2_0));
    const k3_0 = this._skipOne_0(this._skipOne_0(this._skipOne_0(this._boundedDraw_0(b_0[6],
                                                                                     b_0[7],
                                                                                     40n),
                                                                 m0_0),
                                                 m1_0),
                                 m2_0);
    return [k0_0, k1_0, k2_0, k3_0];
  }
  _showdownCards_0(dealt_0, b_0) {
    const s_0 = this._sort9_0(dealt_0);
    const k_0 = this._showdownIdx_0(b_0);
    return [this._skipDealt_0(k_0[0], s_0),
            this._skipDealt_0(k_0[1], s_0),
            this._skipDealt_0(k_0[2], s_0),
            this._skipDealt_0(k_0[3], s_0)];
  }
  _showdownDigest_0(salt0_0, salt1_0, seed_0, round_0) {
    return __compactRuntime.convertFieldToBytes(32,
                                                this._transientHash_4({ separator:
                                                                          new Uint8Array([112, 111, 98, 58, 53, 117, 50, 100, 58, 115, 104, 111, 119, 100, 111, 119, 110, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                                                        salt0:
                                                                          salt0_0,
                                                                        salt1:
                                                                          salt1_0,
                                                                        seed:
                                                                          seed_0,
                                                                        round:
                                                                          round_0 }),
                                                'five-up-two-down.compact line 323 char 10');
  }
  _targetScore_0(mode_0) { return this._equal_41(mode_0, 0n) ? 10n : 20n; }
  _onBoard_0(r_0, board_0) {
    return this._equal_42(r_0, board_0[0]) || this._equal_43(r_0, board_0[1])
           ||
           this._equal_44(r_0, board_0[2])
           ||
           this._equal_45(r_0, board_0[3])
           ||
           this._equal_46(r_0, board_0[4]);
  }
  _subFloor_0(score_0, d_0) {
    if (score_0 <= d_0) {
      return 0n;
    } else {
      __compactRuntime.assert(score_0 >= d_0,
                              'result of subtraction would be negative');
      return score_0 - d_0;
    }
  }
  _resolvePass_0(hole_0, draw_0, pass_0, response_0) {
    __compactRuntime.assert(this._equal_47(pass_0.kind, 4n), 'expected a PASS');
    __compactRuntime.assert(this._equal_48(pass_0.count, 0n)
                            &&
                            this._equal_49(pass_0.rankA, 0n)
                            &&
                            this._equal_50(pass_0.rankB, 0n),
                            'pass fields must be zero');
    __compactRuntime.assert(this._equal_51(response_0.kind, 0n),
                            'a pass can only be followed by NOOP');
    __compactRuntime.assert(this._equal_52(response_0.count, 0n)
                            &&
                            this._equal_53(response_0.rankA, 0n)
                            &&
                            this._equal_54(response_0.rankB, 0n),
                            'noop fields must be zero');
    let t_0, t_1;
    const wins_0 = ((t_0 = draw_0[0], t_0 > hole_0[0]) ? 1n : 0n)
                   +
                   ((t_1 = draw_0[1], t_1 > hole_0[1]) ? 1n : 0n);
    return { claimantGain: 0n, claimantLoss: 0n, responderGain: wins_0, lies: 0n };
  }
  _resolveExchange_0(hole_0, draw_0, board_0, claim_0, response_0) {
    if (this._equal_55(claim_0.kind, 4n)) {
      return this._resolvePass_0(hole_0, draw_0, claim_0, response_0);
    } else {
      return this._resolveClaim_0(hole_0, board_0, claim_0, response_0);
    }
  }
  _resolveClaim_0(hole_0, board_0, claim_0, response_0) {
    __compactRuntime.assert(this._equal_56(claim_0.kind, 1n), 'expected a CLAIM');
    let t_0;
    __compactRuntime.assert((t_0 = claim_0.count, t_0 <= 2n),
                            'claim count out of range');
    let t_1;
    __compactRuntime.assert((t_1 = claim_0.count, t_1 < 1n)
                            ||
                            this._onBoard_0(claim_0.rankA, board_0),
                            'claimed rank not on board');
    let t_2;
    __compactRuntime.assert((t_2 = claim_0.count, t_2 < 2n)
                            ||
                            this._onBoard_0(claim_0.rankB, board_0),
                            'claimed rank not on board');
    let t_3;
    __compactRuntime.assert((t_3 = claim_0.count, t_3 >= 1n)
                            ||
                            this._equal_57(claim_0.rankA, 0n),
                            'unused claim slot must be zero');
    let t_4;
    __compactRuntime.assert((t_4 = claim_0.count, t_4 >= 2n)
                            ||
                            this._equal_58(claim_0.rankB, 0n),
                            'unused claim slot must be zero');
    const isAccept_0 = this._equal_59(response_0.kind, 2n);
    const isChallenge_0 = this._equal_60(response_0.kind, 3n);
    __compactRuntime.assert(isAccept_0 || isChallenge_0, 'expected a response');
    __compactRuntime.assert(this._equal_61(response_0.count, 0n)
                            &&
                            this._equal_62(response_0.rankA, 0n)
                            &&
                            this._equal_63(response_0.rankB, 0n),
                            'response fields must be zero');
    let t_5;
    __compactRuntime.assert(!isChallenge_0 || (t_5 = claim_0.count, t_5 >= 1n),
                            'nothing to challenge');
    const aHit_0 = this._equal_64(hole_0[0], claim_0.rankA)
                   ||
                   this._equal_65(hole_0[1], claim_0.rankA);
    const bHit_0 = this._equal_66(hole_0[0], claim_0.rankB)
                   ||
                   this._equal_67(hole_0[1], claim_0.rankB);
    const pairHit_0 = this._equal_68(hole_0[0], claim_0.rankA)
                      &&
                      this._equal_69(hole_0[1], claim_0.rankB)
                      ||
                      this._equal_70(hole_0[0], claim_0.rankB)
                      &&
                      this._equal_71(hole_0[1], claim_0.rankA);
    const trueCount_0 = this._equal_72(claim_0.count, 0n) ?
                        0n :
                        this._equal_73(claim_0.count, 1n) ?
                        aHit_0 ? 1n : 0n :
                        pairHit_0 ? 2n : aHit_0 || bHit_0 ? 1n : 0n;
    let t_6;
    const lies_0 = (t_6 = claim_0.count,
                    (__compactRuntime.assert(t_6 >= trueCount_0,
                                             'result of subtraction would be negative'),
                     t_6 - trueCount_0));
    const acceptGain_0 = this._equal_74(claim_0.count, 0n) ?
                         0n :
                         this._equal_75(claim_0.count, 1n) ? 1n : 3n;
    const provenGain_0 = this._equal_76(claim_0.count, 1n) ? 2n : 4n;
    const shown_0 = isChallenge_0 ? lies_0 : 0n;
    return { claimantGain:
               isAccept_0 ?
               acceptGain_0 :
               this._equal_77(lies_0, 0n) ? provenGain_0 : 0n,
             claimantLoss: shown_0,
             responderGain: shown_0,
             lies: shown_0 };
  }
  _commitBoundary_0(b_0) {
    return this._persistentHash_3({ separator:
                                      new Uint8Array([112, 111, 98, 58, 53, 117, 50, 100, 58, 98, 111, 117, 110, 100, 97, 114, 121, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    b: b_0 });
  }
  _commitTranscript_0(chain_0) {
    return this._persistentHash_4({ separator:
                                      new Uint8Array([112, 111, 98, 58, 53, 117, 50, 100, 58, 116, 114, 97, 110, 115, 99, 114, 105, 112, 116, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    chain: chain_0 });
  }
  _entropyPair_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.entropyPair(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 2  && result_0[0].buffer instanceof ArrayBuffer && result_0[0].BYTES_PER_ELEMENT === 1 && result_0[0].length === 32 && result_0[1].buffer instanceof ArrayBuffer && result_0[1].BYTES_PER_ELEMENT === 1 && result_0[1].length === 32)) {
      __compactRuntime.typeError('entropyPair',
                                 'return value',
                                 'five-up-two-down.compact line 404 char 1',
                                 '[Bytes<32>, Bytes<32>]',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_16.toValue(result_0),
      alignment: _descriptor_16.alignment()
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
                                 'five-up-two-down.compact line 405 char 1',
                                 '[Bytes<32>, Bytes<32>]',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_16.toValue(result_0),
      alignment: _descriptor_16.alignment()
    });
    return result_0;
  }
  _roundMoves_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.roundMoves(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 4 && result_0.every((t) => typeof(t) === 'object' && typeof(t.kind) === 'bigint' && t.kind >= 0n && t.kind <= 255n && typeof(t.count) === 'bigint' && t.count >= 0n && t.count <= 255n && typeof(t.rankA) === 'bigint' && t.rankA >= 0n && t.rankA <= 255n && typeof(t.rankB) === 'bigint' && t.rankB >= 0n && t.rankB <= 255n))) {
      __compactRuntime.typeError('roundMoves',
                                 'return value',
                                 'five-up-two-down.compact line 406 char 1',
                                 'Vector<4, struct Move<kind: Uint<0..256>, count: Uint<0..256>, rankA: Uint<0..256>, rankB: Uint<0..256>>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_13.toValue(result_0),
      alignment: _descriptor_13.alignment()
    });
    return result_0;
  }
  _roundDigests_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.roundDigests(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 3  && Array.isArray(result_0[0]) && result_0[0].length === 32 && result_0[0].every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 255n) && Array.isArray(result_0[1]) && result_0[1].length === 32 && result_0[1].every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 255n) && Array.isArray(result_0[2]) && result_0[2].length === 32 && result_0[2].every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 255n))) {
      __compactRuntime.typeError('roundDigests',
                                 'return value',
                                 'five-up-two-down.compact line 413 char 1',
                                 '[Vector<32, Uint<0..256>>, Vector<32, Uint<0..256>>, Vector<32, Uint<0..256>>]',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_15.toValue(result_0),
      alignment: _descriptor_15.alignment()
    });
    return result_0;
  }
  _dealtCards_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.dealtCards(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 13 && result_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 255n))) {
      __compactRuntime.typeError('dealtCards',
                                 'return value',
                                 'five-up-two-down.compact line 414 char 1',
                                 'Vector<13, Uint<0..256>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_11.toValue(result_0),
      alignment: _descriptor_11.alignment()
    });
    return result_0;
  }
  _dealtRanks_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.dealtRanks(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 13 && result_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 255n))) {
      __compactRuntime.typeError('dealtRanks',
                                 'return value',
                                 'five-up-two-down.compact line 415 char 1',
                                 'Vector<13, Uint<0..256>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_11.toValue(result_0),
      alignment: _descriptor_11.alignment()
    });
    return result_0;
  }
  _startBoundary_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.startBoundary(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && typeof(result_0.turn) === 'bigint' && result_0.turn >= 0n && result_0.turn <= 255n && typeof(result_0.score0) === 'bigint' && result_0.score0 >= 0n && result_0.score0 <= 255n && typeof(result_0.score1) === 'bigint' && result_0.score1 >= 0n && result_0.score1 <= 255n && typeof(result_0.round) === 'bigint' && result_0.round >= 0n && result_0.round <= 255n && typeof(result_0.ended) === 'boolean' && typeof(result_0.winner) === 'bigint' && result_0.winner >= 0n && result_0.winner <= 255n && typeof(result_0.chain) === 'bigint' && result_0.chain >= 0 && result_0.chain <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('startBoundary',
                                 'return value',
                                 'five-up-two-down.compact line 416 char 1',
                                 'struct Boundary<turn: Uint<0..256>, score0: Uint<0..256>, score1: Uint<0..256>, round: Uint<0..256>, ended: Boolean, winner: Uint<0..256>, chain: Field>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_10.toValue(result_0),
      alignment: _descriptor_10.alignment()
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
                                 'five-up-two-down.compact line 417 char 1',
                                 'struct SignedCredential<credential: struct CloseConsent<sep: Bytes<32>, gameId: Bytes<32>, transcriptRoot: Field, p1Score: Uint<0..256>, p2Score: Uint<0..256>, winner: Uint<0..256>>, signature: struct Signature<r: Opaque<"JubjubPoint">, s: Field>, pk: Opaque<"JubjubPoint">>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_9.toValue(result_0),
      alignment: _descriptor_9.alignment()
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
                                 'five-up-two-down.compact line 418 char 1',
                                 'struct SignedCredential<credential: struct CloseConsent<sep: Bytes<32>, gameId: Bytes<32>, transcriptRoot: Field, p1Score: Uint<0..256>, p2Score: Uint<0..256>, winner: Uint<0..256>>, signature: struct Signature<r: Opaque<"JubjubPoint">, s: Field>, pk: Opaque<"JubjubPoint">>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_9.toValue(result_0),
      alignment: _descriptor_9.alignment()
    });
    return result_0;
  }
  _selectCommit_0(commits_0, round_0) {
    if (this._equal_78(round_0, 1n)) {
      return commits_0[0];
    } else {
      if (this._equal_79(round_0, 2n)) {
        return commits_0[1];
      } else {
        if (this._equal_80(round_0, 3n)) {
          return commits_0[2];
        } else {
          if (this._equal_81(round_0, 4n)) {
            return commits_0[3];
          } else {
            if (this._equal_82(round_0, 5n)) {
              return commits_0[4];
            } else {
              if (this._equal_83(round_0, 6n)) {
                return commits_0[5];
              } else {
                if (this._equal_84(round_0, 7n)) {
                  return commits_0[6];
                } else {
                  if (this._equal_85(round_0, 8n)) {
                    return commits_0[7];
                  } else {
                    if (this._equal_86(round_0, 9n)) {
                      return commits_0[8];
                    } else {
                      return commits_0[9];
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
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
                                                                                                          value: { value: _descriptor_1.toValue(10n),
                                                                                                                   alignment: _descriptor_1.alignment() } }] } },
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
                                                                                                          value: { value: _descriptor_1.toValue(9n),
                                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                                        { popeq: { cached: false,
                                                                                                   result: undefined } }]).value),
                            'Proven history already reached game end');
    const r_0 = round_0;
    __compactRuntime.assert(r_0 >= 1n && r_0 <= 10n, 'bad round');
    __compactRuntime.assert(this._equal_87(r_0,
                                           ((t1) => {
                                             if (t1 > 255n) {
                                               throw new __compactRuntime.CompactError('five-up-two-down.compact line 475 char 16: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                                             }
                                             return t1;
                                           })(_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                        partialProofData,
                                                                                                        [
                                                                                                         { dup: { n: 0 } },
                                                                                                         { idx: { cached: false,
                                                                                                                  pushPath: false,
                                                                                                                  path: [
                                                                                                                         { tag: 'value',
                                                                                                                           value: { value: _descriptor_1.toValue(7n),
                                                                                                                                    alignment: _descriptor_1.alignment() } }] } },
                                                                                                         { popeq: { cached: false,
                                                                                                                    result: undefined } }]).value)
                                              +
                                              1n)),
                            'rounds must be proven in order');
    const e_0 = this._entropyPair_0(context, partialProofData);
    __compactRuntime.assert(this._equal_88(this._commitEntropy_0(e_0[0]),
                                           _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_1.toValue(3n),
                                                                                                                                 alignment: _descriptor_1.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'P1 entropy mismatch');
    __compactRuntime.assert(this._equal_89(this._commitEntropy_0(e_0[1]),
                                           _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_1.toValue(4n),
                                                                                                                                 alignment: _descriptor_1.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'P2 entropy mismatch');
    const secrets_0 = this._roundSecrets_0(context, partialProofData);
    __compactRuntime.assert(this._equal_90(this._commitRoundSecret_0(secrets_0[0],
                                                                     r_0),
                                           this._selectCommit_0(_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                          partialProofData,
                                                                                                                          [
                                                                                                                           { dup: { n: 0 } },
                                                                                                                           { idx: { cached: false,
                                                                                                                                    pushPath: false,
                                                                                                                                    path: [
                                                                                                                                           { tag: 'value',
                                                                                                                                             value: { value: _descriptor_1.toValue(5n),
                                                                                                                                                      alignment: _descriptor_1.alignment() } }] } },
                                                                                                                           { popeq: { cached: false,
                                                                                                                                      result: undefined } }]).value),
                                                                r_0)),
                            'P1 round secret mismatch');
    __compactRuntime.assert(this._equal_91(this._commitRoundSecret_0(secrets_0[1],
                                                                     r_0),
                                           this._selectCommit_0(_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                          partialProofData,
                                                                                                                          [
                                                                                                                           { dup: { n: 0 } },
                                                                                                                           { idx: { cached: false,
                                                                                                                                    pushPath: false,
                                                                                                                                    path: [
                                                                                                                                           { tag: 'value',
                                                                                                                                             value: { value: _descriptor_1.toValue(6n),
                                                                                                                                                      alignment: _descriptor_1.alignment() } }] } },
                                                                                                                           { popeq: { cached: false,
                                                                                                                                      result: undefined } }]).value),
                                                                r_0)),
                            'P2 round secret mismatch');
    const seed_0 = this._combineEntropy_0(e_0[0], e_0[1]);
    const prev_0 = this._startBoundary_0(context, partialProofData);
    const b0_0 = this._equal_92(r_0, 1n) ?
                 { turn: 0n,
                   score0: 0n,
                   score1: 0n,
                   round: 0n,
                   ended: false,
                   winner: 0n,
                   chain: 0n }
                 :
                 prev_0;
    __compactRuntime.assert(this._equal_93(this._commitBoundary_0(b0_0),
                                           _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_1.toValue(8n),
                                                                                                                                 alignment: _descriptor_1.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'boundary does not open stateRoot');
    __compactRuntime.assert(this._equal_94(b0_0.round,
                                           (__compactRuntime.assert(r_0 >= 1n,
                                                                    'result of subtraction would be negative'),
                                            r_0 - 1n)),
                            'boundary round mismatch');
    const dg_0 = this._roundDigests_0(context, partialProofData);
    __compactRuntime.assert(this._equal_95(Uint8Array.from(dg_0[0], Number),
                                           this._dealDigest_0(secrets_0[0],
                                                              secrets_0[1],
                                                              seed_0,
                                                              r_0)),
                            'deal digest mismatch');
    __compactRuntime.assert(this._equal_96(Uint8Array.from(dg_0[1], Number),
                                           this._shuffleDigest_0(secrets_0[0],
                                                                 secrets_0[1],
                                                                 seed_0,
                                                                 r_0)),
                            'shuffle digest mismatch');
    __compactRuntime.assert(this._equal_97(Uint8Array.from(dg_0[2], Number),
                                           this._showdownDigest_0(secrets_0[0],
                                                                  secrets_0[1],
                                                                  seed_0,
                                                                  r_0)),
                            'showdown digest mismatch');
    const cards_0 = this._dealtCards_0(context, partialProofData);
    const nine_0 = this._dealNineShuffled_0(dg_0[0], dg_0[1]);
    this._folder_1(context,
                   partialProofData,
                   ((context, partialProofData, t_0, i_0) =>
                    {
                      __compactRuntime.assert(this._equal_98(cards_0[i_0],
                                                             nine_0[i_0]),
                                              'deal mismatch');
                      return t_0;
                    }),
                   [],
                   [0n, 1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n]);
    const dealt9_0 = [cards_0[0],
                      cards_0[1],
                      cards_0[2],
                      cards_0[3],
                      cards_0[4],
                      cards_0[5],
                      cards_0[6],
                      cards_0[7],
                      cards_0[8]];
    const sd_0 = this._showdownCards_0(dealt9_0, dg_0[2]);
    __compactRuntime.assert(this._equal_99(cards_0[9], sd_0[0])
                            &&
                            this._equal_100(cards_0[10], sd_0[1])
                            &&
                            this._equal_101(cards_0[11], sd_0[2])
                            &&
                            this._equal_102(cards_0[12], sd_0[3]),
                            'showdown mismatch');
    const ranks_0 = this._dealtRanks_0(context, partialProofData);
    this._folder_2(context,
                   partialProofData,
                   ((context, partialProofData, t_1, i_1) =>
                    {
                      __compactRuntime.assert(this._equal_103(ranks_0[i_1],
                                                              this._cardToRank_0(cards_0[i_1])),
                                              'rank mismatch');
                      return t_1;
                    }),
                   [],
                   [0n, 1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n, 10n, 11n, 12n]);
    const hole0_0 = [ranks_0[0], ranks_0[1]];
    const hole1_0 = [ranks_0[2], ranks_0[3]];
    const board_0 = [ranks_0[4], ranks_0[5], ranks_0[6], ranks_0[7], ranks_0[8]];
    const drawA_0 = [ranks_0[9], ranks_0[10]];
    const drawB_0 = [ranks_0[11], ranks_0[12]];
    const chain1_0 = this._chainBoard_0(b0_0.chain, board_0);
    const moves_0 = this._roundMoves_0(context, partialProofData);
    const firstIs0_0 = this._equal_104(b0_0.turn, 0n);
    const resA_0 = this._resolveExchange_0(firstIs0_0 ? hole0_0 : hole1_0,
                                           drawA_0,
                                           board_0,
                                           moves_0[0],
                                           moves_0[1]);
    const resB_0 = this._resolveExchange_0(firstIs0_0 ? hole1_0 : hole0_0,
                                           drawB_0,
                                           board_0,
                                           moves_0[2],
                                           moves_0[3]);
    const a0_0 = firstIs0_0 ?
                 this._subFloor_0(((t1) => {
                                    if (t1 > 255n) {
                                      throw new __compactRuntime.CompactError('five-up-two-down.compact line 520 char 44: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                                    }
                                    return t1;
                                  })(b0_0.score0 + resA_0.claimantGain),
                                  resA_0.claimantLoss)
                 :
                 ((t1) => {
                   if (t1 > 255n) {
                     throw new __compactRuntime.CompactError('five-up-two-down.compact line 520 char 111: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                   }
                   return t1;
                 })(b0_0.score0 + resA_0.responderGain);
    const a1_0 = firstIs0_0 ?
                 ((t1) => {
                   if (t1 > 255n) {
                     throw new __compactRuntime.CompactError('five-up-two-down.compact line 521 char 35: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                   }
                   return t1;
                 })(b0_0.score1 + resA_0.responderGain)
                 :
                 this._subFloor_0(((t1) => {
                                    if (t1 > 255n) {
                                      throw new __compactRuntime.CompactError('five-up-two-down.compact line 521 char 92: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                                    }
                                    return t1;
                                  })(b0_0.score1 + resA_0.claimantGain),
                                  resA_0.claimantLoss);
    const s0_0 = firstIs0_0 ?
                 ((t1) => {
                   if (t1 > 255n) {
                     throw new __compactRuntime.CompactError('five-up-two-down.compact line 522 char 35: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                   }
                   return t1;
                 })(a0_0 + resB_0.responderGain)
                 :
                 this._subFloor_0(((t1) => {
                                    if (t1 > 255n) {
                                      throw new __compactRuntime.CompactError('five-up-two-down.compact line 522 char 85: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                                    }
                                    return t1;
                                  })(a0_0 + resB_0.claimantGain),
                                  resB_0.claimantLoss);
    const s1_0 = firstIs0_0 ?
                 this._subFloor_0(((t1) => {
                                    if (t1 > 255n) {
                                      throw new __compactRuntime.CompactError('five-up-two-down.compact line 523 char 44: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                                    }
                                    return t1;
                                  })(a1_0 + resB_0.claimantGain),
                                  resB_0.claimantLoss)
                 :
                 ((t1) => {
                   if (t1 > 255n) {
                     throw new __compactRuntime.CompactError('five-up-two-down.compact line 523 char 104: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                   }
                   return t1;
                 })(a1_0 + resB_0.responderGain);
    const passA_0 = this._equal_105(moves_0[0].kind, 4n);
    const passB_0 = this._equal_106(moves_0[2].kind, 4n);
    const chain2_0 = this._chainMove_0(chain1_0,
                                       moves_0[0].kind,
                                       passA_0 ?
                                       resA_0.responderGain :
                                       moves_0[0].count,
                                       passA_0 ? drawA_0[0] : moves_0[0].rankA,
                                       passA_0 ? drawA_0[1] : moves_0[0].rankB,
                                       0n);
    const chain3_0 = this._chainMove_0(chain2_0,
                                       moves_0[1].kind,
                                       0n,
                                       0n,
                                       0n,
                                       resA_0.lies);
    const chain4_0 = this._chainMove_0(chain3_0,
                                       moves_0[2].kind,
                                       passB_0 ?
                                       resB_0.responderGain :
                                       moves_0[2].count,
                                       passB_0 ? drawB_0[0] : moves_0[2].rankA,
                                       passB_0 ? drawB_0[1] : moves_0[2].rankB,
                                       0n);
    const chain5_0 = this._chainMove_0(chain4_0,
                                       moves_0[3].kind,
                                       0n,
                                       0n,
                                       0n,
                                       resB_0.lies);
    const target_0 = this._targetScore_0(_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                   partialProofData,
                                                                                                   [
                                                                                                    { dup: { n: 0 } },
                                                                                                    { idx: { cached: false,
                                                                                                             pushPath: false,
                                                                                                             path: [
                                                                                                                    { tag: 'value',
                                                                                                                      value: { value: _descriptor_1.toValue(2n),
                                                                                                                               alignment: _descriptor_1.alignment() } }] } },
                                                                                                    { popeq: { cached: false,
                                                                                                               result: undefined } }]).value));
    const gameEnded_0 = s0_0 >= target_0 || s1_0 >= target_0
                        ||
                        this._equal_107(r_0, 10n);
    const w_0 = !gameEnded_0 ? 0n : s0_0 > s1_0 ? 1n : s1_0 > s0_0 ? 2n : 0n;
    const b1_0 = { turn: firstIs0_0 ? 1n : 0n,
                   score0: s0_0,
                   score1: s1_0,
                   round: r_0,
                   ended: gameEnded_0,
                   winner: w_0,
                   chain: chain5_0 };
    const tmp_0 = this._commitBoundary_0(b1_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(8n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(7n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(r_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(9n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(gameEnded_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
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
                                                                                                          value: { value: _descriptor_1.toValue(10n),
                                                                                                                   alignment: _descriptor_1.alignment() } }] } },
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
                                                                                                         value: { value: _descriptor_1.toValue(9n),
                                                                                                                  alignment: _descriptor_1.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'Proven history has not reached game end');
    const b_0 = this._startBoundary_0(context, partialProofData);
    __compactRuntime.assert(this._equal_108(this._commitBoundary_0(b_0),
                                            _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                      partialProofData,
                                                                                                      [
                                                                                                       { dup: { n: 0 } },
                                                                                                       { idx: { cached: false,
                                                                                                                pushPath: false,
                                                                                                                path: [
                                                                                                                       { tag: 'value',
                                                                                                                         value: { value: _descriptor_1.toValue(8n),
                                                                                                                                  alignment: _descriptor_1.alignment() } }] } },
                                                                                                       { popeq: { cached: false,
                                                                                                                  result: undefined } }]).value)),
                            'boundary does not open stateRoot');
    __compactRuntime.assert(this._equal_109(b_0.round,
                                            _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                      partialProofData,
                                                                                                      [
                                                                                                       { dup: { n: 0 } },
                                                                                                       { idx: { cached: false,
                                                                                                                pushPath: false,
                                                                                                                path: [
                                                                                                                       { tag: 'value',
                                                                                                                         value: { value: _descriptor_1.toValue(7n),
                                                                                                                                  alignment: _descriptor_1.alignment() } }] } },
                                                                                                       { popeq: { cached: false,
                                                                                                                  result: undefined } }]).value)),
                            'boundary round mismatch');
    const w_0 = b_0.winner;
    __compactRuntime.assert(this._equal_110(finalP1Score_0, b_0.score0)
                            &&
                            this._equal_111(finalP2Score_0, b_0.score1),
                            'final score mismatch');
    __compactRuntime.assert(this._equal_112(finalWinner_0, w_0),
                            'winner mismatch');
    const consent1_0 = this._p1CloseConsent_0(context, partialProofData);
    const consent2_0 = this._p2CloseConsent_0(context, partialProofData);
    const expected_0 = this._closeConsentFor_0(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                         partialProofData,
                                                                                                         [
                                                                                                          { dup: { n: 2 } },
                                                                                                          { idx: { cached: true,
                                                                                                                   pushPath: false,
                                                                                                                   path: [
                                                                                                                          { tag: 'value',
                                                                                                                            value: { value: _descriptor_1.toValue(0n),
                                                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                                                          { popeq: { cached: true,
                                                                                                                     result: undefined } }]).value).bytes,
                                               b_0.chain,
                                               b_0.score0,
                                               b_0.score1,
                                               w_0);
    __compactRuntime.assert(this._equal_113(this._playerIdFromPk_0(consent1_0.pk),
                                            _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                      partialProofData,
                                                                                                      [
                                                                                                       { dup: { n: 0 } },
                                                                                                       { idx: { cached: false,
                                                                                                                pushPath: false,
                                                                                                                path: [
                                                                                                                       { tag: 'value',
                                                                                                                         value: { value: _descriptor_1.toValue(0n),
                                                                                                                                  alignment: _descriptor_1.alignment() } }] } },
                                                                                                       { popeq: { cached: false,
                                                                                                                  result: undefined } }]).value)),
                            'P1 signer is not player one');
    __compactRuntime.assert(this._equal_114(this._playerIdFromPk_0(consent2_0.pk),
                                            _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                      partialProofData,
                                                                                                      [
                                                                                                       { dup: { n: 0 } },
                                                                                                       { idx: { cached: false,
                                                                                                                pushPath: false,
                                                                                                                path: [
                                                                                                                       { tag: 'value',
                                                                                                                         value: { value: _descriptor_1.toValue(1n),
                                                                                                                                  alignment: _descriptor_1.alignment() } }] } },
                                                                                                       { popeq: { cached: false,
                                                                                                                  result: undefined } }]).value)),
                            'P2 signer is not player two');
    __compactRuntime.assert(this._equal_115(consent1_0.credential, expected_0),
                            'P1 signed a different result');
    __compactRuntime.assert(this._equal_116(consent2_0.credential, expected_0),
                            'P2 signed a different result');
    this._assert_signed_by_0(context,
                             partialProofData,
                             consent1_0,
                             consent1_0.pk);
    this._assert_signed_by_0(context,
                             partialProofData,
                             consent2_0,
                             consent2_0.pk);
    const tmp_0 = this._commitTranscript_0(b_0.chain);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(11n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_1 = b_0.score0;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(12n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_1),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_2 = b_0.score1;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(13n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_2),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(14n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(w_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(10n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
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
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_3(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_4(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _folder_0(context, partialProofData, f, x, a0) {
    for (let i = 0; i < 10; i++) { x = f(context, partialProofData, x, a0[i]); }
    return x;
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
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_73(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_74(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_75(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_76(x0, y0) {
    if (x0 !== y0) { return false; }
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
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_80(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_81(x0, y0) {
    if (x0 !== y0) { return false; }
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
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_88(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_89(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_90(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_91(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_92(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_93(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_94(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_95(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_96(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_97(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_98(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _folder_1(context, partialProofData, f, x, a0) {
    for (let i = 0; i < 9; i++) { x = f(context, partialProofData, x, a0[i]); }
    return x;
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
  _folder_2(context, partialProofData, f, x, a0) {
    for (let i = 0; i < 13; i++) { x = f(context, partialProofData, x, a0[i]); }
    return x;
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
  _equal_107(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_108(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_109(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_110(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_111(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_112(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_113(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_114(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_115(x0, y0) {
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
  _equal_116(x0, y0) {
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
      return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_1.toValue(0n),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get playerTwo() {
      return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_1.toValue(1n),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get mode() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_1.toValue(2n),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get p1EntropyCommit() {
      return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_1.toValue(3n),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get p2EntropyCommit() {
      return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_1.toValue(4n),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get p1RoundCommits() {
      return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_1.toValue(5n),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get p2RoundCommits() {
      return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_1.toValue(6n),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get roundsProven() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_1.toValue(7n),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get stateRoot() {
      return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_1.toValue(8n),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
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
                                                                                          value: { value: _descriptor_1.toValue(9n),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
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
                                                                                          value: { value: _descriptor_1.toValue(10n),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get transcriptRoot() {
      return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_1.toValue(11n),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get p1Score() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_1.toValue(12n),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get p2Score() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_1.toValue(13n),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get winner() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_1.toValue(14n),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
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
  roundDigests: (...args) => undefined,
  dealtCards: (...args) => undefined,
  dealtRanks: (...args) => undefined,
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
                                 'five-up-two-down.compact line 60 char 1',
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
                                 'five-up-two-down.compact line 63 char 1',
                                 'Bytes<32>',
                                 p1Entropy_0)
    }
    if (!(p2Entropy_0.buffer instanceof ArrayBuffer && p2Entropy_0.BYTES_PER_ELEMENT === 1 && p2Entropy_0.length === 32)) {
      __compactRuntime.typeError('combineEntropy',
                                 'argument 2',
                                 'five-up-two-down.compact line 63 char 1',
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
                                 'five-up-two-down.compact line 66 char 1',
                                 'Bytes<32>',
                                 secret_0)
    }
    if (!(typeof(round_0) === 'bigint' && round_0 >= 0n && round_0 <= 255n)) {
      __compactRuntime.typeError('commitRoundSecret',
                                 'argument 2',
                                 'five-up-two-down.compact line 66 char 1',
                                 'Uint<0..256>',
                                 round_0)
    }
    return _dummyContract._commitRoundSecret_0(secret_0, round_0);
  },
  chainBoard: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`chainBoard: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const prev_0 = args_0[0];
    const board_0 = args_0[1];
    if (!(typeof(prev_0) === 'bigint' && prev_0 >= 0 && prev_0 <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('chainBoard',
                                 'argument 1',
                                 'five-up-two-down.compact line 71 char 1',
                                 'Field',
                                 prev_0)
    }
    if (!(Array.isArray(board_0) && board_0.length === 5 && board_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 255n))) {
      __compactRuntime.typeError('chainBoard',
                                 'argument 2',
                                 'five-up-two-down.compact line 71 char 1',
                                 'Vector<5, Uint<0..256>>',
                                 board_0)
    }
    return _dummyContract._chainBoard_0(prev_0, board_0);
  },
  chainMove: (...args_0) => {
    if (args_0.length !== 6) {
      throw new __compactRuntime.CompactError(`chainMove: expected 6 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const prev_0 = args_0[0];
    const kind_0 = args_0[1];
    const count_0 = args_0[2];
    const rankA_0 = args_0[3];
    const rankB_0 = args_0[4];
    const lies_0 = args_0[5];
    if (!(typeof(prev_0) === 'bigint' && prev_0 >= 0 && prev_0 <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('chainMove',
                                 'argument 1',
                                 'five-up-two-down.compact line 74 char 1',
                                 'Field',
                                 prev_0)
    }
    if (!(typeof(kind_0) === 'bigint' && kind_0 >= 0n && kind_0 <= 255n)) {
      __compactRuntime.typeError('chainMove',
                                 'argument 2',
                                 'five-up-two-down.compact line 74 char 1',
                                 'Uint<0..256>',
                                 kind_0)
    }
    if (!(typeof(count_0) === 'bigint' && count_0 >= 0n && count_0 <= 255n)) {
      __compactRuntime.typeError('chainMove',
                                 'argument 3',
                                 'five-up-two-down.compact line 74 char 1',
                                 'Uint<0..256>',
                                 count_0)
    }
    if (!(typeof(rankA_0) === 'bigint' && rankA_0 >= 0n && rankA_0 <= 255n)) {
      __compactRuntime.typeError('chainMove',
                                 'argument 4',
                                 'five-up-two-down.compact line 74 char 1',
                                 'Uint<0..256>',
                                 rankA_0)
    }
    if (!(typeof(rankB_0) === 'bigint' && rankB_0 >= 0n && rankB_0 <= 255n)) {
      __compactRuntime.typeError('chainMove',
                                 'argument 5',
                                 'five-up-two-down.compact line 74 char 1',
                                 'Uint<0..256>',
                                 rankB_0)
    }
    if (!(typeof(lies_0) === 'bigint' && lies_0 >= 0n && lies_0 <= 255n)) {
      __compactRuntime.typeError('chainMove',
                                 'argument 6',
                                 'five-up-two-down.compact line 74 char 1',
                                 'Uint<0..256>',
                                 lies_0)
    }
    return _dummyContract._chainMove_0(prev_0,
                                       kind_0,
                                       count_0,
                                       rankA_0,
                                       rankB_0,
                                       lies_0);
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
                                 'five-up-two-down.compact line 82 char 1',
                                 'Bytes<32>',
                                 gameId_0)
    }
    if (!(typeof(transcriptRoot_0) === 'bigint' && transcriptRoot_0 >= 0 && transcriptRoot_0 <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('closeConsentFor',
                                 'argument 2',
                                 'five-up-two-down.compact line 82 char 1',
                                 'Field',
                                 transcriptRoot_0)
    }
    if (!(typeof(p1Score_0) === 'bigint' && p1Score_0 >= 0n && p1Score_0 <= 255n)) {
      __compactRuntime.typeError('closeConsentFor',
                                 'argument 3',
                                 'five-up-two-down.compact line 82 char 1',
                                 'Uint<0..256>',
                                 p1Score_0)
    }
    if (!(typeof(p2Score_0) === 'bigint' && p2Score_0 >= 0n && p2Score_0 <= 255n)) {
      __compactRuntime.typeError('closeConsentFor',
                                 'argument 4',
                                 'five-up-two-down.compact line 82 char 1',
                                 'Uint<0..256>',
                                 p2Score_0)
    }
    if (!(typeof(winner_0) === 'bigint' && winner_0 >= 0n && winner_0 <= 255n)) {
      __compactRuntime.typeError('closeConsentFor',
                                 'argument 5',
                                 'five-up-two-down.compact line 82 char 1',
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
                                 'five-up-two-down.compact line 90 char 1',
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
                                 'five-up-two-down.compact line 93 char 1',
                                 'Field',
                                 sk_0)
    }
    if (!(typeof(consent_0) === 'object' && consent_0.sep.buffer instanceof ArrayBuffer && consent_0.sep.BYTES_PER_ELEMENT === 1 && consent_0.sep.length === 32 && consent_0.gameId.buffer instanceof ArrayBuffer && consent_0.gameId.BYTES_PER_ELEMENT === 1 && consent_0.gameId.length === 32 && typeof(consent_0.transcriptRoot) === 'bigint' && consent_0.transcriptRoot >= 0 && consent_0.transcriptRoot <= __compactRuntime.MAX_FIELD && typeof(consent_0.p1Score) === 'bigint' && consent_0.p1Score >= 0n && consent_0.p1Score <= 255n && typeof(consent_0.p2Score) === 'bigint' && consent_0.p2Score >= 0n && consent_0.p2Score <= 255n && typeof(consent_0.winner) === 'bigint' && consent_0.winner >= 0n && consent_0.winner <= 255n)) {
      __compactRuntime.typeError('closeConsentK',
                                 'argument 2',
                                 'five-up-two-down.compact line 93 char 1',
                                 'struct CloseConsent<sep: Bytes<32>, gameId: Bytes<32>, transcriptRoot: Field, p1Score: Uint<0..256>, p2Score: Uint<0..256>, winner: Uint<0..256>>',
                                 consent_0)
    }
    return _dummyContract._closeConsentK_0(sk_0, consent_0);
  },
  dealDigest: (...args_0) => {
    if (args_0.length !== 4) {
      throw new __compactRuntime.CompactError(`dealDigest: expected 4 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const salt0_0 = args_0[0];
    const salt1_0 = args_0[1];
    const seed_0 = args_0[2];
    const round_0 = args_0[3];
    if (!(salt0_0.buffer instanceof ArrayBuffer && salt0_0.BYTES_PER_ELEMENT === 1 && salt0_0.length === 32)) {
      __compactRuntime.typeError('dealDigest',
                                 'argument 1',
                                 'five-up-two-down.compact line 240 char 1',
                                 'Bytes<32>',
                                 salt0_0)
    }
    if (!(salt1_0.buffer instanceof ArrayBuffer && salt1_0.BYTES_PER_ELEMENT === 1 && salt1_0.length === 32)) {
      __compactRuntime.typeError('dealDigest',
                                 'argument 2',
                                 'five-up-two-down.compact line 240 char 1',
                                 'Bytes<32>',
                                 salt1_0)
    }
    if (!(typeof(seed_0) === 'bigint' && seed_0 >= 0 && seed_0 <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('dealDigest',
                                 'argument 3',
                                 'five-up-two-down.compact line 240 char 1',
                                 'Field',
                                 seed_0)
    }
    if (!(typeof(round_0) === 'bigint' && round_0 >= 0n && round_0 <= 4294967295n)) {
      __compactRuntime.typeError('dealDigest',
                                 'argument 4',
                                 'five-up-two-down.compact line 240 char 1',
                                 'Uint<0..4294967296>',
                                 round_0)
    }
    return _dummyContract._dealDigest_0(salt0_0, salt1_0, seed_0, round_0);
  },
  shuffleDigest: (...args_0) => {
    if (args_0.length !== 4) {
      throw new __compactRuntime.CompactError(`shuffleDigest: expected 4 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const salt0_0 = args_0[0];
    const salt1_0 = args_0[1];
    const seed_0 = args_0[2];
    const round_0 = args_0[3];
    if (!(salt0_0.buffer instanceof ArrayBuffer && salt0_0.BYTES_PER_ELEMENT === 1 && salt0_0.length === 32)) {
      __compactRuntime.typeError('shuffleDigest',
                                 'argument 1',
                                 'five-up-two-down.compact line 243 char 1',
                                 'Bytes<32>',
                                 salt0_0)
    }
    if (!(salt1_0.buffer instanceof ArrayBuffer && salt1_0.BYTES_PER_ELEMENT === 1 && salt1_0.length === 32)) {
      __compactRuntime.typeError('shuffleDigest',
                                 'argument 2',
                                 'five-up-two-down.compact line 243 char 1',
                                 'Bytes<32>',
                                 salt1_0)
    }
    if (!(typeof(seed_0) === 'bigint' && seed_0 >= 0 && seed_0 <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('shuffleDigest',
                                 'argument 3',
                                 'five-up-two-down.compact line 243 char 1',
                                 'Field',
                                 seed_0)
    }
    if (!(typeof(round_0) === 'bigint' && round_0 >= 0n && round_0 <= 4294967295n)) {
      __compactRuntime.typeError('shuffleDigest',
                                 'argument 4',
                                 'five-up-two-down.compact line 243 char 1',
                                 'Uint<0..4294967296>',
                                 round_0)
    }
    return _dummyContract._shuffleDigest_0(salt0_0, salt1_0, seed_0, round_0);
  },
  showdownDigest: (...args_0) => {
    if (args_0.length !== 4) {
      throw new __compactRuntime.CompactError(`showdownDigest: expected 4 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const salt0_0 = args_0[0];
    const salt1_0 = args_0[1];
    const seed_0 = args_0[2];
    const round_0 = args_0[3];
    if (!(salt0_0.buffer instanceof ArrayBuffer && salt0_0.BYTES_PER_ELEMENT === 1 && salt0_0.length === 32)) {
      __compactRuntime.typeError('showdownDigest',
                                 'argument 1',
                                 'five-up-two-down.compact line 322 char 1',
                                 'Bytes<32>',
                                 salt0_0)
    }
    if (!(salt1_0.buffer instanceof ArrayBuffer && salt1_0.BYTES_PER_ELEMENT === 1 && salt1_0.length === 32)) {
      __compactRuntime.typeError('showdownDigest',
                                 'argument 2',
                                 'five-up-two-down.compact line 322 char 1',
                                 'Bytes<32>',
                                 salt1_0)
    }
    if (!(typeof(seed_0) === 'bigint' && seed_0 >= 0 && seed_0 <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('showdownDigest',
                                 'argument 3',
                                 'five-up-two-down.compact line 322 char 1',
                                 'Field',
                                 seed_0)
    }
    if (!(typeof(round_0) === 'bigint' && round_0 >= 0n && round_0 <= 4294967295n)) {
      __compactRuntime.typeError('showdownDigest',
                                 'argument 4',
                                 'five-up-two-down.compact line 322 char 1',
                                 'Uint<0..4294967296>',
                                 round_0)
    }
    return _dummyContract._showdownDigest_0(salt0_0, salt1_0, seed_0, round_0);
  },
  commitBoundary: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`commitBoundary: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const b_0 = args_0[0];
    if (!(typeof(b_0) === 'object' && typeof(b_0.turn) === 'bigint' && b_0.turn >= 0n && b_0.turn <= 255n && typeof(b_0.score0) === 'bigint' && b_0.score0 >= 0n && b_0.score0 <= 255n && typeof(b_0.score1) === 'bigint' && b_0.score1 >= 0n && b_0.score1 <= 255n && typeof(b_0.round) === 'bigint' && b_0.round >= 0n && b_0.round <= 255n && typeof(b_0.ended) === 'boolean' && typeof(b_0.winner) === 'bigint' && b_0.winner >= 0n && b_0.winner <= 255n && typeof(b_0.chain) === 'bigint' && b_0.chain >= 0 && b_0.chain <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('commitBoundary',
                                 'argument 1',
                                 'five-up-two-down.compact line 396 char 1',
                                 'struct Boundary<turn: Uint<0..256>, score0: Uint<0..256>, score1: Uint<0..256>, round: Uint<0..256>, ended: Boolean, winner: Uint<0..256>, chain: Field>',
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
                                 'five-up-two-down.compact line 400 char 1',
                                 'Field',
                                 chain_0)
    }
    return _dummyContract._commitTranscript_0(chain_0);
  }
};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
