import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {colors, radius, spacing, typography} from '../theme';
import {Persona} from '../types';
import {Chip} from './Badge';

export function AIPalCard({
  persona,
  onPress,
  onDelete,
}: {
  persona: Persona;
  onPress: () => void;
  onDelete?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.avatar}>
        <Text style={styles.avatarEmoji}>{persona.avatarEmoji}</Text>
      </View>
      <View style={styles.text}>
        <Text style={typography.heading} numberOfLines={1}>
          {persona.name}
        </Text>
        <Text style={styles.tagline} numberOfLines={2}>
          {persona.tagline}
        </Text>
        {persona.isBuiltIn && <Chip label="Built-in" />}
      </View>
      {!persona.isBuiltIn && onDelete && (
        <TouchableOpacity onPress={onDelete} hitSlop={8} style={styles.deleteButton}>
          <Text style={styles.deleteLabel}>✕</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {fontSize: 24},
  text: {flex: 1, gap: 4},
  tagline: {...typography.caption},
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHigh,
  },
  deleteLabel: {color: colors.textSecondary, fontSize: 12, fontWeight: '700'},
});
