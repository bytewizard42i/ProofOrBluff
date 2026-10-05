<div align="center">

![Proof or Bluff — the one-proof game](media/pob-hero-casino.webp)

# Proof or Bluff

### Bluff in public. Prove in private.

*A loneliness-fighting Ai card game that makes zero-knowledge proofs feel human.*

[![Midnight](https://img.shields.io/badge/Midnight-Network-6e3ff3)](https://midnight.network)
[![Contract](https://img.shields.io/badge/contract-proof--or--bluff--rollup-blueviolet)](docs/ZK_GAME_ROLLUP.md)
[![Real ZK proof](https://img.shields.io/badge/real%20ZK%20proof-generated%20Oct%203-success)](scripts/prove-rollup-close.mjs)
[![Tests](https://img.shields.io/badge/tests-351%20passing-brightgreen)](#)
[![Sites](https://img.shields.io/badge/prooforbluff.com%20%2B%20.app-live-orange)](https://prooforbluff.com)

</div>

---

> **Status (Oct 3, 2026)** — The **one-proof-per-game rollup contract**
> (`realDeal/contracts/proof-or-bluff-rollup.compact`) compiles to full proving
> keys (`closeGame` ≈ 641k rows, k=20) and has produced a **real zero-knowledge
> proof** through the live proof-server pipeline: a complete scripted game —
> fairly dealt, bluffed, challenged, and closed with **both players' signed
> consents** — verified end to end in ~190 s. All 351 repo tests pass.
> **It is not deployed yet** — Preview rehearsal is next; per-move predecessor
> contract lives on Preview at `cc75d39e…06a159`. Launch plan:
> [`docs/MAINNET_LAUNCH_RUNBOOK.md`](docs/MAINNET_LAUNCH_RUNBOOK.md).
>
> **Oct 4 2026 — the proof got 5× cheaper.** We found the one-proof design could
> never land on-chain (a 3-minute proof inside a 2-minute window), measured where
> every row went, read every other card game on Midnight, and rebuilt it as
> **one proof per round, one contract per game, one secret per round**:
> `proveRound` k=18 (186k rows), `closeGame` k=15 (22k rows), keys in 2 minutes
> instead of 11, fits the 8 GiB server. 375 tests. The full story, with every
> number: [`docs/HOW_WE_CRACKED_THE_PROOF.md`](docs/HOW_WE_CRACKED_THE_PROOF.md).

## 🎯 The one-proof game

Proof or Bluff is a **ZK game rollup**: a whole match plays instantly
off-chain, then **one zero-knowledge proof** settles it on Midnight — every
shuffle, every claim, every challenge checked at once, in private.

| You see | The chain sees |
|---|---|
| A tense, funny card game | A commitment, a transcript root, two scores, a winner |
| Your private hand | **Never a card. Ever.** |
| "Proof or Bluff!" drama | A proof that both players signed the same ending |
| Seconds of play | Two transactions per game, not dozens |

And the rule that governs the future: **money settles only after the proof
verifies — every time.**

---

## Why this game exists

Most blockchain demos are intellectually correct but emotionally flat.
Proof or Bluff flips that: **privacy IS the game.**

| What the player experiences | What Midnight proves behind the scenes |
|-|-|
| Suspicion, trust, reading tells | The move was legal without revealing the hand |
| The challenge moment | Whether the claim was true — nothing more |
| A companion Ai that banters and bluffs | Only the minimum state needed for fairness |
| Growing companionship | A verifiable record you own |

The player never needs to understand zero-knowledge proofs. They just *feel*
them — as dramatic moments of truth in a game about deception.

---

## How a game actually plays

```
openGame ──► play a whole match off-chain ──► closeGame
   │          (instant, private, free)          │
   │                                            ▼
   │                              ONE ZK proof verifies:
   │                              · both hands were fairly dealt
   │                              · every claim & challenge was legal
   │                              · both players signed the result
   │                              · scores + winner are correct
   ▼                                            │
commitments on-chain                     transcript sealed forever
```

- **`openGame`** — players commit entropy + hand salts; the circuit deals in
  private. Cards never exist outside the proof.
- **`closeGame`** — replays the entire transcript inside the circuit, checks
  scoring, and requires a `CloseConsent` signature from **both** players'
  session keys bound to their public IDs. Nobody can fabricate an ending.
- **`pruneExpired`** — housekeeping for abandoned games.

---

## The stack

| Layer | Role |
|---|---|
| **Compact contract** (`proof-or-bluff-rollup.compact`) | One proof per game; in-circuit deal, replay, scoring, dual-signature authorization |
| **Midnight Network** | Private state, selective disclosure, provable fairness |
| **Proof server** (hosted, `proof.prooforbluff.app`) | Turns witnesses into proofs; sponsored so players never see fees |
| **JS referee** (`rollup-referee.js`) | Mirrors the circuit off-chain — the engine the browser and bot both run |
| **Session layer** (`rollup-session.js`) | Human vs. scripted bot, consent signing, receipt hooks |
| **Ai persona layer** | Personality, banter, tells — the emotional surface of the game |

---

## Quick links

| | | |
|---|---|---|
| 🎮 [Play (when live)](https://prooforbluff.app) | 🌐 [Product site](https://prooforbluff.com) | 📜 [Game rules](docs/RULES.md) |
| 🎯 [ZK Game Rollup spec](docs/ZK_GAME_ROLLUP.md) | 🚀 [Mainnet runbook](docs/MAINNET_LAUNCH_RUNBOOK.md) | 🏗️ [Deployment doc](DEPLOYMENT.md) |
| 🏆 [How we cracked the proof](docs/HOW_WE_CRACKED_THE_PROOF.md) | 🔬 [v3 design + review](docs/CARD_GAME_LANDSCAPE_AND_SEGMENT_PROVING.md) | 🃏 [Midnight card-game survey](../monolith-docs/MIDNIGHT_CARD_GAMES_SURVEY_2026-10-04.md) |
| 🔐 [realDeal README](docs/realDealREADME.md) | 🃏 [demoLand README](docs/demoLandREADME.md) | 🗺️ [Roadmap](docs/ROADMAP.md) |
| 🧪 [Proof harness](scripts/prove-rollup-close.mjs) | 💼 [Business plan](docs/BUSINESS_PLAN.md) | 🎲 [Gameplay research](docs/GAMEPLAY_RESEARCH.md) |

---

## For judges

```bash
./judge-demo.sh
```

Brings up the whole local Midnight stack, waits for healthy, smoke-tests
every endpoint, and opens the game on port 3016. Full instructions:
[`FOR_JUDGES.md`](FOR_JUDGES.md).

---

## Repo map

```
ProofOrBluff/
├── media/                     # Banners, logos, audio — pob-hero-casino.webp is the hero
├── site/                      # prooforbluff.com — marketing, rules, privacy, Pro
├── realDeal/
│   ├── app/                   # prooforbluff.app — the playable browser client
│   ├── cli/                   # rollup session, consent signer, chain API, bot
│   └── contracts/
│       ├── proof-or-bluff-rollup.compact   # ← the Season 1 launch contract
│       ├── signed_credential.compact       # in-circuit Schnorr/Jubjub verify
│       ├── rollup-referee.js               # off-chain engine mirroring the circuit
│       └── managed/proof-or-bluff-rollup/  # generated bindings + zkir + keys (git-ignored)
├── ops/vps/                   # proof-server + Caddy stack (compose.yaml is source of truth)
├── scripts/                   # compile-contract.sh, prove-rollup-close.mjs
└── docs/                      # rules, specs, runbooks, plans — start at ZK_GAME_ROLLUP.md
```

---

## demoLand / realDeal

Proof or Bluff follows the DIDzMonolith **demoLand / realDeal** split:
- **demoLand** — fully functional game, local state, no blockchain. For demos and play-testing.
- **realDeal** — the real thing: Midnight private state, ZK proofs, on-chain fairness.

Same rules, same UI. Different backend. Full architecture:
[`DEMOLAND_VS_REALDEAL.md`](docs/DEMOLAND_VS_REALDEAL.md).

---

## Persona archetypes

The Ai opponent's face should **not** perfectly reveal whether it's lying —
ambiguity is where the fun lives.

| Persona | Style | Tell reliability |
|---|---|---|
| **Charming Liar** | Playful, smiles constantly | Tells are usually fake |
| **Nervous Genius** | Awkward, actually brilliant | Anxiety doesn't correlate with lying |
| **Cold Professional** | Minimal emotion, precise | Intimidating — almost no tells |
| **Chaos Goblin** | Funny, unpredictable trash-talker | Pure entropy |

---

## On stakes

Could this be a wager game? Yes — but **never before the proof**. The launch
contract is deliberately state-only: no escrow, no payouts, nothing to steal.
A future wagered edition is a separate contract and a separate design, gated
on a verified closing proof — **every time.**

Best framing: a privacy-native competitive table game where money can be
*part* of the fun without being the point.

---

## Part of the DIDzMonolith ecosystem

Proof or Bluff lives inside the DIDzMonolith constellation of
privacy-preserving Midnight products:

- **DIDz** — player identity and cross-game reputation (receipts may one day be DIDz attestations)
- **KYCz** — age/jurisdiction checks for wager modes without exposing personal data
- **ProMingle** — finding human opponents
- **SentinelDID** — verification for high-stakes play

---

## Author

**John Santi** — Midnight Ambassador · Midnight Academy Triple Certified ·
Cardano Certified Blockchain Associate · Midnight NightForce Bravo

## License

All Rights Reserved — private project under active development.

---

<div align="center">

*Concept developed collaboratively with Alice (ChatGPT) and Penny (Windsurf Cascade/Devin).*
*Original brainstorm: March 31, 2026.*

**Bluff in public. Prove in private.**

</div>
