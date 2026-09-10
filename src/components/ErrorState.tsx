import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {PrimaryButton} from './PrimaryButton';

export function ErrorState({message, onRetry}: {message: string; onRetry?: () => void}) {
  const {colors, typography} = useTheme();
  return (
    <View style={styles.root}>
      <Text style={[typography.caption, styles.message, {color: colors.danger}]}>{message}</Text>
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
  message: {textAlign: 'center'},
  action: {marginTop: spacing.md},
});
