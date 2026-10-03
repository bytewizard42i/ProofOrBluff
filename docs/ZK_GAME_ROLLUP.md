# Proof or Bluff — the one-proof-per-game ZK rollup

> **Headline for talks, decks and the .com site:** a whole game of bluffing is
> settled by **one zero-knowledge proof**. Every shuffle, every claim, every
> challenge — checked at once, in private, and recorded on Midnight as a single
> verified result. The chain never sees a card. It only ever sees that the game
> was fair.

Status: **design, approved direction (Oct 3 2026).** Not implemented. This
document is the specification the "Season 1" mainnet contract will be built
against. The per-move Preview contract (`proof-or-bluff-mainnet.compact`) is
the predecessor; its fairness model (committed entropy, private hand salt,
in-circuit deal, proven moves) carries over unchanged — it just runs once at
the end instead of once per move.

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

## 6. Deal algorithm (carried over from the Preview fix)

`DEAL_ALGORITHM`: Floyd's selection — `size` **distinct** card indexes from a
private 52-card deck keyed by `(salt, seed, round)`, mapped to ranks. Uniform
over hands, never five of a rank, real-deck pair/triple odds, ~30 lines and one
hash in-circuit. Independent decks per player are deliberate: one shared deck
keyed by the public seed would let each player compute the other's cards. The
conformance spec in `realDeal/cli/src/deal-conformance.test.js` is the
acceptance test for any deal implementation. (Experiment record: branches
`deal/resample-cap4` — safe but statistically clumpy — and
`deal/hashsort-private-deck` — correct but compiles past 12 GB RAM; rejected.)

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
