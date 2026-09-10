import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {Persona} from '../types';
import {Chip} from './Badge';
import {AssistantAvatarIcon} from './Icons';

export function AIPalCard({
  persona,
  onPress,
  onDelete,
}: {
  persona: Persona;
  onPress: () => void;
  onDelete?: () => void;
}) {
  const {colors, typography} = useTheme();
  return (
    <TouchableOpacity
      style={[styles.card, {backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant}]}
      onPress={onPress}
      activeOpacity={0.85}>
      <View style={[styles.avatar, {backgroundColor: colors.surfaceContainerHigh}]}>
        <AssistantAvatarIcon id={persona.avatarIcon} color={colors.accent} />
      </View>
      <View style={styles.text}>
        <Text style={typography.heading} numberOfLines={1}>
          {persona.name}
        </Text>
        <Text style={[typography.caption, styles.tagline]} numberOfLines={2}>
          {persona.tagline}
        </Text>
        {persona.isBuiltIn && <Chip label="Built-in" />}
      </View>
      {!persona.isBuiltIn && onDelete && (
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={8}
          style={[styles.deleteButton, {backgroundColor: colors.surfaceContainerHigh}]}>
          <Text style={[styles.deleteLabel, {color: colors.textSecondary}]}>✕</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {flex: 1, gap: 4},
  tagline: {},
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLabel: {fontSize: 12, fontWeight: '700'},
});
