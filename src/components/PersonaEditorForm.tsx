import React, {useState} from 'react';
import {ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {colors, radius, spacing, typography} from '../theme';
import {DownloadedModel, Persona} from '../types';
import {PrimaryButton} from './PrimaryButton';
import {ModelPickerList} from './ModelPickerList';

const AVATAR_CHOICES = [
  '🌸', '🤖', '🦉', '🐬', '🌟', '🔥', '🌿', '🎯', '🧠', '⚡', '🎨', '🧭',
];

type Draft = {
  name: string;
  tagline: string;
  avatarEmoji: string;
  systemPrompt: string;
  defaultModelId?: string;
};

export function PersonaEditorForm({
  initial,
  downloadedModels,
  onSave,
  onCancel,
}: {
  initial?: Partial<Persona>;
  downloadedModels: DownloadedModel[];
  onSave: (draft: Draft) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [tagline, setTagline] = useState(initial?.tagline ?? '');
  const [avatarEmoji, setAvatarEmoji] = useState(initial?.avatarEmoji ?? AVATAR_CHOICES[0]);
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt ?? '');
  const [defaultModelId, setDefaultModelId] = useState(initial?.defaultModelId);

  const canSave = name.trim().length > 0 && systemPrompt.trim().length > 0;

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Riya"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />

      <Text style={styles.label}>Tagline</Text>
      <TextInput
        value={tagline}
        onChangeText={setTagline}
        placeholder="A short description of this AIPal"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />

      <Text style={styles.label}>Avatar</Text>
      <View style={styles.avatarRow}>
        {AVATAR_CHOICES.map(emoji => (
          <TouchableOpacity
            key={emoji}
            onPress={() => setAvatarEmoji(emoji)}
            style={[styles.avatarSwatch, avatarEmoji === emoji && styles.avatarSwatchActive]}>
            <Text style={styles.avatarSwatchLabel}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>System prompt</Text>
      <TextInput
        value={systemPrompt}
        onChangeText={setSystemPrompt}
        placeholder="You are ... Always identify yourself as ..."
        placeholderTextColor={colors.textMuted}
        style={[styles.input, styles.multiline]}
        multiline
      />

      {downloadedModels.length > 0 && (
        <>
          <Text style={styles.label}>Default model (optional)</Text>
          <View style={styles.modelPicker}>
            <ModelPickerList
              models={downloadedModels}
              activeModelId={defaultModelId}
              onSelect={id => setDefaultModelId(id === defaultModelId ? undefined : id)}
            />
          </View>
        </>
      )}

      <View style={styles.actions}>
        <PrimaryButton label="Cancel" variant="secondary" onPress={onCancel} style={styles.flexButton} />
        <PrimaryButton
          label="Save"
          disabled={!canSave}
          onPress={() =>
            onSave({
              name: name.trim(),
              tagline: tagline.trim(),
              avatarEmoji,
              systemPrompt: systemPrompt.trim(),
              defaultModelId,
            })
          }
          style={styles.flexButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: {...typography.caption, marginBottom: spacing.xs, marginTop: spacing.md},
  input: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  multiline: {minHeight: 100, textAlignVertical: 'top'},
  avatarRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  avatarSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  avatarSwatchActive: {borderColor: colors.accent, backgroundColor: colors.accentMuted},
  avatarSwatchLabel: {fontSize: 20},
  modelPicker: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  actions: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.xl},
  flexButton: {flex: 1},
});
