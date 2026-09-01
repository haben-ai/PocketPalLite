import React, {useCallback, useEffect, useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {colors, radius, spacing, typography} from '../theme';
import {AppSettings, getAppSettings, setAppSettings} from '../storage/appSettings';
import {DownloadedModel} from '../types';
import {
  getDownloadedModels,
  removeDownloadedModel,
} from '../storage/modelRegistry';
import {deleteDownloadedModel} from '../services/downloadManager';
import {getModelById} from '../data/models';
import {AppScreen} from '../navigation/types';
import {AIPalScaffold} from '../components/AIPalScaffold';
import {SettingRow} from '../components/SettingRow';
import {PrimaryButton} from '../components/PrimaryButton';
import {Chip} from '../components/Badge';
import {TranslationTestScreen} from './TranslationTestScreen';
import packageJson from '../../package.json';

type SubView = 'main' | 'advanced' | 'translation-test';

const CONTEXT_SIZE_OPTIONS = [512, 1024, 2048, 4096];

function Stepper({
  value,
  step,
  min,
  max,
  onChange,
}: {
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        onPress={() => onChange(Math.max(min, value - step))}
        style={styles.stepperButton}>
        <Text style={styles.stepperLabel}>-</Text>
      </TouchableOpacity>
      <Text style={styles.stepperValue}>{value}</Text>
      <TouchableOpacity
        onPress={() => onChange(Math.min(max, value + step))}
        style={styles.stepperButton}>
        <Text style={styles.stepperLabel}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export function SettingsTabScreen({onNavigate}: {onNavigate: (screen: AppScreen) => void}) {
  const [subView, setSubView] = useState<SubView>('main');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [downloaded, setDownloaded] = useState<DownloadedModel[]>([]);

  const refresh = useCallback(async () => {
    setSettings(await getAppSettings());
    setDownloaded(await getDownloadedModels());
  }, []);

  // This screen fully mounts/unmounts on every sidebar navigation (no
  // persistent tab bar), so a mount-only effect always shows fresh data.
  useEffect(() => {
    refresh();
  }, [refresh]);

  const patch = async (p: Partial<AppSettings>) => {
    await setAppSettings(p);
    setSettings(await getAppSettings());
  };

  const handleDeleteModel = (model: DownloadedModel) => {
    Alert.alert(
      'Delete model',
      `Remove "${model.displayName}" from your device? You can download it again anytime.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteDownloadedModel(model.filePath);
            if (model.mmprojPath) {
              await deleteDownloadedModel(model.mmprojPath);
            }
            await removeDownloadedModel(model.modelId);
            await refresh();
          },
        },
      ],
    );
  };

  if (subView === 'translation-test') {
    return <TranslationTestScreen onBack={() => setSubView('advanced')} />;
  }

  if (subView === 'advanced' && settings) {
    return (
      <AIPalScaffold scroll onBack={() => setSubView('main')}>
        <Text style={typography.title}>Advanced</Text>
        <Text style={styles.subtitle}>
          Generation parameters. Most people never need to change these.
        </Text>

        <SettingRow
          label="Temperature"
          description="Higher is more creative, lower is more focused."
          control={
            <Stepper
              value={Math.round(settings.temperature * 10) / 10}
              step={0.1}
              min={0}
              max={1.5}
              onChange={v => patch({temperature: Math.round(v * 10) / 10})}
            />
          }
        />

        <SettingRow
          label="Max tokens"
          description="Longest a single reply can be."
          control={
            <Stepper
              value={settings.maxTokens}
              step={64}
              min={64}
              max={2048}
              onChange={v => patch({maxTokens: v})}
            />
          }
        />

        <SettingRow
          label="Context length"
          description="Applies the next time a model loads."
          control={
            <View style={styles.contextRow}>
              {CONTEXT_SIZE_OPTIONS.map(size => (
                <TouchableOpacity key={size} onPress={() => patch({contextSize: size})}>
                  <View
                    style={[
                      styles.contextPill,
                      settings.contextSize === size && styles.contextPillActive,
                    ]}>
                    <Text
                      style={[
                        styles.contextPillLabel,
                        settings.contextSize === size && styles.contextPillLabelActive,
                      ]}>
                      {size}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          }
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer</Text>
          <SettingRow
            label="Translation Test"
            description="Phase 2 spike: proves the ONNX Runtime + NLLB pipeline works, in isolation from chat."
            control={
              <PrimaryButton
                label="Open"
                variant="secondary"
                onPress={() => setSubView('translation-test')}
              />
            }
          />
        </View>
      </AIPalScaffold>
    );
  }

  return (
    <AIPalScaffold scroll onBack={() => onNavigate({name: 'chat'})}>
      <Text style={typography.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage</Text>
        {downloaded.length === 0 ? (
          <Text style={styles.emptyHint}>No models downloaded yet.</Text>
        ) : (
          downloaded.map(model => (
            <SettingRow
              key={model.modelId}
              label={model.displayName}
              description={getModelById(model.modelId)?.name}
              control={
                <PrimaryButton
                  label="Delete"
                  variant="danger"
                  onPress={() => handleDeleteModel(model)}
                />
              }
            />
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Models</Text>
        <SettingRow
          label="Manage models"
          description="Download, delete, browse the catalog"
          control={
            <PrimaryButton
              label="Open"
              variant="secondary"
              onPress={() => onNavigate({name: 'models'})}
            />
          }
        />
        <SettingRow
          label="Generation parameters"
          description="Temperature, max tokens, context length"
          control={
            <PrimaryButton
              label="Advanced"
              variant="secondary"
              onPress={() => setSubView('advanced')}
            />
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Language</Text>
        <SettingRow
          label="Offline translation"
          description="Coming soon"
          control={<Chip label="Off" />}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        <SettingRow
          label="Everything runs on-device"
          description="Chats and models never leave your phone. There is no server this app talks to for chat."
          control={<View />}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <SettingRow label="Version" control={<Text style={typography.caption}>{packageJson.version}</Text>} />
      </View>
    </AIPalScaffold>
  );
}

const styles = StyleSheet.create({
  subtitle: {...typography.caption, marginTop: spacing.xs, marginBottom: spacing.md},
  section: {marginBottom: spacing.lg},
  sectionTitle: {
    ...typography.heading,
    marginBottom: spacing.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  emptyHint: {...typography.caption},
  stepper: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHigh,
  },
  stepperLabel: {color: colors.textPrimary, fontSize: 18, fontWeight: '700'},
  stepperValue: {...typography.body, minWidth: 40, textAlign: 'center'},
  contextRow: {flexDirection: 'row', gap: spacing.xs},
  contextPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainerHigh,
  },
  contextPillActive: {backgroundColor: colors.accent},
  contextPillLabel: {fontSize: 12, fontWeight: '600', color: colors.textSecondary},
  contextPillLabelActive: {color: colors.onAccent},
});
