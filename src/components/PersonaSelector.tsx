import React from 'react';
import {Modal, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {Persona} from '../types';
import {AssistantAvatarIcon} from './Icons';

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
  const {colors, typography} = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}>
        <View
          style={[
            styles.sheet,
            {backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant},
          ]}>
          <Text style={typography.heading}>Switch AIPal</Text>
          <Text style={[typography.caption, styles.hint]}>This chat continues with the new AIPal.</Text>
          {personas.map(persona => {
            const isActive = persona.id === activePersonaId;
            return (
              <TouchableOpacity
                key={persona.id}
                style={[
                  styles.row,
                  {borderTopColor: colors.outlineVariant},
                  isActive && {backgroundColor: colors.accentMuted},
                ]}
                onPress={() => onSelect(persona.id)}>
                <View style={styles.avatar}>
                  <AssistantAvatarIcon id={persona.avatarIcon} size={20} color={colors.accent} />
                </View>
                <View style={styles.rowText}>
                  <Text style={typography.body} numberOfLines={1}>
                    {persona.name}
                  </Text>
                  <Text style={[typography.small, styles.tagline]} numberOfLines={1}>
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
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
  },
  hint: {marginTop: 2, marginBottom: spacing.sm},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  avatar: {width: 22, alignItems: 'center'},
  rowText: {flex: 1},
  tagline: {marginTop: 1},
});
