import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A draggable, resizable floating panel. Drag by the handle (the header);
 * resize from the bottom-right corner (native CSS resize). Position and size
 * persist per `storageKey` so the player's layout survives reloads.
 *
 * Keyboard: the handle is focusable; arrow keys nudge the panel 16px.
 */
export default function FloatingPanel({
  storageKey,
  title,
  defaultPosition = { x: 16, y: 120 },
  defaultSize = { width: 320, height: 620 },
  minWidth = 240,
  minHeight = 240,
  children,
  headerExtra,
  className = '',
}) {
  const [layout, setLayout] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) return saved;
    } catch { /* ignore */ }
    return { ...defaultPosition, ...defaultSize };
  });
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const [minimized, setMinimized] = useState(() => {
    try { return window.localStorage.getItem(`${storageKey}:min`) === '1'; } catch { return false; }
  });
  const toggleMinimized = () => setMinimized((current) => {
    const next = !current;
    try { window.localStorage.setItem(`${storageKey}:min`, next ? '1' : '0'); } catch { /* noop */ }
    return next;
  });

  const persist = useCallback((next) => {
    try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* noop */ }
  }, [storageKey]);

  // Clamp so the handle can never be dragged fully off-screen.
  const clamp = useCallback((x, y, width, height) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      x: Math.min(Math.max(x, 8 - width + 80), vw - 80),
      y: Math.min(Math.max(y, 0), vh - 40),
      width,
      height,
    };
  }, []);

  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragRef.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const onPointerMove = (event) => {
    if (!dragRef.current) return;
    const { dx, dy } = dragRef.current;
    setLayout((current) => clamp(event.clientX - dx, event.clientY - dy, current.width, current.height));
  };
  const onPointerUp = (event) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setLayout((current) => { persist(current); return current; });
  };
  const onKeyDown = (event) => {
    const step = 16;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
    if (!delta) return;
    event.preventDefault();
    setLayout((current) => {
      const next = clamp(current.x + delta[0], current.y + delta[1], current.width, current.height);
      persist(next);
      return next;
    });
  };

  // Record size after a native resize (no resize event on elements; observe).
  useEffect(() => {
    const node = panelRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      if (node.classList.contains('floating-panel--minimized')) return;
      const { width, height } = node.getBoundingClientRect();
      setLayout((current) => {
        if (Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1) return current;
        const next = { ...current, width, height };
        persist(next);
        return next;
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [persist]);

  const reset = () => {
    const next = { ...defaultPosition, ...defaultSize };
    setLayout(next);
    persist(next);
  };

  return (
    <div
      ref={panelRef}
      className={`floating-panel ${minimized ? 'floating-panel--minimized' : ''} ${className}`.trim()}
      style={{
        left: layout.x,
        top: layout.y,
        width: minimized ? Math.max(200, Math.min(layout.width, 260)) : layout.width,
        height: minimized ? 'auto' : layout.height,
        minWidth: minimized ? 200 : minWidth,
        minHeight: minimized ? 0 : minHeight,
      }}
      role="region"
      aria-label={title}
    >
      <div
        className="floating-panel__handle"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Move ${title}. Use arrow keys to nudge.`}
        title="Drag to move · arrow keys to nudge"
      >
        <span className="floating-panel__grip" aria-hidden="true">⋮⋮</span>
        <span className="floating-panel__title">{title}</span>
        <span className="floating-panel__extra" onPointerDown={(e) => e.stopPropagation()}>{headerExtra}</span>
        <button
          type="button"
          className="floating-panel__reset"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={reset}
          title="Reset position and size"
          aria-label="Reset panel position and size"
        >
          ⟲
        </button>
        <button
          type="button"
          className="floating-panel__minimize"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={toggleMinimized}
          title={minimized ? 'Expand' : 'Minimize'}
          aria-label={minimized ? `Expand ${title}` : `Minimize ${title}`}
          aria-expanded={!minimized}
        >
          {minimized ? '▢' : '—'}
        </button>
      </div>
      {!minimized && <div className="floating-panel__body">{children}</div>}
    </div>
  );
}
