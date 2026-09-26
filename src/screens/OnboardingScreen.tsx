import React, {useEffect, useRef, useState} from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import {ArrowLeft} from 'lucide-react-native';
import DeviceInfo from 'react-native-device-info';
import {PalMascot} from '../components/PalMascot';
import {NeuralDownloadProgress} from '../components/NeuralDownloadProgress';
import {formatSize} from '../components/ModelCard';
import {ONBOARDING_USE_CASES, OnboardingUseCase} from '../data/onboardingPals';
import {KEYS, setJSON} from '../storage/asyncStore';
import {MODEL_CATALOG, getModelById} from '../data/models';
import {getStoredDeviceTier} from '../services/deviceAnalyzer';
import {getDownloadedModel} from '../storage/modelRegistry';
import {createPersona} from '../storage/personas';
import * as downloadQueue from '../services/downloadQueue';
import {DeviceTier, ModelInfo} from '../types';

const logoTransparent = require('../assets/images/logo-transparent.png');

/**
 * Dark-mode-first onboarding palette (OLED black + warm amber), deliberately
 * separate from theme/dark.ts and theme/light.ts -- onboarding always
 * renders in this exact palette regardless of the device's system theme,
 * same "fixed, not theme-driven" convention the previous light-mode-only
 * onboarding used, just inverted to match this design's dark-first spec.
 */
const C = {
  background: '#000000',
  card: '#16161E',
  cardBorder: '#2A2A36',
  cardHigh: '#1E1E27',
  accent: '#E8A87C',
  accentSoft: '#F4B886',
  onAccent: '#1A1206',
  textPrimary: '#F5F1EC',
  textSecondary: '#B7B3AE',
  textMuted: '#7D7A76',
  white: '#FFFFFF',
  black: '#000000',
};

// Georgia and the platform's generic 'serif' alias are both real, already-
// installed system fonts on iOS/Android respectively -- gives the reference
// design's serif display headlines without bundling a new font file (which
// would need native project changes on both platforms).
const SERIF = Platform.select({ios: 'Georgia', default: 'serif'});

const STEP = {
  welcome: 0,
  offline: 1,
  comparison: 2,
  privacy: 3,
  useCase: 4,
  reveal: 5,
} as const;
const SEGMENT_COUNT = 4; // Steps 0-3 only -- the grid/reveal steps have no segmented bar (per spec).
const SLIDE_COUNT = 6;

type RevealMode = 'picking' | 'downloading' | 'ready' | 'error';

// The plain app mark (not a pal's own mascot) shown on the welcome screen --
// reuses the bundled transparent logo asset rather than another SVG glyph.
function LogoMark({size = 64}: {size?: number}) {
  return <Image source={logoTransparent} resizeMode="contain" style={{width: size, height: size}} />;
}

function PillButton({
  label,
  onPress,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.pillButton, {backgroundColor: C.white}, disabled && {opacity: 0.4}, style]}>
      <Text style={styles.pillButtonLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function BackCircleButton({onPress}: {onPress: () => void}) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={10} style={styles.backCircle} activeOpacity={0.8}>
      <ArrowLeft size={20} color={C.textPrimary} />
    </TouchableOpacity>
  );
}

function SegmentedProgress({activeIndex}: {activeIndex: number}) {
  return (
    <View style={styles.segmentRow}>
      {Array.from({length: SEGMENT_COUNT}).map((_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            {backgroundColor: i <= activeIndex ? C.accent : 'rgba(255,255,255,0.14)'},
          ]}
        />
      ))}
    </View>
  );
}

function TopBar({
  activeSegment,
  skipLabel,
  onSkip,
}: {
  activeSegment: number | null;
  skipLabel: string;
  onSkip: () => void;
}) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarProgressSlot}>
        {activeSegment !== null && <SegmentedProgress activeIndex={activeSegment} />}
      </View>
      <TouchableOpacity onPress={onSkip} hitSlop={10}>
        <Text style={styles.skipLabel}>{skipLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

/** Bold word(s) highlighted with the amber pill background used throughout
 * the reference spec (e.g. "No internet, no signal", "quick and private").
 * Renders as a single Text run so the highlight wraps naturally with the
 * surrounding sentence instead of forcing a line break around it. */
function Highlight({children}: {children: string}) {
  return <Text style={styles.highlight}>{children}</Text>;
}

const GB = 1024 * 1024 * 1024;

/** Three real catalog models framed as Quick/Balanced/Best, using the same
 * device-fit logic deviceAnalyzer.ts already applies elsewhere (Balanced
 * reuses its actual recommendedModelId rather than recomputing a separate
 * "sweet spot" heuristic) -- Quick/Best are simply the smallest/largest
 * text model that still fits the device's free storage. */
function pickModelTiers(
  device: DeviceTier | null,
): {label: string; model: ModelInfo; recommended: boolean}[] {
  const freeGB = device?.freeStorageGB ?? Infinity;
  const textModels = MODEL_CATALOG.filter(m => (m.capability ?? 'text') === 'text');
  const fitting = textModels.filter(
    m => (m.sizeBytes + (m.mmprojSizeBytes ?? 0)) / GB < freeGB - 0.5,
  );
  const pool = fitting.length > 0 ? fitting : textModels;
  const sorted = [...pool].sort((a, b) => a.sizeBytes - b.sizeBytes);
  if (sorted.length === 0) {
    return [];
  }
  const quick = sorted[0];
  const best = sorted[sorted.length - 1];
  const recommended = device ? getModelById(device.recommendedModelId) : undefined;
  const recommendedFits = recommended && pool.some(m => m.id === recommended.id);
  const balanced =
    recommendedFits && recommended!.id !== quick.id && recommended!.id !== best.id
      ? recommended!
      : sorted[Math.floor(sorted.length / 2)];

  const rows = [
    {label: 'Quick', model: quick, recommended: false},
    {label: 'Balanced', model: balanced, recommended: true},
    {label: 'Best', model: best, recommended: false},
  ];
  // Dedupe by model id -- a small catalog can make two tiers collide.
  const seen = new Set<string>();
  return rows.filter(row => {
    if (seen.has(row.model.id)) {
      return false;
    }
    seen.add(row.model.id);
    return true;
  });
}

export function OnboardingScreen({onDone}: {onDone: () => void}) {
  const {width, height} = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);

  const [device, setDevice] = useState<DeviceTier | null>(null);
  const [deviceLabel, setDeviceLabel] = useState('');
  const [selectedUseCase, setSelectedUseCase] = useState<OnboardingUseCase>(ONBOARDING_USE_CASES[0]);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>();
  const [revealMode, setRevealMode] = useState<RevealMode>('picking');
  const [revealError, setRevealError] = useState<string | undefined>();
  const [queueItems, setQueueItems] = useState<downloadQueue.QueueItem[]>([]);

  const selectedModelIdRef = useRef(selectedModelId);
  selectedModelIdRef.current = selectedModelId;
  const selectedUseCaseRef = useRef(selectedUseCase);
  selectedUseCaseRef.current = selectedUseCase;
  const finishedRef = useRef(false);

  const goToStep = (next: number) => {
    setStep(next);
    scrollRef.current?.scrollTo({x: next * width, animated: true});
  };

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    if (index !== step) {
      setStep(index);
    }
  };

  useEffect(() => {
    (async () => {
      const tier = await getStoredDeviceTier();
      setDevice(tier);
      setSelectedModelId(tier?.recommendedModelId ?? MODEL_CATALOG[0]?.id);
      setDeviceLabel(
        `${DeviceInfo.getModel()}${tier ? ` • ${tier.totalRamGB.toFixed(1)} GB RAM` : ''}${
          tier ? ` • ${tier.freeStorageGB.toFixed(1)} GB free` : ''
        }`,
      );
    })();
  }, []);

  useEffect(() => {
    const unsubscribeChange = downloadQueue.onChange(setQueueItems);
    const unsubscribeDone = downloadQueue.onDone(async descriptor => {
      if (
        finishedRef.current ||
        descriptor.kind !== 'catalog' ||
        descriptor.modelId !== selectedModelIdRef.current
      ) {
        return;
      }
      await completeWithPersona();
    });
    return () => {
      unsubscribeChange();
      unsubscribeDone();
    };
    // Mount-only subscription -- reads current selection via refs above so
    // it never needs to resubscribe as the user changes their pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestNotificationPermission = () => {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).catch(() => undefined);
    }
  };

  /** Creates the real, persistent AIPal for the use-case the user picked,
   * then stages the chat screen to open directly into a new conversation
   * with it once onDone() (the outer prop) fires -- mirrors how a real
   * "new AIPal chat" already works elsewhere (ChatTabScreen's personaId +
   * modelId branch), not a bespoke onboarding-only path. */
  const completeWithPersona = async () => {
    if (finishedRef.current) {
      return;
    }
    finishedRef.current = true;
    const useCase = selectedUseCaseRef.current;
    const modelId = selectedModelIdRef.current;
    try {
      const persona = await createPersona({
        name: useCase.palName,
        tagline: useCase.palTagline,
        avatarIcon: useCase.avatarIcon,
        systemPrompt: useCase.systemPrompt,
        defaultModelId: modelId,
      });
      await setJSON(KEYS.lastScreen, {name: 'chat', modelId, personaId: persona.id}).catch(() => undefined);
      setRevealMode('ready');
      requestNotificationPermission();
    } catch (err) {
      finishedRef.current = false;
      setRevealMode('error');
      setRevealError(err instanceof Error ? err.message : String(err));
    }
  };

  const startDownload = async () => {
    const modelId = selectedModelIdRef.current;
    if (!modelId) {
      return;
    }
    setRevealError(undefined);
    const already = await getDownloadedModel(modelId).catch(() => undefined);
    if (already) {
      await completeWithPersona();
      return;
    }
    setRevealMode('downloading');
    try {
      await downloadQueue.enqueue({kind: 'catalog', modelId});
    } catch (err) {
      setRevealMode('error');
      setRevealError(err instanceof Error ? err.message : String(err));
    }
  };

  const activeQueueItem = queueItems.find(
    i => i.descriptor.kind === 'catalog' && i.descriptor.modelId === selectedModelId,
  );
  const queuePosition = activeQueueItem
    ? queueItems.filter(i => i.status === 'queued').indexOf(activeQueueItem) + 1
    : undefined;

  const selectedDescriptor = selectedModelId
    ? ({kind: 'catalog', modelId: selectedModelId} as const)
    : undefined;

  const modelTiers = pickModelTiers(device);
  const selectedModel = selectedModelId ? getModelById(selectedModelId) : undefined;

  const finishAndEnter = () => {
    onDone();
  };

  const skip = () => onDone();

  return (
    <View style={[styles.container, {backgroundColor: C.background}]}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        horizontal
        pagingEnabled
        scrollEnabled={step < STEP.useCase}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}>
        {/* Screen 1: Welcome */}
        <View style={[styles.page, {width, height}]}>
          <LogoMark size={80} />
          <Text style={styles.eyebrow}>Welcome to Zayla</Text>
          <Text style={styles.headline}>Meet your{'\n'}pals.</Text>
          <Text style={styles.subtitle}>
            Smart little friends that live inside your phone. Let's get you set up -- it'll take a minute.
          </Text>
        </View>

        {/* Screen 2: Offline capability */}
        <View style={[styles.page, {width, height}]}>
          <View style={styles.phoneGlyph}>
            <PalMascot size={56} color={C.accentSoft} />
          </View>
          <Text style={styles.eyebrow}>The idea</Text>
          <Text style={styles.headline}>Anytime,{'\n'}Anywhere.</Text>
          <Text style={styles.subtitle}>
            Your pals live inside your phone. <Highlight>No internet, no signal</Highlight> -- they work on
            planes, off-grid, in remote villages.
          </Text>
        </View>

        {/* Screen 3: Local vs Cloud comparison */}
        <View style={[styles.page, {width, height}]}>
          <View style={styles.comparisonRow}>
            <View style={[styles.comparisonCard, styles.comparisonCardLeft]}>
              <Text style={styles.comparisonTitle}>Your pal</Text>
              <Text style={styles.comparisonMeta}>Lives on your phone</Text>
              <Text style={styles.comparisonMeta}>Fast • Offline • Private</Text>
            </View>
            <View style={[styles.comparisonCard, styles.comparisonCardRight]}>
              <Text style={styles.comparisonTitle}>Cloud AI</Text>
              <Text style={styles.comparisonMeta}>Lives in the cloud</Text>
              <Text style={styles.comparisonMeta}>Bigger • Online • Tracked</Text>
            </View>
          </View>
          <Text style={styles.eyebrow}>A heads-up</Text>
          <Text style={styles.headline}>Smaller,{'\n'}but yours.</Text>
          <Text style={styles.subtitle}>
            Pals on your phone are <Highlight>quick and private</Highlight> -- but lighter than Cloud AI.
            Think pocket companion, not all-knowing oracle.
          </Text>
        </View>

        {/* Screen 4: Privacy guarantee */}
        <View style={[styles.page, {width, height}]}>
          <View style={styles.phoneGlyph}>
            <PalMascot size={56} color={C.accentSoft} />
          </View>
          <Text style={styles.eyebrow}>Privacy promised</Text>
          <Text style={styles.headline}>Nothing leaves{'\n'}your phone.</Text>
          <Text style={styles.subtitle}>
            <Highlight>No accounts. No cloud. No tracking.</Highlight> Your conversations stay yours.
          </Text>
        </View>

        {/* Screen 5: Use-case grid */}
        <View style={[styles.page, styles.gridPage, {width, height}]}>
          <Text style={styles.gridTitle}>What's your pal for?</Text>
          <Text style={styles.gridSubtitle}>
            Pick what you'd like to discuss -- we'll match a pal that fits your phone.
          </Text>
          <View style={styles.grid}>
            {ONBOARDING_USE_CASES.map(useCase => {
              const Icon = useCase.icon;
              const isSelected = selectedUseCase.key === useCase.key;
              return (
                <TouchableOpacity
                  key={useCase.key}
                  style={[styles.gridCell, isSelected && styles.gridCellSelected]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setSelectedUseCase(useCase);
                    goToStep(STEP.reveal);
                  }}>
                  <Icon size={26} color={C.accentSoft} />
                  <Text style={styles.gridCellLabel}>{useCase.label}</Text>
                  <Text style={styles.gridCellSublabel}>{useCase.sublabel}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.gridCell, styles.gridCellOutline]}
              activeOpacity={0.85}
              onPress={skip}>
              <Text style={styles.gridCellLabel}>Looking for something else?</Text>
              <Text style={styles.gridCellSublabel}>Browse all pals later in the app</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Screen 6: Pal reveal + device hardware check + model tier pick */}
        <View style={[styles.page, styles.revealPage, {width, height}]}>
          {revealMode === 'ready' ? (
            <>
              <PalMascot size={88} color={selectedUseCase.mascotColor} />
              <Text style={styles.headline}>You're all set!</Text>
              <Text style={styles.subtitle}>
                {selectedUseCase.palName} is ready to chat -- start your first conversation now.
              </Text>
            </>
          ) : revealMode === 'downloading' ? (
            <>
              <PalMascot size={72} color={selectedUseCase.mascotColor} />
              <Text style={styles.revealPalName}>{selectedUseCase.palName}</Text>
              {selectedModel && (
                <NeuralDownloadProgress
                  fraction={activeQueueItem?.fraction ?? 0}
                  status={activeQueueItem?.status ?? 'queued'}
                  bytesWritten={activeQueueItem?.bytesWritten ?? 0}
                  totalBytes={activeQueueItem?.totalBytes ?? selectedModel.sizeBytes}
                  queuePosition={queuePosition}
                  error={activeQueueItem?.error}
                  onCancel={() => {
                    if (selectedDescriptor) {
                      downloadQueue.cancel(selectedDescriptor);
                    }
                    setRevealMode('picking');
                  }}
                  onRetry={() => selectedDescriptor && downloadQueue.retry(selectedDescriptor)}
                  onPause={() => selectedDescriptor && downloadQueue.pause(selectedDescriptor)}
                  onResume={() => selectedDescriptor && downloadQueue.resume(selectedDescriptor)}
                />
              )}
            </>
          ) : (
            <>
              <PalMascot size={72} color={selectedUseCase.mascotColor} />
              <Text style={styles.revealPalName}>{selectedUseCase.palName}</Text>
              <Text style={styles.subtitle}>{selectedUseCase.palBio}</Text>
              {deviceLabel !== '' && (
                <View style={styles.deviceChip}>
                  <Text style={styles.deviceChipLabel}>{deviceLabel}</Text>
                </View>
              )}
              <Text style={styles.tierIntro}>
                {selectedUseCase.palName} thinks using a small AI model on your phone -- pick one that fits.
              </Text>
              <View style={styles.tierList}>
                {modelTiers.map(row => {
                  const isSelected = selectedModelId === row.model.id;
                  return (
                    <TouchableOpacity
                      key={row.model.id}
                      style={[
                        styles.tierRow,
                        isSelected && (row.recommended ? styles.tierRowRecommended : styles.tierRowSelected),
                      ]}
                      activeOpacity={0.85}
                      onPress={() => setSelectedModelId(row.model.id)}>
                      <View
                        style={[
                          styles.radioOuter,
                          isSelected && {
                            borderColor: row.recommended ? C.onAccent : C.accent,
                          },
                        ]}>
                        {isSelected && (
                          <View
                            style={[
                              styles.radioInner,
                              {backgroundColor: row.recommended ? C.onAccent : C.accent},
                            ]}
                          />
                        )}
                      </View>
                      <View style={styles.tierTextCol}>
                        <View style={styles.tierLabelRow}>
                          <Text
                            style={[
                              styles.tierLabel,
                              {color: isSelected && row.recommended ? C.onAccent : C.textPrimary},
                            ]}>
                            {row.label}
                          </Text>
                          {row.recommended && (
                            <View style={styles.recommendedBadge}>
                              <Text style={styles.recommendedBadgeLabel}>Recommended</Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.tierMeta,
                            {color: isSelected && row.recommended ? C.onAccent : C.textSecondary},
                          ]}>
                          {row.model.name.replace(' Instruct', '')} • {formatSize(row.model.sizeBytes)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {revealMode === 'error' && revealError && <Text style={styles.errorText}>{revealError}</Text>}
            </>
          )}
        </View>
      </ScrollView>

      {step < STEP.useCase && (
        <TopBar activeSegment={step} skipLabel="Skip" onSkip={skip} />
      )}
      {step === STEP.useCase && <TopBar activeSegment={null} skipLabel="Skip" onSkip={skip} />}
      {step === STEP.reveal && revealMode === 'picking' && (
        <TopBar activeSegment={null} skipLabel="Skip for now" onSkip={skip} />
      )}

      {step < STEP.useCase && (
        <View style={styles.footer} pointerEvents="box-none">
          {step > STEP.welcome && <BackCircleButton onPress={() => goToStep(step - 1)} />}
          <View style={styles.footerButtonSlot}>
            <PillButton
              label={
                step === STEP.welcome
                  ? 'Show me Around'
                  : step === STEP.offline
                  ? 'Next'
                  : step === STEP.comparison
                  ? 'Got it'
                  : 'Get Started'
              }
              onPress={() => goToStep(step + 1)}
            />
          </View>
        </View>
      )}
      {step === STEP.reveal && revealMode === 'picking' && (
        <View style={styles.footer} pointerEvents="box-none">
          <BackCircleButton onPress={() => goToStep(STEP.useCase)} />
          <View style={styles.footerButtonSlot}>
            <PillButton
              label={
                selectedModel
                  ? `⬇  Download ${selectedUseCase.palName} (${formatSize(selectedModel.sizeBytes)})`
                  : `⬇  Download ${selectedUseCase.palName}`
              }
              onPress={startDownload}
              disabled={!selectedModel}
            />
          </View>
        </View>
      )}
      {step === STEP.reveal && revealMode === 'ready' && (
        <View style={styles.footer} pointerEvents="box-none">
          <View style={styles.footerButtonSlot}>
            <PillButton label="Start Chatting  →" onPress={finishAndEnter} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {flex: 1},
  page: {alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 90, paddingBottom: 140},
  eyebrow: {color: C.textMuted, fontSize: 14, marginTop: 20, textAlign: 'center'},
  headline: {
    fontFamily: SERIF,
    fontStyle: 'italic',
    color: C.textPrimary,
    fontSize: 40,
    lineHeight: 46,
    textAlign: 'center',
    marginTop: 14,
  },
  subtitle: {
    color: C.textSecondary,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 22,
  },
  highlight: {
    color: C.onAccent,
    backgroundColor: C.accent,
    fontWeight: '600',
  },
  phoneGlyph: {
    width: 96,
    height: 96,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  comparisonRow: {flexDirection: 'row', marginBottom: 40, gap: -12},
  comparisonCard: {
    width: 140,
    height: 150,
    borderRadius: 20,
    backgroundColor: C.white,
    padding: 16,
    justifyContent: 'flex-end',
  },
  comparisonCardLeft: {transform: [{rotate: '-6deg'}]},
  comparisonCardRight: {transform: [{rotate: '6deg'}], marginLeft: -24, opacity: 0.9},
  comparisonTitle: {color: C.black, fontWeight: '700', fontSize: 15, marginBottom: 4},
  comparisonMeta: {color: '#5B5B5B', fontSize: 11, lineHeight: 15},
  gridPage: {justifyContent: 'flex-start', paddingTop: 100, paddingBottom: 32},
  gridTitle: {
    fontFamily: SERIF,
    fontStyle: 'italic',
    color: C.textPrimary,
    fontSize: 28,
    textAlign: 'center',
  },
  gridSubtitle: {color: C.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20},
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 28,
    gap: 12,
  },
  gridCell: {
    width: '48%',
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 16,
    gap: 4,
    minHeight: 108,
  },
  gridCellSelected: {borderColor: C.accent},
  gridCellOutline: {width: '100%', backgroundColor: 'transparent', borderStyle: 'dashed'},
  gridCellLabel: {color: C.textPrimary, fontWeight: '700', fontSize: 15, marginTop: 6},
  gridCellSublabel: {color: C.textMuted, fontSize: 12, lineHeight: 16},
  revealPage: {paddingTop: 70, paddingBottom: 140},
  revealPalName: {
    fontFamily: SERIF,
    fontStyle: 'italic',
    color: C.textPrimary,
    fontSize: 34,
    marginTop: 14,
  },
  deviceChip: {
    backgroundColor: C.cardHigh,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 18,
  },
  deviceChipLabel: {color: C.textSecondary, fontSize: 12},
  tierIntro: {color: C.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 22, lineHeight: 20},
  tierList: {width: '100%', marginTop: 18, gap: 10},
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: C.card,
    padding: 16,
  },
  tierRowSelected: {borderColor: C.accent},
  tierRowRecommended: {backgroundColor: C.accentSoft, borderColor: C.accentSoft},
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {width: 10, height: 10, borderRadius: 5},
  tierTextCol: {flex: 1, gap: 2},
  tierLabelRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  tierLabel: {fontSize: 16, fontWeight: '700'},
  tierMeta: {fontSize: 12},
  recommendedBadge: {
    backgroundColor: C.onAccent,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  recommendedBadgeLabel: {color: C.accentSoft, fontSize: 10, fontWeight: '700'},
  errorText: {color: '#F65C5C', fontSize: 13, textAlign: 'center', marginTop: 14},
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 56,
  },
  topBarProgressSlot: {flex: 1, marginRight: 16},
  skipLabel: {color: C.textSecondary, fontSize: 14, fontWeight: '600'},
  segmentRow: {flexDirection: 'row', gap: 6},
  segment: {flex: 1, height: 4, borderRadius: 999},
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  footerButtonSlot: {flex: 1},
  backCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.cardHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillButton: {
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  pillButtonLabel: {fontSize: 16, fontWeight: '700'},
});
