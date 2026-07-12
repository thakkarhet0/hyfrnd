/**
 * The app is permanently dark/"metal" — there is no light mode or user
 * preference to resolve. Kept as a hook (rather than inlining 'dark'
 * everywhere) since `useTheme()`, `_layout.tsx`'s nav/Paper theme selection,
 * and `getPaperTheme(scheme)` all call this.
 */
import { useColorScheme as useRNColorScheme } from 'react-native';

export function useColorScheme(): 'light' | 'dark' {
  const scheme = useRNColorScheme();
  return scheme === 'light' ? 'light' : 'dark';
}
