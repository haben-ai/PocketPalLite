import React from 'react';
import {Modal, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {colors, radius, spacing, typography} from '../theme';
import {GearIcon, GridIcon, UploadIcon} from './Icons';

/**
 * The three-dot overflow menu opened from the Chat header: Generation
 * settings, Model (opens the existing model switcher), Export/Import.
 * Positioned as a floating card near the top-right, matching the reference
 * layout, rather than a bottom sheet -- this is a short action list, not a
 * scrollable picker.
 */
export function HeaderMenu({
  visible,
  onClose,
  onOpenGenerationSettings,
  onOpenModel,
  onOpenExportImport,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenGenerationSettings: () => void;
  onOpenModel: () => void;
  onOpenExportImport: () => void;
}) {
  const item = (
    glyph: React.ReactNode,
    label: string,
    onPress: () => void,
    showChevron?: boolean,
  ) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => {
        onClose();
        onPress();
      }}>
      {glyph}
      <Text style={styles.itemLabel}>{label}</Text>
      {showChevron && <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.cardAnchor}>
          <View style={styles.card}>
            {item(<GearIcon />, 'Generation settings', onOpenGenerationSettings)}
            {item(<GridIcon />, 'Model', onOpenModel, true)}
            {item(<UploadIcon />, 'Export/Import', onOpenExportImport, true)}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, backgroundColor: '#00000066'},
  cardAnchor: {
    position: 'absolute',
    top: 56,
    right: spacing.md,
  },
  card: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingVertical: spacing.xs,
    minWidth: 220,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  itemLabel: {...typography.body, flex: 1},
  chevron: {color: colors.textMuted, fontSize: 18},
});
