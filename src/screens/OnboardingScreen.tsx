import React, {useEffect, useRef, useState} from 'react';
import {
  Image,
  ImageBackground,
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
} from 'react-native';
import {ArrowRight, EyeOff, Lock, WifiOff} from 'lucide-react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {PrimaryButton} from '../components/PrimaryButton';
import {OnboardingModelCard} from '../components/OnboardingModelCard';
import {HuggingFaceIcon} from '../components/HuggingFaceIcon';
import {ModelRowInfo, formatSize} from '../components/ModelCard';
import {lightColors} from '../theme/light';
import {radius, spacing} from '../theme';
import {KEYS, setJSON} from '../storage/asyncStore';
import {MODEL_CATALOG, getModelById} from '../data/models';
import {getStoredDeviceTier} from '../services/deviceAnalyzer';
import {DeviceTier, ModelInfo} from '../types';

const scenery = require('../assets/images/onboarding-scenery.jpg');
const logoTransparent = require('../assets/images/logo-transparent.png');

// Three distinct icon/color pairings per feature (rather than one shield +
// a plain checklist) -- a common pattern in polished onboarding flows,
// where each privacy fact gets its own visual identity instead of reading
// as one undifferentiated list.
const PRIVACY_FEATURES = [
  {
    Icon: WifiOff,
    tint: '#0081FB1F',
    color: '#0081FB',
    title: '100% Offline',
    description: 'Works fully without an internet connection once your model is downloaded.',
  },
  {
    Icon: Lock,
    tint: '#1FA9711F',
    color: '#1FA971',
    title: 'On-Device Only',
    description: 'Conversations are processed and stored only on your phone -- never uploaded.',
  },
  {
    Icon: EyeOff,
    tint: '#7C5CFC1F',
    color: '#7C5CFC',
    title: 'No Tracking',
    description: 'No analytics, no accounts, nothing sent to any server, ever.',
  },
];

const SLIDE_COUNT = 5;
const STEP = {welcome: 0, choose: 1, download: 2, privacy: 3, done: 4} as const;

// Fixed, illustrative progress for the download screen -- this step is a
// static mockup of the UI/structure only (explicitly requested, and now
// explicitly non-interactive too), not a real download; scaled against the
// real selected model's real size so the numbers shown are at least
// internally consistent, not just copied from a reference screenshot
// verbatim regardless of which model is selected.
const MOCK_PROGRESS_FRACTION = 0.68;
const MOCK_ETA_LABEL = 'About 1 min left';

// Onboarding always renders in this fixed light/whitish-blue palette (see
// theme/light.ts), never the app's own resolved (possibly dark) theme --
// explicitly requested: every onboarding screen must read as white with a
// blue accent regardless of the device's system dark/light setting.
const ONB = lightColors;

// Deep navy -- explicitly specified for the welcome slide's brand/heading
// text (reference spec: "~#10294A"), distinct from the pure-black
// ONB.textPrimary used everywhere else in onboarding.
const NAVY = '#10294A';
const NAVY_MUTED = '#4A5D78';

// Static Nunito Sans weight instances bundled at
// android/app/src/main/assets/fonts/NunitoSans-*.ttf (generated from
// Google's variable Nunito Sans font, per the explicit typography spec --
// modern rounded geometric sans, distinct from the app's own default font,
// used only within onboarding). No fontWeight is set alongside these --
// each weight is already its own separate font file/family, so adding a
// numeric fontWeight on top would make Android synthesize extra (faux)
// bold rather than pick a different real face.
const FONT = {
  brand: 'NunitoSans-Bold',
  heading: 'NunitoSans-ExtraBold',
  body: 'NunitoSans-Regular',
  medium: 'NunitoSans-Medium',
  semiBold: 'NunitoSans-SemiBold',
};

// Reserves space at the bottom of every slide so its content never sits
// underneath the floating progress-bar + footer overlay (see bottomOverlay
// below, which renders on top of every slide -- including, on the welcome
// slide, on top of the photo -- rather than pushing slides up in normal
// layout flow).
const FOOTER_RESERVE = 168;

function catalogToRow(model: ModelInfo): ModelRowInfo {
  return {
    id: model.id,
    name: model.name,
    sizeBytes: model.sizeBytes + (model.mmprojSizeBytes ?? 0),
    tier: model.tier,
    capability: model.capability,
    params: model.params,
    quant: model.quant,
    minRamGB: model.minRamGB,
    vendor: model.vendor,
  };
}

// Static display-only entry -- there's no Meta/Llama model in the app's
// real catalog (data/models.ts) yet, so this isn't backed by a real
// download the way the Google/Microsoft cards below it are. Explicitly
// requested as a static card for this screen only; real specs for the
// actual public model (Llama 3.2 1B Instruct) so it doesn't misrepresent
// what it's illustrating, even though tapping it does nothing, same as
// every other card on this screen.
const META_STATIC_ROW: ModelRowInfo = {
  id: 'meta-llama-static',
  name: 'Llama 3.2 1B Instruct',
  sizeBytes: 807_694_336,
  tier: 'weak',
  params: '1B',
  quant: 'Q4_K_M',
  minRamGB: 3,
  vendor: 'meta',
};

// Exactly four cards, per explicit request: Meta (static -- see above),
// Google, Microsoft, then the Hugging Face capability card rendered
// separately below. The Google/Microsoft entries are real catalog models
// (catalogToRow), not fabricated.
function curatedOnboardingModels(): ModelRowInfo[] {
  const rows = [META_STATIC_ROW];
  const google = getModelById('gemma3-1b');
  if (google) {
    rows.push(catalogToRow(google));
  }
  const microsoft = getModelById('phi4-mini');
  if (microsoft) {
    rows.push(catalogToRow(microsoft));
  }
  return rows;
}

/** Plain, static app mark -- used at the top of the welcome slide. No
 * animation (explicitly requested): a continuously spinning brand mark at
 * the very top of the first screen a user ever sees read as distracting
 * rather than polished, per that request. */
function LogoMark({size = 72}: {size?: number}) {
  return <Image source={logoTransparent} resizeMode="contain" style={{width: size, height: size}} />;
}

export function OnboardingScreen({onDone}: {onDone: () => void}) {
  const {width, height} = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);

  const [device, setDevice] = useState<DeviceTier | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>();

  const goToStep = (next: number) => {
    setStep(next);
    scrollRef.current?.scrollTo({x: next * width, animated: true});
  };

  // Real swipe navigation (the ScrollView below has no scrollEnabled prop,
  // so it defaults to true) -- this just keeps `step` (which drives the
  // footer/progress UI) in sync with wherever the user's own drag actually
  // lands, same as goToStep does for button taps.
  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    if (index !== step) {
      setStep(index);
    }
  };

  // Real device recommendation (App.tsx computes this once, ever, right
  // after onboarding starts -- see deviceAnalyzer.ts), not mock content --
  // pre-selects a sensible model and flags it as "Recommended" the same way
  // the real Models tab does. The Choose-model slide itself is a static
  // display of this real result, not an interactive picker.
  useEffect(() => {
    (async () => {
      const tier = await getStoredDeviceTier();
      setDevice(tier);
      setSelectedModelId(tier?.recommendedModelId ?? MODEL_CATALOG[0]?.id);
    })();
  }, []);

  // Requested placement: the notification permission prompt appears when
  // onboarding's own last screen is reached, not at cold start -- App.tsx's
  // own request is gated off for a first-run user for exactly this reason
  // (see its comment), so this is the only place it fires for them.
  useEffect(() => {
    if (step === STEP.done && Platform.OS === 'android' && Platform.Version >= 33) {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).catch(() => undefined);
    }
  }, [step]);

  const selectedModel = selectedModelId ? getModelById(selectedModelId) : undefined;
  const storageNeededBytes = selectedModel ? selectedModel.sizeBytes + (selectedModel.mmprojSizeBytes ?? 0) : 0;
  const mockDownloadedBytes = Math.round(storageNeededBytes * MOCK_PROGRESS_FRACTION);

  const finishToSettings = async () => {
    // Rides the same "resume where you left off" mechanism ChatScreen's
    // background/foreground restore uses (RootNavigator reads this same
    // key on its very first mount) -- "Explore Settings" genuinely lands
    // there instead of just being a relabeled "Start Chatting".
    await setJSON(KEYS.lastScreen, {name: 'settings'}).catch(() => undefined);
    onDone();
  };

  return (
    <View style={[styles.container, {backgroundColor: ONB.background}]}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}>
        {/* Slide 1: Welcome -- the one photo-background screen, filled
            edge-to-edge (no gap below it: the progress bar/footer float on
            top of it via bottomOverlay below, instead of sitting in a
            separate strip beneath it). Logo is static and pinned to the
            top; the brand block stays anchored to the bottom. */}
        <ImageBackground source={scenery} resizeMode="cover" style={[styles.page, styles.heroPage, {width, height}]}>
          {/* Subtle white/blue legibility gradient over the upper portion
              only, fading to fully transparent above the mountains -- the
              photo's own sky is already bright, this just guarantees
              contrast for the dark navy text on any device/photo variance,
              per the reference's "subtle white/blue translucent gradient
              overlay". Built with react-native-svg (already a dependency)
              rather than adding a gradient package. */}
          <Svg style={styles.heroGradient} width="100%" height="58%">
            <Defs>
              <LinearGradient id="heroFade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#EAF4FF" stopOpacity={0.55} />
                <Stop offset="0.7" stopColor="#EAF4FF" stopOpacity={0.18} />
                <Stop offset="1" stopColor="#EAF4FF" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroFade)" />
          </Svg>
          <View style={styles.heroTop}>
            <LogoMark size={132} />
            <Text style={styles.heroBrand}>Zayla</Text>
            <Text style={styles.heroHeading}>AI that stays{'\n'}with you.</Text>
            <Text style={styles.heroSubtitle}>Powerful AI. Private, offline,{'\n'}and on your device.</Text>
          </View>
        </ImageBackground>

        {/* Slide 2: Choose the right model -- exactly four cards (explicitly
            requested): Meta (static, see META_STATIC_ROW), Google,
            Microsoft, then the Hugging Face capability card below. Not the
            full real catalog -- a curated preview, same "static mockup"
            spirit as the rest of onboarding. */}
        <View style={[styles.page, styles.pageLight, {width, height}]}>
          <Text style={styles.title}>Choose the right model</Text>
          <Text style={styles.body}>
            We recommend models based on your device's RAM and storage. You can change this anytime.
          </Text>
          <ScrollView
            style={styles.modelList}
            contentContainerStyle={styles.modelListContent}
            showsVerticalScrollIndicator={false}>
            {curatedOnboardingModels().map(model => (
              <OnboardingModelCard
                key={model.id}
                model={model}
                selected={selectedModelId === model.id}
                recommended={device?.recommendedModelId === model.id}
              />
            ))}
            {/* Static capability callout, not another selectable model --
                the real Models tab can search and download any GGUF repo
                from Hugging Face directly; this just makes sure a new user
                knows that exists too, beyond the curated list above. */}
            <View
              style={[
                styles.hfCard,
                {backgroundColor: ONB.surfaceContainer, borderColor: ONB.outlineVariant},
              ]}>
              <View style={[styles.hfIconTile, {backgroundColor: ONB.surfaceContainerHigh}]}>
                <HuggingFaceIcon size={24} />
              </View>
              <View style={styles.hfTextCol}>
                <Text style={styles.hfTitle}>Search Hugging Face</Text>
                <Text style={styles.hfDesc}>
                  Not on the list? Download any GGUF model straight from Hugging Face too.
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Slide 3: Download model -- a static mockup of the UI/structure
            only (explicitly requested): no downloadQueue call happens on
            this screen, and its Pause/Cancel controls are plain, non-
            interactive visuals rather than real buttons. */}
        <View style={[styles.page, styles.pageLight, {width, height}]}>
          <Text style={styles.title}>Download model</Text>
          <Text style={styles.body}>Get the model and start chatting in just a few minutes.</Text>
          {selectedModel && (
            <View style={[styles.downloadCard, {backgroundColor: ONB.surfaceContainer, borderColor: ONB.outlineVariant}]}>
              <Text style={styles.cardHeading}>{selectedModel.name}</Text>
              <View style={styles.downloadFactsRow}>
                <Text style={[styles.caption, {color: ONB.textSecondary}]}>Model size</Text>
                <Text style={styles.caption}>{formatSize(selectedModel.sizeBytes)}</Text>
              </View>
              <View style={styles.downloadFactsRow}>
                <Text style={[styles.caption, {color: ONB.textSecondary}]}>Storage needed</Text>
                <Text style={styles.caption}>
                  {formatSize(storageNeededBytes)}
                  {selectedModel.mmprojSizeBytes ? ' (incl. vision files)' : ''}
                </Text>
              </View>

              <View style={styles.downloadProgressSlot}>
                <Text style={styles.progressTitle}>Downloading... {Math.round(MOCK_PROGRESS_FRACTION * 100)}%</Text>
                <View style={[styles.progressTrack, {backgroundColor: ONB.surfaceContainerHigh}]}>
                  <View
                    style={[
                      styles.progressFillBar,
                      {width: `${MOCK_PROGRESS_FRACTION * 100}%`, backgroundColor: ONB.accent},
                    ]}
                  />
                </View>
                <Text style={[styles.small, {color: ONB.textMuted}]}>
                  {formatSize(mockDownloadedBytes)} / {formatSize(storageNeededBytes)} · {MOCK_ETA_LABEL}
                </Text>
              </View>

              <View style={[styles.tipCard, {backgroundColor: ONB.accentMuted}]}>
                <Text style={[styles.tipLine, {color: ONB.accent}]}>Keep the app open during download</Text>
                <Text style={[styles.tipLine, {color: ONB.accent}]}>Use Wi-Fi for a faster experience</Text>
              </View>

              {/* Static mockup only -- not wrapped in any touchable. */}
              <View style={[styles.mockPauseButton, {backgroundColor: ONB.accent}]}>
                <Text style={styles.mockPauseLabel}>Pause</Text>
              </View>
              <Text style={styles.mockCancelLink}>Cancel</Text>
            </View>
          )}
        </View>

        {/* Slide 4: Your privacy matters -- redesigned as three distinct
            icon/title/description feature cards instead of one shield +
            a plain checklist, matching how most modern app onboarding
            flows present a short list of privacy facts. */}
        <View style={[styles.page, styles.pageLight, {width, height}]}>
          <Text style={styles.title}>Your privacy matters</Text>
          <Text style={styles.body}>Everything below is true the moment you finish setup -- not a promise for later.</Text>
          <View style={styles.privacyList}>
            {PRIVACY_FEATURES.map(feature => (
              <View
                key={feature.title}
                style={[styles.privacyCard, {backgroundColor: ONB.surfaceContainer, borderColor: ONB.outlineVariant}]}>
                <View style={[styles.privacyIconTile, {backgroundColor: feature.tint}]}>
                  <feature.Icon size={22} color={feature.color} />
                </View>
                <View style={styles.privacyTextCol}>
                  <Text style={styles.privacyCardTitle}>{feature.title}</Text>
                  <Text style={styles.privacyCardDesc}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Slide 5: You're all set -- same photo background as the welcome
            slide, not the plain light surface every other slide uses. Logo
            is the same static mark as the welcome slide (no spin -- this
            closing screen shouldn't animate either), and the Zayla
            wordmark reappears here too, matching the welcome slide. */}
        <ImageBackground source={scenery} resizeMode="cover" style={[styles.page, styles.donePage, {width, height}]}>
          <LogoMark size={132} />
          <Text style={styles.heroBrand}>Zayla</Text>
          <Text style={styles.doneTitle}>You're all set!</Text>
          <Text style={styles.doneSubtitle}>
            Start your first conversation and experience the power of AI on your device.
          </Text>
        </ImageBackground>
      </ScrollView>

      {/* Floats on top of every slide -- including the welcome photo --
          instead of sitting in its own opaque strip beneath the ScrollView,
          so the photo (and every other slide's background) genuinely fills
          the full screen behind it. */}
      {step === STEP.welcome ? (
        // Welcome-only bottom layout, per the explicit reference spec:
        // button, then link, then a compact "N / total" counter with a
        // short centered bar right at the bottom edge -- a different order
        // and shape from every other slide's shared full-width bar above
        // the footer, so it's a separate block rather than a variant of
        // bottomOverlay/footer below.
        <View style={styles.welcomeBottom} pointerEvents="box-none">
          <PrimaryButton
            label="Get Started  →"
            onPress={() => goToStep(STEP.choose)}
            style={styles.welcomeButton}
            labelStyle={styles.buttonLabel}
          />
          <TouchableOpacity onPress={onDone} hitSlop={10} style={styles.welcomeLinkWrap}>
            <Text style={styles.welcomeLink}>I already have a model</Text>
          </TouchableOpacity>
          <View style={styles.welcomeProgressWrap}>
            <Text style={styles.welcomeProgressLabel}>
              {step + 1} / {SLIDE_COUNT}
            </Text>
            <View style={styles.welcomeProgressTrack}>
              <View style={[styles.welcomeProgressFill, {width: `${((step + 1) / SLIDE_COUNT) * 100}%`}]} />
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.bottomOverlay} pointerEvents="box-none">
          <View style={styles.progressTrack2}>
            <View
              style={[styles.progressFill, {width: `${((step + 1) / SLIDE_COUNT) * 100}%`, backgroundColor: ONB.accent}]}
            />
          </View>

          <View style={styles.footer}>
            {step === STEP.done ? (
              <>
                <PrimaryButton label="Start Chatting  →" onPress={onDone} labelStyle={styles.buttonLabel} />
                <TouchableOpacity onPress={finishToSettings} hitSlop={10} style={styles.centerLink}>
                  <Text style={[styles.linkLabel, {color: ONB.accent}]}>Explore Settings</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.linksRow}>
                <TouchableOpacity onPress={onDone} hitSlop={10}>
                  <Text style={[styles.linkLabel, {color: ONB.textMuted}]}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => goToStep(step + 1)}
                  hitSlop={10}
                  style={[styles.arrowButton, {backgroundColor: ONB.accent}]}>
                  <ArrowRight size={20} color={ONB.onAccent} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {flex: 1},
  // No height here -- each page passes an explicit {height} (from
  // useWindowDimensions, alongside {width}) inline instead of `100%`.
  // A horizontal ScrollView's row-direction content container doesn't
  // reliably resolve a percentage height down to children on this RN
  // version (confirmed live: ImageBackground's absolute-fill photo fell
  // short of the true bottom, leaving a plain white gap), so this uses a
  // concrete pixel value instead of relying on that resolution at all.
  page: {alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32},
  // Top-anchored now (matches the reference layout): logo + brand + heading
  // + subtitle cluster together just below the status bar, leaving the
  // photo's scenic lower half open behind the Get Started button/link that
  // bottomOverlay floats on top of. No scrim -- the reference shows dark
  // text sitting directly on the photo's own light sky, not white text on
  // a darkened photo.
  heroPage: {justifyContent: 'flex-start', paddingTop: 64, paddingBottom: FOOTER_RESERVE},
  heroTop: {alignItems: 'center', paddingHorizontal: 32},
  heroGradient: {position: 'absolute', top: 0, left: 0, right: 0},
  pageLight: {paddingTop: 60, paddingBottom: FOOTER_RESERVE, justifyContent: 'flex-start', alignItems: 'stretch'},
  donePage: {justifyContent: 'center', alignItems: 'center', paddingTop: 0},
  heroBrand: {
    fontFamily: FONT.brand,
    color: NAVY,
    fontSize: 38,
    textAlign: 'center',
    marginTop: 14,
  },
  heroHeading: {
    fontFamily: FONT.heading,
    color: NAVY,
    fontSize: 43,
    lineHeight: 45,
    textAlign: 'center',
    marginTop: 34,
  },
  heroSubtitle: {
    fontFamily: FONT.medium,
    color: NAVY_MUTED,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 25,
  },
  doneTitle: {
    fontFamily: FONT.heading,
    color: ONB.textPrimary,
    fontSize: 24,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  doneSubtitle: {
    fontFamily: FONT.body,
    color: ONB.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontFamily: FONT.heading,
    color: ONB.textPrimary,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontFamily: FONT.body,
    color: ONB.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  cardHeading: {fontFamily: FONT.semiBold, color: ONB.textPrimary, fontSize: 17},
  caption: {fontFamily: FONT.medium, color: ONB.textPrimary, fontSize: 13},
  small: {fontFamily: FONT.medium, fontSize: 11},
  modelList: {flex: 1},
  modelListContent: {paddingBottom: spacing.lg},
  hfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  hfIconTile: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hfTextCol: {flex: 1, gap: 2},
  hfTitle: {fontFamily: FONT.semiBold, color: ONB.textPrimary, fontSize: 15},
  hfDesc: {fontFamily: FONT.body, color: ONB.textSecondary, fontSize: 12, lineHeight: 16},
  downloadCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  downloadFactsRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2},
  downloadProgressSlot: {marginTop: spacing.md, marginBottom: spacing.sm, gap: 6},
  progressTitle: {fontFamily: FONT.semiBold, color: ONB.textPrimary, fontSize: 15},
  progressTrack: {height: 6, borderRadius: radius.pill, overflow: 'hidden'},
  progressFillBar: {height: '100%', borderRadius: radius.pill},
  tipCard: {borderRadius: radius.md, padding: spacing.sm, gap: 4},
  tipLine: {fontFamily: FONT.semiBold, fontSize: 11},
  mockPauseButton: {
    marginTop: spacing.sm,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockPauseLabel: {fontFamily: FONT.semiBold, color: ONB.onAccent, fontSize: 15},
  mockCancelLink: {
    fontFamily: FONT.medium,
    color: ONB.textMuted,
    fontSize: 15,
    textAlign: 'center',
    paddingTop: spacing.sm,
  },
  privacyList: {width: '100%', gap: spacing.sm},
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  privacyIconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyTextCol: {flex: 1, gap: 2},
  privacyCardTitle: {fontFamily: FONT.semiBold, color: ONB.textPrimary, fontSize: 15},
  privacyCardDesc: {fontFamily: FONT.body, color: ONB.textSecondary, fontSize: 13, lineHeight: 18},
  bottomOverlay: {position: 'absolute', left: 0, right: 0, bottom: 0},
  // Welcome-only bottom layout (see JSX comment): button, link, then a
  // compact centered "N / total" counter + short bar right at the bottom
  // edge -- a different shape/order from the shared bottomOverlay/footer
  // every other slide uses, per the reference spec.
  welcomeBottom: {position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 28, paddingBottom: 16},
  welcomeButton: {borderRadius: radius.pill, paddingVertical: 15},
  welcomeLinkWrap: {alignItems: 'center', paddingTop: 22},
  welcomeLink: {fontFamily: FONT.semiBold, color: ONB.accent, fontSize: 15},
  welcomeProgressWrap: {alignItems: 'center', marginTop: 22},
  welcomeProgressLabel: {fontFamily: FONT.medium, color: NAVY_MUTED, fontSize: 12, marginBottom: 6},
  welcomeProgressTrack: {
    width: 90,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(16,41,74,0.15)',
    overflow: 'hidden',
  },
  welcomeProgressFill: {height: '100%', borderRadius: radius.pill, backgroundColor: ONB.accent},
  progressTrack2: {
    height: 3,
    marginHorizontal: 32,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(128,128,128,0.25)',
    overflow: 'hidden',
  },
  progressFill: {height: '100%', borderRadius: radius.pill},
  footer: {paddingHorizontal: 24, paddingTop: spacing.md, paddingBottom: 24, gap: spacing.sm},
  buttonLabel: {fontFamily: FONT.semiBold},
  linkLabel: {fontFamily: FONT.medium, fontSize: 15},
  centerLink: {alignItems: 'center', paddingTop: spacing.xs},
  linksRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  arrowButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
