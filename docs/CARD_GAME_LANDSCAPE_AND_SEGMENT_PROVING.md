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

## 7. Open questions for John
- Segment size 16 (default) vs 8 (faster, more txs)?
- Keep `checkpoint` as a separate cheap anchor, or fold anchoring into `proveSegment` only?
- `closedAt`: keep as block-time lower bound, or drop?
