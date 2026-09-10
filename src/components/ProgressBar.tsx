import React from 'react';
import {StyleSheet, View} from 'react-native';
import {radius} from '../theme';
import {useTheme} from '../theme/ThemeContext';

export function ProgressBar({fraction}: {fraction: number}) {
  const {colors} = useTheme();
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <View style={[styles.track, {backgroundColor: colors.border}]}>
      <View style={[styles.fill, {width: `${pct}%`, backgroundColor: colors.accent}]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
