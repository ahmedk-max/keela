import { useReducedMotion } from 'framer-motion';

// Seconds for Motion; the same values are exposed to CSS at the app root.
export const MOTION = { feedback: 0.12, fade: 0.18, panel: 0.24 };
export const EASE = [0.2, 0.8, 0.2, 1];
export const motionVariables = {
  '--motion-feedback': `${MOTION.feedback}s`,
  '--motion-fade': `${MOTION.fade}s`,
  '--motion-panel': `${MOTION.panel}s`,
  '--c-ease': `cubic-bezier(${EASE.join(',')})`,
};
export function useTransition(kind = 'panel') {
  const reduced = useReducedMotion();
  return { reduced, transition: { duration: reduced ? 0 : MOTION[kind], ease: EASE } };
}
