import React from 'react';
import {StyleSheet, View} from 'react-native';
import {colors, radius} from '../theme';

export function ProgressBar({fraction}: {fraction: number}) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <View style={styles.track}>
      <View style={[styles.fill, {width: `${pct}%`}]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
  },
});
