import type { Transition, Variants } from 'framer-motion';

/** Snappy spring for presses, hovers, and toggle thumbs. */
export const springSnappy: Transition = { type: 'spring', stiffness: 500, damping: 30, mass: 0.6 };

/** Gentle spring for entrances, drawers, and modals. */
export const springGentle: Transition = { type: 'spring', stiffness: 260, damping: 26 };

/** Spread onto any `motion.*` element for the standard press/hover feel. */
export const pressable = {
  whileTap: { scale: 0.97 },
  whileHover: { y: -2 },
  transition: springSnappy,
};

export const fadeScaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: springGentle },
  exit: { opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.15, ease: 'easeIn' } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } },
};

export const dropdownPop: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: -6 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { ...springGentle, staggerChildren: 0.035, delayChildren: 0.02 } },
  exit: { opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.12, ease: 'easeIn' } },
};

export const slideFromRight: Variants = {
  hidden: { x: '100%', opacity: 0.5 },
  visible: { x: 0, opacity: 1, transition: springGentle },
  exit: { x: '100%', opacity: 0.5, transition: { duration: 0.22, ease: 'easeIn' } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  visible: { opacity: 1, y: 0, scale: 1, transition: springGentle },
};

export const dropdownItem: Variants = {
  hidden: { opacity: 0, y: -4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15 } },
};
