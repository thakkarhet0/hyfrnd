import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useAppStore } from '@/stores/app.store';

/**
 * Resolves the active color scheme, honoring the user's in-app theme preference
 * (Settings → appearance). 'system' defers to the OS; 'light'/'dark' force a mode.
 */
export function useColorScheme(): 'light' | 'dark' {
  const system = useSystemColorScheme();
  const preference = useAppStore((s) => s.theme_preference);
  if (preference === 'light' || preference === 'dark') return preference;
  return system === 'dark' ? 'dark' : 'light';
}
