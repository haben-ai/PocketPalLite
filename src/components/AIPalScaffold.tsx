import React from 'react';
import {SafeAreaView, ScrollView, StyleSheet, View, ViewStyle} from 'react-native';
import {colors, gradients, spacing} from '../theme';

/**
 * Shared screen-level chrome: safe area + the app's hero gradient background
 * + standard horizontal padding. Every tab screen previously inlined this
 * combination separately (ChatScreen/ModelLibraryScreen/OnboardingScreen
 * each had their own near-identical `styles.container`) -- this is the one
 * place it lives now.
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
    ...({experimental_backgroundImage: gradients.hero} as object),
  },
  flex: {flex: 1},
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
});
