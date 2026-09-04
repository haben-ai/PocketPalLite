import React, {Children, isValidElement} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {Card} from './Card';

/**
 * A titled card grouping several `SettingRow`s (rendered with `bare`) under
 * one shared background, separated by hairlines -- matches the grouped-card
 * layout of PocketPal AI's Settings screen, in place of the previous "one
 * card per row" layout.
 */
export function SettingSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const {colors, typography} = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View style={styles.wrapper}>
      <Text style={[typography.heading, styles.title, {color: colors.textSecondary}]}>{title}</Text>
      {description ? <Text style={[typography.caption, styles.description]}>{description}</Text> : null}
      <Card style={styles.card}>
        {rows.map((row, index) => (
          <View
            key={index}
            style={index > 0 ? [styles.divider, {borderTopColor: colors.outlineVariant}] : undefined}>
            {row}
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {marginBottom: spacing.lg},
  title: {
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  description: {marginBottom: spacing.sm},
  card: {padding: spacing.md, borderRadius: radius.lg},
  divider: {borderTopWidth: 1},
});
