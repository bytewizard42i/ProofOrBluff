# Sponsored game API (Season 1) — `api.prooforbluff.app/v1`

Season 1 is **server-authoritative and wallet-free**: the service generates all
game material, runs the v3p referee, plays the bot seat, holds the operator
wallet, and submits every proof (`deploy` → `proveRound(r)`… → `closeGame`) in
the background, paying DUST. Cards never touch the chain. The bot's AI is
firewalled in code to its own hand + public state. Client-held round secrets
are a 1.x upgrade, not Season 1.

Browser → service is JSON over HTTPS. CORS is locked to `https://prooforbluff.app`
(+ localhost dev origins). No auth in Season 1; `gameId` is an unguessable
32-byte hex token and is the only handle.

Ranks are integers 0..12 indexing `RANKS` in `realDeal/shared/dealing.js` (0 = '2' … 8 = '10', 9 = J, 10 = Q, 11 = K, 12 = A), same as the circuit. Seats:
`human` (circuit seat 0 / playerOne) and `bot` (seat 1 / playerTwo).

## Endpoints

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/v1/health` | — | `{ ok, network, wallet: { address, dustReady }, proofQueue: { pending } }` |
| POST | `/v1/games` | `{ mode: 0\|1\|4, difficulty?: 'easy'\|'medium'\|'hard' }` | `GameView` |
| GET | `/v1/games/:gameId` | — | `GameView` |
| POST | `/v1/games/:gameId/play` | `{ rank, count, cards: [rank…] }` (cards.length === count, 1..4, rank === currentRank) | `GameView` (bot has responded: accept / challenge) |
| POST | `/v1/games/:gameId/accept` | — | `GameView` (bot then plays if its turn) |
| POST | `/v1/games/:gameId/challenge` | — | `GameView` (bot's cards revealed in `lastEvents`) |
| POST | `/v1/games/:gameId/claim` | `{ count, ranks: [boardRank…] }` (5U2D, claim step) | `GameView` |
| POST | `/v1/games/:gameId/pass` | — | `GameView` (5U2D claim step only; resolves a showdown) |
| POST | `/v1/games/:gameId/next` | — | `GameView` (5U2D; deals the next hand once a round is held) |

Errors: `{ error: string }` with 400 (bad move / bad body), 404 (unknown game),
409 (not your turn / game over), 429 (too many open games), 503 (service not
ready — wallet syncing or no DUST).

## `GameView`

```jsonc
{
  "gameId": "hex64",
  "status": "playing" | "ended" | "closed",   // ended = result final; closed = closeGame on-chain
  "mode": 1, "difficulty": "medium",
  "round": 1,                                  // 1..6
  "turn": "human" | "bot",
  "currentRank": 7,
  "pending": null | { "claimer": "human"|"bot", "rank": 7, "count": 2 },
  "scores": { "human": 3, "bot": 0 },
  "hand": [0, 3, 3, 7, 11, 12, 12],            // the HUMAN's cards (ranks), sorted
  "cardsLeft": { "human": 7, "bot": 5 },
  "winner": null | "human" | "bot" | "draw",
  "lastEvents": [                               // what happened since the human's last action, in order
    { "type": "bot-play",      "rank": 7, "count": 2, "dialogue": "Two sevens." },
    { "type": "bot-accept",    "dialogue": "..." },
    { "type": "bot-challenge", "truthful": false, "revealed": [3, 11], "dialogue": "..." },
    { "type": "human-challenge", "truthful": true, "revealed": [7, 7], "dialogue": "..." },
    { "type": "round-end", "round": 1, "scores": { "human": 8, "bot": 12 } },
    { "type": "game-end",  "winner": "bot" }
  ],
  "chain": {
    "network": "mainnet",
    "contractAddress": null | "hex",
    "receipts": [                               // appended as proofs land; UI shows "round 2/3 proven"
      { "step": "deploy",      "txHash": "…", "blockHeight": 2888400, "seconds": 20.3 },
      { "step": "proveRound",  "round": 1, "txHash": "…", "blockHeight": 2888410, "seconds": 41.4 },
      { "step": "closeGame",   "txHash": "…", "blockHeight": 2888420, "seconds": 22.9 }
    ],
    "pending": ["deploy"] | ["proveRound:2"] | []  // queued/in-flight chain steps
  }
}
```

Rules of play are the circuit's: claims must name `currentRank`; 1..4 cards;
a challenge scores the challenger −1 (floored at 0) if the claim was truthful,
or +3 if it was a bluff; the responder takes the next turn; the rank advances
after every resolution; a round ends when a hand empties (or the game does);
win at 10 / 15 / 20 for mode 0 (Casual) / 1 (Standard) / 4 (Casino); 6 rounds max.

### 5 Up 2 Down view extras (`"gameType": "fiveup"`, modes 0 | 1)

```jsonc
{
  "step": "claim" | "respond" | "round-end",
  "board": [5 ranks], "hole": [2 ranks], "myMatches": [ranks],
  "pending": null | { "claimer": "human"|"bot", "count": 2, "ranks": […] },
  "awaitingNext": true,                            // a finished hand is held; POST /next to deal
  "roundSummary": {                                // while awaitingNext (and after the last round)
    "round": 3, "board": […], "hole": […], "botHole": […],
    "showdowns": [{ "passer": "human", "drawer": "bot", "draws": [r, r], "wins": 1, "passerHole": [r, r] }],
    "scores": { "human": 7, "bot": 5 }
  }
}
```

New `lastEvents` types: `human-pass`, `bot-pass` (dialogue),
`showdown` (`{ passer, draws, wins }`).

## Chain lifecycle (server side, invisible to the player)

1. `POST /v1/games` → game material generated; `deploy` queued (non-blocking).
2. Round ends → `proveRound(r)` queued with that round's witnesses.
3. Game ends → both `CloseConsent` signatures produced (Season 1: both keys
   are server-held) → `closeGame` queued after the last `proveRound`.
4. Every queued step is persisted (`POB_SPONSORED_STATE_DIR`) before it runs and
   marked done after; on restart, unfinished steps resume in order.
5. One operator wallet → one global serialized chain queue. Games never block
   on chain progress; the player only ever sees `chain.receipts` grow.
