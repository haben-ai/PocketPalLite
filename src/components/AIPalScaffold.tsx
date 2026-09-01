import React from 'react';
import {SafeAreaView, ScrollView, StyleSheet, View, ViewStyle} from 'react-native';
import {colors, spacing} from '../theme';

/**
 * Shared screen-level chrome: safe area + flat background + standard
 * horizontal padding. Every screen previously inlined this combination
 * separately -- this is the one place it lives now.
 */
export function AIPalScaffold({
  children,
  scroll,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
}) {
  return (
    <SafeAreaView style={styles.root}>
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
});
