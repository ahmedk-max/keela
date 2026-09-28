import { useLayoutEffect, useState } from 'react';

// iOS keeps the layout viewport tall when its keyboard covers the page.
// Restrict overlays to the visible viewport without interfering with pinch zoom.
export function useVisibleViewport() {
  const [style, setStyle] = useState({});
  useLayoutEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      if (viewport.scale !== 1) return;
      setStyle({
        '--vv-height': `${viewport.height}px`,
        '--vv-top': `${viewport.offsetTop}px`,
        '--sheet-bottom-pad': window.innerHeight - viewport.height > 120
          ? '16px' : 'calc(16px + env(safe-area-inset-bottom))',
      });
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);
  return style;
}
