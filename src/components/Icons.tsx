import React from 'react';
import {StyleSheet, TouchableOpacity} from 'react-native';

/**
 * A frosted-glass circular button wrapping a single icon -- translucent
 * fill + hairline border to approximate glassmorphism without pulling in a
 * real blur dependency. Pairs with the gradient-shaded glyphs in
 * GlassIcons.tsx. Used for the header's standalone icon-only controls
 * (hamburger, new chat, overflow menu).
 */
export function GlassIconButton({
  onPress,
  children,
  size = 40,
}: {
  onPress: () => void;
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={10}
      activeOpacity={0.6}
      style={[styles.glassButton, {width: size, height: size, borderRadius: size / 2}]}>
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  glassButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
});
