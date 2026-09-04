import React, {useRef, useState} from 'react';
import {PanResponder, StyleSheet, View} from 'react-native';
import {useTheme} from '../theme/ThemeContext';

const THUMB_SIZE = 20;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function snapToStep(value: number, min: number, step: number): number {
  if (step <= 0) {
    return value;
  }
  const steps = Math.round((value - min) / step);
  return min + steps * step;
}

/**
 * A controlled, pure-JS slider (PanResponder + a measured track), used
 * instead of `@react-native-community/slider` to avoid another native
 * dependency and rebuild cycle -- consistent with this app's existing
 * custom-Animated components rather than reaching for a native library.
 */
export function Slider({
  value,
  min,
  max,
  step = 0,
  onValueChange,
  onSlidingComplete,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
}) {
  const trackRef = useRef<View>(null);
  const trackWidth = useRef(0);
  const trackPageX = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;
  const [dragging, setDragging] = useState(false);

  const measureTrack = () => {
    trackRef.current?.measure((_x, _y, width, _h, pageX) => {
      trackWidth.current = width;
      trackPageX.current = pageX;
    });
  };

  const valueFromPageX = (pageX: number): number => {
    const width = trackWidth.current;
    if (width <= 0) {
      return valueRef.current;
    }
    const ratio = clamp((pageX - trackPageX.current) / width, 0, 1);
    const raw = min + ratio * (max - min);
    return clamp(snapToStep(raw, min, step), min, max);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: evt => {
        measureTrack();
        setDragging(true);
        // Track width/pageX aren't known synchronously the very first time
        // (measure() is async) -- fall back to locationX for this one event.
        const width = trackWidth.current || evt.nativeEvent.locationX + 1;
        const next =
          trackWidth.current > 0
            ? valueFromPageX(evt.nativeEvent.pageX)
            : clamp(
                snapToStep(
                  min + clamp(evt.nativeEvent.locationX / width, 0, 1) * (max - min),
                  min,
                  step,
                ),
                min,
                max,
              );
        onValueChange(next);
      },
      onPanResponderMove: evt => {
        onValueChange(valueFromPageX(evt.nativeEvent.pageX));
      },
      onPanResponderRelease: () => {
        setDragging(false);
        onSlidingComplete?.(valueRef.current);
      },
      onPanResponderTerminate: () => setDragging(false),
    }),
  ).current;

  const ratio = max > min ? clamp((value - min) / (max - min), 0, 1) : 0;
  const {colors} = useTheme();

  return (
    <View style={styles.touchArea} {...panResponder.panHandlers}>
      <View
        ref={trackRef}
        style={[styles.track, {backgroundColor: colors.surfaceContainerHigh}]}
        onLayout={measureTrack}>
        <View style={[styles.fill, {backgroundColor: colors.textPrimary, width: `${ratio * 100}%`}]} />
      </View>
      <View
        style={[
          styles.thumb,
          {backgroundColor: colors.textPrimary},
          dragging && styles.thumbActive,
          {left: `${ratio * 100}%`},
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    height: 32,
    justifyContent: 'center',
  },
  track: {
    height: 3,
    borderRadius: 2,
  },
  fill: {
    height: 3,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    marginLeft: -THUMB_SIZE / 2,
    top: '50%',
    marginTop: -THUMB_SIZE / 2,
  },
  thumbActive: {
    transform: [{scale: 1.15}],
  },
});
