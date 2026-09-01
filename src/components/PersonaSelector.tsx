import React from 'react';
import {Modal, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {colors, radius, spacing, typography} from '../theme';
import {Persona} from '../types';

/**
 * Sibling to ModelSelector -- same bottom-sheet shell, rows are AIPal
 * personas instead of models.
 */
export function PersonaSelector({
  visible,
  onClose,
  personas,
  activePersonaId,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  personas: Persona[];
  activePersonaId?: string;
  onSelect: (personaId: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={typography.heading}>Switch AIPal</Text>
          <Text style={styles.hint}>This chat continues with the new AIPal.</Text>
          {personas.map(persona => {
            const isActive = persona.id === activePersonaId;
            return (
              <TouchableOpacity
                key={persona.id}
                style={[styles.row, isActive && styles.rowActive]}
                onPress={() => onSelect(persona.id)}>
                <Text style={styles.avatar}>{persona.avatarEmoji}</Text>
                <View style={styles.rowText}>
                  <Text style={typography.body} numberOfLines={1}>
                    {persona.name}
                  </Text>
                  <Text style={styles.tagline} numberOfLines={1}>
                    {persona.tagline}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceContainerLow,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderColor: colors.outlineVariant,
  },
  hint: {...typography.caption, marginTop: 2, marginBottom: spacing.sm},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    gap: spacing.sm,
  },
  rowActive: {backgroundColor: colors.accentMuted},
  avatar: {fontSize: 22},
  rowText: {flex: 1},
  tagline: {...typography.small, marginTop: 1},
});
