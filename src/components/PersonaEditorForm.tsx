import React, {useState} from 'react';
import {ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {DownloadedModel, Persona} from '../types';
import {PrimaryButton} from './PrimaryButton';
import {ModelPickerList} from './ModelPickerList';
import {AssistantAvatarIcon, ASSISTANT_ICON_IDS} from './Icons';

type Draft = {
  name: string;
  tagline: string;
  avatarIcon: string;
  systemPrompt: string;
  defaultModelId?: string;
  internetSearchEnabled: boolean;
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
  const {colors, typography} = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [tagline, setTagline] = useState(initial?.tagline ?? '');
  const [avatarIcon, setAvatarIcon] = useState(initial?.avatarIcon ?? ASSISTANT_ICON_IDS[0]);
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt ?? '');
  const [defaultModelId, setDefaultModelId] = useState(initial?.defaultModelId);
  const [internetSearchEnabled, setInternetSearchEnabled] = useState(
    initial?.internetSearchEnabled ?? false,
  );

  const canSave = name.trim().length > 0 && systemPrompt.trim().length > 0;

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <Text style={[typography.caption, styles.label]}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Coach"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border},
        ]}
      />

      <Text style={[typography.caption, styles.label]}>Tagline</Text>
      <TextInput
        value={tagline}
        onChangeText={setTagline}
        placeholder="A short description of this AIPal"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border},
        ]}
      />

      <Text style={[typography.caption, styles.label]}>Avatar</Text>
      <View style={styles.avatarRow}>
        {ASSISTANT_ICON_IDS.map(iconId => (
          <TouchableOpacity
            key={iconId}
            onPress={() => setAvatarIcon(iconId)}
            style={[
              styles.avatarSwatch,
              {backgroundColor: colors.surfaceContainerHigh, borderColor: 'transparent'},
              avatarIcon === iconId && {borderColor: colors.accent, backgroundColor: colors.accentMuted},
            ]}>
            <AssistantAvatarIcon id={iconId} size={40} />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[typography.caption, styles.label]}>System prompt</Text>
      <TextInput
        value={systemPrompt}
        onChangeText={setSystemPrompt}
        placeholder="You are ... Always identify yourself as ..."
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          styles.multiline,
          {backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border},
        ]}
        multiline
      />

      <View style={styles.searchToggleRow}>
        <View style={styles.searchToggleText}>
          <Text style={typography.body}>Internet Search</Text>
          <Text style={[typography.caption, styles.searchToggleDescription]}>
            Let this Pal search the web (also needs Internet Search set up in Settings).
          </Text>
        </View>
        <Switch
          value={internetSearchEnabled}
          onValueChange={setInternetSearchEnabled}
          trackColor={{false: colors.surfaceContainerHigh, true: colors.accent}}
          thumbColor={colors.textPrimary}
        />
      </View>

      {downloadedModels.length > 0 && (
        <>
          <Text style={[typography.caption, styles.label]}>Default model (optional)</Text>
          <View style={[styles.modelPicker, {backgroundColor: colors.surfaceContainer}]}>
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
              avatarIcon,
              systemPrompt: systemPrompt.trim(),
              defaultModelId,
              internetSearchEnabled,
            })
          }
          style={styles.flexButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: {marginBottom: spacing.xs, marginTop: spacing.md},
  input: {
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  multiline: {minHeight: 100, textAlignVertical: 'top'},
  avatarRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  avatarSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modelPicker: {
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  actions: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.xl},
  flexButton: {flex: 1},
  searchToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  searchToggleText: {flex: 1},
  searchToggleDescription: {marginTop: 2},
});
