import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Cpu, Globe, MessageCircle, Server, Smartphone} from 'lucide-react-native';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';

function IconNode({
  icon: Icon,
  color,
  bg,
  size = 22,
}: {
  // See OnboardingScreen.tsx's own comment on this same `any` -- lucide's
  // generated icon components don't structurally match a plain
  // {size,color} ComponentType at the type level, only at the call site.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  color: string;
  bg: string;
  size?: number;
}) {
  const diameter = size * 2.4;
  return (
    <View
      style={[
        styles.nodeCircle,
        {width: diameter, height: diameter, borderRadius: diameter / 2, backgroundColor: bg},
      ]}>
      <Icon size={size} color={color} />
    </View>
  );
}

function FlowArrow({color}: {color: string}) {
  return <Text style={[styles.arrow, {color}]}>{'→'}</Text>;
}

/**
 * "No internet required" panel's centerpiece: a phone->model->response flow
 * (this app's real, on-device shape), then a Cloud-AI-vs-Your-AI comparison
 * pair so the contrast this panel's body text describes is actually shown,
 * not just stated.
 */
export function LocalAiFlowDiagram() {
  const {colors, typography} = useTheme();
  return (
    <View style={styles.flowWrap}>
      <View style={styles.flowRow}>
        <IconNode icon={Smartphone} color={colors.accent} bg={colors.accentMuted} />
        <FlowArrow color={colors.textMuted} />
        <IconNode icon={Cpu} color={colors.accent} bg={colors.accentMuted} />
        <FlowArrow color={colors.textMuted} />
        <IconNode icon={MessageCircle} color={colors.accent} bg={colors.accentMuted} />
      </View>
      <View style={styles.flowLabelsRow}>
        <Text style={[typography.small, styles.flowLabel, {color: colors.textMuted}]}>Your phone</Text>
        <Text style={[typography.small, styles.flowLabel, {color: colors.textMuted}]}>AI model</Text>
        <Text style={[typography.small, styles.flowLabel, {color: colors.textMuted}]}>Your response</Text>
      </View>

      <View
        style={[
          styles.compareCard,
          {backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant},
        ]}>
        <Text style={[typography.caption, styles.compareTitle, {color: colors.textSecondary}]}>
          Cloud AI
        </Text>
        <View style={styles.flowRowCompact}>
          <IconNode icon={Smartphone} color={colors.textMuted} bg={colors.surfaceContainerHigh} size={16} />
          <FlowArrow color={colors.textMuted} />
          <IconNode icon={Globe} color={colors.textMuted} bg={colors.surfaceContainerHigh} size={16} />
          <FlowArrow color={colors.textMuted} />
          <IconNode icon={Server} color={colors.textMuted} bg={colors.surfaceContainerHigh} size={16} />
          <FlowArrow color={colors.textMuted} />
          <IconNode icon={MessageCircle} color={colors.textMuted} bg={colors.surfaceContainerHigh} size={16} />
        </View>
      </View>

      <View
        style={[
          styles.compareCard,
          styles.compareCardHighlighted,
          {backgroundColor: colors.accentMuted, borderColor: colors.accent},
        ]}>
        <Text style={[typography.caption, styles.compareTitle, {color: colors.accent}]}>Your AI</Text>
        <View style={styles.flowRowCompact}>
          <IconNode icon={Smartphone} color={colors.accent} bg={colors.surface} size={16} />
          <FlowArrow color={colors.accent} />
          <IconNode icon={Cpu} color={colors.accent} bg={colors.surface} size={16} />
          <FlowArrow color={colors.accent} />
          <IconNode icon={MessageCircle} color={colors.accent} bg={colors.surface} size={16} />
        </View>
      </View>
    </View>
  );
}

const LANGUAGE_SAMPLES = ['Hello', 'Français', 'Español', 'العربية', '中文', 'ትግርኛ'];

/** "Multilingual & versatile" panel's centerpiece: a globe ringed by a few
 * sample language bubbles -- concrete evidence for the panel's claim rather
 * than an abstract globe glyph alone. */
export function LanguageBubbles() {
  const {colors, typography} = useTheme();
  return (
    <View style={styles.languageWrap}>
      <View style={[styles.globeCircle, {backgroundColor: colors.accentMuted}]}>
        <Globe size={32} color={colors.accent} />
      </View>
      <View style={styles.bubbleGrid}>
        {LANGUAGE_SAMPLES.map(sample => (
          <View
            key={sample}
            style={[
              styles.languageBubble,
              {backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant},
            ]}>
            <Text style={[typography.caption, {color: colors.textPrimary}]}>{sample}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nodeCircle: {alignItems: 'center', justifyContent: 'center'},
  arrow: {fontSize: 18, marginHorizontal: 2},
  flowWrap: {alignItems: 'center', gap: spacing.md, width: '100%'},
  flowRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
  flowRowCompact: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs},
  flowLabelsRow: {flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 2},
  flowLabel: {width: 78, textAlign: 'center'},
  compareCard: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  compareCardHighlighted: {borderWidth: 1.5},
  compareTitle: {fontWeight: '700', marginBottom: 2},
  languageWrap: {alignItems: 'center', gap: spacing.lg, width: '100%'},
  globeCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  languageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
