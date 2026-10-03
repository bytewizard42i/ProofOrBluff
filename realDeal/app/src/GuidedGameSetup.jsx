import React, { useId } from 'react';
import './guidedGameSetup.css';

const SETUP_STEPS = [
  { key: 'prepare', label: 'Get ready' },
  { key: 'connect', label: 'Connect wallet' },
  { key: 'match', label: 'Start match' },
];

const SERVICE_MESSAGES = {
  checking: 'Checking whether the bot service is reachable.',
  ready: 'Bot service reachable.',
  offline: 'Bot service not reachable. Try again when the service is available.',
};

/**
 * A controlled, presentational setup flow. The parent owns navigation and all
 * wallet/game operations; rendering never initiates a connection or a match.
 * Bot health is HTTP reachability only, not wallet synchronization readiness.
 */
export default function GuidedGameSetup({
  step,
  networkLabel,
  walletAvailable,
  botHealth,
  walletConnected,
  hasSavedMatch,
  tableConfigured,
  busy,
  difficulty,
  onDifficultyChange,
  onContinue,
  onBack,
  onConnect,
  onRetryWalletCheck,
  onStart,
  onResume,
  children,
}) {
  const headingId = useId();
  const difficultyId = useId();
  const matchActionDisabled = busy || !walletConnected || !tableConfigured || botHealth !== 'ready';

  return (
    <section className="guided-game-setup" aria-labelledby={headingId} aria-busy={busy}>
      <ol className="guided-game-setup__steps" aria-label="Game setup steps">
        {SETUP_STEPS.map((setupStep) => (
          <li key={setupStep.key} aria-current={step === setupStep.key ? 'step' : undefined}>
            {setupStep.label}
          </li>
        ))}
      </ol>

      <div className="guided-game-setup__task">
        {step === 'prepare' && (
          <>
            <h2 id={headingId}>1. Get ready to play</h2>
            <p>Before connecting, check these essentials:</p>
            <ul className="guided-game-setup__checklist">
              <li>Set Lace to the {networkLabel} network.</li>
              <li>Use a funded test wallet with DUST available for transactions.</li>
              <li>
                Proof privacy: a hosted proof server receives the private inputs needed to
                generate proofs. Using your own proof server keeps those inputs under your control.
              </li>
              <li>This is a test game with no wagers.</li>
            </ul>
            <p className="guided-game-setup__notice" role="status">
              {SERVICE_MESSAGES[botHealth]} This checks HTTP reachability only, not wallet synchronization.
            </p>
            {!tableConfigured && (
              <p className="guided-game-setup__warning">
                The configured table is unavailable. Ask the operator to configure the table before continuing.
              </p>
            )}
            <div className="guided-game-setup__actions">
              <button type="button" className="guided-game-setup__primary" onClick={onContinue} disabled={busy || !tableConfigured}>
                Continue to wallet
              </button>
            </div>
          </>
        )}

        {step === 'connect' && (
          <>
            <h2 id={headingId}>2. Connect your wallet</h2>
            <p>
              Click Connect Lace. Approve the connection in the Lace popup. Do not paste a seed phrase, password, or wallet address here.
            </p>
            {walletConnected ? (
              <p>Your wallet is connected. Continue to choose your match.</p>
            ) : walletAvailable === null ? (
              <p role="status">Checking whether Lace is available in this browser.</p>
            ) : walletAvailable === false ? (
              <>
                <p className="guided-game-setup__warning">Lace is not available. Install or enable Lace in this browser, unlock it, then check again.</p>
                {onRetryWalletCheck && (
                  <button type="button" onClick={onRetryWalletCheck} disabled={busy}>
                    Check for Lace again
                  </button>
                )}
              </>
            ) : null}
            <div className="guided-game-setup__actions">
              {walletConnected ? (
                <button type="button" className="guided-game-setup__primary" onClick={onContinue} disabled={busy}>
                  Continue to match
                </button>
              ) : (
                <button type="button" className="guided-game-setup__primary" onClick={onConnect} disabled={busy || walletAvailable !== true}>
                  Connect Lace
                </button>
              )}
              <button type="button" onClick={onBack} disabled={busy}>Back</button>
            </div>
          </>
        )}

        {step === 'match' && (
          <>
            <h2 id={headingId}>3. Start your match</h2>
            {hasSavedMatch ? (
              <p>A match is saved in this browser. Resume it instead of starting another.</p>
            ) : (
              <>
                <label className="guided-game-setup__label" htmlFor={difficultyId}>Opponent difficulty</label>
                <select id={difficultyId} value={difficulty} onChange={(event) => onDifficultyChange(event.target.value)} disabled={busy}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <p>Click Start game, then review and approve any transaction request in Lace. Nothing starts automatically.</p>
              </>
            )}
            {!walletConnected && <p className="guided-game-setup__warning">Connect your wallet before continuing.</p>}
            {!tableConfigured && <p className="guided-game-setup__warning">The configured table is unavailable. Ask the operator to configure the table.</p>}
            {botHealth !== 'ready' && <p role="status">{SERVICE_MESSAGES[botHealth]}</p>}
            <div className="guided-game-setup__actions">
              {hasSavedMatch ? (
                <button type="button" className="guided-game-setup__primary" onClick={onResume} disabled={matchActionDisabled}>
                  Resume my match
                </button>
              ) : (
                <button type="button" className="guided-game-setup__primary" onClick={onStart} disabled={matchActionDisabled}>
                  Start game
                </button>
              )}
              <button type="button" onClick={onBack} disabled={busy}>Back</button>
            </div>
          </>
        )}
      </div>

      {/* Parent-provided activity, status, and errors remain below the task. */}
      <div className="guided-game-setup__status">{children}</div>
    </section>
  );
}
