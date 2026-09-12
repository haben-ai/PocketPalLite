import React from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Defs, LinearGradient, Path, Polygon, Stop} from 'react-native-svg';

/**
 * Full-bleed dusk sky/mountains/lake backdrop for onboarding's bookend
 * slides (welcome + "you're all set"). A flat-vector illustration built
 * from gradients and simple polygons, matching the requested reference's
 * photographic sky -- deliberately not a real photo (no image asset/
 * generation pipeline for this), but the same warm-dusk-over-water mood via
 * shapes alone, tinted from the live accent color so it re-themes for free
 * if the brand color ever changes again.
 */
export function OnboardingScenery({accent}: {accent: string}) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0B1230" />
            <Stop offset="0.45" stopColor="#1B2A5E" />
            <Stop offset="0.75" stopColor="#5B4A8A" />
            <Stop offset="1" stopColor="#D98A5E" />
          </LinearGradient>
          <LinearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#3A3F6B" />
            <Stop offset="1" stopColor="#12162E" />
          </LinearGradient>
          <LinearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={accent} stopOpacity={0.9} />
            <Stop offset="1" stopColor={accent} stopOpacity={0.1} />
          </LinearGradient>
        </Defs>

        <Path d="M0 0 H400 V800 H0 Z" fill="url(#sky)" />

        {/* Sun/moon glow sitting on the horizon. */}
        <Path d="M140 420 A60 60 0 0 1 260 420 Z" fill="url(#sun)" />

        {/* Distant + near mountain ranges, darkest in front. */}
        <Polygon points="0,460 90,340 170,460" fill="#141A3D" opacity={0.7} />
        <Polygon points="120,460 230,300 330,460" fill="#0F1330" opacity={0.85} />
        <Polygon points="260,460 340,360 400,460" fill="#0B0E24" />

        {/* Water + horizontal reflection ripples. */}
        <Path d="M0 460 H400 V800 H0 Z" fill="url(#water)" />
        <Path d="M40 520 H150" stroke={accent} strokeOpacity={0.25} strokeWidth={3} />
        <Path d="M220 560 H340" stroke={accent} strokeOpacity={0.18} strokeWidth={3} />
        <Path d="M80 610 H260" stroke={accent} strokeOpacity={0.15} strokeWidth={3} />
        <Path d="M150 670 H320" stroke={accent} strokeOpacity={0.12} strokeWidth={3} />
      </Svg>
    </View>
  );
}
