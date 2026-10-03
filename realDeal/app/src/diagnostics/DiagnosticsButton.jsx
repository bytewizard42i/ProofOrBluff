/**
 * diagnostics/DiagnosticsButton.jsx — "Copy diagnostic report" button.
 *
 * WHAT
 * One click: ask the parent for a fresh report (`getReport()`), serialise
 * it as pretty JSON, and put it on the clipboard. Shows "Copied" for two
 * seconds. If the Clipboard API is unavailable (http:// origins other than
 * localhost, some embedded browsers, permission denied), fall back to a
 * read-only <textarea> holding the JSON so the person can select-all and
 * copy by hand.
 *
 * WHY a getter instead of a `report` prop
 * Building the report walks the activity history and redacts everything.
 * Doing that on every render would be wasteful; doing it on click means
 * the paste always reflects the moment the button was pressed.
 *
 * Styling is inline so this component can be dropped anywhere without
 * touching styles.css (which another helper owns). Palette matches the
 * realDeal dark purple theme.
 *
 * Not mounted anywhere yet; see README.md in this folder for how.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

export const COPIED_FEEDBACK_DURATION_MS = 2000;

// Dark purple palette shared with the rest of realDeal.
const PALETTE = {
  background: '#1a1530',
  border: '#3b2e6a',
  text: '#bcb1ff',
};

const buttonStyle = {
  background: PALETTE.background,
  border: `1px solid ${PALETTE.border}`,
  color: PALETTE.text,
  borderRadius: 6,
  padding: '6px 12px',
  font: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
};

const fallbackTextareaStyle = {
  display: 'block',
  width: '100%',
  minHeight: 160,
  marginTop: 8,
  background: PALETTE.background,
  border: `1px solid ${PALETTE.border}`,
  color: PALETTE.text,
  borderRadius: 6,
  padding: 8,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 11,
  resize: 'vertical',
};

const statusTextStyle = {
  color: PALETTE.text,
  fontSize: 12,
  marginLeft: 8,
};

// ---------------------------------------------------------------------
// Pure helpers (exported so they can be unit-tested without a DOM)
// ---------------------------------------------------------------------

/** Pretty JSON, 2-space indented — what ends up on the clipboard. */
export function serializeDiagnosticReport(report) {
  return JSON.stringify(report, null, 2);
}

/**
 * Try to write text to a clipboard-like object.
 * Returns { copied: true } on success, { copied: false, reason } otherwise.
 * Never throws — the caller decides what to do about failure.
 *
 * @param {string} text
 * @param {{ writeText?: (text: string) => Promise<void> } | undefined} clipboard
 */
export async function copyTextWithClipboard(text, clipboard) {
  if (!clipboard || typeof clipboard.writeText !== 'function') {
    return { copied: false, reason: 'clipboard-unavailable' };
  }
  try {
    await clipboard.writeText(text);
    return { copied: true };
  } catch (error) {
    return { copied: false, reason: error instanceof Error ? error.message : 'clipboard-write-failed' };
  }
}

/** Resolve the browser clipboard if we are in a browser; undefined otherwise. */
function resolveNavigatorClipboard() {
  if (typeof navigator === 'undefined') return undefined;
  return navigator.clipboard;
}

/**
 * Call the getter defensively so a throwing report builder still yields a
 * paste. The getter may be sync or async (the TestWired panel runs a live
 * health probe before building its report), so we always `await` it.
 */
async function safelyBuildReport(getReport) {
  try {
    return await getReport();
  } catch (error) {
    return {
      error: 'Diagnostic report could not be built.',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

// ---------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------

/**
 * @param {object} props
 * @param {() => object|Promise<object>} props.getReport   returns the (already sanitized) report object
 * @param {string} [props.label]           button text, default "Copy diagnostic report"
 * @param {string} [props.className]       optional extra class for the wrapper
 */
export default function DiagnosticsButton({ getReport, label = 'Copy diagnostic report', className }) {
  // 'idle' | 'copied' | 'fallback' | 'error'
  const [copyStatus, setCopyStatus] = useState('idle');
  const [fallbackJsonText, setFallbackJsonText] = useState('');
  const resetTimerRef = useRef(null);

  // Clear the "Copied" reset timer if the component unmounts mid-countdown.
  useEffect(() => () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
  }, []);

  const scheduleStatusReset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setCopyStatus('idle'), COPIED_FEEDBACK_DURATION_MS);
  }, []);

  const handleCopyClick = useCallback(async () => {
    const report = await safelyBuildReport(getReport);
    const jsonText = serializeDiagnosticReport(report);
    const result = await copyTextWithClipboard(jsonText, resolveNavigatorClipboard());

    if (result.copied) {
      setFallbackJsonText('');
      setCopyStatus('copied');
      scheduleStatusReset();
      return;
    }

    // Clipboard unavailable or refused: show the JSON for manual copy.
    setFallbackJsonText(jsonText);
    setCopyStatus('fallback');
  }, [getReport, scheduleStatusReset]);

  const showingFallback = copyStatus === 'fallback';

  return (
    <div className={className}>
      <button
        type="button"
        style={buttonStyle}
        onClick={handleCopyClick}
        aria-label="Copy a sanitized diagnostic report to the clipboard"
        aria-live="polite"
      >
        {copyStatus === 'copied' ? 'Copied' : label}
      </button>
      {showingFallback && (
        <span style={statusTextStyle} role="status">
          Clipboard unavailable. Select the text below and copy it manually.
        </span>
      )}
      {showingFallback && (
        <textarea
          readOnly
          value={fallbackJsonText}
          style={fallbackTextareaStyle}
          aria-label="Diagnostic report JSON for manual copy"
          onFocus={(event) => event.target.select()}
        />
      )}
    </div>
  );
}
