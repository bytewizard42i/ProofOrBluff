// preview-v3p-game.mjs — deploy ONE v3p game on a public Midnight network, play
// round 1 off-chain, submit the real proveRound(1) transaction, and close the
// game if round 1 ended it. This is the first on-chain life of the per-round
// rollup. Everything is recorded for the launch log.
//
//   cd realDeal/cli
//   POB_NETWORK_ID=preview POB_STATE_NAMESPACE=preview-v3p-1 POB_PROOF_SERVER=http://127.0.0.1:16300 \
//     node ../../scripts/preview-v3p-game.mjs
//
// Needs (from realDeal/cli/.env.local, never committed): POB_PUBLIC_SEED_P2
// (the operator/bot wallet, funded with tDUST on that network) and
// POB_PRIVATE_STATE_PASSWORD. Mainnet additionally needs BLOCKFROST_PROJECT_ID
// and POB_ALLOW_MAINNET_DEPLOY=I_APPROVE_MAINNET_DEPLOYMENT — and John's
// explicit approval of the exact command. This script never sets that guard.
//
// Both seats are driven by this process (bot vs scripted "human") so the proof
// pipeline can be exercised end to end on-chain before the browser flow exists.
// The human's consent key is a throwaway; nothing of value is at stake.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
const cliDir = path.resolve(here, '..', 'realDeal', 'cli');
dotenv.config({ path: path.join(cliDir, '.env') });
dotenv.config({ path: path.join(cliDir, '.env.local'), override: true });

const { buildWalletFromSeed } = await import('../realDeal/cli/src/wallet-node.js');
const { getV3pContractApi, DEFAULT_V3P_MANAGED_DIR, bytesToHex } = await import('../realDeal/cli/src/rollup-v3p-contract.js');
const { createV3pReferee, KIND, MAX_ROUNDS, roundFinished } = await import('../realDeal/contracts/rollup-v3p-referee.js');
const { consentKeyPairFromSecret, buildCloseConsent, signCloseConsent } = await import('../realDeal/cli/src/rollup-consent.js');
const { pureCircuits } = await import(path.join(DEFAULT_V3P_MANAGED_DIR, 'contract', 'index.js'));

const networkId = process.env.POB_NETWORK_ID || 'preview';
if (networkId === 'undeployed') throw new Error('This script targets a public network. Set POB_NETWORK_ID=preview|preprod.');
if (networkId === 'mainnet' && !process.env.BLOCKFROST_PROJECT_ID) throw new Error('Mainnet needs BLOCKFROST_PROJECT_ID (server-side only).');
const seedHex = process.env.POB_PUBLIC_SEED_P2;
if (!seedHex) throw new Error('Set POB_PUBLIC_SEED_P2 (operator wallet) in realDeal/cli/.env.local.');
const proofServer = process.env.POB_PROOF_SERVER || 'http://127.0.0.1:16300';

function endpoints(net) {
  if (net === 'mainnet') {
    const t = (u) => `${u}?project_id=${encodeURIComponent(process.env.BLOCKFROST_PROJECT_ID.trim())}`;
    return { node: t('https://rpc.midnight-mainnet.blockfrost.io'), indexer: t('https://midnight-mainnet.blockfrost.io/api/v0'), indexerWs: t('wss://midnight-mainnet.blockfrost.io/api/v0/ws'), proofServer };
  }
  return {
    node: `https://rpc.${net}.midnight.network`,
    indexer: `https://indexer.${net}.midnight.network/api/v4/graphql`,
    indexerWs: `wss://indexer.${net}.midnight.network/api/v4/graphql/ws`,
    proofServer,
  };
}

const log = (m) => console.log(`${new Date().toISOString()}  ${m}`);
const hex = (b) => Buffer.from(b).toString('hex');

// --- fresh per-game material (NEVER reused across games) -------------------
const KP1 = consentKeyPairFromSecret(randomBytes(32));   // scripted "human"
const KP2 = consentKeyPairFromSecret(randomBytes(32));   // bot seat identity
const P1 = pureCircuits.playerIdFromPk(KP1.pk);
const P2 = pureCircuits.playerIdFromPk(KP2.pk);
const E1 = new Uint8Array(randomBytes(32));
const E2 = new Uint8Array(randomBytes(32));
const MODE = BigInt(process.env.POB_MODE ?? '1');
const SECRETS = [0, 1].map(() => Array.from({ length: MAX_ROUNDS }, () => new Uint8Array(randomBytes(32))));
const seed = pureCircuits.combineEntropy(E1, E2);
const commits = (seat) => SECRETS[seat].map((s, i) => pureCircuits.commitRoundSecret(s, BigInt(i + 1)));

function takeCards(hand, rank, count, { lie = false } = {}) {
  const cards = []; const h = [...hand];
  const order = lie
    ? [...Array(13).keys()].filter((r) => BigInt(r) !== rank).concat([Number(rank)])
    : [Number(rank)].concat([...Array(13).keys()].filter((r) => BigInt(r) !== rank));
  for (const r of order) while (cards.length < count && h[r] > 0n) { cards.push(BigInt(r)); h[r] -= 1n; }
  return cards;
}
function playRound(ref) {
  let truths = 0;
  ref.startRound();
  while (!roundFinished(ref.state, ref.size)) {
    const s = ref.state;
    if (s.pending) {
      const bluff = !ref.truthfulPending;
      if (bluff || (++truths % 3 === 0)) ref.challenge(); else ref.accept();
      continue;
    }
    const hand = ref.hands[Number(s.turn)];
    const holds = hand[Number(s.currentRank)] > 0n;
    const playSalt = BigInt('0x' + randomBytes(31).toString('hex'));
    ref.play(s.currentRank, 1n, takeCards(hand, s.currentRank, 1, { lie: !holds }), playSalt);
  }
  return ref.finishRound();
}

// --- go ---------------------------------------------------------------------
log(`network=${networkId} proofServer=${proofServer} managed=${DEFAULT_V3P_MANAGED_DIR}`);
const ep = endpoints(networkId);
log(`node=${new URL(ep.node).origin} indexer=${new URL(ep.indexer).origin}`);
const walletHandle = await buildWalletFromSeed({ seed: seedHex, endpoints: ep, networkId });
const record = { network: networkId, startedAt: new Date().toISOString(), playerOne: hex(P1), playerTwo: hex(P2), mode: MODE.toString(), txs: [] };
try {
  const api = await getV3pContractApi({ networkId, walletHandle, endpoints: ep, seedHex });

  log('deploying ONE v3p game (constructor == openGame)…');
  let t = Date.now();
  const dep = await api.deployGame({
    playerOne: P1, playerTwo: P2, mode: MODE,
    p1EntropyCommit: pureCircuits.commitEntropy(E1), p2EntropyCommit: pureCircuits.commitEntropy(E2),
    p1RoundCommits: commits(0), p2RoundCommits: commits(1),
  });
  record.contractAddress = dep.contractAddress;
  record.txs.push({ step: 'deploy(openGame)', ...dep, seconds: ((Date.now() - t) / 1000).toFixed(1) });
  log(`DEPLOYED contract=${dep.contractAddress} tx=${dep.txHash} block=${dep.blockHeight} (${record.txs.at(-1).seconds}s)`);

  const ref = createV3pReferee(pureCircuits, { seed, roundSecrets: SECRETS, mode: MODE });
  let round = 1n;
  while (!ref.boundary.ended) {
    const fin = playRound(ref);
    const realMoves = fin.moves.filter((m) => m.kind !== KIND.NOOP).length;
    log(`round ${round} played off-chain: ${realMoves} moves, scores ${fin.boundaryOut.score0}-${fin.boundaryOut.score1}, ended=${fin.boundaryOut.ended}`);
    log(`proving + submitting proveRound(${round})…`);
    t = Date.now();
    const pr = await api.proveRound({
      round,
      witnesses: { ...fin, entropyPair: [E1, E2], roundSecrets: [SECRETS[0][Number(round) - 1], SECRETS[1][Number(round) - 1]] },
    });
    record.txs.push({ step: `proveRound(${round})`, ...pr, round: round.toString(), seconds: ((Date.now() - t) / 1000).toFixed(1) });
    log(`ON-CHAIN proveRound(${round}) tx=${pr.txHash} block=${pr.blockHeight} (${record.txs.at(-1).seconds}s)`);
    round += 1n;
    if (process.env.POB_ONE_ROUND === '1') break;
  }

  if (ref.boundary.ended) {
    const result = ref.result();
    const root = pureCircuits.commitTranscript(result.transcriptChain);
    const consent = buildCloseConsent(pureCircuits, { gameId: root, transcriptRoot: result.transcriptChain, p1Score: result.p1Score, p2Score: result.p2Score, winner: result.winner });
    log(`closing: winner=${result.winner} ${result.p1Score}-${result.p2Score}, both consents signed…`);
    t = Date.now();
    const cl = await api.closeGame({
      boundary: result.boundary, p1Score: result.p1Score, p2Score: result.p2Score, winner: result.winner,
      p1CloseConsent: signCloseConsent(pureCircuits, consent, KP1), p2CloseConsent: signCloseConsent(pureCircuits, consent, KP2),
    });
    record.txs.push({ step: 'closeGame', ...cl, winner: result.winner.toString(), p1Score: result.p1Score.toString(), p2Score: result.p2Score.toString(), seconds: ((Date.now() - t) / 1000).toFixed(1) });
    log(`ON-CHAIN closeGame tx=${cl.txHash} block=${cl.blockHeight} (${record.txs.at(-1).seconds}s)`);
    record.transcriptRoot = hex(root);
  }

  const onChain = await api.readGame();
  record.finalLedger = { roundsProven: onChain.roundsProven.toString(), ended: onChain.ended, closed: onChain.closed, winner: onChain.winner.toString(), p1Score: onChain.p1Score.toString(), p2Score: onChain.p2Score.toString() };
  log(`indexer says: ${JSON.stringify(record.finalLedger)}`);
} finally {
  record.finishedAt = new Date().toISOString();
  console.log('\n=== LAUNCH LOG RECORD ===\n' + JSON.stringify(record, null, 2));
  await walletHandle.shutdown?.();
}
