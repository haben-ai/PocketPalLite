import React from 'react';
import {Modal, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {SUPPORTED_LANGUAGES} from '../i18n';

/** A small dropdown-style picker for the app's UI language, opened from
 * the "English (EN)" chip in Settings > App Settings > Language. */
export function LanguagePicker({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const {colors, typography} = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={[styles.backdrop, {backgroundColor: colors.scrim}]} activeOpacity={1} onPress={onClose}>
        <View style={[styles.sheet, {backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant}]}>
          {SUPPORTED_LANGUAGES.map(lang => (
            <TouchableOpacity
              key={lang.code}
              style={styles.row}
              onPress={() => {
                onSelect(lang.code);
                onClose();
              }}>
              <Text style={[typography.body, lang.code === value && {fontWeight: '700'}]}>{lang.label}</Text>
              {lang.code === value && <Text style={{color: colors.accent}}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg},
  sheet: {
    width: '100%',
    maxWidth: 320,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
});
