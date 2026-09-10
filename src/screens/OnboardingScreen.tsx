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
import {EyeOff, ShieldCheck, WifiOff} from 'lucide-react-native';
import {useTheme} from '../theme/ThemeContext';
import {PrimaryButton} from '../components/PrimaryButton';
import {OnboardingHero} from '../components/OnboardingHero';

type Panel = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lucide's
  // generated icon components carry prop-types metadata that doesn't
  // structurally match a plain {size,color} ComponentType; `any` here just
  // sidesteps that mismatch, the actual props passed at each call site are
  // still {size, color}.
  icon: React.ComponentType<any>;
  accent: string;
  title: string;
  body: string;
};

// One cohesive 3-color trio (cool blue, cool teal, warm amber) -- the only
// color outside the app's normal monochrome theme, reserved for this
// first-run welcome flow.
const PANELS: Panel[] = [
  {
    icon: ShieldCheck,
    accent: '#5B7FFF',
    title: 'Runs 100% On Your Device',
    body: 'Every model runs locally, right here on your phone. Nothing you type is ever sent to a server -- not your messages, not your data, nothing.',
  },
  {
    icon: EyeOff,
    accent: '#2DD4A8',
    title: 'No Accounts. No Tracking.',
    body: "There's no sign-up, no analytics, and nothing watching what you do. PocketPal was built to work for you, not to study you.",
  },
  {
    icon: WifiOff,
    accent: '#FF9F5B',
    title: 'Works Fully Offline',
    body: 'Download a model once, then chat anywhere -- no Wi-Fi, no signal, no data plan needed. Your AI companion, ready whenever you are.',
  },
];

export function OnboardingScreen({onDone}: {onDone: () => void}) {
  const {colors, typography} = useTheme();
  const {width} = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);
  const isLast = step === PANELS.length - 1;

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

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}>
        {PANELS.map((panel, i) => (
          <View key={i} style={[styles.page, {width}]}>
            <View style={styles.hero}>
              <OnboardingHero icon={panel.icon} accent={panel.accent} />
            </View>
            <Text style={[typography.title, styles.title]}>{panel.title}</Text>
            <Text style={[typography.body, styles.body, {color: colors.textSecondary}]}>
              {panel.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {PANELS.map((panel, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {backgroundColor: colors.border},
              i === step && [styles.dotActive, {backgroundColor: panel.accent}],
            ]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        {isLast ? (
          <PrimaryButton label="Get Started" onPress={onDone} />
        ) : (
          <View style={styles.linksRow}>
            <TouchableOpacity onPress={onDone} hitSlop={10}>
              <Text style={[typography.body, {color: colors.textMuted}]}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => goToStep(step + 1)} hitSlop={10}>
              <Text style={[typography.body, styles.nextLabel, {color: PANELS[step].accent}]}>
                Next
              </Text>
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
  hero: {marginBottom: 28},
  title: {textAlign: 'center', marginBottom: 12},
  body: {textAlign: 'center', lineHeight: 22},
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {width: 22},
  footer: {paddingHorizontal: 24, paddingBottom: 24, minHeight: 48, justifyContent: 'center'},
  linksRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  nextLabel: {fontWeight: '700'},
});
