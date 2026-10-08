/**
 * client.js — thin JSON client for the wallet-free sponsored game service
 * (docs/SPONSORED_GAME_API.md). The browser holds nothing but the gameId;
 * every call returns the full GameView.
 */

const API_PREFIX = '/v1';

export class SponsoredApiError extends Error {
  /**
   * @param {number} status   HTTP status (0 when the request never reached the server)
   * @param {string} message  `body.error` when present, otherwise the HTTP status text
   */
  constructor(status, message) {
    super(message);
    this.name = 'SponsoredApiError';
    this.status = status;
  }
}

function defaultBaseUrl() {
  const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
  return env.VITE_POB_API_URL || '';
}

function normaliseBaseUrl(baseUrl) {
  const trimmed = String(baseUrl || '').replace(/\/+$/, '');
  if (!trimmed) throw new Error('Sponsored API base URL is missing. Set VITE_POB_API_URL (e.g. https://api.prooforbluff.app).');
  return trimmed.endsWith(API_PREFIX) ? trimmed : `${trimmed}${API_PREFIX}`;
}

/**
 * @param {object} [options]
 * @param {string} [options.baseUrl]      service origin, with or without the /v1 suffix
 * @param {Function} [options.fetchImpl]  fetch-compatible function (injectable for tests)
 */
export function createSponsoredClient({ baseUrl = defaultBaseUrl(), fetchImpl = globalThis.fetch } = {}) {
  const apiRoot = normaliseBaseUrl(baseUrl);
  if (typeof fetchImpl !== 'function') throw new Error('createSponsoredClient needs a fetch implementation.');

  async function request(method, path, body) {
    const init = { method, headers: { Accept: 'application/json' } };
    if (method === 'POST') {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body ?? {});
    }
    // Network blips (and the rare proxy/keep-alive 502) must not cost a player
    // their game: retry transport failures and 5xx up to 3 times, 1s/3s apart.
    // Safe for POSTs here because every endpoint is idempotent or rejects a
    // duplicate cleanly (createGame is the exception — a retried POST /games
    // would make a second game, so it is attempted only once below).
    const attempts = path === '/games' ? 1 : 3;
    let lastError = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      let response;
      try {
        response = await fetchImpl(`${apiRoot}${path}`, init);
      } catch (error) {
        lastError = new SponsoredApiError(0, `Could not reach the game service: ${error?.message || error}`);
        if (attempt < attempts) { await new Promise((r) => setTimeout(r, attempt * 2000)); continue; }
        throw lastError;
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = payload?.error || response.statusText || `HTTP ${response.status}`;
        lastError = new SponsoredApiError(response.status, message);
        if (response.status >= 500 && attempt < attempts) { await new Promise((r) => setTimeout(r, attempt * 2000)); continue; }
        throw lastError;
      }
      return payload;
    }
    throw lastError;
  }

  const requireGameId = (gameId) => {
    if (typeof gameId !== 'string' || !/^[0-9a-f]{64}$/.test(gameId)) throw new Error('gameId must be a 64-character lowercase hex token.');
    return gameId;
  };

  return {
    apiRoot,
    health: () => request('GET', '/health'),
    createGame: ({ mode = 1, difficulty = 'medium' } = {}) => request('POST', '/games', { mode, difficulty }),
    getGame: (gameId) => request('GET', `/games/${requireGameId(gameId)}`),
    play: (gameId, { rank, count, cards }) => request('POST', `/games/${requireGameId(gameId)}/play`, { rank, count, cards }),
    accept: (gameId) => request('POST', `/games/${requireGameId(gameId)}/accept`),
    challenge: (gameId) => request('POST', `/games/${requireGameId(gameId)}/challenge`),
    abandon: (gameId) => request('POST', `/games/${requireGameId(gameId)}/abandon`),
    /** Absolute URL for navigator.sendBeacon on tab close (no custom headers → no preflight). */
    abandonUrl: (gameId) => `${apiRoot}/games/${requireGameId(gameId)}/abandon`,
  };
}

export default createSponsoredClient;
