import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {colors, spacing, typography} from '../theme';

export function LoadingState({label}: {label?: string}) {
  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.accent} size="small" />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  label: {...typography.caption, marginTop: spacing.sm},
});
