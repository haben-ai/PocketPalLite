import React from 'react';
import {Image, StyleSheet} from 'react-native';

const appIcon = require('../assets/images/app-icon.png');

/**
 * The app's own brand mark -- used everywhere a "this is Zayla" glyph
 * is needed (empty states, About screen, onboarding) so there's one place
 * the real logo image is wired in; every call site updates at once. The
 * source image already includes its own blue gradient square card (no
 * white background), so it's rendered directly with just a matching
 * corner radius, no extra tile/tint.
 */
export function AppIconMark({size = 64}: {size?: number}) {
  return (
    <Image
      source={appIcon}
      style={[styles.image, {width: size, height: size, borderRadius: size / 4}]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  image: {},
});
