// Deal conformance suite — the independent spec every dealing algorithm must
// satisfy, exercised directly against the COMPILED contract's pure circuits
// (no mocks). Written to catch the v1 bug where hands were 7 iid rank draws,
// allowing 5+ of a rank and ~87% pair rates (a real deck gives ~79%).
//
// What "correct" means here:
//   * deterministic in (salt, seed, round, size)
//   * first `size` slots behave like `size` cards drawn WITHOUT REPLACEMENT
//     from a private 52-card deck: max 4 of any rank, real-deck frequencies
//   * ranks are 0..12 and every rank is equally likely (marginal uniformity)
//   * pureCircuits.handCountsFromRanks agrees with an independent JS count
//
// Run from repo root:  npx vitest run realDeal/cli/src/deal-conformance.test.js

import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
// POB_MANAGED_DIR lets the same spec run against a git worktree's build.
const managedDir = process.env.POB_MANAGED_DIR
  ? path.resolve(process.env.POB_MANAGED_DIR)
  : path.resolve(here, '../../contracts/managed/proof-or-bluff-mainnet');
const { pureCircuits } = await import(
  pathToFileURL(path.join(managedDir, 'contract', 'index.js')).href
);

const hex32 = (n) => createHash('sha256').update(`deal-conformance:${n}`).digest('hex');
const bytes32 = (hex) => Uint8Array.from(hex.match(/../g).map((h) => parseInt(h, 16)));

function deal(saltHex, seedHex, round, size = 7n) {
  const ranks = pureCircuits.dealHandRanks(
    bytes32(saltHex), bytes32(seedHex), BigInt(round), BigInt(size),
  );
  return Array.from(ranks, Number);
}

function rankCounts(ranks, size) {
  const counts = new Array(13).fill(0);
  ranks.slice(0, size).forEach((r) => { counts[r] += 1; });
  return counts;
}

describe('compiled contract deal (pureCircuits.dealHandRanks)', () => {
  it('is deterministic in (salt, seed, round, size)', () => {
    const a = deal(hex32(1), hex32(2), 3n);
    const b = deal(hex32(1), hex32(2), 3n);
    expect(b).toEqual(a);
  });

  it.each([
    ['salt', (s, e) => deal(hex32(99), e, 3n)],
    ['seed', (s, e) => deal(s, hex32(99), 3n)],
    ['round', (s, e) => deal(s, e, 99n)],
  ])('changes the hand when %s changes', (_label, altered) => {
    const base = deal(hex32(1), hex32(2), 3n);
    expect(altered(hex32(1), hex32(2))).not.toEqual(base);
  });

  it('never deals more than 4 of a rank across 2000 samples', () => {
    for (let i = 0; i < 2000; i += 1) {
      const counts = rankCounts(deal(hex32(i), hex32(i + 50000), 0n), 7);
      expect(Math.max(...counts), `sample ${i} has 5+ of a rank`).toBeLessThanOrEqual(4);
    }
  });

  it('deals only ranks 0..12 with exactly `size` cards counted', () => {
    for (let i = 0; i < 200; i += 1) {
      const ranks = deal(hex32(i), hex32(i + 60000), 1n);
      expect(ranks).toHaveLength(7);
      ranks.forEach((r) => {
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(12);
      });
      const counts = rankCounts(ranks, 7);
      expect(counts.reduce((a, c) => a + c, 0)).toBe(7);
    }
  });

  it('respects the 5-card mode as a uniform 5-of-52 draw', () => {
    // Every rank must be reachable — the v1-style "truncate a 7-deal" bug
    // would under-represent aces (two ace cards land in slots the naive
    // truncation can't reach). Marginal share per rank should be ~5/52 each.
    const totals = new Array(13).fill(0);
    const N = 2000;
    for (let i = 0; i < N; i += 1) {
      rankCounts(deal(hex32(i), hex32(i + 70000), 0n, 5n), 5)
        .forEach((c, r) => { totals[r] += c; });
    }
    const expected = (5 * N) / 13; // ~769 cards of each rank
    totals.forEach((total, r) => {
      expect(total, `rank ${r} under/over-represented in 5-card mode`)
        .toBeGreaterThan(expected * 0.8);
      expect(total, `rank ${r} under/over-represented in 5-card mode`)
        .toBeLessThan(expected * 1.2);
    });
  });

  it('matches real-deck multiplicity frequencies (7-of-52 without replacement)', () => {
    // Reference probabilities for 7 cards from a real 52-card deck:
    //   P(no pair, all 7 ranks distinct) = C(13,7)*4^7 / C(52,7) ≈ 0.2102
    // iid rank draws give ≈ 0.1378 — that difference is what this test measures.
    const N = 3000;
    let noPair = 0;
    let quad = 0;
    for (let i = 0; i < N; i += 1) {
      const counts = rankCounts(deal(hex32(i), hex32(i + 80000), 2n), 7);
      const max = Math.max(...counts);
      if (max === 1) noPair += 1;
      if (max === 4) quad += 1;
    }
    const pNoPair = noPair / N;
    const pQuad = quad / N;
    // ±4 sigma around the true values (stderr ≈ 0.0075 / 0.0007)
    expect(pNoPair, `P(no pair)=${pNoPair.toFixed(3)}; real deck ≈0.210, iid ≈0.138`)
      .toBeGreaterThan(0.18);
    expect(pNoPair).toBeLessThan(0.245);
    expect(pQuad, `P(four-of-a-kind)=${pQuad.toFixed(4)}; real deck ≈0.0017`)
      .toBeLessThan(0.006);
  });

  it('gives every rank equal marginal probability', () => {
    const totals = new Array(13).fill(0);
    const N = 3000;
    for (let i = 0; i < N; i += 1) {
      rankCounts(deal(hex32(i), hex32(i + 90000), 0n), 7)
        .forEach((c, r) => { totals[r] += c; });
    }
    const expected = (7 * N) / 13; // ~1615 of each rank; stderr ≈ 33
    totals.forEach((total, r) => {
      expect(total, `rank ${r} biased`).toBeGreaterThan(expected - 4 * 34);
      expect(total, `rank ${r} biased`).toBeLessThan(expected + 4 * 34);
    });
  });

  it('agrees with pureCircuits.handCountsFromRanks', () => {
    for (let i = 0; i < 50; i += 1) {
      const salt = bytes32(hex32(i));
      const seed = bytes32(hex32(i + 100000));
      const ranks = Array.from(
        pureCircuits.dealHandRanks(salt, seed, 0n, 7n), Number,
      );
      const circuit = Array.from(
        pureCircuits.handCountsFromRanks(pureCircuits.dealHandRanks(salt, seed, 0n, 7n), 7n),
        Number,
      );
      expect(circuit).toEqual(rankCounts(ranks, 7));
    }
  });
});
