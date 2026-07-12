import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { type Edge } from 'react-native-safe-area-context';

import { MetalColors } from '@/constants/theme';
import { Screen } from '@/components/Screen';

type CaptureScreenBackgroundProps = {
  children: ReactNode;
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
};

/**
 * Full-bleed metal gradient behind the capture screens, matching the record
 * button's own `.inner` gradient. Sits outside `Screen`'s SafeAreaView so the
 * gradient reaches the notch/home-indicator zones too, not just the padded box.
 */
export function CaptureScreenBackground({ children, edges, style }: CaptureScreenBackgroundProps) {
  return (
    <View style={styles.fill}>
      <LinearGradient colors={MetalColors.gradient} style={StyleSheet.absoluteFill} />
      <Screen edges={edges} style={[styles.transparent, style]}>
        {children}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  transparent: { backgroundColor: 'transparent' },
});
