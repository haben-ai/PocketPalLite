import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, Text, View} from 'react-native';
import {spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {GearIcon} from './Icons';

/**
 * "Analyzing your device" state: a large gear icon making one full
 * rotation every 2 seconds, in place of a generic spinner -- reads as
 * "your phone's specs are being turned over/inspected" and is sized to
 * fill the recommended-model card it replaces while checking, rather than
 * a small spinner lost in that space.
 */
export function RotatingGearLoader({label, size = 64}: {label?: string; size?: number}) {
  const {colors, typography} = useTheme();
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);

  const spin = rotation.interpolate({inputRange: [0, 1], outputRange: ['0deg', '360deg']});

  return (
    <View style={styles.root}>
      <Animated.View style={{transform: [{rotate: spin}]}}>
        <GearIcon size={size} color={colors.accent} />
      </Animated.View>
      {label ? <Text style={[typography.caption, styles.label]}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  label: {marginTop: spacing.sm},
});
