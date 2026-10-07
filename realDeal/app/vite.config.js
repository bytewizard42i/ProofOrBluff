import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Vercel CLI uploads only this directory, so files that live outside it
// (../shared, ../contracts) must be vendored first (scripts/vendor-for-deploy.mjs
// → vendor/). Prefer the real checkout when present; fall back to vendor/.
const realStateOnlyAssets = resolve(__dirname, '../contracts/managed/proof-or-bluff-mainnet');
const stateOnlyAssets = existsSync(realStateOnlyAssets)
  ? realStateOnlyAssets
  : resolve(__dirname, 'vendor/proof-or-bluff-mainnet');
const stateOnlyBuild = process.env.VITE_CONTRACT_VARIANT === 'state-only';
const sponsoredBuild = process.env.VITE_POB_MODE === 'sponsored';

// Keep the generated state-only ZK assets separate from the wagered symlink.
// Dev serves only known key/zkir file names; production emits the same assets
// into dist so a static host can serve them without access to this source tree.
function stateOnlyZkAssetsPlugin() {
  return {
    name: 'pob-state-only-zk-assets',
    configureServer(server) {
      if (!stateOnlyBuild || sponsoredBuild) return;
      server.middlewares.use((request, response, next) => {
        const match = /^\/managed\/proof-or-bluff-mainnet\/(keys|zkir)\/([a-zA-Z0-9_-]+\.(?:prover|verifier|bzkir|zkir))$/.exec(request.url?.split('?')[0] || '');
        if (!match) return next();
        try {
          const bytes = readFileSync(resolve(stateOnlyAssets, match[1], match[2]));
          response.setHeader('Content-Type', 'application/octet-stream');
          response.end(bytes);
        } catch {
          response.statusCode = 404;
          response.end('Compiled ZK asset not found. Run npm run compile:state-only.');
        }
      });
    },
    generateBundle() {
      if (!stateOnlyBuild || sponsoredBuild) return;
      for (const folder of ['keys', 'zkir']) {
        for (const filename of readdirSync(resolve(stateOnlyAssets, folder))) {
          this.emitFile({
            type: 'asset',
            fileName: `managed/proof-or-bluff-mainnet/${folder}/${filename}`,
            source: readFileSync(resolve(stateOnlyAssets, folder, filename)),
          });
        }
      }
    },
  };
}

// public/managed/proof-or-bluff is a symlink to the WAGERED contract's
// compiled artifacts so the local wagered table can fetch keys in dev.
// Vite copies public/ into every build, which would ship ~40 MB of the one
// contract we never deploy publicly. Demo and state-only builds strip it.
const wageredAssetsInBundle = !stateOnlyBuild && process.env.VITE_POB_MODE !== 'demo';
function stripWageredAssetsPlugin() {
  return {
    name: 'pob-strip-wagered-assets',
    apply: 'build',
    closeBundle() {
      if (wageredAssetsInBundle) return;
      rmSync(resolve(__dirname, 'dist/managed/proof-or-bluff'), { recursive: true, force: true });
    },
  };
}

// Tiny dev-only middleware: GET /api/proof-server-logs?tail=N returns
// the last N lines of `docker logs midnight-proof-server` as plain
// text. The realDeal UI polls this so the player can watch ZK proofs
// being generated live in the side panel while they play. Read-only,
// only mounted by the dev server, so it cannot leak into production.
function proofServerLogsPlugin() {
  return {
    name: 'pob-proof-server-logs',
    configureServer(server) {
      server.middlewares.use('/api/proof-server-logs', (req, res) => {
        const url = new URL(req.url || '/', 'http://localhost');
        const tail = Math.min(
          200,
          Math.max(1, Number(url.searchParams.get('tail') || 30))
        );
        execFile(
          'docker',
          ['logs', '--tail', String(tail), 'midnight-proof-server'],
          { timeout: 4000, maxBuffer: 1024 * 1024 },
          (err, stdout, stderr) => {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            if (err) {
              res.statusCode = 503;
              res.end(
                `proof-server unreachable: ${err.message}\n${stderr || ''}`
              );
              return;
            }
            // proof-server uses tracing -> stderr; combine streams in
            // chronological order.
            res.end(`${stderr || ''}${stdout || ''}`);
          }
        );
      });
    },
  };
}

// Redirects imports that escape this directory (`../shared/x.js`,
// `../../media/Audio/y.mp3` at any depth) to vendor/<rest> when the real
// path doesn't exist — i.e. inside a Vercel deploy upload, which contains
// only this directory. Locally nothing changes.
function vendorSharedPlugin() {
  const vendored = resolve(__dirname, 'vendor');
  return {
    name: 'pob-vendor-shared',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!source.startsWith('..') || !importer) return null;
      if (existsSync(resolve(dirname(importer), source))) return null;
      const local = resolve(vendored, source.replace(/^(\.\.\/)+/, ''));
      return local.startsWith(vendored) && existsSync(local) ? local : null;
    },
  };
}

// Proof or Bluff — realDeal Vite app. Port 3016 (demoLand owns 3015).
// Aliases let the Midnight SDK packages resolve correctly inside the
// browser bundle even when their internal deps reach for Node built-ins.
//
// vite-plugin-wasm + vite-plugin-top-level-await are required because
// @midnight-ntwrk/ledger-v8 (and a handful of other v8 SDK packages)
// ship as WASM modules with top-level-await initialization. Without
// these plugins Vite errors with: "ESM integration proposal for Wasm
// is not supported currently".
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait(), stateOnlyZkAssetsPlugin(), stripWageredAssetsPlugin(), proofServerLogsPlugin(), vendorSharedPlugin()],
  resolve: {
    // Keep symlinks unresolved so the bindings imported via
    // src/contract/ keep their import paths anchored inside realDeal/app/,
    // where node_modules can satisfy @midnight-ntwrk/*.
    preserveSymlinks: true,
    alias: {
      // Compiled Compact bindings — generated by compactc into
      // realDeal/contracts/managed/proof-or-bluff/contract/.
      // realDeal/app/src/contract is a symlink to
      // realDeal/contracts/managed/proof-or-bluff. Importing through the
      // symlinked path lets the bindings resolve @midnight-ntwrk/* from
      // realDeal/app/node_modules.
      '@pob/contract': stateOnlyBuild
        ? resolve(stateOnlyAssets, 'contract/index.js')
        : resolve(__dirname, './src/contract/contract/index.js'),
      '@pob/zkir': resolve(
        __dirname,
        './src/contract/zkir'
      ),
    },
  },
  define: {
    // Some midnight-js packages still reference process.env at module init.
    'process.env': {},
    global: 'globalThis',
  },
  optimizeDeps: {
    // Only the WASM-backed ledger packages need to skip esbuild
    // pre-bundling (esbuild strips top-level-await, which breaks WASM
    // init). Everything else MUST be pre-bundled so CJS->ESM interop
    // works for transitive deps like `object-inspect` that several
    // midnight-js packages reach for.
    exclude: [
      '@midnight-ntwrk/ledger-v8',
      '@midnight-ntwrk/zswap',
      '@midnight-ntwrk/onchain-runtime',
    ],
    // Pre-bundle the CJS dependency that is actually installed. Old
    // entries for qs/side-channel made Vite's optimizer fail on clean installs.
    include: ['object-inspect'],
    esbuildOptions: {
      target: 'es2022',
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 3016,
    host: true,
    strictPort: false,
  },
  preview: {
    port: 3016,
  },
});
