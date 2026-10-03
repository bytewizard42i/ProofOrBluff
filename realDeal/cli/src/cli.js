#!/usr/bin/env node
/**
 * pob-cli — drives every realDeal circuit from the terminal.
 *
 * Commands (each runs against the wallet selected by --player or
 * POB_DEFAULT_SEED):
 *   create-match     [--mode N --wager N]
 *   join-match       --match 0x... [--wager N]
 *   import-entropy   --match 0x... --role p1|p2 --hex 0x...
 *   reveal-seed      [--match 0x... --starting-rank 0]
 *   play             [--match 0x...] --cards 2,2,2 --rank 2
 *   accept           [--match 0x...]
 *   challenge        [--match 0x...]
 *   resolve          [--match 0x...]
 *   claim-payout     [--match 0x...]
 *   cancel           [--match 0x...]
 *   forfeit-abandon  [--match 0x... --timeout 86400]
 *   forfeit-stall    [--match 0x... --timeout 3600]
 *   state            [--match 0x...]   show full ledger view of the match
 *   active                              print active matchId + contract address
 *   address                             print contract address only
 *   e2e                                 full end-to-end smoke test
 *
 * Global flags:
 *   --player p1|p2|genesis              selects which seed env var to use
 *   --network undeployed|testnet|mainnet
 *
 * The CLI prefers `--match` flags; if omitted it uses the active match
 * stored in `.pob-state/active.json` (set after each create-match or
 * join-match).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import { log } from './log.js';
import { buildWalletFromSeed, deriveUnshieldedAddress } from './wallet-node.js';
import { getContractApi } from './contract.js';
import * as state from './state.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// --- argv parsing -----------------------------------------------------------

function parseArgv(argv) {
  const args = argv.slice(2);
  const cmd = args[0] || 'help';
  const flags = {};
  for (let i = 1; i < args.length; i += 1) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i += 1;
      }
    }
  }
  return { cmd, flags };
}

function num(x, fallback) {
  if (x === undefined || x === true) return fallback;
  const n = Number(x);
  if (Number.isNaN(n)) throw new Error(`Expected number, got ${x}`);
  return n;
}

function envSeed(player, networkId) {
  // Committed POB_SEED_* values are public local-test fixtures. Never allow
  // them to become the signers on Preprod or Mainnet by accident.
  if (networkId !== 'undeployed') {
    const secret = process.env[`POB_PUBLIC_SEED_${player.toUpperCase()}`];
    if (!secret || !/^[0-9a-fA-F]{64}$/.test(secret)) {
      throw new Error(`Set POB_PUBLIC_SEED_${player.toUpperCase()} to a fresh, private 64-hex seed for ${networkId}. Local test seeds are forbidden.`);
    }
    if ([process.env.POB_SEED_GENESIS, process.env.POB_SEED_P1, process.env.POB_SEED_P2]
      .some((localSeed) => localSeed?.toLowerCase() === secret.toLowerCase())) {
      throw new Error('Refusing to use a committed local test seed on a public network. Generate a fresh private seed.');
    }
    return secret;
  }
  const map = {
    p1: process.env.POB_SEED_P1,
    p2: process.env.POB_SEED_P2,
    genesis: process.env.POB_SEED_GENESIS,
  };
  if (map[player]) return map[player];
  // Fall back to default alias env var (e.g. POB_DEFAULT_SEED=POB_SEED_GENESIS)
  const alias = process.env.POB_DEFAULT_SEED;
  if (alias && process.env[alias]) return process.env[alias];
  throw new Error(
    `No seed found for player "${player}". Set POB_SEED_${player.toUpperCase()} `
    + `in .env, or POB_DEFAULT_SEED to point at one of the seed env vars.`
  );
}

function endpointsFromEnv(networkId) {
  const proofServer = process.env.POB_PROOF_SERVER || 'http://localhost:6300';
  if (networkId === 'undeployed') {
    // indexer-standalone 4.3.x (official midnight-local-dev) serves api/v4;
    // the retired 4.0.x image served api/v3.
    return {
      node: process.env.POB_NODE || 'http://localhost:9944',
      indexer: process.env.POB_INDEXER || 'http://localhost:8088/api/v4/graphql',
      indexerWs: process.env.POB_INDEXER_WS || 'ws://localhost:8088/api/v4/graphql/ws',
      proofServer,
    };
  }
  // Public test networks are Midnight-hosted and need no token. Endpoints per
  // docs.midnight.network/guides/networks-and-environments (Oct 2 2026).
  // Preview = early development on shared infra (our launch rehearsal);
  // Preprod = final validation, tracks mainnet most closely.
  if (networkId === 'preview' || networkId === 'preprod') {
    return {
      node: `https://rpc.${networkId}.midnight.network`,
      indexer: `https://indexer.${networkId}.midnight.network/api/v4/graphql`,
      indexerWs: `wss://indexer.${networkId}.midnight.network/api/v4/graphql/ws`,
      proofServer,
    };
  }
  if (networkId !== 'mainnet') throw new Error(`Unsupported network: ${networkId} (use undeployed|preview|preprod|mainnet)`);
  const projectId = process.env.BLOCKFROST_PROJECT_ID?.trim();
  if (!projectId) throw new Error('Set BLOCKFROST_PROJECT_ID for Midnight Mainnet (never put this token in a browser build).');
  const withToken = (url) => `${url}?project_id=${encodeURIComponent(projectId)}`;
  return {
    node: withToken('https://rpc.midnight-mainnet.blockfrost.io'),
    indexer: withToken('https://midnight-mainnet.blockfrost.io/api/v0'),
    indexerWs: withToken('wss://midnight-mainnet.blockfrost.io/api/v0/ws'),
    proofServer,
  };
}

function resolveManagedDir(variant) {
  if (variant === 'state-only') {
    return path.resolve(__dirname, '..', '..', 'contracts', 'managed', 'proof-or-bluff-mainnet');
  }
  const fromEnv = process.env.POB_MANAGED_DIR;
  if (fromEnv) return path.resolve(__dirname, '..', fromEnv);
  return path.resolve(__dirname, '..', '..', 'contracts', 'managed', 'proof-or-bluff');
}

function activeMatch(flags) {
  return flags.match || state.getActiveMatch(
    flags.contract || process.env.POB_CONTRACT_VARIANT || 'wagered'
  );
}

// --- session boot -----------------------------------------------------------

export async function openSession(flags, { allowDeploy = false } = {}) {
  const player = flags.player || 'genesis';
  const networkId = flags.network || process.env.POB_NETWORK_ID || 'undeployed';
  const variant = flags.contract || process.env.POB_CONTRACT_VARIANT || 'wagered';
  if (!['wagered', 'state-only'].includes(variant)) throw new Error('Use --contract wagered|state-only');
  if (networkId !== 'undeployed' && variant !== 'state-only') {
    throw new Error('The wagered contract is disabled on public networks. Use --contract state-only.');
  }
  if (networkId === 'mainnet' && allowDeploy
    && process.env.POB_ALLOW_MAINNET_DEPLOY !== 'I_APPROVE_MAINNET_DEPLOYMENT') {
    throw new Error('Mainnet deployment is locked. John must review the preprod run and explicitly set POB_ALLOW_MAINNET_DEPLOY=I_APPROVE_MAINNET_DEPLOYMENT for that one command.');
  }
  const seed = envSeed(player, networkId);
  const endpoints = endpointsFromEnv(networkId);
  const managedDir = resolveManagedDir(variant);

  log.hr();
  log.info(`network    = ${networkId}`);
  log.info(`contract   = ${variant}`);
  log.info(`player     = ${player}`);
  // Never print a Blockfrost project_id query string: it is an API token.
  log.info(`node       = ${new URL(endpoints.node).origin}`);
  log.info(`indexer    = ${new URL(endpoints.indexer).origin}`);
  log.info(`proof-srv  = ${endpoints.proofServer}`);
  log.info(`managedDir = ${managedDir}`);
  log.hr();

  const walletHandle = await buildWalletFromSeed({ seed, endpoints, networkId });
  try {
    const api = await getContractApi({
      walletHandle, endpoints, networkId, managedDir, allowDeploy, variant,
    });
    log.ok(`Contract: ${api.address}`);
    return { api, walletHandle, networkId, variant };
  } catch (error) {
    await walletHandle.shutdown();
    throw error;
  }
}

// --- command implementations ------------------------------------------------

const commands = {
  async 'create-match'(flags) {
    // The ONLY command allowed to deploy a fresh contract when none is stored.
    const s = await openSession(flags, { allowDeploy: true });
    try {
      if (s.variant === 'state-only' && flags.wager !== undefined) {
        throw new Error('State-only matches have no wager; omit --wager.');
      }
      const result = await s.api.createMatch({
        mode: num(flags.mode, 1),
        wagerAmount: s.variant === 'state-only' ? 0 : num(flags.wager, 5),
      });
      state.setActiveMatch(result.matchId, s.variant);
      log.ok('createMatch confirmed');
      log.json('result', result);
      log.warn(
        'Save the entropy hex above — Player Two needs it before reveal-seed. '
        + 'Use `pob-cli import-entropy --role p1 --hex 0x...` on the other side.'
      );
    } finally { await s.walletHandle.shutdown(); }
  },

  async 'join-match'(flags) {
    if (!flags.match) throw new Error('--match 0x... is required');
    const s = await openSession(flags);
    try {
      if (s.variant === 'state-only' && flags.wager !== undefined) {
        throw new Error('State-only matches have no wager; omit --wager.');
      }
      const result = await s.api.joinMatch({
        matchId: flags.match,
        wagerAmount: s.variant === 'state-only' ? 0 : num(flags.wager, 5),
      });
      state.setActiveMatch(flags.match, s.variant);
      log.ok('joinMatch confirmed');
      log.json('result', result);
    } finally { await s.walletHandle.shutdown(); }
  },

  async 'import-entropy'(flags) {
    const matchId = activeMatch(flags);
    if (!matchId) throw new Error('No active match.');
    if (!flags.role) throw new Error('--role p1|p2 is required');
    if (!flags.hex)  throw new Error('--hex 0x... is required');
    // No wallet needed, this is local-only persistence.
    state.persistEntropy(matchId, flags.role, flags.hex);
    log.ok(`Stored ${flags.role} entropy for match ${matchId}`);
  },

  async 'reveal-seed'(flags) {
    const matchId = activeMatch(flags);
    if (!matchId) throw new Error('No active match.');
    const s = await openSession(flags);
    try {
      const result = await s.api.revealSeed({
        matchId,
        startingRank: num(flags['starting-rank'], 0),
      });
      log.ok('revealSeed confirmed');
      log.json('result', result);
    } finally { await s.walletHandle.shutdown(); }
  },

  async play(flags) {
    const matchId = activeMatch(flags);
    if (!matchId) throw new Error('No active match.');
    if (!flags.cards) throw new Error('--cards 2,2,2 (1-4 ranks) is required');
    if (flags.rank === undefined) throw new Error('--rank N is required');
    const cards = String(flags.cards).split(',').map((s) => Number(s.trim()));
    const s = await openSession(flags);
    try {
      const result = await s.api.playCards({
        matchId, cards,
        claimedRank: num(flags.rank),
        claimedCount: cards.length,
        // The provable edition must know which committed hand to open.
        role: flags.player || process.env.POB_PLAYER || null,
      });
      log.ok('playCards confirmed');
      log.json('result', result);
    } finally { await s.walletHandle.shutdown(); }
  },

  async accept(flags) {
    const matchId = activeMatch(flags);
    if (!matchId) throw new Error('No active match.');
    const s = await openSession(flags);
    try {
      const r = await s.api.acceptClaim({ matchId });
      log.ok('acceptClaim confirmed');
      log.json('result', r);
    } finally { await s.walletHandle.shutdown(); }
  },

  async challenge(flags) {
    const matchId = activeMatch(flags);
    if (!matchId) throw new Error('No active match.');
    const s = await openSession(flags);
    try {
      const r = await s.api.challengeClaim({ matchId });
      log.ok('challengeClaim confirmed');
      log.json('result', r);
    } finally { await s.walletHandle.shutdown(); }
  },

  async resolve(flags) {
    const matchId = activeMatch(flags);
    if (!matchId) throw new Error('No active match.');
    const s = await openSession(flags);
    try {
      const r = await s.api.resolveChallenge({ matchId });
      log.ok(`resolveChallenge confirmed — claim was ${r.honest ? 'HONEST ✓' : 'A BLUFF ✗'}`);
      log.json('result', r);
    } finally { await s.walletHandle.shutdown(); }
  },

  async 'claim-payout'(flags) {
    const matchId = activeMatch(flags);
    if (!matchId) throw new Error('No active match.');
    const s = await openSession(flags);
    try {
      const r = await s.api.claimPayout({ matchId });
      log.ok('claimPayout confirmed');
      log.json('result', r);
    } finally { await s.walletHandle.shutdown(); }
  },

  async cancel(flags) {
    const matchId = activeMatch(flags);
    if (!matchId) throw new Error('No active match.');
    const s = await openSession(flags);
    try {
      const r = await s.api.cancelUnjoinedMatch({ matchId });
      log.ok('cancelUnjoinedMatch confirmed');
      log.json('result', r);
    } finally { await s.walletHandle.shutdown(); }
  },

  async 'forfeit-abandon'(flags) {
    const matchId = activeMatch(flags);
    if (!matchId) throw new Error('No active match.');
    const s = await openSession(flags);
    try {
      const r = await s.api.forfeitAbandonedMatch({
        matchId,
        timeoutSeconds: BigInt(num(flags.timeout, 86_400)),
      });
      log.ok('forfeitAbandonedMatch confirmed');
      log.json('result', r);
    } finally { await s.walletHandle.shutdown(); }
  },

  async 'forfeit-stall'(flags) {
    const matchId = activeMatch(flags);
    if (!matchId) throw new Error('No active match.');
    const s = await openSession(flags);
    try {
      const r = await s.api.forfeitStalledChallenge({
        matchId,
        timeoutSeconds: BigInt(num(flags.timeout, 3600)),
      });
      log.ok('forfeitStalledChallenge confirmed');
      log.json('result', r);
    } finally { await s.walletHandle.shutdown(); }
  },

  async state(flags) {
    const matchId = activeMatch(flags);
    if (!matchId) throw new Error('No active match.');
    const s = await openSession(flags);
    try {
      const m = await s.api.getMatch(matchId);
      const phase = await s.api.getMatchPhase(matchId);
      log.ok(`Match ${matchId} phase=${phase}`);
      log.json('match', m);
    } finally { await s.walletHandle.shutdown(); }
  },

  async active(flags) {
    const variant = flags.contract || process.env.POB_CONTRACT_VARIANT || 'wagered';
    const matchId = state.getActiveMatch(variant);
    const networkId = flags.network || process.env.POB_NETWORK_ID || 'undeployed';
    const address = state.getContractAddress(networkId, variant);
    log.json('active', { matchId, networkId, variant, contractAddress: address });
  },

  async address(flags) {
    const networkId = flags.network || process.env.POB_NETWORK_ID || 'undeployed';
    const variant = flags.contract || process.env.POB_CONTRACT_VARIANT || 'wagered';
    const address = state.getContractAddress(networkId, variant);
    if (!address) {
      log.warn('No contract deployed yet for network ' + networkId);
      return;
    }
    console.log(address);
  },

  // Store a known contract address (e.g. one deployed by the browser app)
  // so this CLI namespace can join matches without deploying its own copy.
  async 'set-address'(flags) {
    if (!flags.address) throw new Error('--address <64-hex> is required');
    const clean = String(flags.address).replace(/^0x/i, '').toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(clean)) {
      throw new Error('Address must be exactly 64 hexadecimal characters');
    }
    const networkId = flags.network || process.env.POB_NETWORK_ID || 'undeployed';
    const variant = flags.contract || process.env.POB_CONTRACT_VARIANT || 'wagered';
    if (!['wagered', 'state-only'].includes(variant)) throw new Error('Use --contract wagered|state-only');
    state.setContractAddress(networkId, clean, variant);
    log.ok(`Stored ${variant} contract address for network "${networkId}": ${clean}`);
  },

  // Real end-to-end smoke test. Drives a complete two-wallet lifecycle:
  //   p1 createMatch → p2 joinMatch → p1 revealSeed → p1 plays a BLUFF →
  //   p2 challengeClaim → p1 resolveChallenge → assert the public state.
  // Entropy handoff needs no copy-paste because both players share this
  // CLI's .pob-state namespace. Each step opens a fresh wallet session and
  // closes it, exactly like separate human invocations would. Expect several
  // minutes of runtime: every transaction generates a real ZK proof.
  async e2e(flags) {
    const variant = flags.contract || process.env.POB_CONTRACT_VARIANT || 'wagered';
    if (variant === 'state-only' && flags.wager !== undefined) {
      throw new Error('State-only e2e has no wager; omit --wager.');
    }
    const wager = variant === 'state-only' ? 0 : num(flags.wager, 1);
    const failures = [];
    const check = (label, actual, expected) => {
      const a = typeof actual === 'bigint' ? Number(actual) : actual;
      if (a === expected) { log.ok(`assert ${label} = ${expected}`); return; }
      failures.push(`${label}: expected ${expected}, got ${a}`);
      log.err(`assert ${label}: expected ${expected}, got ${a}`);
    };
    // Tiny helper so every step gets a session that is ALWAYS shut down,
    // even when the step throws — otherwise a failed run leaks wallet
    // subscriptions and the process never exits.
    const withSession = async (player, allowDeploy, fn) => {
      const s = await openSession({ ...flags, player }, { allowDeploy });
      try { return await fn(s); } finally { await s.walletHandle.shutdown(); }
    };

    log.step('e2e 1/5 — P1 createMatch (STANDARD mode)');
    const created = await withSession('p1', true, (s) =>
      s.api.createMatch({ mode: 1, wagerAmount: wager }));
    if (!created.matchId) throw new Error('createMatch returned no matchId');
    const matchId = created.matchId;
    state.setActiveMatch(matchId, variant);
    log.ok(`matchId ${matchId}`);

    log.step('e2e 2/5 — P2 joinMatch');
    await withSession('p2', false, (s) =>
      s.api.joinMatch({ matchId, wagerAmount: wager }));

    log.step('e2e 3/5 — P1 revealSeed + play a deliberate BLUFF');
    await withSession('p1', false, async (s) => {
      await s.api.revealSeed({ matchId, startingRank: 0 });
      if (variant === 'state-only') {
        // Provably fair edition: P1 may only play cards it was actually
        // dealt, so pick a HELD card whose rank is not the required rank 0.
        // Claiming rank 0 with it is a guaranteed bluff. (If the dealt hand
        // is all rank 0 — astronomically unlikely — the run reports it.)
        const hand = await s.api.getHand({ matchId, role: 'p1' });
        log.ok(`P1 provably dealt ranks [${hand.ranks.join(', ')}]`);
        const bluffCard = hand.ranks.find((rank) => rank !== 0);
        if (bluffCard === undefined) throw new Error('Dealt hand is entirely rank 0; cannot stage a deterministic bluff. Re-run.');
        await s.api.playCards({
          matchId, cards: [bluffCard], claimedRank: 0, claimedCount: 1, role: 'p1',
        });
        return;
      }
      // Required rank is 0 ("2"); committing rank 1 ("3") is a guaranteed
      // bluff, which makes the resolveChallenge outcome deterministic.
      await s.api.playCards({
        matchId, cards: [1], claimedRank: 0, claimedCount: 1,
      });
    });

    log.step('e2e 4/5 — P2 challengeClaim ("Proof or Bluff!")');
    await withSession('p2', false, (s) => s.api.challengeClaim({ matchId }));

    log.step('e2e 5/5 — P1 resolveChallenge + verify public state');
    await withSession('p1', false, async (s) => {
      const resolved = await s.api.resolveChallenge({ matchId });
      check('resolveChallenge.honest (bluff caught)', resolved.honest, false);
      const m = await s.api.getMatch(matchId);
      if (variant === 'state-only') {
        if (!m.seedCommitment || !s.api.verifySeedCommitment(matchId, m.seedCommitment)) {
          failures.push('Public seed commitment did not match private deal seed');
        } else {
          log.ok('assert public seed commitment matches private deal seed');
        }
      }
      check('phase (back to PLAYING)', m.phase, 2);
      check('p2Score (+3 successful challenge)', m.p2Score, 3);
      check('p1Score (unchanged)', m.p1Score, 0);
      check('pileSize (discarded after resolution)', m.pileSize, 0);
      if (variant === 'state-only') {
        check('p1HandDrawn (hand committed on-chain)', m.p1HandDrawn, true);
        check('p1HandSize (one card provably played, pile not picked up)', m.p1HandSize, 6);
      }
    });

    if (failures.length > 0) {
      throw new Error(`e2e FAILED ${failures.length} assertion(s):\n  ${failures.join('\n  ')}`);
    }
    log.ok('e2e PASSED — full lifecycle with ZK challenge verified on-chain.');
    log.warn('Run in a FRESH state namespace (POB_STATE_NAMESPACE) against a '
      + 'running local stack; both player wallets must be funded.');
  },

  // Print the public funding address for a player's wallet on the selected
  // network. Pure key derivation — no network access, no sync, no
  // transaction. Use it to know where to send faucet tNIGHT before the first
  // (slow) public-network wallet sync.
  async address(flags) {
    const player = flags.player || 'p2';
    const networkId = flags.network || process.env.POB_NETWORK_ID || 'undeployed';
    const seed = envSeed(player, networkId);
    log.ok(`${player} unshielded address on ${networkId}: ${deriveUnshieldedAddress(seed, networkId)}`);
    if (networkId === 'preview') log.info('Faucet: https://midnight-tmnight-preview.nethermind.dev/');
    if (networkId === 'preprod') log.info('Faucet: https://midnight-tmnight-preprod.nethermind.dev/');
  },

  async help() {
    console.log(HELP_TEXT);
  },
};

const HELP_TEXT = `pob-cli — realDeal headless driver

Commands:
  address          --player p1|p2 --network preview   (print funding address; no tx)
  create-match     [--mode N --wager N]
  join-match       --match 0x... [--wager N]
  import-entropy   --match 0x... --role p1|p2 --hex 0x...
  reveal-seed      [--match 0x... --starting-rank N]
  play             [--match 0x...] --cards 2,2,2 --rank N
  accept           [--match 0x...]
  challenge        [--match 0x...]
  resolve          [--match 0x...]
  claim-payout     [--match 0x...]
  cancel           [--match 0x...]
  forfeit-abandon  [--match 0x... --timeout 86400]
  forfeit-stall    [--match 0x... --timeout 3600]
  state            [--match 0x...]
  active                              # print active matchId + contract address
  address                             # print contract address only
  set-address      --address 0x...    # store a known contract address (no deploy)
  e2e              [--wager N]        # REAL two-wallet lifecycle smoke test
                                      # (create→join→reveal→bluff→challenge→
                                      #  resolve→asserts; needs fresh namespace)

Global flags (apply to any command that opens a wallet):
  --player p1|p2|genesis              # which seed env var to use
  --network undeployed|preview|preprod|mainnet
  --contract wagered|state-only          # state-only holds no player funds

Public networks: fresh POB_PUBLIC_SEED_P1/P2, POB_PRIVATE_STATE_PASSWORD;
mainnet also needs BLOCKFROST_PROJECT_ID. Local POB_SEED_* are NEVER used
on public networks. The wagered contract is blocked on public networks.

Setup:
  1) cp .env.example .env  &&  edit .env to fill in seeds + endpoints.
  2) npm install
  3) Make sure the local stack is running (docker compose -f standalone.yml
     up -d in /home/js/utils_Midnight/midnight-local-dev).

The CLI shares the on-chain contract with the browser app at ../app/, but
keeps its own local persistence under .pob-state/ — copy the contract
address printed by \`pob-cli address\` into the browser's localStorage
key \`pob:realdeal:contract-address\` if you want both surfaces talking
to the same deployed contract.
`;

// --- entry point ------------------------------------------------------------

async function main() {
  const { cmd, flags } = parseArgv(process.argv);
  const handler = commands[cmd];
  if (!handler) {
    log.err(`Unknown command: ${cmd}`);
    console.log(HELP_TEXT);
    process.exit(1);
  }
  try {
    await handler(flags);
    process.exit(0);
  } catch (err) {
    const projectId = process.env.BLOCKFROST_PROJECT_ID?.trim();
    const message = err.message || String(err);
    log.err(projectId ? message.replaceAll(projectId, '[redacted]') : message);
    if (process.env.POB_VERBOSE && !projectId) console.error(err);
    process.exit(1);
  }
}

// Importers such as the localhost bot need the wallet/session factory without
// accidentally executing a CLI command. Comparing resolved entrypoint paths keeps
// direct `node src/cli.js ...` and the installed `pob-cli` bin behavior unchanged.
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
