/**
 * state.js — file-backed persistence for CLI sessions.
 *
 * Mirrors the localStorage keys used by the browser app, but rooted in
 * `./.pob-state/` (cwd of the CLI) so it's easy to nuke between test
 * runs. We deliberately do NOT touch the browser app's localStorage —
 * the CLI is its own self-contained surface. Crossing surfaces means
 * copy-pasting the contract address (printed by `pob-cli active`).
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// ESM evaluates imported modules before it runs cli.js's module body. Load the
// CLI's environment file here as well, before STATE_DIR is calculated, so
// POB_STATE_NAMESPACE cannot accidentally fall back to "default".
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
// .env.local is gitignored and loaded FIRST so it wins: it holds the private
// public-network seeds (POB_PUBLIC_SEED_*), the private-state password, and
// any Blockfrost token. The committed .env holds only local test fixtures.
dotenv.config({ path: path.resolve(moduleDirectory, '..', '.env.local') });
dotenv.config({ path: path.resolve(moduleDirectory, '..', '.env') });

// Local Midnight chains are disposable: starting a fresh Docker stack makes
// every contract address from the previous chain stale. A namespace gives each
// TestWired environment its own state without deleting useful historical runs.
// Only a simple slug is accepted so an environment variable cannot escape the
// CLI directory through values such as "../../somewhere".
const stateNamespace = process.env.POB_STATE_NAMESPACE || 'default';
if (!/^[a-zA-Z0-9_-]+$/.test(stateNamespace)) {
  throw new Error('POB_STATE_NAMESPACE may contain only letters, numbers, _ and -');
}
const STATE_DIR = path.resolve(process.cwd(), '.pob-state', stateNamespace);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

// Per-network contract address. Switching POB_NETWORK_ID gives a fresh
// contract slot, so you don't accidentally talk to the pre-prod address
// while pointing at the local stack.
// Separate address slots prevent the wagered and state-only contracts from
// being mistaken for one another even when they share the same network.
const CONTRACT_FILE = (networkId, variant = 'wagered') =>
  path.join(STATE_DIR, networkId,
    variant === 'state-only' ? 'contract-state-only.json' : 'contract.json');

const ACTIVE_FILE = (variant = 'wagered') =>
  path.join(STATE_DIR, variant === 'state-only' ? 'active-state-only.json' : 'active.json');

const ENTROPY_FILE = (matchId, role) =>
  path.join(STATE_DIR, 'entropy', matchId, `${role}.hex`);

const PLAY_FILE = (matchId) =>
  path.join(STATE_DIR, 'play', `${matchId}.json`);

// Provably fair edition private material. The hand salt is the secret that
// makes a player's deal unpredictable to everyone else; it must never be sent
// anywhere. The hand file mirrors the 13 per-rank counts the contract has
// committed to for this player, so later plays can open that commitment.
const HAND_SALT_FILE = (matchId, role) =>
  path.join(STATE_DIR, 'hand-salt', matchId, `${role}.hex`);
const HAND_FILE = (matchId, role) =>
  path.join(STATE_DIR, 'hand', matchId, `${role}.json`);

export function getContractAddress(networkId, variant = 'wagered') {
  const data = readJson(CONTRACT_FILE(networkId, variant), null);
  return data?.address || null;
}

export function setContractAddress(networkId, address, variant = 'wagered') {
  writeJson(CONTRACT_FILE(networkId, variant), {
    address,
    network: networkId,
    deployedAt: new Date().toISOString(),
  });
}

export function getActiveMatch(variant = 'wagered') {
  return readJson(ACTIVE_FILE(variant), null)?.matchId || null;
}

export function setActiveMatch(matchId, variant = 'wagered') {
  writeJson(ACTIVE_FILE(variant), { matchId, updatedAt: new Date().toISOString() });
}

export function clearActiveMatch(variant = 'wagered') {
  try { fs.unlinkSync(ACTIVE_FILE(variant)); } catch { /* noop */ }
}

export function persistEntropy(matchId, role, entropyHex) {
  const file = ENTROPY_FILE(matchId, role);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, entropyHex.replace(/^0x/, ''));
}

export function getEntropy(matchId, role) {
  try {
    return fs.readFileSync(ENTROPY_FILE(matchId, role), 'utf8').trim();
  } catch {
    return null;
  }
}

export function persistHandSalt(matchId, role, saltHex) {
  const file = HAND_SALT_FILE(matchId, role);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, saltHex.replace(/^0x/, ''));
}

export function getHandSalt(matchId, role) {
  try {
    return fs.readFileSync(HAND_SALT_FILE(matchId, role), 'utf8').trim();
  } catch {
    return null;
  }
}

/** Store { round, counts: string[13] } — the hand the contract last committed to. */
export function persistHandCounts(matchId, role, round, counts) {
  writeJson(HAND_FILE(matchId, role), {
    round: String(round),
    counts: counts.map((count) => String(count)),
  });
}

export function loadHandCounts(matchId, role) {
  const stored = readJson(HAND_FILE(matchId, role), null);
  if (!stored || !Array.isArray(stored.counts) || stored.counts.length !== 13) return null;
  return { round: BigInt(stored.round), counts: stored.counts.map((count) => BigInt(count)) };
}

export function persistPlayReveal(matchId, dump) {
  writeJson(PLAY_FILE(matchId), dump);
}

export function loadPlayReveal(matchId) {
  return readJson(PLAY_FILE(matchId), null);
}

export function stateRoot() { return STATE_DIR; }
export function privateStateDir(networkId, variant = 'wagered') {
  return path.join(STATE_DIR, networkId,
    variant === 'state-only' ? 'private-state-no-stakes' : 'private-state');
}

export function homeStateDir() {
  // Fallback used by long-lived caches that should outlive cwd resets.
  return path.join(os.homedir(), '.pob-realdeal');
}
