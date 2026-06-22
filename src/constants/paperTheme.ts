import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

import { Colors, type ColorScheme } from './theme';

export const lightPaperTheme = {
  ...MD3LightTheme,
  roundness: 0,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.light.cta,
    onPrimary: Colors.light.background,
    background: Colors.light.background,
    onBackground: Colors.light.text,
    surface: Colors.light.background,
    onSurface: Colors.light.text,
    secondary: Colors.light.accent,
    onSecondary: Colors.light.text,
  },
};

export const darkPaperTheme = {
  ...MD3DarkTheme,
  roundness: 0,
  colors: {
    ...MD3DarkTheme.colors,
    primary: Colors.dark.cta,
    onPrimary: Colors.dark.text,
    background: Colors.dark.background,
    onBackground: Colors.dark.text,
    surface: Colors.dark.background,
    onSurface: Colors.dark.text,
    secondary: Colors.dark.accent,
    onSecondary: Colors.dark.text,
  },
};

export function getPaperTheme(scheme: ColorScheme) {
  return scheme === 'dark' ? darkPaperTheme : lightPaperTheme;
}
