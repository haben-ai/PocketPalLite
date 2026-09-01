import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {spacing, typography} from '../theme';
import {PrimaryButton} from './PrimaryButton';

export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: string;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.root}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  icon: {fontSize: 40, marginBottom: spacing.sm},
  title: {...typography.heading, textAlign: 'center'},
  body: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  action: {marginTop: spacing.md},
});
