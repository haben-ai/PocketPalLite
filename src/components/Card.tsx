import React, {PropsWithChildren} from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {elevation, radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';

export function Card({
  children,
  style,
  highlighted,
}: PropsWithChildren<{style?: StyleProp<ViewStyle>; highlighted?: boolean}>) {
  const {colors} = useTheme();
  return (
    <View
      style={[
        styles.card,
        {backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant},
        highlighted && [styles.highlighted, {borderColor: colors.accent}],
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    ...elevation.level1,
  },
  highlighted: {
    borderWidth: 1.5,
    ...elevation.level2,
  },
});
