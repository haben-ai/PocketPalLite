import React, {useEffect, useState} from 'react';
import {Platform, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {getCpuCoreCount} from '../services/deviceCores';
import {getStoredDeviceTier} from '../services/deviceAnalyzer';
import {getModelById} from '../data/models';
import {DeviceTier} from '../types';
import {Card} from './Card';
import {TierBadge} from './Badge';
import {ChevronDownIcon} from './Icons';

type Summary = {
  label: string;
  coreCount: number | null;
  totalRamGB: number;
  tier: DeviceTier | null;
};

/**
 * The one-time device analysis (see services/deviceAnalyzer.ts -- it runs
 * exactly once, ever, right after onboarding, never re-triggered here)
 * surfaced as a small collapsible card: real brand/model/OS, RAM, core
 * count, and the tier + model this device got recommended. Self-contained
 * (fetches its own data on mount) so it drops into any screen -- Models,
 * Discover, Benchmark -- without prop wiring.
 */
export function DeviceAnalysisCard({style}: {style?: object}) {
  const {colors, typography} = useTheme();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    (async () => {
      const [coreCount, totalMemoryBytes, tier] = await Promise.all([
        getCpuCoreCount(),
        DeviceInfo.getTotalMemory(),
        getStoredDeviceTier(),
      ]);
      const osLabel = Platform.OS === 'android' ? 'Android' : 'iOS';
      setSummary({
        label: `${DeviceInfo.getBrand()} ${DeviceInfo.getModel()} • ${osLabel} ${DeviceInfo.getSystemVersion()}`,
        coreCount,
        totalRamGB: totalMemoryBytes / 1e9,
        tier,
      });
    })();
  }, []);

  if (!summary) {
    return null;
  }

  const recommendedModel = summary.tier ? getModelById(summary.tier.recommendedModelId) : undefined;

  return (
    <Card style={[styles.card, style]}>
      <TouchableOpacity style={styles.header} onPress={() => setOpen(v => !v)} activeOpacity={0.7}>
        <View style={styles.headerText}>
          <Text style={typography.heading}>Device Analysis</Text>
          <Text style={[typography.caption, {color: colors.textSecondary}]} numberOfLines={1}>
            {summary.label}
          </Text>
        </View>
        <View style={{transform: [{rotate: open ? '180deg' : '0deg'}]}}>
          <ChevronDownIcon size={18} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
      {open && (
        <View style={styles.details}>
          <View style={styles.factsRow}>
            <Text style={[typography.caption, {color: colors.textSecondary}]}>
              {summary.coreCount ? `${summary.coreCount} cores • ` : ''}
              {summary.totalRamGB.toFixed(1)} GB RAM
            </Text>
          </View>
          {summary.tier && (
            <View style={styles.tierRow}>
              <TierBadge tier={summary.tier.tier} />
              {recommendedModel && (
                <Text style={[typography.caption, styles.recommendedText, {color: colors.textSecondary}]}>
                  Recommended: {recommendedModel.name}
                </Text>
              )}
            </View>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {marginBottom: spacing.md},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  headerText: {flex: 1, marginRight: spacing.sm, gap: 2},
  details: {marginTop: spacing.sm, gap: spacing.xs},
  factsRow: {flexDirection: 'row'},
  tierRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
  recommendedText: {flex: 1},
});
