import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

const BAR_MAX_HEIGHT = 28;
const BAR_MIN_HEIGHT = 4;
const ANIMATION_DURATION = 400;
// Wave-like stagger: centre bar peaks last
const DELAYS = [0, 80, 160, 80, 0];

interface WaveBarProps {
  isActive: boolean;
  delay: number;
  color: string;
}

function WaveBar({ isActive, delay, color }: WaveBarProps) {
  const height = useSharedValue(BAR_MIN_HEIGHT);

  useEffect(() => {
    if (isActive) {
      height.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(BAR_MAX_HEIGHT, { duration: ANIMATION_DURATION }),
            withTiming(BAR_MIN_HEIGHT, { duration: ANIMATION_DURATION }),
          ),
          -1,
          false,
        ),
      );
    } else {
      height.value = withTiming(BAR_MIN_HEIGHT, { duration: 300 });
    }
    // delay and height are stable refs — safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return <Animated.View style={[styles.bar, animatedStyle, { backgroundColor: color }]} />;
}

export interface WaveformAnimationProps {
  isActive: boolean;
  color: string;
}

export function WaveformAnimation({ isActive, color }: WaveformAnimationProps) {
  return (
    <View style={styles.container}>
      {DELAYS.map((delay, index) => (
        <WaveBar key={index} isActive={isActive} delay={delay} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
    height: 32,
  },
  bar: {
    width: 4,
    borderRadius: 0, // flat-edge — UX-DR10
  },
});
