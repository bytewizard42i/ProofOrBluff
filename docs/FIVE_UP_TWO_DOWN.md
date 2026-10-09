# 5 Up 2 Down — rules and protocol (v1, 2026-10-08)

The second Proof or Bluff table. Lives beside **Original** (the Cheat-style
v4 rollup); shares the sponsored service, operator wallet, prover and the
player-identity / close-consent scheme. Own contract, referee, bot and UI.

## Rules (as ruled by John, 2026-10-08)

- Each round: **2 private cards per player, 5 face-up board cards**, all nine
  from ONE shared 52-card deck (no duplicates possible, and provably so).
- A **match** = one of your hole cards has the same rank as a board card.
  Suits are decorative. Two hole Kings against one board King = 2 matches.
- Players claim in turn (first claimant alternates each round). A claim names
  0, 1 or 2 board ranks you say you hold. The opponent **accepts** or
  **challenges** ("Proof or Bluff!"). A 0-claim cannot be challenged.
- The proof verifies each claimed rank against the real hole cards and reveals
  exactly one number: how many claimed cards were lies.

| Claim | Accepted | Challenged, all true | Challenged, some false |
|---|---|---|---|
| 0 | 0 | — | — |
| 1 card | +1 | +2 | liar −1, challenger +1 |
| 2 cards | +3 | +4 | 1 lie: liar −1, challenger +1 · 2 lies: liar −2, challenger +2 |

- A claim with ANY lie is void: the true card earns nothing.
- Scores floor at 0.
- **Race to 20** (Standard). Casual = race to 10. Checked at round end;
  higher score wins, equal → draw. Hard cap **10 rounds**; at the cap the
  higher score wins (draw on tie).

## Protocol (mirrors the v4 rollup)

- Constructor = openGame: identities, mode, entropy commits, 10 round-secret
  commits per player. `gameId = kernel.self().bytes`.
- `proveRound(r)`: opens entropy + round-r secrets, deals 9 cards keyed on
  both secrets + seed + round, replays the 4 moves, binds the board and every
  move + challenge outcome into the transcript chain, writes the new boundary.
- `closeGame(p1, p2, winner)`: opens the final boundary, checks both players'
  Schnorr-signed CloseConsent over {gameId, transcriptRoot, scores, winner}.
- Privacy: hole cards never leave the proof. Only the lie count of a
  challenged claim is disclosed (that IS the game). Accepted claims reveal
  nothing — a successful bluff stays a secret forever.

## Files

- `realDeal/contracts/five-up-two-down.compact`
- `realDeal/contracts/five-up-referee.js` (JS mirror; pure circuits for hashes/deal)
- `realDeal/contracts/five-up-two-down.sim.test.js`
- `realDeal/cli/src/five-up-contract.js` (chain binding), bot in `realDeal/cli/src/five-up-bot.js`
- App route `/fiveup`; `.com` second Play button.
