import React, {useEffect, useState} from 'react';
import {Modal, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {PrimaryButton} from './PrimaryButton';

/**
 * A small modal for pasting a secret (API key/token) -- shared by the
 * Hugging Face Token and Internet Search API key settings. Masks input via
 * secureTextEntry; the actual value is only ever handed to secureStorage by
 * the caller, never persisted here.
 */
export function SecretInputModal({
  visible,
  title,
  placeholder,
  initialValue,
  onSave,
  onClose,
}: {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const {colors, typography} = useTheme();
  const [value, setValue] = useState(initialValue ?? '');

  useEffect(() => {
    if (visible) {
      setValue(initialValue ?? '');
    }
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, {backgroundColor: colors.scrim}]}>
        <View style={[styles.sheet, {backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant}]}>
          <Text style={typography.heading}>{title}</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.textPrimary,
                borderColor: colors.border,
              },
            ]}
          />
          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={[typography.body, {color: colors.textSecondary}]}>Cancel</Text>
            </TouchableOpacity>
            <PrimaryButton
              label="Save"
              onPress={() => {
                onSave(value.trim());
                onClose();
              }}
              disabled={value.trim().length === 0}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg},
  sheet: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  input: {
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  actions: {flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.xs},
  cancelButton: {paddingVertical: 12, paddingHorizontal: spacing.sm},
});
