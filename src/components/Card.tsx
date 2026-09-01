import React, {PropsWithChildren} from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {colors, elevation, radius, spacing} from '../theme';

export function Card({
  children,
  style,
  highlighted,
}: PropsWithChildren<{style?: ViewStyle; highlighted?: boolean}>) {
  return (
    <View
      style={[
        styles.card,
        highlighted && styles.highlighted,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...elevation.level1,
  },
  highlighted: {
    borderColor: colors.accent,
    borderWidth: 1.5,
    ...elevation.level2,
  },
});
