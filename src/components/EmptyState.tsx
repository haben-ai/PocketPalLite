import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {PrimaryButton} from './PrimaryButton';
import {AppIconMark} from './AppIconMark';

export function EmptyState({
  icon,
  useAppIcon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  /** An emoji glyph. Ignored when useAppIcon is set. */
  icon?: string;
  /** Shows the app's own brand mark instead of an emoji -- for states
   * that are about the app itself (e.g. "nothing to chat with yet")
   * rather than about a specific piece of content. */
  useAppIcon?: boolean;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const {typography, colors} = useTheme();
  return (
    <View style={styles.root}>
      {useAppIcon ? (
        <View style={styles.appIcon}>
          <AppIconMark size={64} />
        </View>
      ) : icon ? (
        <Text style={styles.icon}>{icon}</Text>
      ) : null}
      <Text style={[typography.heading, styles.title]}>{title}</Text>
      {body ? (
        <Text style={[typography.caption, styles.body, {color: colors.textSecondary}]}>{body}</Text>
      ) : null}
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
  appIcon: {marginBottom: spacing.sm},
  title: {textAlign: 'center'},
  body: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  action: {marginTop: spacing.md},
});
