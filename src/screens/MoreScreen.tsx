import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {AppScreen} from '../navigation/types';
import {AIPalScaffold} from '../components/AIPalScaffold';
import {Card} from '../components/Card';
import {ChevronDownIcon, SparkleIcon, SpeedometerIcon, GearIcon, InfoIcon} from '../components/Icons';

type Props = {onNavigate: (screen: AppScreen) => void};

/**
 * Everything that doesn't get its own bottom-tab slot -- Discover,
 * Benchmark, Settings, App Info. The bottom tab bar's "More" tab lands
 * here; Chat/Models/AIPals have real tabs of their own.
 */
export function MoreScreen({onNavigate}: Props) {
  const {colors, typography} = useTheme();

  const ITEMS: {
    icon: React.ReactNode;
    label: string;
    description: string;
    screen: AppScreen;
  }[] = [
    {
      icon: <SparkleIcon color={colors.accent} />,
      label: 'Discover',
      description: 'Ideas for what to try next.',
      screen: {name: 'discover'},
    },
    {
      icon: <SpeedometerIcon color={colors.accent} />,
      label: 'Benchmark',
      description: 'Measure real on-device generation speed.',
      screen: {name: 'benchmark'},
    },
    {
      icon: <GearIcon color={colors.accent} />,
      label: 'Settings',
      description: 'Model, memory, and app preferences.',
      screen: {name: 'settings'},
    },
    {
      icon: <InfoIcon color={colors.accent} />,
      label: 'App Info',
      description: 'Version, privacy, open source licenses.',
      screen: {name: 'appInfo'},
    },
  ];

  return (
    <AIPalScaffold scroll onBack={() => onNavigate({name: 'chat'})}>
      <Text style={typography.title}>More</Text>
      <Text style={[typography.caption, styles.subtitle, {color: colors.textSecondary}]}>
        Everything else, in one place.
      </Text>

      {ITEMS.map(item => (
        <TouchableOpacity key={item.label} onPress={() => onNavigate(item.screen)} activeOpacity={0.7}>
          <Card style={styles.row}>
            <View style={[styles.iconTile, {backgroundColor: colors.accentMuted}]}>{item.icon}</View>
            <View style={styles.rowText}>
              <Text style={typography.body}>{item.label}</Text>
              <Text style={[typography.caption, {color: colors.textSecondary}]}>{item.description}</Text>
            </View>
            <View style={styles.chevron}>
              <ChevronDownIcon size={18} color={colors.textMuted} />
            </View>
          </Card>
        </TouchableOpacity>
      ))}
    </AIPalScaffold>
  );
}

const styles = StyleSheet.create({
  subtitle: {marginTop: spacing.xs, marginBottom: spacing.md},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {flex: 1, gap: 2},
  chevron: {transform: [{rotate: '-90deg'}]},
});
