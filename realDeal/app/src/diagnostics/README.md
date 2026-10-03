# diagnostics/ — sanitized "Copy diagnostic report"

A small, dependency-free adapter that turns the app's current state into a
JSON blob safe to paste into chat or an issue. Background and the
MidnightVitals comparison live in `docs/MIDNIGHTVITALS_AUDIT_2026-10-02.md`.

| File | Role |
|---|---|
| `redact.js` | `redactSensitiveText`, `redactObjectDeep` — the scrubber. |
| `diagnosticReport.js` | `buildDiagnosticReport(...)` — shapes inputs, then runs the scrubber over the whole result. |
| `DiagnosticsButton.jsx` | Button: click -> `getReport()` -> clipboard, with a read-only `<textarea>` fallback. Shows "Copied" for 2 s. |
| `*.test.*` | Vitest coverage for every redaction category. |

## What is captured

- `timestamp` (ISO), `appVersion` (from `realDeal/app/package.json`), `schemaVersion`
- `networkId`, `contractVariant`, `contractAddress` (public, kept)
- `endpointHosts` — **origin only** (`https://host:port`); paths and query strings are dropped
- `activityHistory[]` — `operation`, `stage`, `startedAt`, `finishedAt`, `durationMs`, `txId` (public), short `detail`
- `walletSummary` — exactly `{ connected, networkLabel, addressPrefix }`; `addressPrefix` is the first 12 chars of an `mn_…` bech32 address
- `healthSnapshot` — proof server `{ reachable, latencyMs }`, indexer `{ reachable, blockHeight, latencyMs }`, optional `node`
- `errors[]` — strings (max 600 chars each), redacted
- `userAgent`

## What is never captured

- Cards, hands, ranks, hand salts, shared seeds, witnesses (keys matching
  `/seed|salt|witness|entropy|secret|password|token|mnemonic|privateKey|cards|hand|ranks/i`
  are replaced with `"[redacted]"`; arrays of small integers under `cards`/`hand`/`ranks` likewise)
- Blockfrost `project_id` values (`project_id=…` becomes `project_id=[redacted]`; also removed by host-only endpoints)
- Full wallet addresses (`mn_addr_…`, `mn_shield-addr_…`, `mn_dust…` keep a 12-char prefix + `…`)
- Any 64+-hex string that was not explicitly passed as a public id (tx ids, contract address)
- Wallet balances, coin public keys, anything not listed above (unknown wallet fields are dropped)

Note the key match is deliberately broad: `walletHandle` and `tokenType`
are redacted too. That is the safe direction.

## How to mount

```jsx
import DiagnosticsButton from './diagnostics/DiagnosticsButton.jsx';
import { buildDiagnosticReport } from './diagnostics/diagnosticReport.js';
import { CONTRACT_VARIANT, ENDPOINTS, NETWORK_ID, getContractAddress } from './midnight/config.js';

function buildReportForThisPage({ activityHistory, walletSummary, healthSnapshot, errors }) {
  return buildDiagnosticReport({
    networkId: NETWORK_ID,
    contractVariant: CONTRACT_VARIANT,
    contractAddress: getContractAddress(),
    endpoints: ENDPOINTS,                    // getters are fine; only origins are kept
    activityHistory,                         // from src/activity/**
    walletSummary,                           // { connected, networkLabel, address }
    healthSnapshot,                          // { proofServer: {...}, indexer: {...} }
    errors,
    userAgent: navigator.userAgent,
  });
}

<DiagnosticsButton getReport={() => buildReportForThisPage(currentState)} />
```

`getReport` is called on click, not on render. Pass `appVersion` if you need
to override the package.json value (e.g. a git SHA at build time).

## Tests

```
cd realDeal/app && npx vitest run src/diagnostics
```
