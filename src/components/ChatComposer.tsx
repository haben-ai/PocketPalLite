import React from 'react';
import {Image, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {colors, radius, spacing, typography} from '../theme';

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

  return (
    <View>
      {editingLabel ? (
        <View style={styles.editingRow}>
          <Text style={styles.editingLabel} numberOfLines={1}>
            {editingLabel}
          </Text>
          <TouchableOpacity onPress={onCancelEdit}>
            <Text style={styles.editingCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {pendingImagePath && (
        <View style={styles.pendingImageRow}>
          <Image
            source={{uri: `file://${pendingImagePath}`}}
            style={styles.pendingImageThumb}
          />
          <TouchableOpacity onPress={onRemoveImage} style={styles.removeImageButton}>
            <Text style={styles.removeImageLabel}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputRow}>
        {isVisionModel && (
          <TouchableOpacity
            onPress={onAttach}
            disabled={!ready}
            style={[styles.attachButton, !ready && {opacity: 0.4}]}>
            <Text style={styles.attachLabel}>📷</Text>
          </TouchableOpacity>
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={ready ? 'Message...' : 'Waiting for model...'}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          editable={ready}
          multiline
        />
        {isGenerating ? (
          <TouchableOpacity onPress={onStop} style={styles.stopButton}>
            <View style={styles.stopIcon} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onSend}
            disabled={!canSend}
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}>
            <Text style={styles.sendLabel}>↑</Text>
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
  editingLabel: {...typography.caption, color: colors.accent, flexShrink: 1},
  editingCancel: {...typography.caption, color: colors.textSecondary},
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
    backgroundColor: colors.surfaceContainerHigh,
  },
  removeImageButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageLabel: {color: colors.textSecondary, fontSize: 12, fontWeight: '700'},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHigh,
  },
  attachLabel: {fontSize: 18},
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Circular icon buttons, monochrome (white bg / near-black glyph),
  // matching ChatGPT's send button -- no color accent, no glow.
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  sendButtonDisabled: {backgroundColor: colors.surfaceContainerHigh},
  sendLabel: {color: colors.onAccent, fontWeight: '700', fontSize: 18, lineHeight: 20},
  stopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  stopIcon: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: colors.onAccent,
  },
});
