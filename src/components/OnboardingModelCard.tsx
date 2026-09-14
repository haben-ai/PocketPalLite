import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {radius, spacing} from '../theme';
import {lightColors} from '../theme/light';
import {ModelRowInfo, tierSpecPair, tierTileColors, formatSize} from './ModelCard';
import {SpecChip} from './Badge';
import {VendorLogo} from './VendorLogo';
import {StarIcon, CheckIcon} from './Icons';

/** Onboarding-only Nunito Sans faces (static weight instances bundled at
 * android/app/src/main/assets/fonts/NunitoSans-*.ttf) -- kept local to this
 * file rather than shared with the app's own typography system, since
 * onboarding intentionally uses a different font from the rest of the app
 * (explicit request) and always renders in the light palette below
 * regardless of the device's system theme (also explicit -- onboarding
 * must always read as white/blue, never the app's own dark mode). */
const FONT = {medium: 'NunitoSans-Medium', semiBold: 'NunitoSans-SemiBold'};
const C = lightColors;

/**
 * Onboarding-only "choose a model" card. Explicitly non-interactive/static
 * (per request -- onboarding's content screens are a mockup of the real UI,
 * not functioning controls): renders the recommended/pre-selected model
 * with a filled radio and every other model unselected, but nothing here
 * responds to touch. Still reuses ModelCard.tsx's tier-tinted spec-pair
 * logic (tierSpecPair/tierTileColors/formatSize) so the visual vocabulary
 * matches the real Models tab.
 */
export function OnboardingModelCard({
  model,
  selected,
  recommended,
}: {
  model: ModelRowInfo;
  selected: boolean;
  recommended?: boolean;
}) {
  const tile = tierTileColors(model.tier, C);
  const specPair = tierSpecPair(model.tier, recommended);

  return (
    <View
      style={[
        styles.card,
        {backgroundColor: C.surfaceContainer, borderColor: C.outlineVariant},
        selected && [styles.selected, {borderColor: C.accent, backgroundColor: C.accentMuted}],
      ]}>
      {recommended && (
        <View style={styles.recommendedRow}>
          <StarIcon size={13} color={C.accent} />
          <Text style={[styles.recommendedLabel, {color: C.accent}]}>Recommended for your device</Text>
        </View>
      )}
      <View style={styles.row}>
        <View style={[styles.iconTile, {backgroundColor: tile.bg}]}>
          <VendorLogo vendor={model.vendor} size={20} mutedColor={tile.fg} />
        </View>
        <View style={styles.nameColumn}>
          <Text style={[styles.name, {color: C.textPrimary}]} numberOfLines={1}>
            {model.name}
          </Text>
          <Text style={[styles.size, {color: C.textMuted}]}>~ {formatSize(model.sizeBytes)}</Text>
        </View>
        <View
          style={[
            styles.radio,
            {borderColor: selected ? C.accent : C.outline},
            selected && {backgroundColor: C.accent},
          ]}>
          {selected && <CheckIcon size={13} color={C.onAccent} />}
        </View>
      </View>
      {specPair && (
        <View style={styles.specRow}>
          <SpecChip label={specPair[0]} fg={tile.fg} bg={tile.bg} />
          <SpecChip label={specPair[1]} fg={tile.fg} bg={tile.bg} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  selected: {borderWidth: 1.5},
  recommendedRow: {flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.sm},
  recommendedLabel: {fontFamily: FONT.semiBold, fontSize: 11},
  row: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameColumn: {flex: 1, gap: 2},
  name: {fontFamily: FONT.semiBold, fontSize: 17},
  size: {fontFamily: FONT.medium, fontSize: 11},
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specRow: {flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, marginLeft: 52},
});
