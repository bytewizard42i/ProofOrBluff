/**
 * mockServer.js — in-memory fake of the sponsored game service for tests.
 *
 * Implements the GameView contract from docs/SPONSORED_GAME_API.md with a
 * deterministic deal and a predictable bot: it always accepts the human's
 * claim, and on its own turn plays one card truthfully when it holds the
 * current rank, otherwise bluffs with its lowest card. Chain steps are only
 * queued; tests call `settleChain()` to turn them into receipts.
 */

const MAX_ROUNDS = 6;
const STARTING_RANK = 3;
const MOCK_NETWORK = 'mainnet';

const DEALS = Object.freeze({
  0: Object.freeze({ human: [3, 3, 5, 9, 12], bot: [1, 3, 6, 10, 12] }),
  1: Object.freeze({ human: [0, 3, 3, 7, 11, 12, 12], bot: [2, 3, 5, 7, 8, 10, 12] }),
  2: Object.freeze({ human: [0, 3, 3, 7, 11, 12, 12], bot: [2, 3, 5, 7, 8, 10, 12] }),
});

export const MOCK_DEALS = DEALS;

export function winThreshold(mode) { return mode === 0 ? 10 : mode === 1 ? 15 : 20; }
export function handSize(mode) { return mode === 0 ? 5 : 7; }

class MockHttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const nextRank = (rank) => (rank + 1) % 13;
const minusOneFloor = (score) => Math.max(0, score - 1);

function deterministicGameId(counter) {
  return counter.toString(16).padStart(64, '0');
}

function removeCards(hand, cards) {
  const remaining = [...hand];
  for (const card of cards) {
    const index = remaining.indexOf(card);
    if (index === -1) throw new MockHttpError(400, 'you do not hold that card');
    remaining.splice(index, 1);
  }
  return remaining;
}

function createMockGame({ gameId, mode, difficulty }) {
  const threshold = winThreshold(mode);
  const game = {
    gameId, mode, difficulty,
    status: 'playing', round: 1, turn: 'human', currentRank: STARTING_RANK,
    pending: null, scores: { human: 0, bot: 0 }, winner: null,
    hands: { human: [], bot: [] }, events: [], lastBotPlay: [],
    chain: { contractAddress: null, receipts: [], pending: ['deploy'] },
  };
  const deal = () => {
    game.hands.human = [...DEALS[mode].human].sort((a, b) => a - b);
    game.hands.bot = [...DEALS[mode].bot].sort((a, b) => a - b);
  };
  deal();

  const push = (event) => game.events.push(event);
  const live = () => game.status === 'playing';
  const roundFinished = () => !game.pending && (game.hands.human.length === 0 || game.hands.bot.length === 0);

  function endRoundIfFinished() {
    if (!live() || !roundFinished()) return;
    push({ type: 'round-end', round: game.round, scores: { ...game.scores } });
    game.chain.pending.push(`proveRound:${game.round}`);
    const someoneWon = game.scores.human >= threshold || game.scores.bot >= threshold;
    if (!someoneWon && game.round < MAX_ROUNDS) {
      game.round += 1;
      deal();
      return;
    }
    game.status = 'ended';
    game.winner = game.scores.human > game.scores.bot ? 'human' : game.scores.bot > game.scores.human ? 'bot' : 'draw';
    game.chain.pending.push('closeGame');
    push({ type: 'game-end', winner: game.winner });
  }

  function resolve(challenger, truthful) {
    if (challenger) game.scores[challenger] = truthful ? minusOneFloor(game.scores[challenger]) : game.scores[challenger] + 3;
    game.turn = game.pending.claimer === 'human' ? 'bot' : 'human';
    game.pending = null;
    game.currentRank = nextRank(game.currentRank);
    if (game.scores.human >= threshold || game.scores.bot >= threshold) {
      game.hands.human = []; game.hands.bot = [];
    }
    endRoundIfFinished();
  }

  function botPlaysIfItsTurn() {
    if (!live() || game.turn !== 'bot' || game.pending) return;
    const holdsRank = game.hands.bot.includes(game.currentRank);
    const card = holdsRank ? game.currentRank : game.hands.bot[0];
    game.hands.bot = removeCards(game.hands.bot, [card]);
    game.lastBotPlay = [card];
    game.pending = { claimer: 'bot', rank: game.currentRank, count: 1 };
    game.turn = 'human';
    push({ type: 'bot-play', rank: game.currentRank, count: 1, dialogue: holdsRank ? 'One, honest as the day.' : 'One. Trust me.' });
    endRoundIfFinished();
  }

  function requireHumanTurn() {
    if (!live()) throw new MockHttpError(409, 'game is over');
    if (game.turn !== 'human') throw new MockHttpError(409, 'not your turn');
  }

  return {
    get status() { return game.status; },

    recordReceipt(receipt) {
      game.chain.receipts.push(receipt);
      const key = receipt.step === 'proveRound' ? `proveRound:${receipt.round}` : receipt.step;
      game.chain.pending = game.chain.pending.filter((p) => p !== key);
      if (receipt.step === 'deploy') game.chain.contractAddress = receipt.contractAddress;
      if (receipt.step === 'closeGame' && game.status === 'ended') game.status = 'closed';
    },

    settleChain(blockHeight) {
      for (const key of [...game.chain.pending]) {
        const [step, round] = key.split(':');
        const receipt = { step, txHash: `tx-${gameId.slice(-4)}-${key}`, blockHeight, seconds: 1.5 };
        if (round) receipt.round = Number(round);
        if (step === 'deploy') receipt.contractAddress = 'c0'.repeat(32);
        this.recordReceipt(receipt);
      }
    },

    humanPlay({ rank, count, cards }) {
      requireHumanTurn();
      if (game.pending) throw new MockHttpError(409, 'respond to the pending claim first');
      if (!Number.isInteger(rank) || rank !== game.currentRank) throw new MockHttpError(400, `you must claim the current rank (${game.currentRank})`);
      if (!Number.isInteger(count) || count < 1 || count > 4) throw new MockHttpError(400, 'count must be 1..4');
      if (!Array.isArray(cards) || cards.length !== count || cards.some((c) => !Number.isInteger(c) || c < 0 || c > 12)) {
        throw new MockHttpError(400, 'cards must list exactly `count` ranks in 0..12');
      }
      const remaining = removeCards(game.hands.human, cards);
      game.events = [];
      game.hands.human = remaining;
      game.turn = 'bot';
      if (game.hands.human.length === 0) {
        endRoundIfFinished();
      } else {
        game.pending = { claimer: 'human', rank, count };
        push({ type: 'bot-accept', dialogue: 'Fine by me.' });
        resolve(null, cards.every((c) => c === rank));
      }
      botPlaysIfItsTurn();
      return this.view();
    },

    humanAccept() {
      requireHumanTurn();
      if (!game.pending || game.pending.claimer !== 'bot') throw new MockHttpError(409, 'no bot claim to accept');
      game.events = [];
      resolve(null, true);
      botPlaysIfItsTurn();
      return this.view();
    },

    humanChallenge() {
      requireHumanTurn();
      if (!game.pending || game.pending.claimer !== 'bot') throw new MockHttpError(409, 'no bot claim to challenge');
      game.events = [];
      const truthful = game.lastBotPlay.every((c) => c === game.pending.rank);
      push({
        type: 'human-challenge', truthful, revealed: [...game.lastBotPlay],
        dialogue: truthful ? 'Told you. Honest as the day.' : 'Caught. Well played.',
      });
      resolve('human', truthful);
      botPlaysIfItsTurn();
      return this.view();
    },

    view() {
      const isLive = live();
      return {
        gameId, status: game.status, mode, difficulty,
        round: game.round,
        turn: isLive ? game.turn : null,
        currentRank: isLive ? game.currentRank : null,
        pending: game.pending ? { ...game.pending } : null,
        scores: { ...game.scores },
        hand: isLive ? [...game.hands.human] : [],
        cardsLeft: isLive ? { human: game.hands.human.length, bot: game.hands.bot.length } : { human: 0, bot: 0 },
        winner: game.winner,
        lastEvents: game.events.map((event) => ({ ...event })),
        chain: {
          network: MOCK_NETWORK,
          contractAddress: game.chain.contractAddress,
          receipts: game.chain.receipts.map((receipt) => ({ ...receipt })),
          pending: [...game.chain.pending],
        },
      };
    },
  };
}

/**
 * @param {object} [options]
 * @param {boolean} [options.ready=true]  false → POST /v1/games answers 503
 * @param {number} [options.maxOpenGames]  exceeding it answers 429
 */
export function createMockSponsoredServer({ ready = true, maxOpenGames = Infinity } = {}) {
  const games = new Map();
  let counter = 0;
  let isReady = ready;

  function createGame(body = {}) {
    if (!isReady) throw new MockHttpError(503, 'Service not ready.');
    if (games.size >= maxOpenGames) throw new MockHttpError(429, 'Too many open games right now; try again in a minute.');
    const mode = body.mode ?? 1;
    const difficulty = body.difficulty ?? 'medium';
    if (![0, 1, 2].includes(mode)) throw new MockHttpError(400, 'mode must be 0, 1 or 2.');
    if (!['easy', 'medium', 'hard'].includes(difficulty)) throw new MockHttpError(400, 'difficulty must be easy, medium or hard.');
    counter += 1;
    const gameId = deterministicGameId(counter);
    const game = createMockGame({ gameId, mode, difficulty });
    games.set(gameId, game);
    return game;
  }

  function requireGame(gameId) {
    const game = /^[0-9a-f]{64}$/.test(gameId ?? '') ? games.get(gameId) : null;
    if (!game) throw new MockHttpError(404, 'Unknown game.');
    return game;
  }

  function health() {
    const pending = [...games.values()].reduce((sum, game) => sum + game.view().chain.pending.length, 0);
    return { ok: isReady, network: MOCK_NETWORK, wallet: { address: 'mn_addr_mock', dustReady: isReady }, proofQueue: { pending } };
  }

  function route(method, pathname, body) {
    const parts = pathname.split('/').filter(Boolean);
    const v1 = parts.indexOf('v1');
    if (v1 === -1) throw new MockHttpError(404, 'Not found.');
    const [resource, gameId, action] = parts.slice(v1 + 1);
    if (resource === 'health' && method === 'GET') return [200, health()];
    if (resource !== 'games') throw new MockHttpError(404, 'Not found.');
    if (!gameId && method === 'POST') return [201, createGame(body).view()];
    const game = requireGame(gameId);
    if (!action && method === 'GET') return [200, game.view()];
    if (method !== 'POST') throw new MockHttpError(405, 'Method not allowed.');
    if (action === 'play') return [200, game.humanPlay({ rank: body?.rank, count: body?.count, cards: body?.cards })];
    if (action === 'accept') return [200, game.humanAccept()];
    if (action === 'challenge') return [200, game.humanChallenge()];
    throw new MockHttpError(404, 'Not found.');
  }

  const jsonResponse = (status, payload) => new Response(JSON.stringify(payload), {
    status, headers: { 'Content-Type': 'application/json' },
  });

  async function fetchImpl(url, init = {}) {
    const method = (init.method || 'GET').toUpperCase();
    const body = init.body ? JSON.parse(init.body) : {};
    try {
      const [status, payload] = route(method, new URL(url, 'http://mock.local').pathname, body);
      return jsonResponse(status, payload);
    } catch (error) {
      if (error instanceof MockHttpError) return jsonResponse(error.status, { error: error.message });
      return jsonResponse(500, { error: 'Internal error.' });
    }
  }

  return {
    fetch: fetchImpl,
    baseUrl: 'http://mock.local',
    setReady(value) { isReady = Boolean(value); },
    getGame: (gameId) => games.get(gameId) ?? null,
    settleChain(gameId, blockHeight = 2888400) { requireGame(gameId).settleChain(blockHeight); },
    landReceipt(gameId, receipt) { requireGame(gameId).recordReceipt(receipt); },
    get openGames() { return games.size; },
  };
}

export default createMockSponsoredServer;
