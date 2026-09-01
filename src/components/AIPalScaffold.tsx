import React from 'react';
import {SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, ViewStyle} from 'react-native';
import {colors, spacing} from '../theme';

/**
 * Shared screen-level chrome: safe area + flat background + standard
 * horizontal padding. Every screen previously inlined this combination
 * separately -- this is the one place it lives now.
 *
 * `onBack`, when passed, renders a minimal back row above the content --
 * with no bottom tab bar any more, Models/AIPals/Discover/Settings are only
 * reachable via the sidebar and need their own way back to Chat.
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
  return (
    <SafeAreaView style={styles.root}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.backRow} hitSlop={8}>
          <Text style={styles.backLabel}>‹ Back</Text>
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
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {flex: 1},
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  backRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  backLabel: {color: colors.textPrimary, fontSize: 15, fontWeight: '600'},
});
