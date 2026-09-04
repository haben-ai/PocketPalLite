import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {PrimaryButton} from './PrimaryButton';

const NODE_COUNT = 6;

/**
 * Download progress rendered as a small chain of "neurons" lighting up and
 * pulsing as the fraction fills, in place of a plain progress bar -- reads
 * as "loading into the model" rather than a generic file-transfer bar.
 * Same props as the plain ProgressBar-based version it replaces, so it
 * drops straight into ModelCard.
 */
export function NeuralDownloadProgress({
  fraction,
  onCancel,
}: {
  fraction: number;
  onCancel: () => void;
}) {
  const {colors, typography} = useTheme();
  const nodeAnims = useRef(
    Array.from({length: NODE_COUNT}, () => new Animated.Value(0)),
  ).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    nodeAnims.forEach((anim, i) => {
      const threshold = i / (NODE_COUNT - 1);
      Animated.timing(anim, {
        toValue: fraction >= threshold ? 1 : 0,
        duration: 260,
        useNativeDriver: false,
      }).start();
    });
  }, [fraction, nodeAnims]);

  useEffect(() => {
    // Must stay JS-driven (useNativeDriver: false), matching the nodes'
    // backgroundColor interpolation below -- both end up as style props on
    // the same Animated.View, and RN can't mix a native-driven and a
    // JS-driven animation on one underlying view (it throws: "Attempting
    // to run JS driven animation on animated node that has been moved to
    // native").
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {toValue: 1.4, duration: 480, useNativeDriver: false}),
        Animated.timing(pulseAnim, {toValue: 1, duration: 480, useNativeDriver: false}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // The node at the current leading edge pulses, like a neuron actively
  // firing, distinguishing "still filling" from the already-lit nodes
  // behind it.
  const activeIndex =
    fraction >= 1
      ? -1
      : Math.min(NODE_COUNT - 1, Math.floor(fraction * (NODE_COUNT - 1)));

  return (
    <View style={styles.container}>
      <View style={styles.chain}>
        {nodeAnims.map((anim, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <Animated.View
                style={[
                  styles.line,
                  {
                    backgroundColor: nodeAnims[i - 1].interpolate({
                      inputRange: [0, 1],
                      outputRange: [colors.outline, colors.accent],
                    }),
                  },
                ]}
              />
            )}
            <Animated.View
              style={[
                styles.node,
                {
                  backgroundColor: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [colors.outline, colors.accent],
                  }),
                  transform: [{scale: i === activeIndex ? pulseAnim : 1}],
                },
              ]}
            />
          </React.Fragment>
        ))}
      </View>
      <Text style={[typography.small, styles.label]}>{Math.round(fraction * 100)}%</Text>
      <PrimaryButton
        label="Cancel"
        variant="secondary"
        onPress={onCancel}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {gap: spacing.xs},
  chain: {flexDirection: 'row', alignItems: 'center', height: 16},
  node: {width: 10, height: 10, borderRadius: 5},
  line: {flex: 1, height: 2, marginHorizontal: 3, borderRadius: 1},
  label: {textAlign: 'center'},
  button: {marginTop: 2},
});
