import React from 'react';
import {Modal, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {colors, radius, spacing, typography} from '../theme';
import {DownloadedModel} from '../types';
import {ModelPickerList} from './ModelPickerList';

/**
 * The model-switcher bottom sheet, extracted verbatim from ChatScreen.tsx's
 * former inline Modal+ModelPickerList JSX -- same behavior, now reusable.
 */
export function ModelSelector({
  visible,
  onClose,
  models,
  activeModelId,
  onSelect,
  title,
  hint,
}: {
  visible: boolean;
  onClose: () => void;
  models: DownloadedModel[];
  activeModelId?: string;
  onSelect: (modelId: string) => void;
  title: string;
  hint?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={typography.heading}>{title}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
          <ModelPickerList
            models={models}
            activeModelId={activeModelId}
            onSelect={onSelect}
          />
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
});
