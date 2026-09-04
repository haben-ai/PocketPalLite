import React, {useEffect, useState} from 'react';
import {Modal, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {PrimaryButton} from './PrimaryButton';

function suggestNameFromUrl(url: string): string {
  const last = url.split('?')[0].split('/').filter(Boolean).pop() ?? '';
  return last.replace(/\.gguf$/i, '') || 'Remote Model';
}

/** "Add Remote Model": paste any direct-download GGUF URL, give it a name,
 * and it downloads through the exact same pipeline as a catalog model. */
export function AddRemoteModelModal({
  visible,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  onSubmit: (url: string, displayName: string) => void;
  onClose: () => void;
}) {
  const {colors, typography} = useTheme();
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);

  useEffect(() => {
    if (visible) {
      setUrl('');
      setName('');
      setNameTouched(false);
    }
  }, [visible]);

  const trimmedUrl = url.trim();
  const isValidUrl = /^https?:\/\/.+/i.test(trimmedUrl);
  const effectiveName = nameTouched ? name.trim() : name.trim() || suggestNameFromUrl(trimmedUrl);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, {backgroundColor: colors.scrim}]}>
        <View
          style={[styles.sheet, {backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant}]}>
          <Text style={typography.heading}>Add Remote Model</Text>
          <Text style={[typography.caption, styles.hint]}>
            Paste a direct download link to a .gguf file (e.g. a Hugging Face "resolve" URL).
          </Text>

          <Text style={[typography.small, styles.label, {color: colors.textMuted}]}>URL</Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="https://huggingface.co/.../resolve/main/model.gguf"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={[
              styles.input,
              {backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border},
            ]}
          />

          <Text style={[typography.small, styles.label, {color: colors.textMuted}]}>Name</Text>
          <TextInput
            value={effectiveName}
            onChangeText={text => {
              setNameTouched(true);
              setName(text);
            }}
            placeholder="Model name"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              {backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border},
            ]}
          />

          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={[typography.body, {color: colors.textSecondary}]}>Cancel</Text>
            </TouchableOpacity>
            <PrimaryButton
              label="Download"
              onPress={() => {
                onSubmit(trimmedUrl, effectiveName || 'Remote Model');
                onClose();
              }}
              disabled={!isValidUrl}
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
    maxWidth: 400,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  hint: {marginTop: spacing.xs, marginBottom: spacing.sm, lineHeight: 18},
  label: {marginBottom: 4, marginTop: spacing.xs},
  input: {
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  actions: {flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md},
  cancelButton: {paddingVertical: 12, paddingHorizontal: spacing.sm},
});
