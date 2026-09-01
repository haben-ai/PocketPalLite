import React from 'react';
import {StyleSheet, View} from 'react-native';
import {colors} from '../theme';

/**
 * Approximates a soft radial glow behind a hero element using concentric,
 * fading semi-transparent circles -- React Native's built-in gradient
 * support (experimental_backgroundImage) is linear-only, so a true radial
 * gradient isn't available without adding a graphics library. This is the
 * same low-dependency spirit as the rest of the app's design system.
 */
export function Glow({size = 220}: {size?: number}) {
  return (
    <View
      style={[styles.container, {width: size, height: size}]}
      pointerEvents="none">
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.glowOuter,
          },
        ]}
      />
      <View
        style={[
          styles.ring,
          {
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: (size * 0.7) / 2,
            backgroundColor: colors.glowMid,
          },
        ]}
      />
      <View
        style={[
          styles.ring,
          {
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: (size * 0.4) / 2,
            backgroundColor: colors.glowCore,
            opacity: 0.35,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {alignItems: 'center', justifyContent: 'center'},
  ring: {position: 'absolute'},
});
