export const Colors = {
  light: {
    background: '#DCF2F1',
    text: '#0F1035',
    cta: '#365486',
    accent: '#7FC7D9',
    // Follow-up / attention accent. Always used as a solid fill or as text on a
    // dark chip — never as yellow text on the page (too low-contrast on light).
    highlight: '#FFD23F',
  },
  dark: {
    background: '#0F1035',
    text: '#DCF2F1',
    cta: '#7FC7D9',
    accent: '#7FC7D9',
    highlight: '#FFD23F',
  },
} as const;

export type ColorScheme = 'light' | 'dark';
export type ThemeColors = typeof Colors.light;

// Navy that pairs with `highlight` (yellow): readable as text/ink on a yellow
// fill, and as a chip background under yellow text, in both light and dark.
export const INK = '#0F1035';

// letterSpacing in pixels, derived from em spec:
// display/heading: 0.08em; body/label/caption: 0.04em
export const FONT_REGULAR = 'SpaceMono_400Regular';
export const FONT_BOLD = 'SpaceMono_700Bold';

export const Typography = {
  display: {
    fontFamily: FONT_BOLD,
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: 2.5,
    textTransform: 'lowercase' as const,
  },
  heading: {
    fontFamily: FONT_BOLD,
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: 1.9,
    textTransform: 'lowercase' as const,
  },
  subheading: {
    fontFamily: FONT_REGULAR,
    fontSize: 20,
    fontWeight: '400' as const,
    letterSpacing: 0.8,
    textTransform: 'lowercase' as const,
  },
  body: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: 0.6,
    textTransform: 'lowercase' as const,
  },
  label: {
    fontFamily: FONT_BOLD,
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    textTransform: 'lowercase' as const,
  },
  caption: {
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0.5,
    textTransform: 'lowercase' as const,
  },
} as const;

// 8px base unit
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,  // screen padding
  xl: 32,  // section gap
  xxl: 64,
} as const;

// Two border-radius values: flat or full circle
export const Radius = {
  none: 0,
  circle: 9999,
} as const;
