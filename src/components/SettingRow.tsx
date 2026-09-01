import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, spacing, typography} from '../theme';
import {Card} from './Card';

export function SettingRow({
  label,
  description,
  control,
}: {
  label: string;
  description?: string;
  control: React.ReactNode;
}) {
  return (
    <Card style={styles.card}>
      <View style={styles.text}>
        <Text style={typography.body}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {control}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  text: {flex: 1},
  description: {...typography.caption, color: colors.textSecondary, marginTop: 2},
});
