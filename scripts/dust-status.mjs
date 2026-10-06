// dust-status.mjs — is the operator wallet's DUST generation live on Mainnet?
//
//   node scripts/dust-status.mjs            # one-shot report
//   node scripts/dust-status.mjs --watch    # poll every 5 min until DUST flows
//
// Two independent sources, so we never trust a single dashboard:
//   1. Midnight indexer (Blockfrost): dustGenerationStatus for John's Cardano
//      stake address — did the observation pallet ingest the cNIGHT registration?
//   2. The live service: https://api.prooforbluff.app/v1/health — what the
//      operator wallet itself sees as spendable DUST right now.
// Reads BLOCKFROST_PROJECT_ID + JOHN_CARDANO_STAKE_ADDR from realDeal/cli/.env.local.
// Never prints the project id.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, '..', 'realDeal', 'cli', '.env.local') });

const projectId = process.env.BLOCKFROST_PROJECT_ID?.trim();
const stake = process.env.JOHN_CARDANO_STAKE_ADDR?.trim();
if (!projectId || !stake) { console.error('Need BLOCKFROST_PROJECT_ID and JOHN_CARDANO_STAKE_ADDR in realDeal/cli/.env.local'); process.exit(2); }
const HEALTH_URL = process.env.POB_API_HEALTH || 'https://api.prooforbluff.app/v1/health';
const SPECKS_PER_DUST = 10n ** 15n;
const fmtDust = (specks) => (Number(BigInt(specks) / 10n ** 12n) / 1000).toFixed(3);

async function indexerStatus() {
  const res = await fetch(`https://midnight-mainnet.blockfrost.io/api/v0?project_id=${encodeURIComponent(projectId)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `{ dustGenerationStatus(cardanoRewardAddresses: ["${stake}"]) { registered nightBalance generationRate maxCapacity currentCapacity dustAddress utxoTxHash } }` }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data.dustGenerationStatus[0];
}

async function serviceHealth() {
  try { const r = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(10_000) }); return r.ok || r.status === 503 ? await r.json() : { error: `HTTP ${r.status}` }; }
  catch (e) { return { error: e.message }; }
}

async function report() {
  const [idx, health] = await Promise.all([indexerStatus(), serviceHealth()]);
  const now = new Date().toISOString().slice(11, 19);
  const nightBacking = (Number(idx.nightBalance) / 1e6).toFixed(0);
  console.log(`${now}  indexer: registered=${idx.registered} night=${nightBacking} cap=${fmtDust(idx.maxCapacity)} DUST now=${fmtDust(idx.currentCapacity)} DUST rate=${idx.generationRate}` + (idx.dustAddress ? ` → ${idx.dustAddress.slice(0, 14)}…` : ''));
  const walletDust = health.wallet?.dust != null ? `${fmtDust(health.wallet.dust)} DUST` : (health.error ?? 'n/a');
  console.log(`${now}  service: ok=${health.ok ?? '?'} wallet=${walletDust}${health.reason ? ` (${health.reason})` : ''}`);
  const ready = idx.registered && BigInt(idx.currentCapacity) > 0n && health.ok === true;
  return { ready, idx, health };
}

const watch = process.argv.includes('--watch');
for (;;) {
  const { ready, idx, health } = await report();
  if (ready) {
    console.log('\n==========================================================');
    console.log('  READY: DUST is generating and the service accepts games.');
    console.log(`  cap ${fmtDust(idx.maxCapacity)} DUST · wallet ${fmtDust(health.wallet.dust)} DUST`);
    console.log('==========================================================\n');
    process.exit(0);
  }
  if (!watch) { console.log(JSON.stringify({ indexer: idx, service: health }, null, 1)); process.exit(ready ? 0 : 1); }
  await new Promise((r) => setTimeout(r, 5 * 60_000));
}
