import React, {useCallback, useEffect, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View} from 'react-native';
import {colors, radius, spacing, typography} from '../theme';
import {AppSettings, CacheType, getAppSettings, setAppSettings} from '../storage/appSettings';
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
import {SettingSection} from '../components/SettingSection';
import {PrimaryButton} from '../components/PrimaryButton';
import {Slider} from '../components/Slider';
import {useThemeContext} from '../theme/ThemeContext';
import {TranslationTestScreen} from './TranslationTestScreen';
import packageJson from '../../package.json';

type SubView = 'main' | 'translation-test';

const CONTEXT_SIZE_OPTIONS = [512, 1024, 2048, 4096];
const CACHE_TYPE_OPTIONS: CacheType[] = ['f16', 'f32', 'q8_0', 'q4_0', 'q4_1', 'iq4_nl', 'q5_0', 'q5_1'];

function SliderSetting({
  label,
  description,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.bareBlock}>
      <Text style={typography.body}>{label}</Text>
      {description ? <Text style={styles.cacheTypeDescription}>{description}</Text> : null}
      <View style={styles.sliderControl}>
        <View style={styles.sliderTrackWrap}>
          <Slider value={value} min={min} max={max} step={step} onValueChange={onChange} />
        </View>
        <View style={styles.valueBox}>
          <Text style={styles.valueBoxText}>{value}</Text>
        </View>
      </View>
    </View>
  );
}

function SegmentedSetting<T extends string>({
  label,
  description,
  options,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  options: {value: T; label: string}[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.bareBlock}>
      <Text style={typography.body}>{label}</Text>
      {description ? <Text style={styles.cacheTypeDescription}>{description}</Text> : null}
      <View style={styles.segmentedControl}>
        {options.map((opt, i) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.segment,
              value === opt.value && styles.segmentActive,
              i > 0 && styles.segmentBorder,
            ]}
            onPress={() => onChange(opt.value)}>
            <Text style={[styles.segmentLabel, value === opt.value && styles.segmentLabelActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function CacheTypeSetting({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: CacheType;
  onChange: (v: CacheType) => void;
  disabled: boolean;
}) {
  return (
    <View style={styles.bareBlock}>
      <Text style={typography.body}>{label}</Text>
      <Text style={styles.cacheTypeDescription}>
        {disabled ? 'Enable Flash Attention to change cache type' : 'llama.cpp KV cache quantization (experimental).'}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cacheTypeScroll}>
        <View style={styles.contextRow}>
          {CACHE_TYPE_OPTIONS.map(type => (
            <TouchableOpacity
              key={type}
              disabled={disabled}
              onPress={() => onChange(type)}>
              <View
                style={[
                  styles.contextPill,
                  value === type && styles.contextPillActive,
                  disabled && styles.contextPillDisabled,
                ]}>
                <Text
                  style={[
                    styles.contextPillLabel,
                    value === type && styles.contextPillLabelActive,
                  ]}>
                  {type === 'f16' ? 'F16 (Default)' : type}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

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
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const {themeMode, setThemeMode: setThemeModeContext} = useThemeContext();

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
    return <TranslationTestScreen onBack={() => setSubView('main')} />;
  }

  if (!settings) {
    return (
      <AIPalScaffold onBack={() => onNavigate({name: 'chat'})}>
        <Text style={typography.title}>Settings</Text>
      </AIPalScaffold>
    );
  }

  return (
    <AIPalScaffold scroll onBack={() => onNavigate({name: 'chat'})}>
      <Text style={typography.title}>Settings</Text>

      <SettingSection title="Model Initialization Settings">
        <SettingRow
          bare
          label="Device Selection"
          description="CPU only - No hardware accelerators detected"
          control={<View />}
        />
        <SettingRow
          bare
          label="Context Size"
          description="Model reload needed for changes to take effect."
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
        <SettingRow
          bare
          label="Advanced Settings"
          control={
            <TouchableOpacity onPress={() => setAdvancedExpanded(v => !v)}>
              <Text style={styles.chevron}>{advancedExpanded ? '⌄' : '›'}</Text>
            </TouchableOpacity>
          }
        />
        {advancedExpanded && (
          <>
            <SettingRow
              bare
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
              bare
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
            <SliderSetting
              label="Batch Size"
              description={`Batch size: ${settings.nBatch}. Model reload needed for changes to take effect.`}
              value={settings.nBatch}
              min={32}
              max={2048}
              step={32}
              onChange={v => patch({nBatch: v})}
            />
            <SliderSetting
              label="Physical Batch Size"
              description={`Physical batch size: ${settings.nUbatch}. Model reload needed for changes to take effect.`}
              value={settings.nUbatch}
              min={32}
              max={2048}
              step={32}
              onChange={v => patch({nUbatch: v})}
            />
            <SliderSetting
              label="CPU Threads"
              description="Threads used for inference. Model reload needed for changes to take effect."
              value={settings.nThreads}
              min={1}
              max={8}
              step={1}
              onChange={v => patch({nThreads: v})}
            />
            <SegmentedSetting<'auto' | 'on' | 'off'>
              label="Flash Attention"
              description="Must be disabled for OpenCL state save/load. Model reload needed for changes to take effect."
              options={[
                {value: 'auto', label: 'Auto'},
                {value: 'on', label: 'On'},
                {value: 'off', label: 'Off'},
              ]}
              value={settings.flashAttnType}
              onChange={v => patch({flashAttnType: v})}
            />
            <CacheTypeSetting
              label="Key Cache Type"
              value={settings.cacheTypeK}
              disabled={settings.flashAttnType === 'off'}
              onChange={v => patch({cacheTypeK: v})}
            />
            <CacheTypeSetting
              label="Value Cache Type"
              value={settings.cacheTypeV}
              disabled={settings.flashAttnType === 'off'}
              onChange={v => patch({cacheTypeV: v})}
            />
          </>
        )}
      </SettingSection>

      <SettingSection title="Memory Settings">
        <SettingRow
          bare
          label="Use Memory Lock"
          description="Force system to keep model in RAM rather than swapping or compressing. Model reload needed for changes to take effect."
          control={
            <Switch
              value={settings.useMlock}
              onValueChange={v => patch({useMlock: v})}
              trackColor={{false: colors.surfaceContainerHigh, true: colors.accent}}
              thumbColor={colors.textPrimary}
            />
          }
        />
        <SettingRow
          bare
          label="Memory Mapping"
          description="Use memory-mapped files for faster model loading. Model reload needed for changes to take effect."
          control={
            <Switch
              value={settings.useMmap}
              onValueChange={v => patch({useMmap: v})}
              trackColor={{false: colors.surfaceContainerHigh, true: colors.accent}}
              thumbColor={colors.textPrimary}
            />
          }
        />
      </SettingSection>

      <SettingSection title="Model Loading Settings">
        <SettingRow
          bare
          label="Auto Offload/Load"
          description="Offload model when app is in background."
          control={
            <Switch
              value={settings.autoOffload}
              onValueChange={v => patch({autoOffload: v})}
              trackColor={{false: colors.surfaceContainerHigh, true: colors.accent}}
              thumbColor={colors.textPrimary}
            />
          }
        />
        <SettingRow
          bare
          label="Auto-Navigate to Chat"
          description="Navigate to chat when a download finishes and the model is about to load."
          control={
            <Switch
              value={settings.autoNavigateToChat}
              onValueChange={v => patch({autoNavigateToChat: v})}
              trackColor={{false: colors.surfaceContainerHigh, true: colors.accent}}
              thumbColor={colors.textPrimary}
            />
          }
        />
      </SettingSection>

      <SettingSection title="App Settings">
        <SegmentedSetting<'light' | 'dark' | 'system'>
          label="Theme"
          description="System follows your phone's own light/dark setting."
          options={[
            {value: 'light', label: 'Light'},
            {value: 'dark', label: 'Dark'},
            {value: 'system', label: 'System'},
          ]}
          value={themeMode}
          onChange={v => setThemeModeContext(v)}
        />
      </SettingSection>

      <SettingSection title="Models">
        <SettingRow
          bare
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
      </SettingSection>

      {downloaded.length > 0 && (
        <SettingSection title="Storage">
          {downloaded.map(model => (
            <SettingRow
              bare
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
          ))}
        </SettingSection>
      )}

      <SettingSection title="Privacy">
        <SettingRow
          bare
          label="Everything runs on-device"
          description="Chats and models never leave your phone. There is no server this app talks to for chat."
          control={<View />}
        />
      </SettingSection>

      <SettingSection title="About">
        <SettingRow bare label="Version" control={<Text style={typography.caption}>{packageJson.version}</Text>} />
        <SettingRow
          bare
          label="Translation Test"
          description="Dev tool: proves the ONNX Runtime + NLLB pipeline works, in isolation from chat."
          control={
            <PrimaryButton
              label="Open"
              variant="secondary"
              onPress={() => setSubView('translation-test')}
            />
          }
        />
      </SettingSection>
    </AIPalScaffold>
  );
}

const styles = StyleSheet.create({
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
  contextPillDisabled: {opacity: 0.4},
  contextPillLabel: {fontSize: 12, fontWeight: '600', color: colors.textSecondary},
  contextPillLabelActive: {color: colors.onAccent},
  chevron: {color: colors.textMuted, fontSize: 20},
  sliderControl: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs},
  sliderTrackWrap: {flex: 1},
  valueBox: {
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  valueBoxText: {...typography.body},
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  segment: {paddingVertical: 10, paddingHorizontal: spacing.md},
  segmentBorder: {borderLeftWidth: 1, borderLeftColor: colors.border},
  segmentActive: {backgroundColor: colors.surfaceContainerHigh},
  segmentLabel: {...typography.body, color: colors.textSecondary},
  segmentLabelActive: {color: colors.textPrimary, fontWeight: '700'},
  bareBlock: {paddingVertical: spacing.sm},
  cacheTypeDescription: {...typography.caption, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.xs},
  cacheTypeScroll: {marginTop: spacing.xs},
});
