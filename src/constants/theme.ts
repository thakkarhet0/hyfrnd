// The app is permanently dark/"metal", matching the record button's own
// chassis (see MetalColors below) — there is no light mode. `light` and `dark`
// are kept as identical values (rather than collapsing the Colors shape to a
// single flat object) so `useTheme()`/`Colors[scheme]`/`getPaperTheme(scheme)`
// call sites don't need restructuring; `useColorScheme()` always resolves to
// 'dark' now, so the `.light` branch is effectively dead but harmless.
const darkTheme = {
  background: '#000000',
  text: '#F2F3F5',
  // Secondary accent — links, borders, spinners, avatar initials.
  cta: '#6657ff',
  accent: '#6657ff',
  // Primary CTA-fill color. Always used as a solid fill (never as red text on
  // the page) — pairs with `INK` (white) for the fill's label text.
  highlight: '#311fff',
  cardBg: '#222225',
  cardBorder: '#3a3a3e',
  cardBgActive: '#2a2a2e',
  divider: '#2d2d31',
  headerGradient: ['#2c2c31', '#1f1f22'] as const,
} as const;

const lightTheme = {
  background: '#ffffff',
  text: '#101114',
  cta: '#009a6f',
  accent: '#00df9a',
  highlight: '#00cc96',
  cardBg: '#f2faf7',
  cardBorder: '#101114',
  cardBgActive: '#e1ebe8',
  divider: '#d8e5e0',
  headerGradient: ['#eaecee', '#f2f4f6'] as const,
} as const;

export const Colors = {
  light: lightTheme,
  dark: darkTheme,
} as const;

// Fixed "metal" palette for the capture experience (record button + its screens
// + the tab bar), matching the RecordButtonDOM button's own gradient/glow colors.
export const MetalColors = {
  // Matches the button's `.inner` face gradient (180deg, #232324 5% -> #46484b 100%).
  gradient: ['#232324', '#46484b'] as const,
  // Shade darker than the page gradient — matches the button chassis's own
  // darkest tone (`.button::before` bottom border / `.bg` fill).
  footerBackground: '#15161a',
  text: '#F2F3F5',
  cta: '#6657ff',
  // Idle button accent (chassis inset shadow / led / shine).
  accentGlow: '#2415d9',
  // Recording accent — brighter red pulse (led/dot at animation peak).
  accentGlowActive: '#311fff',
} as const;

export type ColorScheme = 'light' | 'dark';
export type ThemeColors = typeof Colors.light | typeof Colors.dark;

// White — CTA-fill text (on `highlight` red buttons) and chip background for
// the inverse highlight-text-on-chip pattern. Named INK from the old
// navy-on-cream palette; kept the name to avoid a 15+ call-site rename.
export const INK = '#FFFFFF';

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
