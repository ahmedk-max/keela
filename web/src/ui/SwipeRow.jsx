import React from 'react';

const WIDTH = 152;

// Claim a pointer only once horizontal intent is clear. Vertical gestures keep
// their native scrolling, and every action also has a keyboard/tap target.
export function SwipeRow({ label, open, onOpenChange, onEdit, onDelete, children }) {
  const [offset, setOffset] = React.useState(null);
  const gesture = React.useRef(null), suppressClick = React.useRef(false);
  const id = React.useId();
  const end = (event, cancelled = false) => {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    if (g.horizontal) {
      suppressClick.current = true;
      if (!cancelled) onOpenChange(g.startOpen ? g.dx < 40 : g.dx < -40);
    }
    gesture.current = null;
    setOffset(null);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return <div className="c-swipe-row" data-open={open || undefined} onKeyDown={(e) => {
    if (e.key === 'Escape' && open) { e.stopPropagation(); onOpenChange(false); }
  }}>
    <div id={id} className="c-swipe-actions" aria-hidden={!open} style={{ visibility: open || offset < 0 ? 'visible' : 'hidden' }}>
      <button type="button" tabIndex={open ? 0 : -1} onClick={onEdit} aria-label={`Edit ${label}`}>Edit</button>
      <button type="button" className="c-danger" tabIndex={open ? 0 : -1} onClick={onDelete} aria-label={`Delete ${label}`}>Delete</button>
    </div>
    <div className="c-row c-swipe-front" style={{ transform: `translateX(${offset ?? (open ? -WIDTH : 0)}px)`, transition: offset !== null ? 'none' : undefined }}
      onPointerDown={(e) => {
        if (e.isPrimary === false || e.button > 0) return;
        suppressClick.current = false;
        gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, startOpen: open };
      }}
      onPointerMove={(e) => {
        const g = gesture.current;
        if (!g || g.id !== e.pointerId || g.vertical) return;
        const dx = e.clientX - g.x, dy = e.clientY - g.y;
        if (!g.horizontal && Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
        if (!g.horizontal && Math.abs(dy) >= Math.abs(dx)) { g.vertical = true; return; }
        if (!g.horizontal) { g.horizontal = true; e.currentTarget.setPointerCapture?.(e.pointerId); }
        g.dx = dx;
        setOffset(Math.max(-WIDTH, Math.min(0, (g.startOpen ? -WIDTH : 0) + dx)));
      }} onPointerUp={(e) => end(e)} onPointerCancel={(e) => end(e, true)}
      onClickCapture={(e) => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; } }}>
      <button type="button" className="c-row-main" aria-label={`Edit ${label}`} onClick={onEdit}>{children}</button>
      <button type="button" className="c-icon-button" aria-label={`Actions for ${label}`} aria-expanded={open} aria-controls={id}
        onClick={() => onOpenChange(!open)}>•••</button>
    </div>
  </div>;
}
