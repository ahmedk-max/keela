import React from 'react';
import { motion } from 'framer-motion';
import { useTransition } from './motion';

export const DetailNavigationContext = React.createContext(/** @type {{ id: string, direction: number, positions: React.MutableRefObject<Record<string, { scroll: number, focus: string | null }>> } | null} */ (null));
export function DetailShell({ onClose, right, children }) {
  const navigation = React.useContext(DetailNavigationContext);
  const ref = React.useRef(null), scroll = React.useRef(null), opener = React.useRef(document.activeElement);
  const latestClose = React.useRef(onClose), done = React.useRef(false);
  latestClose.current = onClose;
  const [closing, setClosing] = React.useState(false);
  const { reduced, transition } = useTransition();
  const finish = React.useCallback(() => {
    if (done.current) return;
    done.current = true;
    latestClose.current();
  }, []);
  const remember = () => {
    if (navigation && scroll.current) {
      const active = document.activeElement;
      navigation.positions.current[navigation.id] = {
        scroll: scroll.current.scrollTop,
        focus: ref.current?.contains(active) ? active?.getAttribute('aria-label') || active?.textContent : null,
      };
    }
  };
  const close = () => { if (closing) return; remember(); setClosing(true); };
  React.useEffect(() => { if (closing && reduced) finish(); }, [closing, reduced, finish]);
  React.useLayoutEffect(() => {
    const background = document.querySelector('.k-app');
    if (background) background.inert = true;
    const saved = navigation?.positions.current[navigation.id];
    if (saved && scroll.current) scroll.current.scrollTop = saved.scroll;
    const previous = saved?.focus && [...ref.current.querySelectorAll('button')].find((node) => (node.getAttribute('aria-label') || node.textContent) === saved.focus);
    const target = navigation?.direction === -1 && previous ? previous : ref.current.querySelector('h1');
    if (target) { if (target.tagName === 'H1') target.tabIndex = -1; target.focus({ preventScroll: true }); }
    return () => {
      if (background) background.inert = false;
      const target = opener.current;
      if (target?.isConnected && !target.closest('[inert]') && !document.querySelector('[role="dialog"]')) target.focus?.({ preventScroll: true });
    };
  }, []);
  return <motion.div ref={ref} className="k-detail c-detail" data-detail-id={navigation?.id}
    initial={reduced ? false : { x: navigation?.direction === -1 ? '-16%' : '100%', opacity: navigation?.direction === -1 ? 0 : 1 }}
    animate={{ x: closing && !reduced ? '100%' : 0, opacity: 1 }} transition={transition}
    onAnimationComplete={() => { if (closing) finish(); }} onKeyDown={(e) => { if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) close(); }}>
    <div className="c-detail-header">
      <button type="button" className="c-button c-back" onClick={close} disabled={closing}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m14 6-6 6 6 6" /></svg>Back
      </button>{right || null}
    </div>
    <div ref={scroll} className="kscroll c-detail-scroll">{children}</div>
  </motion.div>;
}
