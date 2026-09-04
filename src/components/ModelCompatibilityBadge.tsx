import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {radius} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {ModelCompatibility} from '../services/deviceAnalyzer';

export function ModelCompatibilityBadge({
  compatibility,
}: {
  compatibility: ModelCompatibility;
}) {
  const {colors} = useTheme();
  const STYLES: Record<ModelCompatibility, {fg: string; bg: string; dot: string; label: string}> = {
    excellent: {fg: colors.tierStrong, bg: colors.tierStrongBg, dot: '🟢', label: 'Excellent'},
    usable: {fg: colors.tierMedium, bg: colors.tierMediumBg, dot: '🟡', label: 'Usable'},
    'not-recommended': {fg: colors.danger, bg: colors.tierWeakBg, dot: '🔴', label: 'Not recommended'},
  };
  const style = STYLES[compatibility];
  return (
    <View style={[styles.badge, {backgroundColor: style.bg}]}>
      <Text style={styles.dot}>{style.dot}</Text>
      <Text style={[styles.label, {color: style.fg}]}>{style.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    gap: 4,
    alignSelf: 'flex-start',
  },
  dot: {fontSize: 9},
  label: {fontSize: 12, fontWeight: '700'},
});
