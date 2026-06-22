import { type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

type ScreenProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Which screen edges to inset for the notch / home indicator.
   * Tab screens default to `['top']` because the tab bar already owns the
   * bottom edge; full-screen stack / modal / onboarding screens should pass
   * `['top', 'bottom']`.
   */
  edges?: readonly Edge[];
};

/**
 * Screen-level wrapper that applies safe-area insets so content never slides
 * under the notch / Dynamic Island or the home indicator. expo-router already
 * mounts a SafeAreaProvider at the root, so the insets resolve correctly here.
 */
export function Screen({ children, style, edges = ['top'] }: ScreenProps) {
  return (
    <SafeAreaView style={[{ flex: 1 }, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}
