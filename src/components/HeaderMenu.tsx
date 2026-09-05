import React, {useEffect, useState} from 'react';
import {Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {DownloadedModel} from '../types';
import {GearIcon, GridIcon, UploadIcon} from './Icons';
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
  const {colors, typography} = useTheme();
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
  ) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => {
        onClose();
        onPress();
      }}>
      {glyph}
      <Text style={[typography.body, styles.itemLabel]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={[styles.backdrop, {backgroundColor: colors.scrim}]}
        activeOpacity={1}
        onPress={onClose}>
        <View style={styles.cardAnchor}>
          <View
            style={[
              styles.card,
              {backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant},
            ]}>
            {item(
              <GearIcon color={colors.textPrimary} />,
              'Generation settings',
              onOpenGenerationSettings,
            )}

            <TouchableOpacity style={styles.item} onPress={() => setModelExpanded(v => !v)}>
              <GridIcon color={colors.textPrimary} />
              <Text style={[typography.body, styles.itemLabel]}>Model</Text>
              <Text style={[styles.chevron, {color: colors.textMuted}]}>
                {modelExpanded ? '⌄' : '›'}
              </Text>
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

            {item(<UploadIcon color={colors.textPrimary} />, 'Export/Import', onOpenExportImport)}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1},
  cardAnchor: {
    position: 'absolute',
    top: 56,
    right: spacing.md,
  },
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
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
  itemLabel: {flex: 1},
  chevron: {fontSize: 18},
  submenu: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    maxHeight: 220,
  },
});
