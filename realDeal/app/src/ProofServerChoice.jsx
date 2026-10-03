import { useState } from 'react';
import {
  HOSTED_PROOF_SERVER_URL,
  LOCAL_PROOF_SERVER_URL,
  getProofServerMode,
  setProofServerMode,
} from './midnight/config.js';

/**
 * The one privacy decision a player actually makes. The proof server is the
 * only component that sees private witnesses (cards, hand salt, shared seed)
 * while generating a proof. Hosted = convenient; local = nobody but you.
 * The chain rejects cheating either way — this only decides who can *see*.
 */
export default function ProofServerChoice({ disabled = false, onChange }) {
  const [mode, setMode] = useState(getProofServerMode);

  const choose = (next) => {
    setProofServerMode(next);
    setMode(next);
    onChange?.(next);
  };

  return (
    <fieldset className="proof-server-choice" disabled={disabled}>
      <legend>Who generates your proofs?</legend>
      <p className="proof-server-choice__note">
        Your cards never go on-chain, but the proof server sees them while proving.
        {' '}The game's fairness is enforced by the contract either way.
      </p>
      {HOSTED_PROOF_SERVER_URL && (
        <label className="proof-server-choice__option">
          <input
            type="radio"
            name="proof-server-mode"
            value="hosted"
            checked={mode === 'hosted'}
            onChange={() => choose('hosted')}
          />
          <span>
            <strong>Hosted (easy)</strong> — our proof server. No setup. We can see your cards during proving; we never store them.
          </span>
        </label>
      )}
      <label className="proof-server-choice__option">
        <input
          type="radio"
          name="proof-server-mode"
          value="local"
          checked={mode === 'local'}
          onChange={() => choose('local')}
        />
        <span>
          <strong>My own (private)</strong> — a proof server you run at <code>{LOCAL_PROOF_SERVER_URL}</code>. Nobody else ever sees your cards.
        </span>
      </label>
    </fieldset>
  );
}
