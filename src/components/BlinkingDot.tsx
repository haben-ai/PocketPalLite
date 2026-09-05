import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet} from 'react-native';

/**
 * A small status dot that pulses opacity on a steady ~2-second cycle --
 * used on model rows so "loaded right now" (green) vs. "downloaded but
 * idle" (red) reads at a glance, not just from the row's action button.
 */
export function BlinkingDot({color, size = 8}: {color: string; size?: number}) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {toValue: 0.25, duration: 1000, useNativeDriver: true}),
        Animated.timing(opacity, {toValue: 1, duration: 1000, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity},
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {marginLeft: 2},
});
