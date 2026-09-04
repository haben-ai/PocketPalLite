import React, {useCallback, useEffect, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {radius, spacing} from '../theme';
import {useTheme, useThemeContext} from '../theme/ThemeContext';
import {SUPPORTED_LANGUAGES} from '../i18n';
import {LanguagePicker} from '../components/LanguagePicker';
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
import {SecretInputModal} from '../components/SecretInputModal';
import {getSecret, setSecret, SECRET_SERVICE} from '../services/secureStorage';
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
  const {colors, typography} = useTheme();
  return (
    <View style={styles.bareBlock}>
      <Text style={typography.body}>{label}</Text>
      {description ? (
        <Text style={[typography.caption, {color: colors.textSecondary}, styles.rowDescription]}>{description}</Text>
      ) : null}
      <View style={styles.sliderControl}>
        <View style={styles.sliderTrackWrap}>
          <Slider value={value} min={min} max={max} step={step} onValueChange={onChange} />
        </View>
        <View style={[styles.valueBox, {borderColor: colors.border}]}>
          <Text style={typography.body}>{value}</Text>
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
  const {colors, typography} = useTheme();
  return (
    <View style={styles.bareBlock}>
      <Text style={typography.body}>{label}</Text>
      {description ? (
        <Text style={[typography.caption, {color: colors.textSecondary}, styles.rowDescription]}>{description}</Text>
      ) : null}
      <View style={[styles.segmentedControl, {borderColor: colors.border}]}>
        {options.map((opt, i) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.segment,
              value === opt.value && {backgroundColor: colors.surfaceContainerHigh},
              i > 0 && [styles.segmentBorder, {borderLeftColor: colors.border}],
            ]}
            onPress={() => onChange(opt.value)}>
            <Text
              style={[
                typography.body,
                {color: colors.textSecondary},
                value === opt.value && {color: colors.textPrimary, fontWeight: '700'},
              ]}>
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
  const {colors, typography} = useTheme();
  return (
    <View style={styles.bareBlock}>
      <Text style={typography.body}>{label}</Text>
      <Text style={[typography.caption, {color: colors.textSecondary}, styles.rowDescription]}>
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
                  {backgroundColor: colors.surfaceContainerHigh},
                  value === type && {backgroundColor: colors.accent},
                  disabled && styles.contextPillDisabled,
                ]}>
                <Text
                  style={[
                    styles.contextPillLabel,
                    {color: colors.textSecondary},
                    value === type && {color: colors.onAccent},
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
  const {colors, typography} = useTheme();
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        onPress={() => onChange(Math.max(min, value - step))}
        style={[styles.stepperButton, {backgroundColor: colors.surfaceContainerHigh}]}>
        <Text style={[styles.stepperLabel, {color: colors.textPrimary}]}>-</Text>
      </TouchableOpacity>
      <Text style={[typography.body, styles.stepperValue]}>{value}</Text>
      <TouchableOpacity
        onPress={() => onChange(Math.min(max, value + step))}
        style={[styles.stepperButton, {backgroundColor: colors.surfaceContainerHigh}]}>
        <Text style={[styles.stepperLabel, {color: colors.textPrimary}]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export function SettingsTabScreen({onNavigate}: {onNavigate: (screen: AppScreen) => void}) {
  const [subView, setSubView] = useState<SubView>('main');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [downloaded, setDownloaded] = useState<DownloadedModel[]>([]);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [hfTokenSet, setHfTokenSet] = useState(false);
  const [showHfTokenModal, setShowHfTokenModal] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [braveKeySet, setBraveKeySet] = useState(false);
  const [showBraveKeyModal, setShowBraveKeyModal] = useState(false);
  const {themeMode, setThemeMode: setThemeModeContext} = useThemeContext();
  const {colors, typography} = useTheme();
  const {t, i18n} = useTranslation();

  const refresh = useCallback(async () => {
    setSettings(await getAppSettings());
    setDownloaded(await getDownloadedModels());
    setHfTokenSet((await getSecret(SECRET_SERVICE.hfToken)) !== null);
    setBraveKeySet((await getSecret(SECRET_SERVICE.braveApiKey)) !== null);
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
        <Text style={typography.title}>{t('settings.title')}</Text>
      </AIPalScaffold>
    );
  }

  return (
    <AIPalScaffold scroll onBack={() => onNavigate({name: 'chat'})}>
      <Text style={typography.title}>{t('settings.title')}</Text>

      <SettingSection title={t('settings.modelInitialization')}>
        <SettingRow
          bare
          label={t('settings.deviceSelection')}
          description={t('settings.deviceSelectionDescription')}
          control={<View />}
        />
        <SettingRow
          bare
          label={t('settings.contextSize')}
          description="Model reload needed for changes to take effect."
          control={
            <View style={styles.contextRow}>
              {CONTEXT_SIZE_OPTIONS.map(size => (
                <TouchableOpacity key={size} onPress={() => patch({contextSize: size})}>
                  <View
                    style={[
                      styles.contextPill,
                      {backgroundColor: colors.surfaceContainerHigh},
                      settings.contextSize === size && {backgroundColor: colors.accent},
                    ]}>
                    <Text
                      style={[
                        styles.contextPillLabel,
                        {color: colors.textSecondary},
                        settings.contextSize === size && {color: colors.onAccent},
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
          label={t('settings.advancedSettings')}
          control={
            <TouchableOpacity onPress={() => setAdvancedExpanded(v => !v)}>
              <Text style={[styles.chevron, {color: colors.textMuted}]}>
                {advancedExpanded ? '⌄' : '›'}
              </Text>
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

      <SettingSection title={t('settings.memorySettings')}>
        <SettingRow
          bare
          label={t('settings.useMemoryLock')}
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
          label={t('settings.memoryMapping')}
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

      <SettingSection title={t('settings.modelLoadingSettings')}>
        <SettingRow
          bare
          label={t('settings.autoOffload')}
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
          label={t('settings.autoNavigate')}
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

      <SettingSection title={t('settings.appSettings')}>
        <SettingRow
          bare
          label={t('settings.language')}
          control={
            <TouchableOpacity
              style={[styles.languageChip, {borderColor: colors.border}]}
              onPress={() => setShowLanguagePicker(true)}>
              <Text style={typography.body}>
                {SUPPORTED_LANGUAGES.find(l => l.code === settings.language)?.label ?? settings.language}
              </Text>
              <Text style={{color: colors.textMuted}}>⌄</Text>
            </TouchableOpacity>
          }
        />
        <SegmentedSetting<'light' | 'dark' | 'system'>
          label={t('settings.theme')}
          description="System follows your phone's own light/dark setting."
          options={[
            {value: 'light', label: t('settings.themeLight')},
            {value: 'dark', label: t('settings.themeDark')},
            {value: 'system', label: t('settings.themeSystem')},
          ]}
          value={themeMode}
          onChange={v => setThemeModeContext(v)}
        />
        <SettingRow
          bare
          label={t('settings.textToSpeech')}
          description={t('settings.textToSpeechDescription')}
          control={
            <Switch
              value={settings.ttsEnabled}
              onValueChange={v => patch({ttsEnabled: v})}
              trackColor={{false: colors.surfaceContainerHigh, true: colors.accent}}
              thumbColor={colors.textPrimary}
            />
          }
        />
      </SettingSection>

      <LanguagePicker
        visible={showLanguagePicker}
        value={settings.language}
        onClose={() => setShowLanguagePicker(false)}
        onSelect={async code => {
          await patch({language: code});
          i18n.changeLanguage(code);
        }}
      />

      <SettingSection title={t('settings.models')}>
        <SettingRow
          bare
          label={t('settings.manageModels')}
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

      <SettingSection
        title={t('settings.internetSearch')}
        description="Let Pals search the web with their own tools. Bring your own API key — PocketPal never holds your keys or routes your queries.">
        <View style={styles.searchDisclosure}>
          <Text style={[typography.body, {fontWeight: '700'}]}>Searches leave your device</Text>
          <Text style={[typography.caption, {color: colors.textSecondary}, styles.rowDescription]}>
            When a Pal searches the web, your query is sent to Brave over the internet. Keys and
            queries are never sent to PocketPal.
          </Text>
          {!settings.searchDisclosureAccepted && (
            <PrimaryButton
              label="I understand"
              onPress={() => patch({searchDisclosureAccepted: true})}
              style={styles.disclosureButton}
            />
          )}
        </View>
        <SettingRow
          bare
          label="Search provider"
          control={
            <View style={[styles.contextPill, {backgroundColor: colors.surfaceContainerHigh}]}>
              <Text style={[styles.contextPillLabel, {color: colors.textSecondary}]}>Brave</Text>
            </View>
          }
        />
        <SettingRow
          bare
          label="API key"
          description={
            braveKeySet
              ? 'Key saved.'
              : settings.searchDisclosureAccepted
              ? 'No key set for Brave.'
              : 'Accept the disclosure above to set a key and enable search.'
          }
          control={
            <PrimaryButton
              label={braveKeySet ? 'Change' : 'Set Key'}
              variant="secondary"
              disabled={!settings.searchDisclosureAccepted}
              onPress={() => setShowBraveKeyModal(true)}
            />
          }
        />
        <SliderSetting
          label="Results per search"
          description="Fewer results keep more room in the model's context."
          value={settings.searchResultsCount}
          min={1}
          max={10}
          step={1}
          onChange={v => patch({searchResultsCount: v})}
        />
      </SettingSection>

      <SecretInputModal
        visible={showBraveKeyModal}
        title="Brave Search API Key"
        placeholder="BSA..."
        onClose={() => setShowBraveKeyModal(false)}
        onSave={async value => {
          await setSecret(SECRET_SERVICE.braveApiKey, value);
          setBraveKeySet(true);
        }}
      />

      <SettingSection title={t('settings.apiSettings')}>
        <SettingRow
          bare
          label={t('settings.huggingFaceToken')}
          description={
            hfTokenSet
              ? 'Token saved. Used to access gated models from Hugging Face.'
              : 'Set a token to access gated models from Hugging Face.'
          }
          control={
            <PrimaryButton
              label={hfTokenSet ? 'Change' : 'Set Token'}
              variant="secondary"
              onPress={() => setShowHfTokenModal(true)}
            />
          }
        />
        <SettingRow
          bare
          label="Use HF Token"
          description="Enable to use token for API requests. Disable if token is causing authentication issues."
          control={
            <Switch
              value={settings.useHfToken}
              onValueChange={v => patch({useHfToken: v})}
              disabled={!hfTokenSet}
              trackColor={{false: colors.surfaceContainerHigh, true: colors.accent}}
              thumbColor={colors.textPrimary}
            />
          }
        />
      </SettingSection>

      <SecretInputModal
        visible={showHfTokenModal}
        title="Hugging Face Token"
        placeholder="hf_..."
        onClose={() => setShowHfTokenModal(false)}
        onSave={async value => {
          await setSecret(SECRET_SERVICE.hfToken, value);
          setHfTokenSet(true);
          await patch({useHfToken: true});
        }}
      />

      {downloaded.length > 0 && (
        <SettingSection title={t('settings.storage')}>
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

      <SettingSection title={t('settings.privacy')}>
        <SettingRow
          bare
          label="Everything runs on-device"
          description="Chats and models never leave your phone. There is no server this app talks to for chat."
          control={<View />}
        />
      </SettingSection>

      <SettingSection title={t('settings.about')}>
        <SettingRow bare label={t('settings.version')} control={<Text style={typography.caption}>{packageJson.version}</Text>} />
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
  searchDisclosure: {paddingVertical: spacing.sm},
  disclosureButton: {alignSelf: 'flex-start', marginTop: spacing.xs},
  languageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  stepper: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperLabel: {fontSize: 18, fontWeight: '700'},
  stepperValue: {minWidth: 40, textAlign: 'center'},
  contextRow: {flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap'},
  contextPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  contextPillDisabled: {opacity: 0.4},
  contextPillLabel: {fontSize: 12, fontWeight: '600'},
  chevron: {fontSize: 20},
  sliderControl: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs},
  sliderTrackWrap: {flex: 1},
  valueBox: {
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  segment: {paddingVertical: 10, paddingHorizontal: spacing.md},
  segmentBorder: {borderLeftWidth: 1},
  bareBlock: {paddingVertical: spacing.sm},
  rowDescription: {marginTop: 2, marginBottom: spacing.xs},
  cacheTypeScroll: {marginTop: spacing.xs},
});
