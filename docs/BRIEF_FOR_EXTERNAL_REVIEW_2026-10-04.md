# Proof or Bluff — design dilemma brief (for outside review)

Written 2026-10-04 to paste into other AI assistants / advisors. Self-contained.
Everything marked **measured** was observed on real hardware with real compiler output.

---

## 1. What we are building

**Proof or Bluff (POB)** is a two-player bluffing card game ("Cheat"/"Bullshit") on the
**Midnight** blockchain (Cardano-adjacent privacy chain). A human plays a bot. The chain
never sees a card. It records only: who played, game mode, final scores, winner, and a
hash of the move list. Zero-knowledge proofs enforce that nobody cheated.

Launch target: **Midnight Mainnet, first 48 hours after launch.** Season 1 is
**no money**: state-only, like a video game leaderboard. Wagering comes later and will
settle only after a verified proof.

Toolchain (pinned to the official Mainnet compatibility matrix): Compact compiler 0.31.1
(language 0.23), compact-runtime 0.16.0, ledger v8, Midnight.js 4.1.1,
proof-server image 8.1.0. Compact compiles to PLONK-style circuits; cost is measured in
**rows** and the size bucket **k** (each +1 k ≈ 2× proving time and memory).

Game rules that matter for the proof:
- 13 ranks (A, 2–10, J, Q, K). Modes: CASUAL (5 cards), STANDARD (7), CASINO (7, 5-deck shoe).
- A turn: player PLAYs 1–4 cards face down claiming "N of the current rank" (lying allowed);
  opponent ACCEPTs or CHALLENGEs. Challenge checks the real cards: truthful → challenger −1,
  bluff caught → challenger +3. Hand empties → new round, re-deal (max 6 rounds).
  First to threshold (10/15/20) wins. Max 64 moves per game.

## 2. Where we came from

**v1 (April 2026):** per-move contract with real-money escrow. Shelved: too much
risk/surface for launch.

**v2a "per-move state-only" (deployed on Midnight Preview):** 13 circuits, one ZK proof +
one wallet prompt **per move**. Works. Problem: every move costs a proof and a transaction;
feels like filling in a tax form between turns.

**v2b "one-proof-per-game rollup" (current, commit `8d40df6`):** play the whole game
off-chain instantly (bot referees, both sides sign each move), then **one** `closeGame`
circuit replays all 64 moves and proves everything at the end. Two on-chain txs per game:
`openGame` (4 commitments) and `closeGame` (1 proof).

What `closeGame` proves today, and we want to keep proving:
1. **Fair deal** — both players committed entropy + a private salt before the game; the
   circuit opens the commitments, mixes the entropy into a seed, and derives every hand
   from (seed, salt, round). Nobody can pick or peek at a hand.
2. **No phantom cards** — every card in every PLAY was actually held; it is removed from
   the hand (per-rank counts).
3. **Challenge truth** — every CHALLENGE ruling matches the real cards; scoring follows.
4. **Agreed history** — a hash chain over all moves; **both players sign** the final
   (root, scores, winner) via in-circuit Schnorr-style signature checks; the circuit
   binds each signer's key to the seat registered at `openGame`.
5. Rule-keeping: canonical move fields, card indices 0..12, padding only after game end,
   max 6 rounds → draw.

Test suite: 35 files / **353 tests pass**, including every cheat path above failing in
the real compiled circuit.

## 3. The dilemma — measured facts

| Fact | Value | How measured |
|---|---|---|
| `closeGame` size | **~641,000 rows, k=20** | `zkir mock-compile` |
| Prover key | 324 MB | compiled artifact |
| Proof time (dedicated 8-thread i5, 19 GiB) | **195 s cold / 130 s warm** | real proof-server runs |
| Peak RAM | **13.69 GiB** (OOM-killed at a 12 GiB cap) | docker stats + kernel OOM log |
| Our 8 GiB production VPS | **cannot run it at all** | OOM at 4.5 and 6.5 GiB caps |
| Contract time window | `blockTime ∈ [t, t+120 s]`, `t` fixed **before** proving | contract source |
| Boundary | +120 s accepted, **+121 s rejected** | compiled-circuit tests |

**So a valid proof is already too old by the time it exists.** Zero games can close
on-chain today. Also: the player waits 2–3 minutes at the end of every game, and 10
players finishing together would queue ~30 minutes on one machine.

### Where the 641k rows go (measured by carving the circuit into probes)

| Piece | Rows | Note |
|---|---|---|
| Open the 4 SHA-256 commitments | 16,933 | cheap |
| **Deal 12 hands** (6 rounds × 2 players, derived up front every game) | **≈363,000** (≈30k per hand) | **the elephant** — most games end in round 1–2 |
| Replay 64 moves | ≈370,000 (≈5.8k per move) | includes full board-state equality after every move |
| 16 moves as a standalone segment | 92,300 → k=17 | |

Inside one dealt hand (~30k): ~40% turning the hash into 32 bytes (bit decomposition —
known expensive in this ZK VM), ~35% "no duplicate card" checks (Floyd sampling, 21
equalities), ~25% card→rank and rank-count comparisons.

### What the rest of the Midnight ecosystem does (we read their source)
Only two other projects do real ZK over card identities on Midnight: **Cat Bluff**
(ElGamal mental poker, 10 per-action circuits, live on Preprod) and **Showdown Poker**
(commit + in-circuit hand evaluator). Both prove **per action**, and both use **zero
wall-clock assertions** ("a circuit has no clock"). Nobody else attempted whole-game
proving. They aren't faster — they wait less because each tx proves less.

## 4. Where we have landed (proposal, not yet built)

**v3 "segmented rollup with hex-packed hands."** Keep every guarantee in §2, change shape:

1. **Minimum-proof model.** We only *need* four statements: fair deal, card conservation,
   challenge truth, agreed history. Unchallenged claims are legal and invisible; ACCEPT
   moves carry no card info; full board state after each move is bookkeeping, not integrity.
2. **Hex-packed hand = one field element.** 13 hex digits, one per rank, Ace lowest:
   `weight(rank) = 16^rank`. Dealing a card = `+weight`. Playing = `+weight` into a
   `played` tally. **Conservation = `played == dealt`, one equality per round** (plays ≤ 7
   so no digit overflow). **Challenge truth = `Σ weight(card_i) == count·weight(rank)`,
   one equation.** The circuit never pulls a digit back out (no decomposition mid-game).
3. **`shuffle` circuit** ("the shuffling machine"): one proof right after `openGame`,
   runs in the background, derives round-1 hands only, writes `dealRoot`. Later rounds
   are derived lazily inside whichever segment contains the rollover.
4. **Shoe dealing for CASINO mode**: draw 7 ranks with replacement, no dedup → est. 5–8k
   rows per hand instead of 30k. (52-card modes keep exact dealing.)
5. **`proveSegment(k)`**: 16 moves at a time, proven by the bot **while the human plays
   the next 16**. Chains `prevRoot → nextRoot`. Est. k≤17 (~92k rows measured for the
   old-style replay; packed style should be lower — probe not yet measured).
6. **Tiny `closeGame`**: final root ↔ public result + both signatures. Est. k≈15.
7. **No time assertion on any gameplay circuit** (keep it only on `openGame` for the
   7-day prune TTL). A slow proof becomes slow, not fatal. Matches every live Midnight game.

Expected: every circuit fits the existing 8 GiB VPS; end-of-game wait ~25–60 s → likely
~10–20 s with packing; 3–4 proofs in parallel per machine; nothing rejected for lateness.
DUST (gas) cost is not a constraint (operator holds ~1 M NIGHT).

## 5. Questions we want fresh eyes on

1. **Is the four-statement minimum (fair deal, conservation, challenge truth, agreed
   history) actually sufficient** for a casino-grade integrity claim in Cheat/Bluff? What
   cheat does it miss? (Collusion between seats is out of scope — it's human vs house.)
2. **Hex-packed multiset encoding**: any soundness hole? We rely on (a) plays per round ≤
   hand size so digits never carry, (b) rank index proven 0..12 so `weight()` is a valid
   power of 16. Does conservation-at-round-end equal per-move "card held" in a game where
   cards are never drawn mid-round? (We believe yes.)
3. **Deal derivation is the cost elephant.** Is there a cheaper unbiasable deal than
   hash → bytes → bounded draws? E.g. operate on the hash as a field element with
   modular arithmetic and avoid the 32-byte decomposition entirely? Lookup-table
   techniques available in Midnight's ZK VM (zkir v2 / PLONK with lookups)?
4. **Segment granularity & liveness.** 16 moves per segment vs 8? If the bot (house)
   proves segments in the background, what's the right on-chain fallback when a human
   disconnects mid-segment — forfeit from the last anchored root? Does that need a
   deadline (and therefore a clock) after all, and if so where is it safe to put one?
5. **Timestamps.** Dropping `blockTime` from gameplay circuits fixes the latency bug. Is
   there any reason a state-only game *needs* a wall-clock bound beyond the
   `openGame`-stamped prune TTL? Replay protection is handled by the per-game record.
6. **Concurrency.** Midnight transactions prove reads of their own ledger keys. With N
   games in one `Map`, is there any scenario where another game's write invalidates a
   background-proven segment of ours? (Our understanding: no, as long as our key's
   record is unchanged.)
7. **Mainnet reality check.** Midnight Mainnet requires Blockfrost tokens server-side,
   DUST registration (~12 h), and Foundation deployment authorization via a PR in the
   MIP repo. Anything else a first-48-hours launch typically trips over?

Anything that proves us wrong with numbers is the most valuable answer.
