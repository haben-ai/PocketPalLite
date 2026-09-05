import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {Bot} from 'lucide-react-native';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';

type StatusKind = 'loading' | 'notFound' | 'error';

function classifyStatus(status: string): StatusKind {
  if (status.startsWith('Model file not found')) {
    return 'notFound';
  }
  if (status.startsWith('Error loading model')) {
    return 'error';
  }
  return 'loading';
}

/**
 * Centered "no model active yet" state shown in place of the message list
 * while a chosen model is loading (or failed to). Disappears entirely once
 * `ready` becomes true -- ChatScreen renders the normal message list
 * (blank or with history) instead, it never renders both.
 */
export function ChatLoadingState({status}: {status: string}) {
  const {colors, typography} = useTheme();
  const kind = classifyStatus(status);

  const title =
    kind === 'notFound'
      ? 'Model Not Found'
      : kind === 'error'
      ? "Couldn't Load Model"
      : 'Activate Model To Get Started';
  const body =
    kind === 'loading'
      ? 'Select a model in Models and download it. Once it finishes loading here, start chatting below.'
      : status;

  return (
    <View style={styles.root}>
      <View style={[styles.iconTile, {backgroundColor: colors.surfaceContainerHigh}]}>
        <Bot size={40} color={colors.textMuted} strokeWidth={1.6} />
      </View>
      <Text style={[typography.heading, styles.title]}>{title}</Text>
      <Text style={[typography.caption, styles.body]}>{body}</Text>
      {kind === 'loading' && (
        <View style={[styles.pill, {backgroundColor: colors.surfaceContainerHigh}]}>
          <ActivityIndicator size="small" color={colors.textPrimary} />
          <Text style={[typography.body, styles.pillLabel]}>{status || 'Loading...'}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconTile: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {textAlign: 'center', marginBottom: spacing.xs},
  body: {textAlign: 'center', lineHeight: 19},
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.pill,
    marginTop: spacing.lg,
  },
  pillLabel: {fontWeight: '600'},
});
