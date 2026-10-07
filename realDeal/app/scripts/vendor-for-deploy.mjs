// Copies the source files that live OUTSIDE this app directory into
// vendor/ so a Vercel CLI deploy (which uploads only realDeal/app) is
// self-contained. Run before `vercel --prod`; vendor/ is gitignored.
//
//   ../shared/*.js                                → vendor/shared/
//   ../contracts/managed/proof-or-bluff-mainnet/contract → vendor/proof-or-bluff-mainnet/contract
//
// keys/ and zkir/ are intentionally skipped: in sponsored mode the
// browser never proves — the service does — so we don't ship ~49 MB
// of proving material nobody downloads.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const copies = [
  ['../shared', 'vendor/shared'],
  ['../../media/Audio', 'vendor/media/Audio'],
  ['../contracts/managed/proof-or-bluff-mainnet/contract', 'vendor/proof-or-bluff-mainnet/contract'],
];

for (const [from, to] of copies) {
  const src = resolve(app, from);
  const dst = resolve(app, to);
  if (!existsSync(src)) {
    console.error(`vendor: missing ${src} — run from the full repo checkout`);
    process.exit(1);
  }
  rmSync(dst, { recursive: true, force: true });
  mkdirSync(dst, { recursive: true });
  cpSync(src, dst, { recursive: true });
  console.log(`vendor: ${from} → ${to}`);
}
console.log('vendor: done');
