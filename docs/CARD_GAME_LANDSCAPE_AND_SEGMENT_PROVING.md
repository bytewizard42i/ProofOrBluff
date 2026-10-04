# Card-game landscape on Midnight → segment proving for POB

**Date:** 2026-10-04 · **Status:** design proposal, not implemented · **Decision owner:** John
**Companion:** `../../monolith-docs/MIDNIGHT_CARD_GAMES_SURVEY_2026-10-04.md` (full ecosystem table).
**Supersedes nothing yet.** `ZK_GAME_ROLLUP.md` remains the Season 1 spec until John approves §4.

---

## 1. The problem in one paragraph

Our rollup proves an entire game in one `closeGame` circuit (~641k rows, k=20). On Terry
that is **195 s cold / 130 s warm and 13.7 GiB RAM**. The same circuit asserts
`blockTime ∈ [currentTime, currentTime+120 s]` with `currentTime` fixed *before* proving, so a
valid proof is already stale when it is ready (tests: 120 s accepted, 121 s rejected). The
player also stares at a spinner for minutes at the end of every game. Fairness, privacy and
authorization are all correct; the shape of the proof is wrong.

## 2. What the rest of the ecosystem does (verified from source)

| | Cat Bluff (Preprod) | Showdown Poker | POB rollup |
|---|---|---|---|
| Proof per | **action** (10 circuits) | **action** (9 circuits) | **game** (1 circuit) |
| Card privacy | ElGamal mental poker; reveal-on-challenge | commit + in-circuit hand eval | commit seed/salt; in-circuit deal; every PLAY checked |
| Wall-clock asserts | **none** | **none** ("a circuit has no clock") | on every circuit |
| Player wait | per move: proof + Lace + confirm | per move | nothing until the end, then minutes |
| Live latency published | no — "still needed" | no | yes (ours, above) |

Nobody else attempted whole-game proving. Nobody else puts a time window on a gameplay
circuit. They are not faster because they are smarter — they wait less because each
transaction proves less. (Cat Bluff's `shuffleDeck` does a 52×52 permutation check and
52 EC scalar mults in-circuit; it is not light, it is just paid once per player at setup.)

## 3. John's two questions, answered

**"Ping the chain at metered points and add them to the rollup?"** Yes. A `checkpoint`
circuit posting the transcript chain-head + move index, signed by both players, is a
k≈12–13 proof (seconds). It anchors history (no rewrites after a checkpoint; forfeit from
the last anchor on disconnect). It proves *nothing about cards* — anchoring ≠ verification.

**"A micro-ZKP in the background, asymmetrically, while players play unaware?"** Yes, and
this is the real fix. Proving is just an HTTP call; the bot can prove the *previous*
block of moves while the human plays the *next* one. Midnight transactions prove reads of
their own ledger keys, so other games landing in `games` do not invalidate a proof built
in the background (same property every multi-room Midnight game relies on).

John confirmed DUST is not a constraint (~1 M NIGHT), so more transactions per game is fine.

## 4. Proposed contract shape (v3 rollup = "segmented rollup")

Today's `closeGame` body is already six numbered steps. The split follows those lines:

```
openGame        unchanged (4 commitments; keeps assertRecentBlockTime for openedAt / prune)
proveDeal       steps 1–3: open commitments, derive seed, 12 deals, opening snapshot
                → writes dealRoot = transientHash(hands0, hands1, startingRank) + snapshotRoot(0)
proveSegment k  step 4 for moves [16k, 16k+16): witnesses = 17 snapshots + 16 moves + the
                12 hands (re-derived from dealRoot, NOT recomputed from salts)
                → asserts snapshotRoot(prev) matches ledger, writes snapshotRoot(16k+16)
checkpoint      optional, cheap: chain-head + move index + both signatures (anchor only)
closeGame       steps 5–6: final snapshot ↔ public result, both CloseConsents
                → NO time assertion; closedAt := block-time bound, informational
pruneExpired    unchanged
```

Ledger additions per game: `dealRoot: Field`, `segmentsProven: Uint<8>`, `snapshotRoot: Field`
(commitment to the last proven `GameState`). All hashes are transient-domain (cheap);
nothing new about cards is disclosed — the chain learns commitments, as today.

### Sizing — MEASURED 2026-10-04 with `zkir mock-compile` (compiler 0.31.1)

Probe contracts (gitignored, `node_modules/pob-v3-probe/`) carved the real `closeGame` body
into pieces. Results overturned the initial guess that `applyMove` dominates:

| Probe | What it contains | Rows | k |
|---|---|---|---|
| `probeCommitsOnly` | ledger lookup + open the 4 SHA-256 commitments | **16,933** | 15 |
| `probeDeal` | commitments + seed + **12 hand derivations** (6 rounds × 2 players) + opening snapshot + dealRoot | **380,194** | **19** |
| `probeSegment16` | dealRoot check + prevRoot check + **16 × applyMove** + nextRoot | **92,300** | **17** |
| (reference) `closeGame` v2 | everything, 64 moves | 641k | 20 |
| (reference) `openGame` | | 5,845 | 13 |

Derived unit costs: **≈30k rows per dealt hand**, **≈5.8k rows per move**. The deal is the
elephant: 12 hands ≈ 363k rows, while all 64 moves ≈ 370k. Most games never reach round 6,
yet v2 pays for all six rounds every time.

**Consequence for the design:** derive hands *lazily*. `proveDeal` derives only round 1
(2 hands ≈ 60k + 17k ≈ **~80k rows, k=17**). A segment that contains a round rollover
derives the two new hands for that round inside the segment (+60k rows → a 16-move
segment with one rollover ≈ 150k rows, still k=18). Segments without a rollover stay at
k=17. `dealRoot` then commits to the *salts+seed*, and each segment proves the hands it
uses derive from them — exactly what v2 does, just paid where it is needed.

Projected v3 circuits (rows measured or derived from the unit costs above; times scale
from Terry's measured k=20 ≈ 130–195 s, assuming ~2× per k):

| Circuit | Rows | k | Proof time (Terry) | RAM |
|---|---|---|---|---|
| proveDeal (round 1 only) | ~80k | 17 | ~15–25 s | ~2 GiB |
| proveSegment, 16 moves, no rollover | ~92k | 17 | ~15–25 s | ~2 GiB |
| proveSegment, 16 moves, one rollover | ~150k | 18 | ~30–50 s | ~3–4 GiB |
| checkpoint | <10k | ≤13 | seconds | <1 GiB |
| closeGame v3 (final root ↔ result + 2 consents) | ~20–30k | 15 | ~5–10 s | ~1 GiB |

Segment size is a tuning knob (8 moves ≈ 46k rows/k=16; 32 ≈ 185k/k=18). Start at 16 and
measure real proofs. Every v3 circuit fits the **existing 8 GiB VPS**; Terry becomes a
second prover rather than the only machine that can run the circuit.

### Sizing round 2 — hex-packed hands + minimum-proof model (MEASURED 2026-10-04)

John's "represent the set, not the cards" idea, done as arithmetic: a hand is ONE
`Field` = 13 hex digits, one per rank, Ace lowest, `weight(rank) = 16^rank`. Dealing or
playing a card is `+weight`. Conservation is `played == dealt` once per round (plays ≤ 7,
so digits never carry). Challenge truth is `Σ weight(card_i) == count · weight(rank)`.
The circuit never decomposes the number mid-game. Probe: `node_modules/pob-v3-probe/packed.compact`.

| Probe | Contents | Rows | k |
|---|---|---|---|
| `probeDealPacked` | 4 seals + seed + **shoe deal of both round-1 hands as packed Fields** + dealRoot | **63,555** | **16** |
| `probeSegmentPacked16` | prevRoot check + **16 × stepPacked** (hash chain, played tally, one-equation challenge truth, scores) + conservation + nextRoot | **16,962** | **15** |

| | v2 (replay + 13-counter hands) | v3 packed | factor |
|---|---|---|---|
| deal, round 1, both players | 380,194 (all 6 rounds) / ≈77k (round 1 only, derived) | **63,555** | 6× vs today |
| 16 moves | 92,300 | **16,962** | **5.4×** |
| per move | ≈5,800 | **≈1,060** | 5.5× |

Projected on Terry (scaling from measured k=20 ≈ 130–195 s at ~2×/k): deal ≈ 8–12 s,
segment ≈ 4–6 s, close ≈ 3–5 s. A full 64-move game ≈ 4 segments ≈ 20–25 s of total
proving, all but the last ~10 s hidden behind gameplay. Memory per proof well under 2 GiB,
so 3–4 provers in parallel per machine. **This supersedes the "round 1" table above as
the recommended v3 shape.** Remaining to validate in the real contract: the lazy
rollover (deriving round r+1 inside a segment, +≈23k rows per hand pair in packed form),
and whether 52-card modes keep exact Floyd dealing (≈30k/hand) or accept shoe semantics.

### Player experience
- Human never waits on `proveDeal` or segments — they run while the game is in progress.
- At game end the only foreground work is the **last partial segment + v3 closeGame**
  (~25–60 s on today's hardware depending on whether a rollover landed in it), down from
  130–195 s — and with no time window, a slow prover degrades the wait, not the outcome.
- Receipt shows: `deal proven ✓ · segments 3/4 proven · closing…` — honest and visible.

### Why not go fully per-move like Cat Bluff?
We already have that contract (`proof-or-bluff-mainnet.compact`, on Preview). It costs a
proof + wallet prompt per move, which is the UX we deliberately moved away from. Segments
keep the "play fast, prove in the background" promise while removing the end-of-game wall.

## 5. The time-window fix (do this regardless of segments)

Remove `assertRecentBlockTime` from `closeGame` (and do not add it to `proveDeal` /
`proveSegment`). Keep it on `openGame` only — that is where `openedAt` is stamped for the
7-day `pruneExpired` rule, and `openGame` proves in seconds. For `closedAt`, either store
the block-time lower bound the circuit can observe or drop the field. This single change
makes proving latency *slow* instead of *fatal* and matches every other live Midnight game.

Test to add: the existing 120/121 s boundary test flips to "closeGame accepts any
`currentTime` ≤ block time" (or is deleted with the parameter).

## 6. Migration plan (no public deploy in this list)

1. **Spike** — new file `proof-or-bluff-rollup-v3.compact` (don't edit v2 in place); `--skip-zk`
   compile; `zkir mock-compile` every circuit; record rows/k in this doc. Unit costs are
   already measured (§4); the spike confirms the lazy-deal rollover path and `selectHand`
   restructuring (it currently assumes a fixed `Vector<6, …>` of hands).
2. **Referee/session** — `rollup-referee.js` already emits 65 snapshots; add
   `segmentWitnesses(k)` and `dealWitnesses()` slicers. `rollup-session.js` emits a
   `segmentReady(k)` event every 16 moves.
3. **Chain binding** — `rollup-contract.js`: `proveDeal`, `proveSegment(k)`, `checkpoint`,
   v3 `closeGame`; serialized per game; idempotent resume (`segmentsProven` from ledger).
4. **Bot** — background prover loop: on `segmentReady(k)` → stage witnesses → prove → submit
   → clear. Human-facing latency budget: last segment + close only.
5. **Full keys on Terry**, real proofs via `scripts/prove-rollup-close.mjs` generalized to
   `prove-rollup-v3.mjs` (deal, each segment, close). Record timings in `DEPLOYMENT.md` §5.5.
6. **Preview**: deploy v3, play a full bot game end-to-end, record tx hashes in the launch
   log. Then Preprod. Then John's guarded Mainnet approval (`POB_ALLOW_MAINNET_DEPLOY`).

Guardrails unchanged: no money, `CloseConsent` from both players still required for the
final result, card bounds and canonical move fields stay in `applyMove`.

## 7. External review (2026-10-04) — what changed after three reviewers read the brief

Reviewers: two outside assistants via John, plus Clara (sister). Every point below was
re-verified against midnight-expert skill text (`compact-transaction-model/references/
state-and-conflicts.md`, privacy/threat catalogs, stdlib notes) or against our own source
before being accepted. **Net effect: same goals, different cut lines.**

### 7.1 The decisive change — proof boundaries = ROUND boundaries (Clara)

Fixed 16-move segments were the wrong unit. A **round** is the game's natural unit:

- **Privacy.** Today the bot learns the human's salt only at game end
  (`rollup-session.js` finish logic). One salt derives *every* round's hand, so background
  proving by the bot would hand it the human's live cards. Fix: **each player commits six
  independent round secrets at `openGame`** (before shared randomness exists); after round
  r ends, only round r's secret is released to the prover. Future hands stay secret. The
  prover (bot side) does learn *completed* rounds — acceptable for "this signed result was
  not forged"; the privacy copy must not claim "the house never peeked".
- **Cost.** Compact pays for both branches of an `if`. "Deal lazily inside the move loop"
  would replicate the deal machinery per unrolled iteration. Dealing at a proof boundary
  (once per round proof) is the only cheap placement.
- **Correctness.** `played == dealt` is wrong at round end: Clara ran a legal game where
  round 2 starts while P2 still holds six cards. Invariant is **`dealt = played + remaining`**
  with per-rank nonnegative bounds on `remaining` (a packed `<=` proves nothing per rank).

Round proof = deal both hands for round r (once) + replay that round's ≤13 claim/response
pairs + commit the resulting state. Max 6 round proofs per game. Round r is proven in the
background while round r+1 is played; only the final round + a tiny close are foreground.

### 7.2 Verified corrections from the other two reviewers

| # | Finding | Source | Consequence |
|---|---|---|---|
| R1 | Brief Q6 was **wrong**: ZK proofs bind to the *full* contract state; a write to a different `Map` key invalidates every in-flight proof. Only `Counter` ±1 is commutative. `HistoricMerkleTree` keeps old proofs valid but its *insert* still contends. | state-and-conflicts.md L108–152 | **One contract per game** (deployed by the bot). Shared leaderboard contract uses `Counter`s only. This also means v2 already fails under concurrent players, independent of speed. |
| R2 | Never store a `transientHash` in the ledger (unstable across compiler upgrades). | stdlib notes | v2's `transcriptRoot: Field` on the ledger is a latent bug. v3: transient inside a proof, **one `persistentHash/Commit` per written root**. |
| R3 | Low-entropy values (a 5/7-card hand) are grindable from a bare hash → blinded `persistentCommit`; distinct salts per commitment. | commit-reveal pattern | Round hand anchors = `persistentCommit(hands, roundSecret-derived blinding)`. |
| R4 | Witnesses are untrusted; `ownPublicKey()` is a documented auth bypass. Don't verify 16 Schnorr sigs per segment. | security checklist | Gate each round proof by *opening the previous anchored root*; both players sign anchored roots (existing Schnorr bind). |
| R5 | Phase guard is mandatory (stale segment submitted as a finish; shuffle replayed onto a closed game). | threat catalog | `phase`, `roundsProven`, monotonic predecessor asserts in every circuit. |
| R6 | Assert strings and `disclose()` leak; disclosing the seed to store a root publishes the deck. | privacy skill | Disclose commitments only; no card/salt/hand in assert text. |
| R8 | SHA-256 at the boundary, field hash inside (10–50×). | circuit-costs | Already v3's shape. |
| R9 | Move Floyd/PRNG into the witness; circuit checks a cheap relation. | perf review | Candidate for keeping exact 52-card dealing cheaply. |
| R10 | Forfeit needs no clock in the big proof; tiny public circuit later. Season 1: abandoned = unrated. | reviewer + Clara | No `blockTime` on any gameplay circuit. |
| R11 | Retries, not DUST, are the bill. | gas model | Reinforces R1. |
| R12 | Mainnet: Blockfrost token server-side, DUST ~12 h, permissionless deploys since 2026-09-28 but MIP review still documented — verify, don't assume. Toolchain pins confirmed current. | Kapa + reviewers | Already in runbook. |

### 7.3 Clara's caution on the probe numbers (accepted)
`probeDealPacked` (63,555 rows) and `probeSegmentPacked16` (16,962 rows) measured an
**incomplete prototype**: no legal-turn-order / pending-claim / rank-progression checks, and
conservation skippable when <7 cards were played. They show the *direction* of the packed
representation, not a sound replacement. Shoe dealing (with replacement) also changes the
distribution of a finite 5-deck shoe — treat it as a **gameplay change**, not an optimization.

### 7.4 Execution order (adopted)
1. **Fix closing in v2 now** — drop the 120 s "too old" check from `closeGame` (keep it on
   `openGame`/`pruneExpired`), keep identity/authorization/duplicate-close protection, rebuild
   keys, generate a real proof on Terry that the chain would accept. Unblocks Preview rehearsal.
2. **v3 round proofs with the existing 13-counter hand representation** (sound first):
   per-round secrets committed at `openGame`; one contract per game; persistent roots only;
   phase guard; `dealt = played + remaining` enforced by the existing per-move `removeFrom`.
   Measure. Expect ~k=18 per round proof (≈60k deal + ≤26 moves × 5.8k).
3. **Represent replay as claim/response pairs** (≤13 per 7-card round) — measure, don't assume.
4. **Then** hex-packing inside the round proof, with full legality checks → target k≤16.
5. Persist signed results + proof jobs server-side so a closed browser never loses a finished game.

### 7.5 v3 BUILT and MEASURED (2026-10-04, same day)

`realDeal/contracts/proof-or-bluff-rollup-v3.compact` implements §7.1 + R1–R6 with the
**existing** 13-counter hand representation and exact Floyd dealing (Clara's step 2 — sound
first, pack later). Compiled with 0.31.1 on Terry; bindings in `managed/proof-or-bluff-rollup-v3/`.

| Circuit | Rows | k | Notes |
|---|---|---|---|
| `proveRound(round)` | **185,892** | **18** | opens 2 entropy + 2 round-secret seals, deals both hands once, replays ≤26 moves, opens/writes the Boundary |
| `closeGame(p1, p2, winner)` | **22,062** | **15** | opens final Boundary, result check, both Schnorr consents, persistent transcript commit |
| (v2 `closeGame`, for comparison) | 641k | 20 | |

Projected on Terry from measured k=20 ≈ 130–200 s: **round ≈ 30–50 s (background), close
≈ 5–8 s (foreground)**; RAM ≈ 3–4 GiB / ≈ 1 GiB → fits the 8 GiB VPS. Real proofs still
to be generated (full keygen for v3 not yet run).

Correctness: `proof-or-bluff-rollup-v3.sim.test.js` — **17 tests** against the real compiled
circuits: full honest game (1 round), multi-round rollover (round 2 opens round 1's
committed boundary), phase guard (order, replay, close-before-end, stale boundary,
prove-after-close), every cheat path (wrong round secret / entropy, forged card, phantom
card, tampered score, early stop, wrong winner, stranger's signature), and block time is
never read. Repo total **36 files / 375 tests**. `rollup-v3-referee.js` is the JS mirror.

Compiler lessons (also in AGENTS.md): a non-constant vector index made `--skip-zk` run
>20 min at 11.3 GB; a chained `fold` accumulator over 26 steps made the optimizer run 15+
min at 100 % CPU. v2's shape — independent per-slot asserts against witness snapshots in a
`for` loop — compiles in seconds. Keep it.

Decisions taken (defaults, reversible): round-boundary proofs (replaces 16-move segments);
anchoring folded into round proofs; `closedAt` dropped; exact 52-card dealing retained for
now; one contract per game; per-round secrets.
