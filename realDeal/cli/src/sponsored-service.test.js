// HTTP-level tests for the sponsored service with a FAKE chain: exercises the
// routes, CORS, validation, the serialized chain queue and receipts flowing
// back into game views. The real circuit acceptance of the emitted witnesses is
// covered in sponsored-game.test.js.

import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createChainQueue, createSponsoredHttpApp, toJsonSafe, allowedOriginsFromEnvironment, installConsoleRedaction, originAllowed } from './sponsored-service.js';

const { pureCircuits } = await import('../../contracts/managed/proof-or-bluff-rollup-v3p/contract/index.js');
const ORIGIN = 'https://prooforbluff.app';

function fakeChain() {
  const calls = [];
  let block = 100;
  const api = {
    async deployGame(args) { calls.push(['deploy', args]); block += 1; return { contractAddress: 'c'.repeat(64), txHash: 'tx-deploy', blockHeight: block }; },
    async proveRound({ round }) { calls.push(['proveRound', round]); block += 1; return { txHash: `tx-r${round}`, blockHeight: block }; },
    async closeGame() { calls.push(['closeGame']); block += 1; return { txHash: 'tx-close', blockHeight: block }; },
    async joinAt() {},
  };
  return { calls, chainForGame: async () => api };
}

let server, base, app, queue, chain, readinessOk = true;

beforeAll(async () => {
  chain = fakeChain();
  queue = createChainQueue({ chainForGame: chain.chainForGame, onReceipt: (id, r) => app.receipt(id, r) });
  app = createSponsoredHttpApp({ pureCircuits, queue, network: 'test', readiness: () => (readinessOk ? { ok: true } : { ok: false, reason: 'no DUST' }) });
  server = http.createServer((q, s) => app.handle(q, s));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => server.close());

const api = async (method, path, body, headers = {}) => {
  const res = await fetch(base + path, {
    method, headers: { Origin: ORIGIN, ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
};

/** Scripted human until the game ends. */
async function playOut(gameId, view) {
  let claims = 0, guard = 0;
  while (view.status === 'playing') {
    if (guard++ > 400) throw new Error('did not finish');
    if (view.pending) { claims += 1; ({ body: view } = await api('POST', `/v1/games/${gameId}/${claims % 3 === 0 ? 'challenge' : 'accept'}`)); continue; }
    const card = view.hand.includes(view.currentRank) ? view.currentRank : view.hand[0];
    ({ body: view } = await api('POST', `/v1/games/${gameId}/play`, { rank: view.currentRank, count: 1, cards: [card] }));
  }
  return view;
}

describe('sponsored service HTTP', () => {
  it('health and stats answer', async () => {
    const h = await api('GET', '/v1/health');
    expect(h.status).toBe(200); expect(h.body.ok).toBe(true); expect(h.body.network).toBe('test');
    const s = await api('GET', '/v1/stats');
    expect(s.status).toBe(200); expect(s.body.created).toBe(0);
  });

  it('CORS: allowed origin echoed, unknown origin refused, preflight 204', async () => {
    const ok = await api('GET', '/v1/health');
    expect(ok.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    const bad = await fetch(`${base}/v1/health`, { headers: { Origin: 'https://evil.example' } });
    expect(bad.status).toBe(403);
    const pre = await fetch(`${base}/v1/games`, { method: 'OPTIONS', headers: { Origin: ORIGIN } });
    expect(pre.status).toBe(204);
  });

  it('creates a game, queues the deploy, and the receipt lands in the view', async () => {
    const c = await api('POST', '/v1/games', { mode: 1 });
    expect(c.status).toBe(201);
    expect(c.body.gameId).toMatch(/^[0-9a-f]{64}$/);
    expect(c.body.hand).toHaveLength(7);
    expect(c.body.chain.network).toBe('test');
    await queue.idle();
    const g = await api('GET', `/v1/games/${c.body.gameId}`);
    expect(g.body.chain.contractAddress).toBe('c'.repeat(64));
    expect(g.body.chain.receipts[0]).toMatchObject({ step: 'deploy', txHash: 'tx-deploy' });
    expect(g.body.chain.pending).toEqual([]);
  });

  it('validates bodies and ids', async () => {
    expect((await api('POST', '/v1/games', { mode: 9 })).status).toBe(400);
    expect((await api('POST', '/v1/games', { difficulty: 'godlike' })).status).toBe(400);
    expect((await api('GET', '/v1/games/nope')).status).toBe(404);
    expect((await api('GET', `/v1/games/${'0'.repeat(64)}`)).status).toBe(404);
    const c = await api('POST', '/v1/games', {});
    const bad = await api('POST', `/v1/games/${c.body.gameId}/play`, { rank: (c.body.currentRank + 1) % 13, count: 1, cards: [c.body.hand[0]] });
    expect(bad.status).toBe(400); expect(bad.body.error).toMatch(/current rank/);
    expect((await api('POST', `/v1/games/${c.body.gameId}/accept`)).status).toBe(409);
    const noJson = await fetch(`${base}/v1/games`, { method: 'POST', headers: { Origin: ORIGIN }, body: 'x' });
    expect(noJson.status).toBe(415);
  });

  it('plays a whole game; chain steps run in order; close receipt flips status to closed', async () => {
    const c = await api('POST', '/v1/games', { mode: 1, difficulty: 'easy' });
    const final = await playOut(c.body.gameId, c.body);
    expect(final.status).toBe('ended');
    expect(['human', 'bot', 'draw']).toContain(final.winner);
    expect(final.lastEvents.at(-1).type).toBe('game-end');
    await queue.idle();
    const g = await api('GET', `/v1/games/${c.body.gameId}`);
    expect(g.body.status).toBe('closed');
    const steps = g.body.chain.receipts.map((r) => r.step);
    expect(steps[0]).toBe('deploy'); expect(steps.at(-1)).toBe('closeGame');
    const rounds = g.body.chain.receipts.filter((r) => r.step === 'proveRound').map((r) => r.round);
    expect(rounds).toEqual(rounds.map((_, i) => i + 1));
    expect(g.body.chain.pending).toEqual([]);
    expect((await api('POST', `/v1/games/${c.body.gameId}/accept`)).status).toBe(409);
    const s = await api('GET', '/v1/stats');
    expect(s.body.ended).toBeGreaterThanOrEqual(1); expect(s.body.closed).toBeGreaterThanOrEqual(1);
    expect(s.body.chain.submitted).toBeGreaterThanOrEqual(rounds.length + 2);
  });

  it('the chain queue is strictly serialized across games', async () => {
    const before = chain.calls.length;
    const a = await api('POST', '/v1/games', {});
    const b = await api('POST', '/v1/games', {});
    await queue.idle();
    const mine = chain.calls.slice(before).filter(([k]) => k === 'deploy');
    expect(mine).toHaveLength(2);
    expect(a.body.gameId).not.toBe(b.body.gameId);
  });

  it('503 when not ready (no DUST) but existing games still answer', async () => {
    const c = await api('POST', '/v1/games', {});
    readinessOk = false;
    expect((await api('POST', '/v1/games', {})).status).toBe(503);
    expect((await api('GET', `/v1/games/${c.body.gameId}`)).status).toBe(200);
    expect((await api('GET', '/v1/health')).body.ok).toBe(false);
    readinessOk = true;
  });

  it('a failing chain step is recorded in stats and does not break the game', async () => {
    const failing = { async deployGame() { throw new Error('boom project_id=SECRET'); } };
    const q2 = createChainQueue({ chainForGame: async () => failing, onReceipt: () => {} });
    const app2 = createSponsoredHttpApp({ pureCircuits, queue: q2, network: 'test' });
    const srv = http.createServer((q, s) => app2.handle(q, s));
    await new Promise((r) => srv.listen(0, '127.0.0.1', r));
    const b2 = `http://127.0.0.1:${srv.address().port}`;
    const res = await fetch(`${b2}/v1/games`, { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json' }, body: '{}' });
    expect(res.status).toBe(201);
    await q2.idle();
    expect(q2.stats.failed).toBe(1);
    expect(q2.stats.lastError.message).toContain('boom');
    srv.close();
  });

  it('beforeStep gates each chain step: a step waits for it, a throw fails only that step, the next step still runs', async () => {
    const calls = [];
    const okChain = { async deployGame() { calls.push('deploy'); return { contractAddress: 'c1', txHash: 't', blockHeight: 1 }; } };
    let release;
    const gate = new Promise((r) => { release = r; });
    let n = 0;
    const beforeStep = async (gameId, step) => {
      n += 1;
      if (n === 1) throw new Error('dust-unready: spendable DUST stayed 0');   // game A's deploy fails loudly
      if (n === 2) await gate;                                                 // game B's deploy waits until released
    };
    const q3 = createChainQueue({ chainForGame: async () => okChain, onReceipt: () => {}, beforeStep });
    const refA = { current: null }; const refB = { current: null };
    q3.enqueue('a'.repeat(64), { step: 'deploy', args: {} }, { contractAddressRef: refA });
    const tailB = q3.enqueue('b'.repeat(64), { step: 'deploy', args: {} }, { contractAddressRef: refB });
    await new Promise((r) => setTimeout(r, 50));
    expect(q3.stats.failed).toBe(1);                                   // A failed...
    expect(q3.stats.lastError.message).toContain('dust-unready');
    expect(calls).toEqual([]);                                         // ...and B has not fired yet (gated)
    release();
    await tailB;
    expect(calls).toEqual(['deploy']);                                 // B ran once released
    expect(refB.current).toBe('c1');
    expect(q3.stats.submitted).toBe(1);
  });

  it('abandon: quitting a live game forgets it, drops unstarted chain steps, and is beacon-friendly', async () => {
    // A slow fake chain so the deploy is still queued when the player quits.
    let release; const gate = new Promise((r) => { release = r; });
    const calls = [];
    const slow = {
      async deployGame() { await gate; calls.push('deploy'); return { contractAddress: 'd'.repeat(64), txHash: 'tx-d', blockHeight: 1 }; },
      async proveRound({ round }) { calls.push(`proveRound${round}`); return { txHash: 't', blockHeight: 2 }; },
      async closeGame() { calls.push('closeGame'); return { txHash: 'c', blockHeight: 3 }; },
    };
    let app2;
    const q = createChainQueue({ chainForGame: async () => slow, onReceipt: (id, r) => app2.receipt(id, r) });
    app2 = createSponsoredHttpApp({ pureCircuits, queue: q, network: 'test' });
    const srv = http.createServer((a, b) => app2.handle(a, b));
    await new Promise((r) => srv.listen(0, '127.0.0.1', r));
    const b2 = `http://127.0.0.1:${srv.address().port}`;
    try {
      // Game A: deploy is in flight (blocked on the gate). Game B: deploy queued behind it.
      const a = await (await fetch(`${b2}/v1/games`, { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json' }, body: '{"mode":1}' })).json();
      const b = await (await fetch(`${b2}/v1/games`, { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json' }, body: '{"mode":1}' })).json();
      expect(app2._games.size).toBe(2);

      // Quit B the way navigator.sendBeacon does: POST, no JSON body, text/plain.
      const quit = await fetch(`${b2}/v1/games/${b.gameId}/abandon`, { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'text/plain' }, body: '' });
      expect(quit.status).toBe(200);
      const view = await quit.json();
      expect(view.status).toBe('abandoned'); expect(view.winner).toBeNull(); expect(view.chain.pending).toEqual([]);
      expect(view.lastEvents).toEqual([{ type: 'game-abandoned' }]);
      expect(app2._games.has(b.gameId)).toBe(false);
      expect((await fetch(`${b2}/v1/games/${b.gameId}`, { headers: { Origin: ORIGIN } })).status).toBe(404);
      // Idempotent / unknown id: still 200 (beacons must never error loudly).
      expect((await fetch(`${b2}/v1/games/${b.gameId}/abandon`, { method: 'POST', headers: { Origin: ORIGIN } })).status).toBe(200);

      // Moves on an abandoned game are refused.
      release(); await q.idle();
      // Only A's deploy ran; B's queued deploy was skipped — no proof, no tx.
      expect(calls).toEqual(['deploy']);
      expect(q.stats.cancelled).toBe(1);
      const stats = await (await fetch(`${b2}/v1/stats`, { headers: { Origin: ORIGIN } })).json();
      expect(stats.abandoned).toBe(1); expect(stats.ended).toBe(0);
      expect(app2._games.get(a.gameId).game.view().chain.contractAddress).toBe('d'.repeat(64));
    } finally { srv.close(); }
  });

  it('sweep abandons live games idle past the threshold, leaves active ones alone', async () => {
    let t = 1_000_000;
    const q = createChainQueue({ chainForGame: chain.chainForGame, onReceipt: () => {} });
    const app3 = createSponsoredHttpApp({ pureCircuits, queue: q, network: 'test', now: () => t });
    const srv = http.createServer((a, b) => app3.handle(a, b));
    await new Promise((r) => srv.listen(0, '127.0.0.1', r));
    const b3 = `http://127.0.0.1:${srv.address().port}`;
    try {
      const idle = await (await fetch(`${b3}/v1/games`, { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json' }, body: '{"mode":1}' })).json();
      t += 9 * 60 * 1000;
      const active = await (await fetch(`${b3}/v1/games`, { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json' }, body: '{"mode":1}' })).json();
      t += 2 * 60 * 1000;              // idle game is now 11 min untouched; active one 2 min
      app3.sweep();
      expect(app3._games.has(idle.gameId)).toBe(false);
      expect(app3._games.has(active.gameId)).toBe(true);
      expect(app3.stats().abandoned).toBe(1);
      await q.idle();
    } finally { srv.close(); }
  });

  it('console redaction scrubs the Blockfrost token from every log level, including URLs and Errors', () => {
    const lines = [];
    const fake = { log: (...a) => lines.push(['log', ...a]), error: (...a) => lines.push(['error', ...a]), info() {}, warn() {}, debug() {} };
    const restore = installConsoleRedaction('nightmainnetSECRETTOKEN', fake);
    fake.log('disconnected from wss://rpc.x/?project_id=nightmainnetSECRETTOKEN: closure');
    fake.error(new Error('fetch https://y/?project_id=nightmainnetSECRETTOKEN failed'));
    restore();
    expect(lines[0][1]).toBe('disconnected from wss://rpc.x/?project_id=[redacted]: closure');
    expect(lines[1][1].message).toBe('fetch https://y/?project_id=[redacted] failed');
    expect(JSON.stringify(lines)).not.toContain('SECRETTOKEN');
  });

  it('toJsonSafe and origin parsing', () => {
    expect(toJsonSafe({ a: 5n, b: [1n, new Uint8Array([255])], c: 'x' })).toEqual({ a: 5, b: [1, 'ff'], c: 'x' });
    expect(toJsonSafe(2n ** 70n)).toBe((2n ** 70n).toString());
    expect([...allowedOriginsFromEnvironment({ POB_ALLOWED_ORIGINS: 'https://prooforbluff.app, http://localhost:5173' })]).toEqual(['https://prooforbluff.app', 'http://localhost:5173']);
    expect(() => allowedOriginsFromEnvironment({ POB_ALLOWED_ORIGINS: 'https://prooforbluff.app/path' })).toThrow(/bare origin/);
    const wild = allowedOriginsFromEnvironment({ POB_ALLOWED_ORIGINS: 'https://prooforbluff.app,https://*-enterpisezk-labs-projects.vercel.app' });
    expect(originAllowed('https://prooforbluff.app', wild)).toBe(true);
    expect(originAllowed('https://pob-git-main-enterpisezk-labs-projects.vercel.app', wild)).toBe(true);
    expect(originAllowed('https://evil.vercel.app', wild)).toBe(false);
    expect(originAllowed('http://pob-enterpisezk-labs-projects.vercel.app', wild)).toBe(false);
    expect(originAllowed('https://evil.example/x-enterpisezk-labs-projects.vercel.app', wild)).toBe(false);
    expect(() => allowedOriginsFromEnvironment({ POB_ALLOWED_ORIGINS: 'https://*' })).toThrow(/real suffix/);
  });
});
