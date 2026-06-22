import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/hooks/use-theme';
import { WaveformAnimation } from './WaveformAnimation';
import { PixelBurst } from './PixelBurst';

export interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function RecordButton({ isRecording, onPress, disabled = false }: RecordButtonProps) {
  const theme = useTheme();
  const buttonColor = isRecording ? theme.accent : theme.cta;

  const [burst, setBurst] = useState(0);
  const scale = useSharedValue(1);

  // Retro 8-bit explosion palette: app accent/cta + bright arcade colors.
  const palette = useMemo(
    () => [theme.accent, theme.cta, '#FFD93D', '#FF6B35', '#FFFFFF'],
    [theme.accent, theme.cta],
  );

  // Drive the press "pop" from an effect (shared-value mutation isn't allowed in
  // event handlers under the React Compiler) — same pattern as WaveformAnimation.
  // The mutation must precede the useAnimatedStyle read to satisfy the rule.
  useEffect(() => {
    if (burst === 0) return;
    scale.value = withSequence(
      withTiming(0.86, { duration: 70 }),
      withTiming(1, { duration: 180, easing: Easing.out(Easing.back(2)) }),
    );
    // scale is a stable shared value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burst]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (disabled) return;
    setBurst((n) => n + 1); // fire a fresh pixel burst (drives the pop + particles)
    onPress();
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.buttonArea}>
        <Pressable
          onPress={handlePress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={isRecording ? 'stop recording' : 'start recording'}
          accessibilityState={{ selected: isRecording }}
        >
          <Animated.View
            style={[
              styles.button,
              { backgroundColor: buttonColor, opacity: disabled ? 0.5 : 1 },
              buttonAnimatedStyle,
            ]}
          >
            <SymbolView
              name={isRecording ? 'stop.fill' : 'mic.fill'}
              size={32}
              tintColor={theme.background}
            />
          </Animated.View>
        </Pressable>
        <PixelBurst trigger={burst} palette={palette} />
      </View>
      <WaveformAnimation isActive={isRecording} color={theme.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    rowGap: 16,
  },
  buttonArea: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40, // 50% — SOLE circle element on screen (UX-DR10)
    alignItems: 'center',
    justifyContent: 'center',
  },
});
