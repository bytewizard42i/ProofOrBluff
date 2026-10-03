import React, { useState } from 'react';

import { getContractAddress, setContractAddress, NETWORK_ID } from './midnight/config.js';

/**
 * ContractAddressControl — "which table am I sitting at?"
 *
 * The contract address is the on-chain identity of the game. On the local
 * chain it does not matter: the first player to click Start deploys a fresh
 * one. On a PUBLIC network it matters a lot — if the browser has no saved
 * address, `startGame` will deploy a brand-new copy of the contract, which
 * costs the player DUST and leaves them playing alone at a table the bot
 * does not know about.
 *
 * This control shows the saved address and lets a player paste the official
 * one (published in the launch log / on prooforbluff.com). Validation is
 * strict: exactly 64 hex characters, optional 0x prefix — anything else is
 * rejected before it can reach localStorage.
 */
const HEX_64 = /^(0x)?[0-9a-fA-F]{64}$/;

export function normalizeContractAddress(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!HEX_64.test(trimmed)) {
    throw new Error('A contract address is exactly 64 hexadecimal characters.');
  }
  return trimmed.replace(/^0x/i, '').toLowerCase();
}

export default function ContractAddressControl({ disabled = false, onChange }) {
  const [saved, setSaved] = useState(() => getContractAddress());
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState(null);

  const isPublicNetwork = NETWORK_ID !== 'undeployed';

  function save() {
    try {
      const clean = normalizeContractAddress(draft);
      setContractAddress(clean);
      setSaved(clean);
      setDraft('');
      setMessage({ tone: 'ok', text: 'Table address saved. Start will join this contract instead of deploying.' });
      onChange?.(clean);
    } catch (error) {
      setMessage({ tone: 'error', text: error.message });
    }
  }

  function clear() {
    setContractAddress(null);
    setSaved(null);
    setMessage({ tone: 'warn', text: 'Cleared. The next Start will DEPLOY a new contract (costs DUST).' });
    onChange?.(null);
  }

  return (
    <div className="contract-address" aria-label="Game table contract address">
      <div className="contract-address__row">
        <strong>Table:</strong>
        {saved ? (
          <code title={saved}>{saved.slice(0, 10)}…{saved.slice(-8)}</code>
        ) : (
          <span className={isPublicNetwork ? 'contract-address__missing' : undefined}>
            {isPublicNetwork
              ? 'none saved — Start would deploy a NEW contract'
              : 'none saved — Start deploys a fresh local contract'}
          </span>
        )}
        {saved && (
          <button type="button" className="ghost" onClick={clear} disabled={disabled}>
            Clear
          </button>
        )}
      </div>
      <div className="contract-address__row">
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck="false"
          placeholder="Paste the published 64-hex contract address"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={disabled}
          aria-label="Contract address to join"
        />
        <button type="button" onClick={save} disabled={disabled || draft.trim() === ''}>
          Use this table
        </button>
      </div>
      {message && (
        <p className={`contract-address__message contract-address__message--${message.tone}`} role="status">
          {message.text}
        </p>
      )}
    </div>
  );
}
