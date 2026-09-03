import React, {useEffect, useState} from 'react';
import {Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {colors, radius, spacing, typography} from '../theme';
import {DownloadedModel} from '../types';
import {GlassGearIcon, GlassGridIcon, GlassUploadIcon} from './GlassIcons';
import {ModelPickerList} from './ModelPickerList';

/**
 * The three-dot overflow menu opened from the Chat header: Generation
 * settings, Model (expands in place as a submenu -- previously navigated to
 * a separate bottom sheet, which felt like a detour for a menu item),
 * Export/Import. Positioned as a floating card near the top-right, matching
 * the reference layout, rather than a bottom sheet -- this is a short
 * action list, not a scrollable picker.
 */
export function HeaderMenu({
  visible,
  onClose,
  onOpenGenerationSettings,
  onOpenExportImport,
  models,
  activeModelId,
  onSelectModel,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenGenerationSettings: () => void;
  onOpenExportImport: () => void;
  models: DownloadedModel[];
  activeModelId?: string;
  onSelectModel: (modelId: string) => void;
}) {
  const [modelExpanded, setModelExpanded] = useState(false);

  // Collapse the submenu whenever the menu itself closes, so it doesn't
  // reopen already-expanded next time.
  useEffect(() => {
    if (!visible) {
      setModelExpanded(false);
    }
  }, [visible]);

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
            {item(<GlassGearIcon />, 'Generation settings', onOpenGenerationSettings)}

            <TouchableOpacity
              style={styles.item}
              onPress={() => setModelExpanded(v => !v)}>
              <GlassGridIcon />
              <Text style={styles.itemLabel}>Model</Text>
              <Text style={styles.chevron}>{modelExpanded ? '⌄' : '›'}</Text>
            </TouchableOpacity>
            {modelExpanded && (
              <ScrollView style={styles.submenu} nestedScrollEnabled>
                <ModelPickerList
                  models={models}
                  activeModelId={activeModelId}
                  onSelect={modelId => {
                    onSelectModel(modelId);
                    onClose();
                  }}
                />
              </ScrollView>
            )}

            {item(<GlassUploadIcon />, 'Export/Import', onOpenExportImport)}
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
    maxWidth: 280,
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
  submenu: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    maxHeight: 220,
  },
});
