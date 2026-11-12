// provider-meter.test.js — proves the diagnostics_channel plumbing counts
// each outbound provider call EXACTLY once across every transport the SDK
// uses (global fetch / node-fetch stack / built-in WebSocket / `ws` package),
// plus the pure level/serialize logic with an injected clock.
//
// Channel message shapes below were verified empirically on Node 22.23 —
// see the header comment in provider-meter.js.

import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocketServer, WebSocket as WsPackageWebSocket } from 'ws';
import crossFetch from 'cross-fetch';
import { createProviderMeter, installProviderMeter, sendProviderAlert } from './provider-meter.js';

const HOST_PATTERN = /^127\.0\.0\.1$/;

let server;
let wss;
let port;
let meter;
let uninstall;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"ok":true}');
  });
  wss = new WebSocketServer({ server });
  // Built-in (undici) WebSocket clients get closed BY THE SERVER with a
  // distinctive code/reason so the close path is exercised too.
  wss.on('connection', (socket) => socket.close(4000, 'bye'));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
  meter = createProviderMeter();
  uninstall = installProviderMeter(meter, { hostPattern: HOST_PATTERN });
});

afterAll(async () => {
  uninstall();
  await new Promise((resolve) => wss.close(resolve));
  await new Promise((resolve) => server.close(resolve));
});

const totals = () => meter.snapshot().last24h;

describe('installProviderMeter channel counting', () => {
  it('counts global fetch requests as http', async () => {
    for (let i = 0; i < 3; i += 1) {
      await fetch(`http://127.0.0.1:${port}/fetch-${i}`).then((r) => r.text());
    }
    expect(totals().http).toBe(3);
    expect(totals().wsOpen).toBe(0);
  });

  it('counts node-fetch/cross-fetch requests as http (node:http channel)', async () => {
    for (let i = 0; i < 2; i += 1) {
      await crossFetch(`http://127.0.0.1:${port}/cross-${i}`).then((r) => r.text());
    }
    expect(totals().http).toBe(5);
    expect(totals().wsOpen).toBe(0);
  });

  it('counts a built-in WebSocket as ONE wsOpen and ZERO http, and records the close', async () => {
    const httpBefore = totals().http;
    const wsOpenBefore = totals().wsOpen;
    const code = await new Promise((resolve, reject) => {
      const ws = new globalThis.WebSocket(`ws://127.0.0.1:${port}/builtin`);
      ws.onopen = () => {};
      ws.onclose = (event) => resolve(event.code);
      ws.onerror = (event) => reject(new Error(event.message ?? 'ws error'));
    });
    expect(code).toBe(4000);
    expect(totals().wsOpen).toBe(wsOpenBefore + 1);
    // The undici handshake ALSO fires undici:request:create — the meter must
    // have deduped it, so http did not move.
    expect(totals().http).toBe(httpBefore);
    expect(totals().wsClose).toBe(1);
    expect(meter.snapshot().lastWsClose.code).toBe(4000);
    expect(meter.snapshot().lastWsClose.reason).toBe('bye');
  });

  it('counts a `ws` package client handshake as ONE wsOpen and ZERO http', async () => {
    const httpBefore = totals().http;
    const wsOpenBefore = totals().wsOpen;
    await new Promise((resolve, reject) => {
      const ws = new WsPackageWebSocket(`ws://127.0.0.1:${port}/pkg`);
      ws.on('open', () => ws.close());
      ws.on('close', resolve);
      ws.on('error', reject);
    });
    expect(totals().wsOpen).toBe(wsOpenBefore + 1);
    expect(totals().http).toBe(httpBefore);
  });

  it('does not count requests to a non-matching host', async () => {
    const before = totals();
    // 'localhost' resolves to the same server but fails the hostname pattern.
    await fetch(`http://localhost:${port}/skip`).then((r) => r.text());
    await new Promise((resolve, reject) => {
      const ws = new WsPackageWebSocket(`ws://localhost:${port}/skip-ws`);
      ws.on('open', () => ws.close());
      ws.on('close', resolve);
      ws.on('error', reject);
    });
    expect(totals().http).toBe(before.http);
    expect(totals().wsOpen).toBe(before.wsOpen);
  });

  it('stops counting after uninstall()', async () => {
    const m2 = createProviderMeter();
    const un = installProviderMeter(m2, { hostPattern: HOST_PATTERN });
    await fetch(`http://127.0.0.1:${port}/before-uninstall`).then((r) => r.text());
    expect(m2.snapshot().last24h.http).toBe(1);
    un();
    await fetch(`http://127.0.0.1:${port}/after-uninstall`).then((r) => r.text());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(m2.snapshot().last24h.http).toBe(1);
  });
});

describe('createProviderMeter logic', () => {
  const T0 = 1_800_000_000_000 - (1_800_000_000_000 % 60_000); // minute-aligned

  function fakeClock(start = T0) {
    let t = start;
    return { now: () => t, advance: (ms) => { t += ms; } };
  }

  it('rolls counts out of the 1 h and 24 h windows', () => {
    const clock = fakeClock();
    const m = createProviderMeter({ now: clock.now });
    m.record('http', T0);
    m.record('http', T0);
    m.record('wsOpen', T0);
    clock.advance(61 * 60_000); // just past the hour, well inside the day
    let snap = m.snapshot();
    expect(snap.lastHour.total).toBe(0);
    expect(snap.last24h).toEqual({ http: 2, wsOpen: 1, wsClose: 0, total: 3 });
    clock.advance(24 * 60 * 60_000);
    m.record('http', clock.now()); // trigger prune/evaluate
    snap = m.snapshot();
    expect(snap.last24h.total).toBe(1); // only the fresh record survives
  });

  it('levels: warn on hourly/daily thresholds, stop on dailyStop, ok otherwise', () => {
    const clock = fakeClock();
    const alerts = [];
    const m = createProviderMeter({ now: clock.now, hourlyWarn: 10, dailyWarn: 100, dailyStop: 200, onAlert: (l, s) => alerts.push(l) });
    for (let i = 0; i < 9; i += 1) m.record('http', clock.now());
    expect(m.snapshot().level).toBe('ok');
    m.record('http', clock.now());
    expect(m.snapshot().level).toBe('warn'); // hourlyWarn hit
    for (let i = 0; i < 89; i += 1) m.record('http', clock.now()); // 99 total
    expect(m.snapshot().level).toBe('warn'); // dailyWarn=100 not yet hit
    m.record('http', clock.now()); // 100 → dailyWarn, still warn (no new transition)
    expect(alerts).toEqual(['warn']);
    for (let i = 0; i < 100; i += 1) m.record('http', clock.now()); // 200 → stop
    expect(m.snapshot().level).toBe('stop');
    expect(alerts).toEqual(['warn', 'stop']);
  });

  it('onAlert fires once per upward transition and re-arms after falling', () => {
    const clock = fakeClock();
    const alerts = [];
    const m = createProviderMeter({ now: clock.now, hourlyWarn: 5, dailyWarn: 50, dailyStop: 100, onAlert: (l) => alerts.push(l) });
    for (let i = 0; i < 5; i += 1) m.record('http', clock.now());
    expect(alerts).toEqual(['warn']);
    for (let i = 0; i < 5; i += 1) m.record('http', clock.now()); // stays warn
    expect(alerts).toEqual(['warn']);
    clock.advance(61 * 60_000); // hour rolls off → level falls to ok
    m.record('http', clock.now());
    expect(m.snapshot().level).toBe('ok');
    expect(alerts).toEqual(['warn']); // falling never alerts
    for (let i = 0; i < 5; i += 1) m.record('http', clock.now()); // warn again → re-armed
    expect(alerts).toEqual(['warn', 'warn']);
  });

  it('swallows onAlert exceptions', () => {
    const m = createProviderMeter({ hourlyWarn: 2, onAlert: () => { throw new Error('webhook down'); } });
    expect(() => m.record('http')).not.toThrow();
    expect(m.snapshot().level).toBe('ok'); // below warn
    expect(() => m.record('http')).not.toThrow();
    expect(m.snapshot().level).toBe('warn'); // alert fired (and threw, swallowed)
  });

  it('serialize/restore round-trips counts and ignores garbage', () => {
    const clock = fakeClock();
    const m = createProviderMeter({ now: clock.now });
    m.record('http', clock.now());
    m.record('wsOpen', clock.now());
    m.noteWsClose({ code: 4000, reason: 'bye' });
    const saved = JSON.parse(JSON.stringify(m.serialize()));

    const restored = createProviderMeter({ now: clock.now });
    restored.restore(saved);
    expect(restored.snapshot().last24h).toEqual(m.snapshot().last24h);
    expect(restored.snapshot().last24h.total).toBe(2);

    // Garbage in, nothing out — no throw, no phantom counts.
    const junk = createProviderMeter({ now: clock.now });
    expect(() => {
      junk.restore('nonsense');
      junk.restore(null);
      junk.restore({ buckets: { abc: { http: 5 }, '-5': { http: 3 }, '9999999999999': { http: 7 }, [`${Math.floor(clock.now() / 60_000)}`]: { http: 'x', wsOpen: -2, wsClose: 4 } } });
    }).not.toThrow();
    const snap = junk.snapshot();
    expect(snap.last24h.http).toBe(0);
    expect(snap.last24h.wsClose).toBe(4); // the one valid field of the valid minute
  });
});

describe('sendProviderAlert', () => {
  it('posts { text, content } once and swallows a rejected fetch', async () => {
    const calls = [];
    const ok = await sendProviderAlert('https://hooks.example/secret', 'level=warn network=mainnet', async (url, init) => {
      calls.push({ url, init });
      return { ok: true };
    });
    expect(ok).toBe(true);
    expect(calls).toHaveLength(1);
    const body = JSON.parse(calls[0].init.body);
    expect(body.text).toBe('level=warn network=mainnet');
    expect(body.content).toBe(body.text);
    expect(calls[0].init.method).toBe('POST');

    const failing = await sendProviderAlert('https://hooks.example/secret', 'x', async () => { throw new Error('network down'); });
    expect(failing).toBe(false); // resolved, not rejected
  });
});
