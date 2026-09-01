import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, spacing, typography} from '../theme';
import {PrimaryButton} from './PrimaryButton';

export function ErrorState({message, onRetry}: {message: string; onRetry?: () => void}) {
  return (
    <View style={styles.root}>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <PrimaryButton
          label="Retry"
          variant="secondary"
          onPress={onRetry}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  message: {...typography.caption, color: colors.danger, textAlign: 'center'},
  action: {marginTop: spacing.md},
});
