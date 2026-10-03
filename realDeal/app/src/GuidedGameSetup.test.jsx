import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import GuidedGameSetup from './GuidedGameSetup.jsx';

const defaultProps = {
  step: 'prepare',
  networkLabel: 'Preview',
  walletAvailable: true,
  botHealth: 'ready',
  walletConnected: false,
  hasSavedMatch: false,
  tableConfigured: true,
  busy: false,
  difficulty: 'medium',
  onDifficultyChange: () => {},
  onContinue: () => {},
  onBack: () => {},
  onConnect: () => {},
  onStart: () => {},
  onResume: () => {},
};

// No browser/DOM dependency: inspect server markup and never run real actions.
function renderSetup(overrides = {}) {
  return renderToStaticMarkup(<GuidedGameSetup {...defaultProps} {...overrides} />);
}

function buttonMarkup(markup, label) {
  const button = [...markup.matchAll(/<button\b[^>]*>[^<]*<\/button>/g)]
    .map((match) => match[0])
    .find((candidate) => candidate.endsWith(`>${label}</button>`));
  expect(button, `Expected button: ${label}`).toBeDefined();
  return button;
}

function buttonLabels(markup) {
  return [...markup.matchAll(/<button\b[^>]*>([^<]*)<\/button>/g)].map((match) => match[1]);
}

describe('GuidedGameSetup preparation', () => {
  it('shows only preparation instructions and its one forward action', () => {
    const markup = renderSetup();
    expect(markup).toContain('1. Get ready to play</h2>');
    expect(markup).toContain('Set Lace to the Preview network.');
    expect(markup).toContain('funded test wallet');
    expect(markup).toContain('DUST');
    expect(markup).toContain('hosted proof server receives the private inputs');
    expect(markup).toContain('own proof server keeps those inputs under your control');
    expect(markup).toContain('no wagers');
    expect(markup).toContain('Bot service reachable.');
    expect(markup).toContain('HTTP reachability only, not wallet synchronization');
    expect(buttonLabels(markup)).toEqual(['Continue to wallet']);
    expect(markup).not.toContain('<select');
    expect(buttonMarkup(markup, 'Continue to wallet')).not.toContain('disabled');
  });

  it.each([
    ['checking', 'Checking whether the bot service is reachable.'],
    ['offline', 'Bot service not reachable.'],
  ])('describes %s service reachability without blocking preparation', (botHealth, message) => {
    const markup = renderSetup({ botHealth });
    expect(markup).toContain(message);
    expect(markup).not.toMatch(/wallet (?:sync|synchronization) (?:is )?ready/i);
    expect(buttonMarkup(markup, 'Continue to wallet')).not.toContain('disabled');
  });

  it.each([{ busy: true }, { tableConfigured: false }])('guards preparation with %j', (overrides) => {
    const markup = renderSetup(overrides);
    expect(buttonMarkup(markup, 'Continue to wallet')).toContain('disabled=""');
    if (overrides.tableConfigured === false) {
      expect(markup).toContain('The configured table is unavailable.');
      expect(markup).toContain('Ask the operator');
    }
  });
});

describe('GuidedGameSetup connection', () => {
  it('explains the Lace popup and has only Connect Lace and Back', () => {
    const markup = renderSetup({ step: 'connect' });
    expect(markup).toContain('2. Choose how to play</h2>');
    expect(markup).toContain('Click Connect Lace. Approve the connection in the Lace popup. Do not paste a seed phrase, password, or wallet address here.');
    expect(buttonLabels(markup)).toEqual(['Connect Lace', 'Back']);
    expect(buttonMarkup(markup, 'Connect Lace')).not.toContain('disabled');
    expect(markup).not.toContain('Opponent difficulty');
    expect(markup).not.toContain('funded test wallet');
  });

  it.each([
    { walletAvailable: null },
    { walletAvailable: false },
    { busy: true },
  ])('guards connection with %j', (overrides) => {
    const markup = renderSetup({ step: 'connect', ...overrides });
    expect(buttonMarkup(markup, 'Connect Lace')).toContain('disabled=""');
    if (overrides.walletAvailable === null) expect(markup).toContain('Checking whether Lace is available');
    if (overrides.walletAvailable === false) expect(markup).toContain('Lace is not available.');
  });

  it('offers Continue to match, not another connection, when connected', () => {
    const markup = renderSetup({ step: 'connect', walletConnected: true, walletAvailable: false });
    expect(buttonLabels(markup)).toEqual(['Continue to match', 'Back']);
    expect(buttonMarkup(markup, 'Continue to match')).not.toContain('disabled');
  });

  it('disables navigation while connection work is busy', () => {
    const markup = renderSetup({ step: 'connect', walletConnected: true, busy: true });
    expect(buttonMarkup(markup, 'Continue to match')).toContain('disabled=""');
    expect(buttonMarkup(markup, 'Back')).toContain('disabled=""');
  });
});

describe('GuidedGameSetup match', () => {
  it('shows a labeled controlled difficulty selector and explicit Start game action', () => {
    const markup = renderSetup({ step: 'match', walletConnected: true, difficulty: 'hard' });
    expect(markup).toContain('3. Start your match</h2>');
    const labelTarget = markup.match(/<label[^>]*for="([^"]+)"/)[1];
    expect(markup).toContain(`<select id="${labelTarget}"`);
    expect(markup).toContain('Opponent difficulty</label>');
    expect(markup).toContain('<option value="hard" selected="">Hard</option>');
    expect(markup).toContain('review and approve any transaction request in Lace');
    expect(markup).toContain('Nothing starts automatically.');
    expect(buttonLabels(markup)).toEqual(['Start game', 'Back']);
    expect(buttonMarkup(markup, 'Start game')).not.toContain('disabled');
    expect(markup).not.toContain('Do not paste a seed phrase');
  });

  it('only offers resume and hides difficulty when a match is saved', () => {
    const markup = renderSetup({ step: 'match', walletConnected: true, hasSavedMatch: true });
    expect(markup).toContain('A match is saved in this browser. Resume it instead of starting another.');
    expect(buttonLabels(markup)).toEqual(['Resume my match', 'Back']);
    expect(markup).not.toContain('Start game');
    expect(markup).not.toContain('<select');
    expect(markup).not.toContain('Opponent difficulty');
    expect(buttonMarkup(markup, 'Resume my match')).not.toContain('disabled');
  });

  describe.each([false, true])('match guards (hasSavedMatch=%s)', (hasSavedMatch) => {
    it.each([
      { busy: true },
      { walletConnected: false },
      { tableConfigured: false },
      { botHealth: 'checking' },
      { botHealth: 'offline' },
    ])('disables the relevant match action with %j', (overrides) => {
      const markup = renderSetup({ step: 'match', walletConnected: true, hasSavedMatch, ...overrides });
      expect(buttonMarkup(markup, hasSavedMatch ? 'Resume my match' : 'Start game')).toContain('disabled=""');
      if (overrides.tableConfigured === false) expect(markup).toContain('The configured table is unavailable.');
      if (overrides.walletConnected === false) expect(markup).toContain('Connect your wallet before continuing.');
      if (overrides.botHealth === 'offline') expect(markup).toContain('Bot service not reachable.');
    });
  });

  it('disables difficulty selection and Back while busy', () => {
    const markup = renderSetup({ step: 'match', walletConnected: true, busy: true });
    expect(markup.match(/<select[^>]*>/)[0]).toContain('disabled=""');
    expect(buttonMarkup(markup, 'Back')).toContain('disabled=""');
  });
});

describe('GuidedGameSetup shared structure', () => {
  it.each([
    ['prepare', 'Get ready', '1. Get ready to play'],
    ['connect', 'Code or wallet', '2. Choose how to play'],
    ['match', 'Start match', '3. Start your match'],
  ])('marks only %s current with a non-clickable ordered step list', (step, label, heading) => {
    const markup = renderSetup({ step });
    const stepList = markup.match(/<ol[^>]*>[\s\S]*?<\/ol>/)[0];
    expect(stepList).toContain('aria-label="Game setup steps"');
    expect(stepList).toContain(`<li aria-current="step">${label}</li>`);
    expect(stepList.match(/aria-current="step"/g)).toHaveLength(1);
    expect(stepList.match(/<li\b/g)).toHaveLength(3);
    expect(stepList).not.toMatch(/<button|<a\b|tabindex/);
    expect(markup.match(/<h2\b/g)).toHaveLength(1);
    expect(markup).toContain(`${heading}</h2>`);
    const headingId = markup.match(/<h2 id="([^"]+)"/)[1];
    expect(markup).toContain(`aria-labelledby="${headingId}"`);
  });

  it.each(['prepare', 'connect', 'match'])('has no secret or manual address input on %s', (step) => {
    const markup = renderSetup({ step });
    expect(markup).not.toMatch(/<input|<textarea|contenteditable/i);
    expect(markup).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it.each(['prepare', 'connect', 'match'])('renders parent activity after the %s task', (step) => {
    const markup = renderSetup({ step, children: <p role="status">Parent activity message</p> });
    expect(markup.indexOf('Parent activity message')).toBeGreaterThan(markup.lastIndexOf('</button>'));
    expect(markup).toContain('<div class="guided-game-setup__status"><p role="status">Parent activity message</p></div>');
  });

  it('never invokes parent callbacks during render on any screen', () => {
    const callbacks = Object.fromEntries(
      ['onDifficultyChange', 'onContinue', 'onBack', 'onConnect', 'onStart', 'onResume'].map((name) => [name, vi.fn()]),
    );
    for (const step of ['prepare', 'connect', 'match']) {
      renderSetup({ step, ...callbacks });
      renderSetup({ step, walletConnected: true, hasSavedMatch: true, ...callbacks });
    }
    for (const callback of Object.values(callbacks)) expect(callback).not.toHaveBeenCalled();
  });
});

describe('GuidedGameSetup game code (sponsored play)', () => {
  it('offers no code form unless the parent supports it', () => {
    expect(renderSetup({ step: 'connect' })).not.toContain('Have a game code?');
  });

  it('renders the code form above the wallet option and submits the typed code', () => {
    const onRedeemCode = vi.fn();
    const markup = renderSetup({ step: 'connect', onRedeemCode, gameCode: 'POB-ABCD-2345' });
    expect(markup.indexOf('Have a game code?')).toBeLessThan(markup.indexOf('Or use your own wallet'));
    expect(markup).toContain('placeholder="POB-XXXX-XXXX"');
    expect(markup).toContain('Play with code');
    expect(markup).toContain('no sign-ups, nothing to approve');
  });

  it('disables the code button until something plausible is typed', () => {
    const short = renderSetup({ step: 'connect', onRedeemCode: () => {}, gameCode: 'POB' });
    expect(buttonMarkup(short, 'Play with code')).toMatch(/disabled/);
    const ok = renderSetup({ step: 'connect', onRedeemCode: () => {}, gameCode: 'POB-ABCD-2345' });
    expect(buttonMarkup(ok, 'Play with code')).not.toMatch(/disabled/);
  });

  it('shows the code status and the session-mode confirmation', () => {
    expect(renderSetup({ step: 'connect', onRedeemCode: () => {}, gameCodeStatus: { kind: 'ok', text: '39 moves left' } })).toContain('39 moves left');
    expect(renderSetup({ step: 'connect', walletConnected: true, walletKind: 'session' })).toContain('no wallet pop-ups');
  });

  it('never asks for a seed, password or address in the code form', () => {
    const markup = renderSetup({ step: 'connect', onRedeemCode: () => {} });
    expect(markup).not.toMatch(/type="password"/);
    expect(markup).not.toMatch(/seed phrase.*<input/);
  });
});
