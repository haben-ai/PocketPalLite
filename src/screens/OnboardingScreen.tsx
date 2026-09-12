import React, {useRef, useState} from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {ArrowRight, Check, ClipboardList, FileText, Languages, Lock, Sparkles} from 'lucide-react-native';
import {useTheme} from '../theme/ThemeContext';
import {PrimaryButton} from '../components/PrimaryButton';
import {AppIconMark} from '../components/AppIconMark';
import {OnboardingScenery} from '../components/OnboardingScenery';
import {LocalAiFlowDiagram, LanguageBubbles} from '../components/OnboardingDiagrams';
import {radius, spacing} from '../theme';
import {KEYS, setJSON} from '../storage/asyncStore';

const CHECKLIST = [
  '100% offline after download',
  'No data leaves your device',
  'Your conversations are yours',
];

const CONTENT_ICONS: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see
  // OnboardingDiagrams.tsx's identical IconNode comment for why.
  icon: React.ComponentType<any>;
  label: string;
}[] = [
  {icon: FileText, label: 'Text'},
  {icon: ClipboardList, label: 'Summarize'},
  {icon: Languages, label: 'Translate'},
  {icon: Sparkles, label: 'Create'},
];

const SLIDE_COUNT = 5;

export function OnboardingScreen({onDone}: {onDone: () => void}) {
  const {colors, typography} = useTheme();
  const {width} = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);

  const goToStep = (next: number) => {
    setStep(next);
    scrollRef.current?.scrollTo({x: next * width, animated: true});
  };

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    if (index !== step) {
      setStep(index);
    }
  };

  const finishToSettings = async () => {
    // Rides the same "resume where you left off" mechanism ChatScreen's
    // background/foreground restore uses (RootNavigator reads this same
    // key on its very first mount) -- "Explore Settings" genuinely lands
    // there instead of just being a relabeled "Start Chatting".
    await setJSON(KEYS.lastScreen, {name: 'settings'}).catch(() => undefined);
    onDone();
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}>
        {/* Slide 1: Welcome */}
        <View style={[styles.page, styles.heroPage, {width}]}>
          <OnboardingScenery accent={colors.accent} />
          <View style={styles.heroBlock}>
            <AppIconMark size={72} />
            <Text style={styles.heroTitle}>Zayla</Text>
            <Text style={styles.heroTagline}>AI that stays with you.</Text>
            <Text style={styles.heroSubtitle}>Powerful AI. Private, offline, and on your device.</Text>
          </View>
        </View>

        {/* Slide 2: No internet required */}
        <View style={[styles.page, styles.pageLight, {width, backgroundColor: colors.background}]}>
          <Text style={[typography.title, styles.title]}>No internet required</Text>
          <Text style={[typography.body, styles.body, {color: colors.textSecondary}]}>
            Once your model is downloaded, your conversations can run entirely on your device.
          </Text>
          <View style={styles.diagramSlot}>
            <LocalAiFlowDiagram />
          </View>
        </View>

        {/* Slide 3: Multilingual & versatile */}
        <View style={[styles.page, styles.pageLight, {width, backgroundColor: colors.background}]}>
          <Text style={[typography.title, styles.title]}>Multilingual & versatile</Text>
          <Text style={[typography.body, styles.body, {color: colors.textSecondary}]}>
            Chat in the language you prefer. Your AI understands and responds in multiple languages.
          </Text>
          <View style={styles.diagramSlot}>
            <LanguageBubbles />
            <View style={styles.iconRow}>
              {CONTENT_ICONS.map(({icon: Icon, label}) => (
                <View key={label} style={styles.iconRowItem}>
                  <Icon size={20} color={colors.textSecondary} />
                  <Text style={[typography.small, {color: colors.textMuted}]}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Slide 4: Your privacy matters */}
        <View style={[styles.page, styles.pageLight, {width, backgroundColor: colors.background}]}>
          <Text style={[typography.title, styles.title]}>Your privacy matters</Text>
          <Text style={[typography.body, styles.body, {color: colors.textSecondary}]}>
            Your conversations stay on your device. No data is sent to the cloud.
          </Text>
          <View style={styles.diagramSlot}>
            <View style={[styles.shieldCircle, {backgroundColor: colors.accentMuted}]}>
              <Lock size={36} color={colors.accent} />
            </View>
            <View style={styles.checklist}>
              {CHECKLIST.map(item => (
                <View key={item} style={styles.checklistRow}>
                  <Check size={16} color={colors.success} />
                  <Text style={[typography.body, {color: colors.textPrimary}]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Slide 5: You're all set */}
        <View style={[styles.page, styles.heroPage, {width}]}>
          <OnboardingScenery accent={colors.accent} />
          <View style={styles.heroBlock}>
            <AppIconMark size={72} />
            <Text style={styles.heroTitle}>You're all set!</Text>
            <Text style={styles.heroSubtitle}>
              Start your first conversation and experience the power of AI on your device.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {width: `${((step + 1) / SLIDE_COUNT) * 100}%`, backgroundColor: colors.accent},
          ]}
        />
      </View>

      <View style={styles.footer}>
        {step === 0 ? (
          <>
            <PrimaryButton label="Get Started  →" onPress={() => goToStep(1)} />
            <TouchableOpacity onPress={onDone} hitSlop={10} style={styles.centerLink}>
              <Text style={[typography.body, {color: colors.textMuted}]}>I already have a model</Text>
            </TouchableOpacity>
          </>
        ) : step === SLIDE_COUNT - 1 ? (
          <>
            <PrimaryButton label="Start Chatting  →" onPress={onDone} />
            <TouchableOpacity onPress={finishToSettings} hitSlop={10} style={styles.centerLink}>
              <Text style={[typography.body, {color: colors.accent}]}>Explore Settings</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.linksRow}>
            <TouchableOpacity onPress={onDone} hitSlop={10}>
              <Text style={[typography.body, {color: colors.textMuted}]}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => goToStep(step + 1)}
              hitSlop={10}
              style={[styles.arrowButton, {backgroundColor: colors.accent}]}>
              <ArrowRight size={20} color={colors.onAccent} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {flex: 1},
  page: {alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32},
  // Explicit height (a horizontal ScrollView's pages don't otherwise
  // stretch to fill it -- they shrink-wrap their content) so
  // OnboardingScenery's absolute-fill background actually reaches the
  // bottom of the slide instead of cutting off wherever the centered
  // content block happens to end.
  heroPage: {height: '100%', justifyContent: 'flex-end', paddingBottom: 48},
  pageLight: {paddingTop: 60},
  heroBlock: {alignItems: 'center', paddingHorizontal: 32},
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  heroTagline: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  title: {textAlign: 'center', marginBottom: 12},
  body: {textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl},
  diagramSlot: {width: '100%', alignItems: 'center', gap: spacing.lg},
  iconRow: {flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: spacing.sm},
  iconRowItem: {alignItems: 'center', gap: 6},
  shieldCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklist: {gap: spacing.sm, alignSelf: 'stretch', paddingHorizontal: spacing.lg},
  checklistRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  progressTrack: {
    height: 3,
    marginHorizontal: 32,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(128,128,128,0.25)',
    overflow: 'hidden',
  },
  progressFill: {height: '100%', borderRadius: radius.pill},
  footer: {paddingHorizontal: 24, paddingTop: spacing.md, paddingBottom: 24, gap: spacing.sm},
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
