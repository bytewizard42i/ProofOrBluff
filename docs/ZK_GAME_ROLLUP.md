# Proof or Bluff — the one-proof-per-game ZK rollup

> **Headline for talks, decks and the .com site:** a whole game of bluffing is
> settled by **one zero-knowledge proof**. Every shuffle, every claim, every
> challenge — checked at once, in private, and recorded on Midnight as a single
> verified result. The chain never sees a card. It only ever sees that the game
> was fair.

Status: **prototype implemented; not deployment-ready (Oct 3 2026).**
Compact source, a referee, an in-memory session, chain bindings and receipt
interfaces exist. Simulator execution is not an actual proof or deployment.
Authenticated transcript approval and independent correctness regressions
remain launch gates; proving-key generation and real proving are being measured.
This document describes the Season 1 target, not an already-shipped protocol.
The per-move Preview contract (`proof-or-bluff-mainnet.compact`) is its
predecessor, not the Mainnet launch target.

---

## 1. Why we are changing shape

The Preview contract proves **every move** as its own transaction:

| | Per-move (Preview v1) | One-proof-per-game (this spec) |
|---|---|---|
| Proofs per game | 20–40 | **2** (open, close) |
| Transactions / DUST per game | 20–40 | **2** |
| Player waits on each move | 20–60 s proving | **none** — moves are instant |
| Proof-server load | scaled to *moves per second with a human waiting* | scaled to *games per hour*, in a queue nobody waits on |
| Chain load for 100 concurrent games | thousands of tx/hour | ~200 tx/hour |

Proving work itself does **not** vanish: a proof's cost tracks how much logic it
checks, so one proof over 30 moves costs roughly what 30 small proofs cost,
minus per-proof overhead (~30–40 % saving). What changes is *when* and *where*
that work happens — after the game, off the critical path — and how much the
chain and the DUST budget have to carry. That is what makes "hundreds of
players at once" a capacity-planning question instead of a wall.

## 2. The protocol

```
                     OPEN                       PLAY (off-chain)                     CLOSE
Player ────────────┐                                                               ┌─────────────
  entropy commit   │  tx #1: openGame            moves exchanged instantly          │ tx #2: closeGame
  hand-salt commit ├──────────────►  ledger       both sides keep the transcript   ├──────────────► ledger
  DUST reserve ok  │  (sponsored)                  bot reveals its salt at the end  │ (sponsored)
Bot ───────────────┘                                                               └─────────────
  entropy commit                                                                     ONE proof covers:
  hand-salt commit                                                                   seed · both deals ·
                                                                                     every play · every
                                                                                     challenge · score
```

### 2.1 `openGame` — one transaction, two signatures or a session key

Each side commits, before seeing anything from the other:

- `entropyCommit = H("pob:entropy:v1", entropy)` — half of the shuffle seed
- `saltCommit    = H("pob:hand-salt:v1", salt)` — the private key to that side's deck

The contract stores both commitments, the mode, the two players' public keys
and the open time, and emits a `gameId`. Nothing about cards exists yet; nothing
can be ground for a good hand because the seed does not exist until both halves
are revealed off-chain.

**DUST:** `openGame` is the only fee before the end. In sponsored mode our bot
balances and pays it. In self-pay mode the player's wallet pays it, which also
serves as the "verified DUST reserve" check — a wallet that cannot fund the open
cannot start a game.

### 2.2 Play — instant, off-chain, signed

Both sides reveal their entropy to each other (not to the chain); `seed =
H("pob:seed:v1", e1, e2)`. Each side deals its own hand in private with the
same deterministic `dealHandRanks(salt, seed, round, size)` the closing circuit
will later recompute — see `DEAL_ALGORITHM` below.

Moves are plain messages, each signed by its author's session key and
acknowledged by the other side:

```
Move { gameId, index, kind: PLAY|ACCEPT|CHALLENGE, rank, count, playCommit?, prevHash }
```

`playCommit = H(cards, salts)` is published to the opponent at play time (as
today) so the cards cannot be changed after a challenge. The opponent never
learns the cards unless it challenges and the resolution reveals them.

The transcript is a hash chain; its head, `transcriptRoot`, is what the closing
proof is about.

### 2.3 Close — one proof over everything

When the game ends (first to the mode's score threshold), the **loser of
privacy is nobody**: the game is over, so the bot reveals its hand salt to the
player. The player's browser now holds *all* private witnesses — both salts,
both entropies, every play's cards — and can prove the entire game. (In the
hosted path the browser hands those witnesses to our proof server over HTTPS
for the ~minute it takes to prove; see §5 Privacy.)

`closeGame(gameId, transcriptRoot, finalScoreP1, finalScoreP2, winner)` with
private witnesses `{ e1, e2, salt1, salt2, moves[MAX_MOVES], cards[...] }`
asserts, in-circuit:

1. `H(e1)`, `H(e2)`, `H(salt1)`, `H(salt2)` open the four stored commitments.
2. `seed = H(e1, e2)`; both round-0 hands are `dealHandRanks(saltN, seed, 0, size)`.
3. Replaying the moves in order from the dealt hands:
   - every `PLAY` claims the current rank, 1–4 cards, and **the revealed cards
     are held** in that player's running hand (membership), then removed;
   - every `ACCEPT` / `CHALLENGE` follows a `PLAY` by the other side;
   - every challenge resolves by comparing the revealed cards to the claim:
     truthful → challenger −1 … bluff → challenger +3 (exact rules in `RULES.md`);
   - when a hand empties the round increments and both hands are re-dealt
     from `(salt, seed, round)`;
   - the game ends the first time a score reaches the threshold, and no moves
     follow the end.
4. The hash chain of the moves equals `transcriptRoot`.
5. The final scores and winner equal the public inputs.

The contract records `{ transcriptRoot, scores, winner, closedAt }`, bumps the
public counters, and the game is final. Players' public stats can be derived
from this record without ever exposing a card.

**Fixed sizes.** Compact circuits are fixed-size, so `MAX_MOVES` is a constant
(target: 64, sized to cover first-to-15 Standard games with margin; measured
on Preview before freezing). Unused slots are padded with no-op moves that the
circuit checks are no-ops. A game that reaches `MAX_MOVES` ends as a draw.

## 3. Abandonment and disputes

Nothing is on-chain between open and close, so an unfinished game is simply
**not a game**. For the no-stakes Season 1 that is the whole policy:
leave the table, nothing is recorded, nobody is harmed. `openGame` rows that
are never closed expire after `OPEN_TTL` and can be pruned by anyone.

For any **monetary** mode this is not enough, and we state the rule plainly:

> **Money settles only after the closing proof verifies. Every time. No
> exceptions, no "trusted result", no early payout.**

That implies, for a future wagered contract: both players' signed
acknowledgements on every move (already in the transcript), an on-chain
**dispute window** where the finisher can submit the proof unilaterally using
the quitter's signed last state, and forfeiture rules for a side that refuses
to reveal. That is a state-channel design and is explicitly **out of scope**
until stakes exist.

### 3.1 Parked design: the quit-and-resume rule (John, Oct 3 2026)

Recorded now so it is not re-derived later; **not for Season 1.**

A player who disappears mid-game in a wagered mode must **resume within a
fixed window or the game defaults to the opponent.** Mechanically:

1. The remaining player posts the **latest snapshot both sides signed**.
   This is the only mid-game transaction and only happens in the quit case.
   Posting it starts a block-time clock (`RESUME_WINDOW`, order of 10–30
   minutes: long enough to survive a dropped connection, short enough that
   no pot sits hostage; same `blockTimeGte` enforcement as the Preview
   forfeit circuits).
2. During the window the absent player may **resume** (play continues from
   that snapshot, off-chain again) or **post a newer signed snapshot** if
   the poster was hiding one.
3. **Window expires → the opponent wins by default** and the pot settles to
   them — still only via a verified closing proof, over the transcript up to
   the posted snapshot plus the forfeit.

Safety properties the snapshot chain gives for free:

- **Newest signed snapshot wins.** Posting a stale state to erase a lost
  challenge fails, because the other side holds (and posts) the newer one.
- **You cannot forge a quit.** A default requires the opponent to be
  provably silent for the whole window on-chain, not merely claimed absent.
- **Reveal refusal is a forfeit.** If the side whose salt is needed for the
  closing proof will not reveal, the window rule applies to that too.
- **Both signatures on every snapshot** are what make all of the above
  enforceable; in no-stakes play the signatures are optional, in wagered
  play they are mandatory.

Open questions for when this is built: window length per mode, who pays
the dispute transaction's DUST (proposal: the party that loses the dispute,
deducted from the pot), and whether a resumed game may be disputed again.

**Merkle note.** A Merkle tree does not replace signatures (only a signature
proves the opponent *agreed* to a state) but it shrinks the dispute
transaction: make each snapshot the root of a tree over the moves so far,
and a dispute posts root + latest leaf + ~6-hash path + signature instead
of replaying the transcript — one move revealed, not the game. Compact's
native `MerkleTree` ledger type gives the membership proof cheaply.

### 3.2 Parked design: the cooperative exit ("I'd like to quit")

The complement to 3.1: an **agreed early settlement**, as chess has the
draw offer and poker the chopped pot. Simpler than the timeout path
because both sides consent.

- Either player proposes a split of the pot (e.g. "I quit, you take 70 %").
- The other **accepts** → both sign the final snapshot + split, and the
  game closes with the normal proof over the transcript so far. Money still
  moves only after that proof verifies.
- The other **declines** → play continues. If the proposer then abandons,
  §3.1's timeout rule applies.
- The contract checks only: both signatures on the split, split sums to the
  pot, transcript valid up to that snapshot. **No odds computation
  in-circuit** — hands are private so nobody can compute true odds, and
  consent makes it unnecessary.
- The UI pre-fills a suggested split from the *public* score (12–8 ≈ 60/40)
  and warns when a proposal is far from it. That "range" is a nudge against
  pressure, not a contract rule.

## 4. Who proves, and what it costs

- **Hosted (default):** the player's browser sends the witnesses to
  `proof.prooforbluff.app` (the official `midnightntwrk/proof-server` image,
  run by us behind HTTPS). One `closeGame` proof per game, queued; the player
  sees "sealing your game — N ahead of you" on the result screen, not during
  play.
- **Self-hosted (advanced):** a player running their own proof server proves
  locally; no witness leaves their machine. Same contract, same proof.
- **Future:** Midnight's Proposal 0020 (in-browser proving) would move the
  work to the player's device and drop our proving cost to ~zero. The design
  is a config switch away from it.

**Masking the proving wait (John, Oct 3 2026).** Play a short clip over both
ZK moments instead of a spinner:

- *Open* (seconds): "sealing the deck" — animate the two commitments locking.
  Teaches the fairness model while the open tx confirms.
- *Close* (1–3 min on 2 vCPU): clip + honest queue status ("sealing your game,
  N ahead") + **Play Again is available immediately**; the previous game keeps
  proving in the background and its result badge flips to "verified ✓" when
  the proof lands. The win is only recorded once proven — the clip buys
  patience, it does not pre-announce a result.
- Rules: skippable, never longer than the wait (cut to result when the proof
  finishes early), no sound by default, cached so it never adds load time.
  Three or four variants so repeat players don't see the same one twice.

**Proof receipts (John, Oct 3 2026).** The player should never have to wait
for the proof at all. When `closeGame` confirms, the server sends a
**receipt** — scores, winner, mode, tx hash, explorer link — not the proof
blob (which only the chain reads). Delivery, in order of privacy cost:

1. *In-app "My Games"* — always on, no PII; entries flip to "verified ✓" when
   the proof lands, including after the tab was closed.
2. *Browser push* — opt-in, no PII, the instant "it's sealed" nudge.
3. *Email* — opt-in only, never required to play; the natural hook is Pro
   registration on `.com`, where the player has already chosen to share an
   email. Content is the public record only: never cards, never the transcript.

This is what makes "close the tab the moment the game ends" safe: the bot
holds the witnesses, proves, submits, and the result finds the player.

Capacity math (to be replaced by measured numbers): if a 64-move `closeGame`
proof takes ~2–4 minutes on 2 vCPU / 6 GB, one 8 GB box seals ~20–30 games an
hour. Boxes are stateless and horizontally scaled; game codes (`tickets.js`)
are the admission throttle so we never promise more than we can seal.

## 5. Privacy statement (for the .com privacy page)

- The chain sees: who played, when, the mode, the final score, the winner, and
  a hash of the move list. **Never a card, never a claim's truth, never a
  hand.**
- Your opponent sees: your claims, and your cards only when they challenge —
  exactly as at a physical table.
- In the hosted path our proof server sees the full witness for the minute it
  proves the game; it is the official Midnight image, run by us, over HTTPS,
  and retains nothing. Players who want zero disclosure use their own proof
  server; the game is identical.

## 6. Deal algorithm (shipped to `main`, Oct 3 2026)

`DEAL_ALGORITHM`: Floyd's selection — `size` **distinct** card indexes from a
private 52-card deck keyed by `(salt, seed, round)`, mapped to ranks. Uniform
over hands, never five of a rank, real-deck pair/triple odds, one hash
in-circuit. Independent decks per player are deliberate: one shared deck
keyed by the public seed would let each player compute the other's cards. The
conformance spec in `realDeal/cli/src/deal-conformance.test.js` is the
acceptance test for any deal implementation (10/10 on the compiled contract).

The uniform draw is division-free: `floor(u·m / 65536)` is byte 2 of the
little-endian product. An earlier remainder chain OOM-killed the compiler;
see PixyPi `MIDNIGHT_COMPACT_V030_QUIRKS.md` Quirk 5. (Experiment record:
branches `deal/resample-cap4` — safe but statistically clumpy — and
`deal/hashsort-private-deck` — correct but ~2,700 comparisons; both rejected.)

## 6a. Circuit-cost rules for `closeGame` (from Midnight Expert's cost model)

Current implementation and measured constraints (Compact 0.31.1, ZKIR v2):

1. **Keep persistent commitments at the opening boundary.** The four
   entropy/salt commitments use `persistentHash`. The v3 rollup's seed,
   deal digests and transcript links use transient hashes; `closeGame`
   contains four persistent and 141 transient hash operations. Its seed
   and deal outputs therefore differ from the per-move predecessor's
   SHA-based deal. Clients must use the rollup bindings. The all-transient
   opening-commitment experiment is not adopted: reducing hash count alone
   did not solve the cost problem. The stored transient transcript root
   still needs an explicit version/persistence policy before launch.
2. **Byte conversions can dominate hashing.** `boundedDraw` computes
   `floor(u*m/65536)` by reading byte 2 of `u*m`. With `u <= 65535` and
   literal ranges at most 52, the product is at most 3,407,820 and fits
   in `Bytes<3>`. Expanding it into `Bytes<32>` wasted repeated full-field
   decompositions. The change preserves the algorithm, move limit, round
   limit and commitments. It is not permission to truncate hash digests.
3. **Measure rows, not just instruction counts.** Use the installed
   compiler's `zkir mock-compile <circuit.zkir>` before key generation.
   This models synthesis and reports `k` and rows; it neither generates
   keys nor proves a game. It can be slow for large circuits. Instruction
   counts, generic 2025 benchmark timings and current CPU activity cannot
   establish proving latency or memory fit on the production VPS.
4. **Avoid repeated or deeply dependent computation.** Loops, `map` and
   `fold` are unrolled; a conditional selection does not make its two
   computed alternatives free. Keep dependency depth shallow and measure
   actual emitted constraints when sharing computation.
5. **Preserve one closing proof as the target.** Do not reduce rounds or
   change commitments merely to make a build finish. John's two-proof
   fallback remains a design option if measured costs require it, but
   splitting needs secure binding of both proofs to the same game.

Measured evidence from the Oct 3 investigation:

| Circuit / experiment | k | Rows | Evidence scope |
|---|---:|---:|---|
| Original 64-move shape probe | 19 | 293,455 | Placeholder rules; not the game contract |
| 64 moves with unverified witness-supplied deals | 19 | 306,541 | Cost isolation only; insecure, never deploy |
| Eight moves with all 12 v3 deals | 21 | 1,854,749 | Confirms deal work dominates |
| All-transient opening experiment, wide product bytes | 21 | 2,071,146 | Experimental only; not adopted |
| One bounded draw, 32-byte product conversion | 14 | 11,284 | Original arithmetic probe |
| Same bounded draw, three-byte product conversion | 10 | 839 | Equivalent arithmetic probe |
| Full v3 closeGame with three-byte products | 20 | 621,400 | All 64 moves, 12 deals, four persistent openings |

The two full-contract variants above have different commitment types; their
row counts are not a controlled one-variable comparison. The single-draw
pair is. Compiled wide/narrow helpers matched the integer reference for all
65,536 inputs at each range in `{13, 46, 47, 48, 49, 50, 51, 52}` (524,288
comparisons). Another 1,536 full deals matched the pre-change bindings
across both hand sizes and all six rounds. Six fixed deal vectors are
pinned in `proof-or-bluff-rollup.sim.test.js`.

Official source corroborates the mechanism: the ledger-8 implementation of
[`DivModPowerOfTwo`](https://github.com/midnightntwrk/midnight-ledger/blob/9f9842ebed66cdff0f54d3fb09efc6a7cd077ed8/zkir/src/ir_vm.rs#L716-L726)
uses full-field bit decomposition before rebuilding quotient and remainder.
[`mock-compile`](https://github.com/midnightntwrk/midnight-ledger/blob/9f9842ebed66cdff0f54d3fb09efc6a7cd077ed8/zkir/src/main.rs#L152-L159)
prints the circuit model, not a generated proof. These ledger-8 sources
corroborate the local 0.31.1 measurements; newer main-branch changes are not
assumed available in this installed compiler.

## 7. Build plan

1. **Engine parity.** demoLand's local engine (`src/engine`) becomes the shared
   off-chain referee both sides run; its move log becomes the signed
   transcript. One engine, two players, deterministic.
2. **Circuit.** `proof-or-bluff-rollup.compact`: `openGame`, `closeGame`,
   `pruneExpired`. Pure helpers exported for clients (deal, hash chain, commit
   functions). Measure `closeGame` proving time at `MAX_MOVES` ∈ {32, 48, 64}.
3. **Bot.** Plays off-chain against the browser over the existing WebSocket /
   HTTP path; reveals its salt on game end; sponsors both transactions.
4. **Browser.** Session key signs moves; witnesses held in memory + IndexedDB
   until close; result screen drives the sealing status honestly.
5. **Preview soak.** Dozens of complete games, every rule path, abandon paths,
   refresh-mid-game recovery.
6. **Mainnet.** New contract address; `.app` env flips; Season 1 opens.

The per-move Preview contract stays in the repo as the reference
implementation of the fairness model and is retired when Season 1 opens.
