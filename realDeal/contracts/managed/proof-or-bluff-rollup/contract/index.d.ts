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
  saltPair(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, [Uint8Array,
                                                                        Uint8Array]];
  transcript(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, { kind: bigint,
                                                                           rank: bigint,
                                                                           count: bigint,
                                                                           cards: bigint[],
                                                                           playSalt: bigint
                                                                         }[]];
  snapshots(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, { hand0: bigint[],
                                                                          hand1: bigint[],
                                                                          turn: bigint,
                                                                          currentRank: bigint,
                                                                          pending: boolean,
                                                                          claimRank: bigint,
                                                                          claimCount: bigint,
                                                                          claimCards: bigint[],
                                                                          claimer: bigint,
                                                                          score0: bigint,
                                                                          score1: bigint,
                                                                          round: bigint,
                                                                          ended: boolean,
                                                                          chain: bigint
                                                                        }[]];
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
  openGame(context: __compactRuntime.CircuitContext<PS>,
           playerOne_0: Uint8Array,
           playerTwo_0: Uint8Array,
           mode_0: bigint,
           p1EntropyCommit_0: Uint8Array,
           p1SaltCommit_0: Uint8Array,
           p2EntropyCommit_0: Uint8Array,
           p2SaltCommit_0: Uint8Array,
           currentTime_0: bigint): __compactRuntime.CircuitResults<PS, Uint8Array>;
  closeGame(context: __compactRuntime.CircuitContext<PS>,
            gameId_0: Uint8Array,
            transcriptRoot_0: bigint,
            p1Score_0: bigint,
            p2Score_0: bigint,
            winner_0: bigint,
            currentTime_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  pruneExpired(context: __compactRuntime.CircuitContext<PS>,
               gameId_0: Uint8Array,
               currentTime_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  openGame(context: __compactRuntime.CircuitContext<PS>,
           playerOne_0: Uint8Array,
           playerTwo_0: Uint8Array,
           mode_0: bigint,
           p1EntropyCommit_0: Uint8Array,
           p1SaltCommit_0: Uint8Array,
           p2EntropyCommit_0: Uint8Array,
           p2SaltCommit_0: Uint8Array,
           currentTime_0: bigint): __compactRuntime.CircuitResults<PS, Uint8Array>;
  closeGame(context: __compactRuntime.CircuitContext<PS>,
            gameId_0: Uint8Array,
            transcriptRoot_0: bigint,
            p1Score_0: bigint,
            p2Score_0: bigint,
            winner_0: bigint,
            currentTime_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  pruneExpired(context: __compactRuntime.CircuitContext<PS>,
               gameId_0: Uint8Array,
               currentTime_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  commitEntropy(entropy_0: Uint8Array): Uint8Array;
  combineEntropy(p1Entropy_0: Uint8Array, p2Entropy_0: Uint8Array): bigint;
  commitHandSalt(salt_0: Uint8Array): Uint8Array;
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
  dealHandRanks(salt_0: Uint8Array,
                seed_0: bigint,
                round_0: bigint,
                size_0: bigint): bigint[];
  handCountsFromRanks(ranks_0: bigint[], size_0: bigint): bigint[];
}

export type Circuits<PS> = {
  commitEntropy(context: __compactRuntime.CircuitContext<PS>,
                entropy_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  combineEntropy(context: __compactRuntime.CircuitContext<PS>,
                 p1Entropy_0: Uint8Array,
                 p2Entropy_0: Uint8Array): __compactRuntime.CircuitResults<PS, bigint>;
  commitHandSalt(context: __compactRuntime.CircuitContext<PS>,
                 salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
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
  dealHandRanks(context: __compactRuntime.CircuitContext<PS>,
                salt_0: Uint8Array,
                seed_0: bigint,
                round_0: bigint,
                size_0: bigint): __compactRuntime.CircuitResults<PS, bigint[]>;
  handCountsFromRanks(context: __compactRuntime.CircuitContext<PS>,
                      ranks_0: bigint[],
                      size_0: bigint): __compactRuntime.CircuitResults<PS, bigint[]>;
  openGame(context: __compactRuntime.CircuitContext<PS>,
           playerOne_0: Uint8Array,
           playerTwo_0: Uint8Array,
           mode_0: bigint,
           p1EntropyCommit_0: Uint8Array,
           p1SaltCommit_0: Uint8Array,
           p2EntropyCommit_0: Uint8Array,
           p2SaltCommit_0: Uint8Array,
           currentTime_0: bigint): __compactRuntime.CircuitResults<PS, Uint8Array>;
  closeGame(context: __compactRuntime.CircuitContext<PS>,
            gameId_0: Uint8Array,
            transcriptRoot_0: bigint,
            p1Score_0: bigint,
            p2Score_0: bigint,
            winner_0: bigint,
            currentTime_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  pruneExpired(context: __compactRuntime.CircuitContext<PS>,
               gameId_0: Uint8Array,
               currentTime_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  games: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): { playerOne: Uint8Array,
                                 playerTwo: Uint8Array,
                                 mode: bigint,
                                 p1EntropyCommit: Uint8Array,
                                 p2EntropyCommit: Uint8Array,
                                 p1SaltCommit: Uint8Array,
                                 p2SaltCommit: Uint8Array,
                                 openedAt: bigint,
                                 closed: boolean,
                                 transcriptRoot: bigint,
                                 p1Score: bigint,
                                 p2Score: bigint,
                                 winner: bigint,
                                 closedAt: bigint
                               };
    [Symbol.iterator](): Iterator<[Uint8Array, { playerOne: Uint8Array,
  playerTwo: Uint8Array,
  mode: bigint,
  p1EntropyCommit: Uint8Array,
  p2EntropyCommit: Uint8Array,
  p1SaltCommit: Uint8Array,
  p2SaltCommit: Uint8Array,
  openedAt: bigint,
  closed: boolean,
  transcriptRoot: bigint,
  p1Score: bigint,
  p2Score: bigint,
  winner: bigint,
  closedAt: bigint
}]>
  };
  readonly totalGamesOpened: bigint;
  readonly totalGamesClosed: bigint;
  readonly totalGamesPruned: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
