import React, { useEffect } from 'react';

// ---------------------------------------------------------------------------
// The store layout, enlarged to fill most of the screen. Esc or a click outside closes it.
// ---------------------------------------------------------------------------
export default function Enlarged({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="cc-big" role="dialog" aria-modal="true" aria-label={`${title}, enlarged`} onClick={onClose}>
      <div className="cc-big-box" onClick={(event) => event.stopPropagation()}>
        <div className="cc-big-head">
          <b>{title}</b>
          <button type="button" className="cc-close" onClick={onClose}>Close</button>
        </div>
        <div className="cc-big-stage"><div className="cc-fill">{children}</div></div>
      </div>
    </div>
  );
}
