export const colors = {
  primary: '#ffffff',
  primaryHover: '#ffffff',
  primaryMuted: '#ffffff',
  primaryGlow: 'rgba(255, 255, 255, 0.4)',
  primarySurface: 'rgba(255, 255, 255, 0.08)',
  primaryBorder: 'rgba(255, 255, 255, 0.2)',

  bgDeep: '#000000',
  bgBase: '#000000',
  bgElevated: '#000000',
  bgSurface: '#000000',

  textPrimary: '#ffffff',
  textSecondary: '#ffffff',
  textTertiary: '#ffffff',
  textMuted: '#000000',
};

export const easing = {
  out: [0.16, 1, 0.3, 1],
  inOut: [0.4, 0, 0.2, 1],
  spring: [0.34, 1.56, 0.64, 1],
};

export const duration = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  slower: 0.6,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
};

export const shadow = {
  sm: '0 2px 8px rgba(0,0,0,0.2)',
  md: '0 8px 24px rgba(0,0,0,0.3)',
  lg: '0 16px 48px rgba(0,0,0,0.4)',
  xl: '0 24px 64px rgba(0,0,0,0.5)',
  glow: '0 0 40px rgba(255,255,255,0.15)',
};

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

export const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

export const pageTransition = {
  duration: 0.3,
  ease: easing.out,
};

export const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};
