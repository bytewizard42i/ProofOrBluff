import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum GameMode { CASUAL = 0,
                       STANDARD = 1,
                       STRATEGIC = 2,
                       CLASSIC = 3,
                       CASINO = 4
}

export type CloseConsent = { sep: Uint8Array;
                             gameId: Uint8Array;
                             transcriptRoot: bigint;
                             p1Score: bigint;
                             p2Score: bigint;
                             winner: bigint
                           };

export type Witnesses<PS> = {
  get_challenge_reduction(context: __compactRuntime.WitnessContext<Ledger, PS>,
                          challenge_hash_0: bigint): [PS, [bigint, bigint]];
  entropyPair(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, [Uint8Array,
                                                                           Uint8Array]];
  roundSecrets(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, [Uint8Array,
                                                                            Uint8Array]];
  roundMoves(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, { kind: bigint,
                                                                           rank: bigint,
                                                                           count: bigint,
                                                                           cards: bigint[],
                                                                           playSalt: bigint
                                                                         }[]];
  roundSnapshots(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, { played0: bigint,
                                                                               played1: bigint,
                                                                               plays0: bigint,
                                                                               plays1: bigint,
                                                                               turn: bigint,
                                                                               currentRank: bigint,
                                                                               pending: boolean,
                                                                               claimRank: bigint,
                                                                               claimCount: bigint,
                                                                               claimSum: bigint,
                                                                               claimer: bigint,
                                                                               score0: bigint,
                                                                               score1: bigint,
                                                                               round: bigint,
                                                                               ended: boolean,
                                                                               winner: bigint,
                                                                               chain: bigint
                                                                             }[]];
  startBoundary(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, { turn: bigint,
                                                                              currentRank: bigint,
                                                                              score0: bigint,
                                                                              score1: bigint,
                                                                              round: bigint,
                                                                              ended: boolean,
                                                                              winner: bigint,
                                                                              chain: bigint
                                                                            }];
  remainingRanks(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, [bigint[],
                                                                              bigint[]]];
  p1CloseConsent(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, { credential: CloseConsent,
                                                                               signature: { r: __compactRuntime.JubjubPoint,
                                                                                            s: bigint
                                                                                          },
                                                                               pk: __compactRuntime.JubjubPoint
                                                                             }];
  p2CloseConsent(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, { credential: CloseConsent,
                                                                               signature: { r: __compactRuntime.JubjubPoint,
                                                                                            s: bigint
                                                                                          },
                                                                               pk: __compactRuntime.JubjubPoint
                                                                             }];
}

export type ImpureCircuits<PS> = {
  proveRound(context: __compactRuntime.CircuitContext<PS>, round_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  closeGame(context: __compactRuntime.CircuitContext<PS>,
            finalP1Score_0: bigint,
            finalP2Score_0: bigint,
            finalWinner_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  proveRound(context: __compactRuntime.CircuitContext<PS>, round_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  closeGame(context: __compactRuntime.CircuitContext<PS>,
            finalP1Score_0: bigint,
            finalP2Score_0: bigint,
            finalWinner_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  commitEntropy(entropy_0: Uint8Array): Uint8Array;
  combineEntropy(p1Entropy_0: Uint8Array, p2Entropy_0: Uint8Array): bigint;
  commitRoundSecret(secret_0: Uint8Array, round_0: bigint): Uint8Array;
  commitPlayCards(cards_0: bigint[], playSalt_0: bigint): bigint;
  chainMove(prev_0: bigint,
            kind_0: bigint,
            rank_0: bigint,
            count_0: bigint,
            playCommit_0: bigint): bigint;
  playerIdFromPk(pk_0: __compactRuntime.JubjubPoint): Uint8Array;
  closeConsentFor(gameId_0: Uint8Array,
                  transcriptRoot_0: bigint,
                  p1Score_0: bigint,
                  p2Score_0: bigint,
                  winner_0: bigint): CloseConsent;
  closeConsentChallenge(r_0: __compactRuntime.JubjubPoint,
                        pk_0: __compactRuntime.JubjubPoint,
                        consent_0: CloseConsent): bigint;
  closeConsentK(sk_0: bigint, consent_0: CloseConsent): bigint;
  dealPairPacked(salt0_0: Uint8Array,
                 salt1_0: Uint8Array,
                 seed_0: bigint,
                 round_0: bigint,
                 size_0: bigint): [bigint, bigint];
  dealPairIndices(salt0_0: Uint8Array,
                  salt1_0: Uint8Array,
                  seed_0: bigint,
                  round_0: bigint,
                  size_0: bigint): bigint[];
  commitBoundary(b_0: { turn: bigint,
                        currentRank: bigint,
                        score0: bigint,
                        score1: bigint,
                        round: bigint,
                        ended: boolean,
                        winner: bigint,
                        chain: bigint
                      }): Uint8Array;
  commitTranscript(chain_0: bigint): Uint8Array;
}

export type Circuits<PS> = {
  commitEntropy(context: __compactRuntime.CircuitContext<PS>,
                entropy_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  combineEntropy(context: __compactRuntime.CircuitContext<PS>,
                 p1Entropy_0: Uint8Array,
                 p2Entropy_0: Uint8Array): __compactRuntime.CircuitResults<PS, bigint>;
  commitRoundSecret(context: __compactRuntime.CircuitContext<PS>,
                    secret_0: Uint8Array,
                    round_0: bigint): __compactRuntime.CircuitResults<PS, Uint8Array>;
  commitPlayCards(context: __compactRuntime.CircuitContext<PS>,
                  cards_0: bigint[],
                  playSalt_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
  chainMove(context: __compactRuntime.CircuitContext<PS>,
            prev_0: bigint,
            kind_0: bigint,
            rank_0: bigint,
            count_0: bigint,
            playCommit_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
  playerIdFromPk(context: __compactRuntime.CircuitContext<PS>,
                 pk_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, Uint8Array>;
  closeConsentFor(context: __compactRuntime.CircuitContext<PS>,
                  gameId_0: Uint8Array,
                  transcriptRoot_0: bigint,
                  p1Score_0: bigint,
                  p2Score_0: bigint,
                  winner_0: bigint): __compactRuntime.CircuitResults<PS, CloseConsent>;
  closeConsentChallenge(context: __compactRuntime.CircuitContext<PS>,
                        r_0: __compactRuntime.JubjubPoint,
                        pk_0: __compactRuntime.JubjubPoint,
                        consent_0: CloseConsent): __compactRuntime.CircuitResults<PS, bigint>;
  closeConsentK(context: __compactRuntime.CircuitContext<PS>,
                sk_0: bigint,
                consent_0: CloseConsent): __compactRuntime.CircuitResults<PS, bigint>;
  dealPairPacked(context: __compactRuntime.CircuitContext<PS>,
                 salt0_0: Uint8Array,
                 salt1_0: Uint8Array,
                 seed_0: bigint,
                 round_0: bigint,
                 size_0: bigint): __compactRuntime.CircuitResults<PS, [bigint,
                                                                       bigint]>;
  dealPairIndices(context: __compactRuntime.CircuitContext<PS>,
                  salt0_0: Uint8Array,
                  salt1_0: Uint8Array,
                  seed_0: bigint,
                  round_0: bigint,
                  size_0: bigint): __compactRuntime.CircuitResults<PS, bigint[]>;
  commitBoundary(context: __compactRuntime.CircuitContext<PS>,
                 b_0: { turn: bigint,
                        currentRank: bigint,
                        score0: bigint,
                        score1: bigint,
                        round: bigint,
                        ended: boolean,
                        winner: bigint,
                        chain: bigint
                      }): __compactRuntime.CircuitResults<PS, Uint8Array>;
  commitTranscript(context: __compactRuntime.CircuitContext<PS>, chain_0: bigint): __compactRuntime.CircuitResults<PS, Uint8Array>;
  proveRound(context: __compactRuntime.CircuitContext<PS>, round_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  closeGame(context: __compactRuntime.CircuitContext<PS>,
            finalP1Score_0: bigint,
            finalP2Score_0: bigint,
            finalWinner_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly playerOne: Uint8Array;
  readonly playerTwo: Uint8Array;
  readonly mode: bigint;
  readonly p1EntropyCommit: Uint8Array;
  readonly p2EntropyCommit: Uint8Array;
  readonly p1RoundCommits: Uint8Array[];
  readonly p2RoundCommits: Uint8Array[];
  readonly roundsProven: bigint;
  readonly stateRoot: Uint8Array;
  readonly ended: boolean;
  readonly closed: boolean;
  readonly transcriptRoot: Uint8Array;
  readonly p1Score: bigint;
  readonly p2Score: bigint;
  readonly winner: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               playerOneId_0: Uint8Array,
               playerTwoId_0: Uint8Array,
               gameMode_0: bigint,
               p1Entropy_0: Uint8Array,
               p2Entropy_0: Uint8Array,
               p1Rounds_0: Uint8Array[],
               p2Rounds_0: Uint8Array[]): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
