import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import DiagnosticsButton, {
  COPIED_FEEDBACK_DURATION_MS,
  copyTextWithClipboard,
  serializeDiagnosticReport,
} from './DiagnosticsButton.jsx';

// The realDeal test suite has no DOM environment (no jsdom), so the
// component is checked via static markup and the click behaviour is
// covered through the exported pure helpers it delegates to.

describe('DiagnosticsButton — markup', () => {
  it('renders an accessible button with the default label and the dark purple palette', () => {
    const markup = renderToStaticMarkup(<DiagnosticsButton getReport={() => ({})} />);
    expect(markup).toContain('<button');
    expect(markup).toContain('type="button"');
    expect(markup).toContain('aria-label="Copy a sanitized diagnostic report to the clipboard"');
    expect(markup).toContain('Copy diagnostic report');
    expect(markup).toContain('#1a1530');
    expect(markup).toContain('#3b2e6a');
    expect(markup).toContain('#bcb1ff');
  });

  it('accepts a custom label and wrapper class, and does not show the fallback textarea initially', () => {
    const markup = renderToStaticMarkup(
      <DiagnosticsButton getReport={() => ({})} label="Copy report" className="pob-diagnostics" />,
    );
    expect(markup).toContain('Copy report');
    expect(markup).toContain('class="pob-diagnostics"');
    expect(markup).not.toContain('<textarea');
  });

  it('does not call getReport during render (only on click)', () => {
    const getReport = vi.fn(() => ({}));
    renderToStaticMarkup(<DiagnosticsButton getReport={getReport} />);
    expect(getReport).not.toHaveBeenCalled();
  });

  it('contains no emoji characters', () => {
    const markup = renderToStaticMarkup(<DiagnosticsButton getReport={() => ({})} />);
    expect(markup).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

describe('serializeDiagnosticReport', () => {
  it('produces 2-space pretty JSON', () => {
    expect(serializeDiagnosticReport({ a: 1, b: [2] })).toBe('{\n  "a": 1,\n  "b": [\n    2\n  ]\n}');
  });
});

describe('copyTextWithClipboard', () => {
  it('writes the text and reports success when a clipboard is available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const result = await copyTextWithClipboard('hello', { writeText });
    expect(writeText).toHaveBeenCalledWith('hello');
    expect(result).toEqual({ copied: true });
  });

  it('reports clipboard-unavailable when there is no clipboard object (triggers textarea fallback)', async () => {
    expect(await copyTextWithClipboard('hello', undefined)).toEqual({
      copied: false,
      reason: 'clipboard-unavailable',
    });
    expect(await copyTextWithClipboard('hello', {})).toEqual({
      copied: false,
      reason: 'clipboard-unavailable',
    });
  });

  it('does not throw when writeText rejects; reports the failure instead', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    const result = await copyTextWithClipboard('hello', { writeText });
    expect(result).toEqual({ copied: false, reason: 'NotAllowedError' });
  });
});

describe('feedback timing', () => {
  it('shows "Copied" for two seconds', () => {
    expect(COPIED_FEEDBACK_DURATION_MS).toBe(2000);
  });
});
