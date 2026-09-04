import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';

/**
 * A titled section that can be collapsed to just its header -- used by the
 * Models screen for "Ready to Use" / "Available to Download" so a long
 * catalog doesn't force endless scrolling to reach what you actually want.
 */
export function CollapsibleSection({
  title,
  subtitle,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Shown next to the title, e.g. item count. */
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const {colors, typography} = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        onPress={() => setOpen(v => !v)}
        style={styles.header}
        activeOpacity={0.7}
        hitSlop={4}>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={[typography.heading, styles.title, {color: colors.textSecondary}]}>
              {title}
            </Text>
            {count !== undefined && (
              <View style={[styles.countBadge, {backgroundColor: colors.surfaceRaised}]}>
                <Text style={[typography.small, {color: colors.textMuted}]}>{count}</Text>
              </View>
            )}
          </View>
          {subtitle ? (
            <Text style={[typography.small, styles.subtitle]}>{subtitle}</Text>
          ) : null}
        </View>
        <Text style={[styles.chevron, {color: colors.textMuted}]}>{open ? '⌃' : '⌄'}</Text>
      </TouchableOpacity>
      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {marginBottom: spacing.lg},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  headerText: {flex: 1},
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
  title: {
    textTransform: 'uppercase',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  countBadge: {
    minWidth: 20,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {marginTop: 2},
  chevron: {fontSize: 18, fontWeight: '700', paddingHorizontal: spacing.xs},
  body: {marginTop: spacing.xs},
});
