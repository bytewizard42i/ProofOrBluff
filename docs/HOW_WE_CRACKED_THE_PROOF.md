# How We Cracked the Proof

**Proof or Bluff · Season 1 engineering note · 4 October 2026**
John Santi (design, direction, the ideas that mattered) · Penny (implementation, measurement)
With thanks to Clara and two outside reviewers who read our brief and told us where we were wrong.

---

## The promise

> **Bluff in public. Prove in private.**

A card game where lying is legal, cheating is impossible, and the blockchain never sees a
card. A human plays a bot. When the game ends, the chain records who played, the final
score, the winner, and a hash of the moves — and a zero-knowledge proof that every card
played was really dealt, every challenge was ruled honestly, and both players signed the
result. Nothing else. No stakes in Season 1. Just a game that is *provably* fair.

We set out to ship that on Midnight Mainnet in its first 48 hours. This is the story of
the one day that turned a proof that could never land into a design that will.

## Where we started: one proof to rule them all

Our second design, the "rollup," was elegant on paper. Play the whole game off-chain —
instant moves, both sides signing each one — then prove the *entire* game in a single
circuit at the end. Two transactions per game. Beautiful.

Then we measured it on real hardware.

| What we found | Number |
|---|---|
| Size of the one circuit | **641,000 rows, k=20** |
| Time to prove it | **130–195 seconds** |
| Memory to prove it | **13.7 GiB** (killed the 8 GiB production server; killed a 12 GiB cap on our new box) |
| The contract's own rule | "this proof is valid for **120 seconds**" |

Read those last two lines together. The proof took three minutes to make and expired after
two. **Every valid proof was dead before it existed.** We confirmed it in the compiled
circuit: a close stamped 120 seconds ago was accepted; 121 seconds, rejected. Zero games
could ever have closed on-chain. It wasn't slow. It was impossible.

## What we learned by looking at everyone else

We cloned every card game ever built on Midnight — thirteen repositories — and read the
contracts. Only two others do real zero-knowledge over card identities: **Cat Bluff** and
**Showdown Poker**. Both prove **one action at a time**. Both have **zero wall-clock
assertions** in their gameplay circuits. One author wrote it plainly: *"a circuit has no
clock."*

Nobody else had tried to prove a whole game in one shot. They weren't faster because they
were smarter. They waited less because each transaction proved less.

## Where the cost actually was

We cut our circuit into pieces and measured each one. The result surprised us:

```
Dealing 12 hands (6 rounds × 2 players, every game)   ████████████████████████  ~363k rows
Replaying 64 moves                                     ████████████████████████  ~370k rows
Opening the 4 commitments                              █                          ~17k rows
```

**The deal was the elephant.** We were shuffling six decks up front for games that usually
end in round one or two. And the moves were expensive only because each one dragged all
twelve hands along through every step.

## The ideas that turned it around

Most of these came from John asking the right question at the right moment.

**"What's the *minimum* we must prove?"** — The casino question. If the players could see
in the dark and we couldn't, what must we be able to prove when the light comes on?
Four things: the deal was fair, every played card was dealt, every challenge was ruled
truthfully, and both players signed the same history. Everything else is bookkeeping.

**"Can we ping the chain at metered points?"** — Yes. And the natural point is the
**round**. A round starts with a deal and ends when a hand empties. Prove each round as
it finishes, in the background, while the next one is being played.

**"Could we represent the hand as one symbol instead of thirteen counters?"** — Yes:
a hand becomes a single number in base 16 — one hex digit per rank. Dealing a card is an
addition. Conservation is one equality. We measured that too: a 16-move replay fell from
92k rows to 17k. It's our next optimization, not our first — Clara rightly insisted we
make the sound version first, then make it fast.

**"What if we had a shuffling machine engraved in the contract?"** — That's exactly the
`proveRound` circuit: it deals once, at the start of each round, and never again.

## What the reviewers caught

We wrote up the dilemma and handed it to people who hadn't lived inside it. Every one of
these was then re-verified against Midnight's own documentation before we accepted it:

- **Our concurrency assumption was wrong.** Midnight proofs bind to the *whole* contract
  state. Ten players finishing at once on a shared contract wouldn't just queue — they'd
  invalidate each other's proofs. **One contract per game.**
- **Background proving would have leaked the human's hand.** One salt derived every
  round's cards; giving it to the bot's prover early meant the bot could see live hands.
  **Six independent secrets per player, one per round**, each revealed only after its
  round ends.
- **Never store a transient hash in the ledger** — it isn't stable across compiler
  upgrades. Persistent commitments at every boundary, cheap transient hashing inside.
- **Compact pays for both branches of an `if`.** Dealing "lazily inside the loop" would
  have copied the deal machinery into every move. Deal at the proof boundary. Only there.
- **Enforce the phase order on-chain.** Open → round 1 → round 2 → … → closed. The
  monotonic chain *is* the replay protection.
- **Drop the clock from every gameplay circuit.** A slow proof should be slow, not fatal.

## What we built — in one day

**v2, fixed.** Removed the freshness window from `closeGame`. Rebuilt the keys. Generated a
real proof with the timestamp deliberately backdated ten minutes — the exact case the old
contract rejected. **Accepted, 203.7 seconds, 6 KB transaction.** The old design can now
land on-chain for rehearsal while v3 matures.

**v3, built.** `proof-or-bluff-rollup-v3.compact`:

| | v2 | **v3** |
|---|---|---|
| Unit of proof | the whole game | **one round** |
| Contract | shared, one `Map` | **one per game** (constructor = openGame) |
| Secrets | one salt per player | **six per player, one per round** |
| Deal | 12 hands up front, every game | **2 hands, once per round proof** |
| Wall clock in gameplay | 120 s window | **none** |
| Roots written to the ledger | transient | **persistent commitments** |
| `proveRound` | — | **185,892 rows, k=18** |
| `closeGame` | 641,000 rows, k=20 | **22,062 rows, k=15** |
| Key generation | 11 min, 11.0 GiB | **2 min, 2.6 GiB** |
| Prover key | 339 MB | **77 MB + 11 MB** |
| Player waits at game end for | 130–195 s | last round + close ≈ **35–60 s** (projected), falling to ~10 s with hex packing |
| Fits the 8 GiB production server | no | **yes** |

**Tested against the real compiled circuits** — 17 new tests, 375 in the repository:
a full honest game; a multi-round game where round two provably opens from round one's
committed boundary; out-of-order rounds, replayed rounds, close-before-end, stale
boundaries, prove-after-close — all rejected; forged cards, phantom cards, wrong secrets,
tampered scores, early-stopped rounds, wrong winners, strangers' signatures — all rejected.

## Why this is the right design, not just a faster one

1. **The proof follows the game's own grammar.** A round is where cards are born and die.
   Proving at round boundaries isn't an optimization trick; it's the shape the game
   already had.
2. **Privacy got *stronger*.** The bot can prove completed rounds without ever seeing a
   card that still matters. Before, "background proving" would have been a leak.
3. **It survives the real world.** Concurrent players don't collide. A slow prover doesn't
   kill a game. A compiler upgrade doesn't strand open games. Each of those was a latent
   failure in v2 that we would have met on launch day.
4. **Every guarantee we promised is intact.** Fair deal, no phantom cards, honest
   challenges, signed result — the same four statements, now proven in pieces we can
   actually afford.
5. **We measured instead of guessed.** Every number in this document came from the real
   compiler or a real proof server. Where we were wrong — the 9–10 GiB memory estimate,
   the concurrency assumption, the "deal lazily inside the loop" idea — the measurements
   and the reviewers caught it, and we changed course the same day.

## What's next

- Pull the v3 keys and generate the **first real per-round proof** on Terry.
- Wire the chain binding: deploy-per-game, `proveRound`, `closeGame`, background prover
  loop in the bot.
- Preview rehearsal → Preprod rehearsal → John's explicit approval → Mainnet.
- Then hex-packed hands inside the round proof, targeting k≤16.

---

*We started the day with a proof that could never land. We ended it with one that is five
times cheaper to build, fits the server we already pay for, protects the player's hand
better than before, and passes every cheat we could think to throw at it.*

*Bluff in public. Prove in private. Now we can.*
