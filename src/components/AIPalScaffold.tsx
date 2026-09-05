import React from 'react';
import {SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View, ViewStyle} from 'react-native';
import {spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {MenuIcon} from './Icons';

/**
 * Shared screen-level chrome: safe area + flat background + standard
 * horizontal padding. Every screen previously inlined this combination
 * separately -- this is the one place it lives now.
 *
 * `onBack`, when passed, renders a hamburger-icon row above the content --
 * with no bottom tab bar any more, Models/AIPals/Discover/Settings/
 * Benchmark/App Info are only reachable via the sidebar, and this always
 * returns to Chat (the app's main navigation), not a literal "previous
 * screen" -- the hamburger glyph signals that destination rather than a
 * back-arrow's "undo the last step" implication.
 */
export function AIPalScaffold({
  children,
  scroll,
  contentStyle,
  onBack,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  onBack?: () => void;
}) {
  const {colors} = useTheme();
  return (
    <SafeAreaView style={[styles.root, {backgroundColor: colors.background}]}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.backRow} hitSlop={8}>
          <MenuIcon color={colors.textPrimary} />
        </TouchableOpacity>
      )}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.content, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  flex: {flex: 1},
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  backRow: {
    // Extra left padding vs. the standard spacing.md: on some devices the
    // system's edge back-swipe gesture zone swallows taps that close to the
    // true screen edge before the app sees them (see ChatScreen's header
    // for the same fix on the hamburger button).
    paddingLeft: spacing.xl + spacing.md,
    paddingRight: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
});
