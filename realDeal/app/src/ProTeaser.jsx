import React, { useRef } from 'react';

export default function ProTeaser() {
  const triggerRef = useRef(null);
  const dialogRef = useRef(null);

  return (
    <div className="pro-teaser">
      <button
        ref={triggerRef}
        type="button"
        className="pro-teaser__trigger"
        aria-describedby="pro-teaser-hint"
        onClick={() => dialogRef.current?.showModal()}
      >
        Go ad free, and other Pro features
      </button>
      <span id="pro-teaser-hint" className="pro-teaser__hint" role="tooltip">
        Coming Soon!
      </span>
      <dialog
        ref={dialogRef}
        className="pro-teaser__dialog"
        aria-labelledby="pro-teaser-title"
        onClose={() => triggerRef.current?.focus()}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="pro-teaser__content">
          <p className="pro-teaser__eyebrow">Coming Soon!</p>
          <h2 id="pro-teaser-title">A little more room to play</h2>
          <p>We are exploring optional Pro features while the core game stays playable:</p>
          <ul>
            <li><strong>Ad-free play</strong> for an uninterrupted table.</li>
            <li><strong>Peer-to-peer matches</strong> with friends instead of the AI.</li>
            <li><strong>Optional play for money</strong> only after fairness, safety, and legal checks are ready.</li>
          </ul>
          <p className="pro-teaser__notice">These are ideas, not live features. No payment or subscription is available yet.</p>
          <button type="button" className="primary" onClick={() => dialogRef.current?.close()}>
            Back to the game
          </button>
        </div>
      </dialog>
    </div>
  );
}
