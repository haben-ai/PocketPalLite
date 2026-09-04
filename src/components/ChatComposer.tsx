import React from 'react';
import {Image, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';

/**
 * Extracted from ChatScreen.tsx's former inline composer JSX -- pure
 * presentational, all state (input text, pending image, streaming status)
 * stays owned by ChatScreen and is passed down as props.
 */
export function ChatComposer({
  value,
  onChangeText,
  onSend,
  onStop,
  onAttach,
  pendingImagePath,
  onRemoveImage,
  ready,
  isGenerating,
  isVisionModel,
  editingLabel,
  onCancelEdit,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
  onAttach?: () => void;
  pendingImagePath?: string | null;
  onRemoveImage?: () => void;
  ready: boolean;
  isGenerating: boolean;
  isVisionModel: boolean;
  editingLabel?: string | null;
  onCancelEdit?: () => void;
}) {
  const canSend = ready && !isGenerating && (!!value.trim() || !!pendingImagePath);
  const {colors, typography} = useTheme();
  const {t} = useTranslation();

  return (
    <View>
      {editingLabel ? (
        <View style={styles.editingRow}>
          <Text style={[typography.caption, {color: colors.accent}, styles.editingLabel]} numberOfLines={1}>
            {editingLabel}
          </Text>
          <TouchableOpacity onPress={onCancelEdit}>
            <Text style={[typography.caption, {color: colors.textSecondary}]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {pendingImagePath && (
        <View style={styles.pendingImageRow}>
          <Image
            source={{uri: `file://${pendingImagePath}`}}
            style={[styles.pendingImageThumb, {backgroundColor: colors.surfaceContainerHigh}]}
          />
          <TouchableOpacity
            onPress={onRemoveImage}
            style={[styles.removeImageButton, {backgroundColor: colors.surfaceContainerHigh}]}>
            <Text style={{color: colors.textSecondary, fontSize: 12, fontWeight: '700'}}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.inputRow, {borderTopColor: colors.border}]}>
        {isVisionModel && (
          <TouchableOpacity
            onPress={onAttach}
            disabled={!ready}
            style={[
              styles.attachButton,
              {backgroundColor: colors.surfaceContainerHigh},
              !ready && {opacity: 0.4},
            ]}>
            <Text style={styles.attachLabel}>📷</Text>
          </TouchableOpacity>
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={ready ? t('chat.messagePlaceholder') : 'Waiting for model...'}
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            {backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border},
          ]}
          editable={ready}
          multiline
        />
        {isGenerating ? (
          <TouchableOpacity
            onPress={onStop}
            style={[styles.stopButton, {backgroundColor: colors.accent}]}>
            <View style={[styles.stopIcon, {backgroundColor: colors.onAccent}]} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onSend}
            disabled={!canSend}
            style={[
              styles.sendButton,
              {backgroundColor: canSend ? colors.accent : colors.surfaceContainerHigh},
            ]}>
            <Text style={[styles.sendLabel, {color: colors.onAccent}]}>↑</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  editingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  editingLabel: {flexShrink: 1},
  pendingImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  pendingImageThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
  },
  removeImageButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachLabel: {fontSize: 18},
  input: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    borderWidth: 1,
  },
  // Circular icon buttons, monochrome (white bg / near-black glyph),
  // matching ChatGPT's send button -- no color accent, no glow.
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendLabel: {fontWeight: '700', fontSize: 18, lineHeight: 20},
  stopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIcon: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
});
