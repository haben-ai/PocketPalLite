import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, radius} from '../theme';
import {ModelCapability, ModelTier} from '../types';

const TIER_STYLES: Record<ModelTier, {fg: string; bg: string; label: string}> = {
  weak: {fg: colors.tierWeak, bg: colors.tierWeakBg, label: 'Weak'},
  medium: {fg: colors.tierMedium, bg: colors.tierMediumBg, label: 'Medium'},
  strong: {fg: colors.tierStrong, bg: colors.tierStrongBg, label: 'Strong'},
};

export function TierBadge({tier}: {tier: ModelTier}) {
  const style = TIER_STYLES[tier];
  return (
    <View style={[styles.badge, {backgroundColor: style.bg}]}>
      <View style={[styles.dot, {backgroundColor: style.fg}]} />
      <Text style={[styles.label, {color: style.fg}]}>{style.label}</Text>
    </View>
  );
}

const CAPABILITY_STYLES: Record<
  ModelCapability,
  {fg: string; bg: string; label: string}
> = {
  text: {fg: colors.capabilityText, bg: colors.capabilityTextBg, label: 'Text'},
  vision: {
    fg: colors.capabilityVision,
    bg: colors.capabilityVisionBg,
    label: 'Vision',
  },
};

/** Compact tag distinguishing text-only models from vision (image) models. */
export function CapabilityBadge({
  capability,
  compact,
}: {
  capability: ModelCapability;
  compact?: boolean;
}) {
  const style = CAPABILITY_STYLES[capability];
  return (
    <View
      style={[
        styles.badge,
        compact && styles.badgeCompact,
        {backgroundColor: style.bg},
      ]}>
      <Text style={[styles.label, compact && styles.labelCompact, {color: style.fg}]}>
        {style.label}
      </Text>
    </View>
  );
}

export function Chip({label}: {label: string}) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    gap: 6,
    alignSelf: 'flex-start',
  },
  dot: {width: 6, height: 6, borderRadius: 3},
  label: {fontSize: 12, fontWeight: '700'},
  badgeCompact: {paddingHorizontal: 6, paddingVertical: 2},
  labelCompact: {fontSize: 10},
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  chipLabel: {fontSize: 12, fontWeight: '600', color: colors.textSecondary},
});
