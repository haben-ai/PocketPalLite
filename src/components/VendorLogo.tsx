import React from 'react';
import Svg, {Defs, LinearGradient, Path, Rect, Stop} from 'react-native-svg';
import {Cpu} from 'lucide-react-native';
import {ModelVendor} from '../types';

/**
 * Small colored brand mark used as a model's "profile picture" in lists and
 * pickers, so the model's real originating company reads at a glance
 * instead of a generic emoji. Google's and Microsoft's marks below are
 * their real official multi-color logos (Microsoft's is just four flat
 * squares -- exact by construction). Meta's is a simplified evocation of
 * its blue double-loop mark, not a pixel-exact trademark reproduction --
 * that shape is intricate enough that guessing at its bezier data from
 * memory would risk an inaccurate copy, so this draws a recognizable
 * infinity-loop silhouette in Meta's real brand blue instead. `vendor:
 * 'other'` (self-hosted/imported/HF-search models with no known origin)
 * gets a neutral monochrome icon, never a fabricated logo.
 */
export function VendorLogo({
  vendor,
  size = 20,
  mutedColor,
}: {
  vendor?: ModelVendor;
  size?: number;
  mutedColor: string;
}) {
  switch (vendor) {
    case 'google':
      return (
        <Svg width={size} height={size} viewBox="0 0 48 48">
          <Path
            fill="#FFC107"
            d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
          />
          <Path
            fill="#FF3D00"
            d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
          />
          <Path
            fill="#4CAF50"
            d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
          />
          <Path
            fill="#1976D2"
            d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
          />
        </Svg>
      );
    case 'microsoft':
      return (
        <Svg width={size} height={size} viewBox="0 0 23 23">
          <Rect x="1" y="1" width="10" height="10" fill="#F25022" />
          <Rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
          <Rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
          <Rect x="12" y="12" width="10" height="10" fill="#FFB900" />
        </Svg>
      );
    case 'meta':
      return (
        <Svg width={size} height={size} viewBox="0 0 48 48">
          <Defs>
            <LinearGradient id="metaGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#0064E0" />
              <Stop offset="1" stopColor="#0081FB" />
            </LinearGradient>
          </Defs>
          <Path
            fill="url(#metaGrad)"
            d="M12 24c0-8 4-14 9-14 3.3 0 5.8 2.6 7 6.2 1.2-3.6 3.7-6.2 7-6.2 5 0 9 6 9 14s-4 14-9 14c-3.3 0-5.8-2.6-7-6.2-1.2 3.6-3.7 6.2-7 6.2-5 0-9-6-9-14z"
          />
        </Svg>
      );
    default:
      return <Cpu size={size * 0.7} color={mutedColor} />;
  }
}
