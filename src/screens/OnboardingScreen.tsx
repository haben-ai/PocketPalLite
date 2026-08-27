import React, {useState} from 'react';
import {SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {colors, spacing, typography} from '../theme';
import {PrimaryButton} from '../components/PrimaryButton';

type Panel = {
  emoji: string;
  title: string;
  body: string;
};

const PANELS: Panel[] = [
  {
    emoji: '🔒',
    title: 'Everything stays on your phone',
    body: 'PocketPal runs AI models directly on your device. No internet is needed to chat, and nothing you type ever leaves your phone.',
  },
  {
    emoji: '📦',
    title: 'You choose what to download',
    body: "Nothing downloads automatically. Browse a library of models sized for weak, medium, and strong phones, and download only the ones you want to use.",
  },
  {
    emoji: '🎯',
    title: "Not sure which model fits?",
    body: 'Tap "Analyze My Phone" and we\'ll check your device and recommend the best model for it.',
  },
];

export function OnboardingScreen({onDone}: {onDone: () => void}) {
  const [step, setStep] = useState(0);
  const panel = PANELS[step];
  const isLast = step === PANELS.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>{panel.emoji}</Text>
        <Text style={styles.title}>{panel.title}</Text>
        <Text style={styles.body}>{panel.body}</Text>
      </View>

      <View style={styles.dots}>
        {PANELS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === step && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label={isLast ? 'Get Started' : 'Next'}
          onPress={() => (isLast ? onDone() : setStep(step + 1))}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emoji: {fontSize: 64, marginBottom: spacing.lg},
  title: {...typography.title, textAlign: 'center', marginBottom: spacing.md},
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {backgroundColor: colors.accent, width: 22},
  footer: {paddingHorizontal: spacing.lg, paddingBottom: spacing.lg},
});
