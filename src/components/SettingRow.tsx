import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {Card} from './Card';

export function SettingRow({
  label,
  description,
  control,
  bare,
}: {
  label: string;
  description?: string;
  control: React.ReactNode;
  /** Skip the row's own Card/margin -- used when nested inside a
   * SettingSection, which supplies one shared card for the whole group. */
  bare?: boolean;
}) {
  const {typography} = useTheme();
  const content = (
    <>
      <View style={styles.text}>
        <Text style={typography.body}>{label}</Text>
        {description ? <Text style={[typography.caption, styles.description]}>{description}</Text> : null}
      </View>
      {control}
    </>
  );

  if (bare) {
    return <View style={styles.bareRow}>{content}</View>;
  }

  return <Card style={styles.card}>{content}</Card>;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  bareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  text: {flex: 1},
  description: {marginTop: 2},
});
