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
    let response;
    try {
      response = await fetchImpl(`${apiRoot}${path}`, init);
    } catch (error) {
      throw new SponsoredApiError(0, `Could not reach the game service: ${error?.message || error}`);
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload?.error || response.statusText || `HTTP ${response.status}`;
      throw new SponsoredApiError(response.status, message);
    }
    return payload;
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
