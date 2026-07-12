/**
 * The app is permanently dark/"metal" — there is no light mode or user
 * preference to resolve. Kept as a hook (rather than inlining 'dark'
 * everywhere) since `useTheme()`, `_layout.tsx`'s nav/Paper theme selection,
 * and `getPaperTheme(scheme)` all call this.
 */
export function useColorScheme(): 'light' | 'dark' {
  return 'dark';
}
