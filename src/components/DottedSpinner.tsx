import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';
import {colors} from '../theme';

const DOT_COUNT = 8;
const CYCLE_MS = 1000;

/**
 * A ring of dots that fade in sequence around the circle, giving a
 * "circular dotted" loading look (as opposed to RN's built-in spinning
 * ActivityIndicator) -- shown under the header while a model is loading.
 * Each dot runs its own looped opacity animation, staggered by its position
 * around the ring, so the lit dot appears to travel around the circle.
 */
export function DottedSpinner({size = 18, color = colors.textSecondary}: {size?: number; color?: string}) {
  const opacities = useRef(
    Array.from({length: DOT_COUNT}, () => new Animated.Value(0.2)),
  ).current;

  useEffect(() => {
    // Each dot runs its own loop, but every loop's total duration is the
    // same CYCLE_MS -- only the delay-before-peak differs per dot -- so
    // they stay in a consistent rotating phase relative to each other
    // indefinitely, rather than drifting apart over time.
    const riseMs = CYCLE_MS * 0.2;
    const loops = opacities.map((anim, i) => {
      const delayMs = (i / DOT_COUNT) * CYCLE_MS;
      const fallMs = Math.max(0, CYCLE_MS - delayMs - riseMs);
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(anim, {
            toValue: 1,
            duration: riseMs,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.2,
            duration: fallMs,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
      );
    });
    loops.forEach(loop => loop.start());
    return () => loops.forEach(loop => loop.stop());
  }, [opacities]);

  const radius = size / 2;
  const dotSize = Math.max(2, size / 7);

  return (
    <View style={{width: size, height: size}}>
      {opacities.map((opacity, i) => {
        const angle = (i / DOT_COUNT) * 2 * Math.PI - Math.PI / 2;
        const x = radius + radius * Math.cos(angle) - dotSize / 2;
        const y = radius + radius * Math.sin(angle) - dotSize / 2;
        return (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                left: x,
                top: y,
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: color,
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {position: 'absolute'},
});
