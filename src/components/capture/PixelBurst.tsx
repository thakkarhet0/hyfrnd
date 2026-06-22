import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const PARTICLE_COUNT = 14;
const DURATION = 600;

interface Particle {
  dx: number;
  dy: number;
  distance: number;
  size: number;
  color: string;
  rotate: number;
}

// Deterministic-ish spread: evenly spaced angles with a little jitter so the
// burst reads as chunky 8-bit shrapnel rather than a perfect ring.
function buildParticles(palette: string[]): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
    const distance = 55 + Math.random() * 45;
    const size = [6, 8, 10][i % 3];
    particles.push({
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      distance,
      size,
      color: palette[i % palette.length],
      rotate: (Math.random() - 0.5) * 90,
    });
  }
  return particles;
}

function ParticleSquare({
  particle,
  progress,
}: {
  particle: Particle;
  progress: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    // easeOutCubic on travel so squares fling out fast then settle
    const eased = 1 - Math.pow(1 - p, 3);
    const tx = Math.round(particle.dx * particle.distance * eased);
    const ty = Math.round(particle.dy * particle.distance * eased);
    const opacity = p === 0 ? 0 : p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    const scale = interpolate(p, [0, 0.15, 1], [0.2, 1.2, 0.6]);
    return {
      opacity,
      transform: [
        { translateX: tx },
        { translateY: ty },
        { scale },
        { rotate: `${particle.rotate}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        { width: particle.size, height: particle.size, backgroundColor: particle.color },
        animatedStyle,
      ]}
    />
  );
}

function FlashCore({ progress, color }: { progress: SharedValue<number>; color: string }) {
  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const opacity = p === 0 || p > 0.3 ? 0 : 0.85 * (1 - p / 0.3);
    const scale = interpolate(p, [0, 0.3], [0.4, 2.4]);
    return { opacity, transform: [{ scale }] };
  });

  return <Animated.View style={[styles.flash, { backgroundColor: color }, animatedStyle]} />;
}

export interface PixelBurstProps {
  /** Increment this to fire a new burst. */
  trigger: number;
  palette: string[];
}

export function PixelBurst({ trigger, palette }: PixelBurstProps) {
  const progress = useSharedValue(0);
  const particles = useMemo(() => buildParticles(palette), [palette]);

  useEffect(() => {
    if (trigger === 0) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.quad) });
    // progress is a stable shared value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    <View pointerEvents="none" style={styles.container}>
      <FlashCore progress={progress} color={palette[palette.length - 1]} />
      {particles.map((particle, index) => (
        <ParticleSquare key={index} particle={particle} progress={progress} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    borderRadius: 0, // flat-edge pixels — UX-DR10
  },
  flash: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 0,
  },
});
