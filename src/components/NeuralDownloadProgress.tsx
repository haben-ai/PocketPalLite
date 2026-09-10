import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {PrimaryButton} from './PrimaryButton';
import {PlayIcon, CloseIcon} from './Icons';
import {QueueItemStatus} from '../services/downloadQueue';

const NODE_COUNT = 6;

function statusLabel(status: QueueItemStatus, fraction: number, queuePosition?: number): string {
  switch (status) {
    case 'queued':
      return queuePosition ? `Queued (#${queuePosition})` : 'Queued';
    case 'failed':
      return 'Failed';
    default:
      return `${Math.round(fraction * 100)}%`;
  }
}

/**
 * Download progress rendered as a small chain of "neurons" lighting up and
 * pulsing as the fraction fills, in place of a plain progress bar -- reads
 * as "loading into the model" rather than a generic file-transfer bar.
 * Reflects the download queue's real status (queued/downloading/failed)
 * and offers Retry (on a failed attempt) alongside Cancel.
 */
export function NeuralDownloadProgress({
  fraction,
  status,
  queuePosition,
  error,
  onCancel,
  onRetry,
}: {
  fraction: number;
  status: QueueItemStatus;
  /** 1-based position in the queue, only meaningful while status is
   * 'queued' (a not-yet-started item behind others). */
  queuePosition?: number;
  /** The real error message from the failed attempt -- only meaningful
   * while status is 'failed'. Shown to the user (not just "Failed" with no
   * reason) so a checksum mismatch, a storage problem, and a network
   * failure all read differently instead of looking identical. */
  error?: string;
  onCancel: () => void;
  onRetry?: () => void;
}) {
  const {colors, typography} = useTheme();
  const nodeAnims = useRef(
    Array.from({length: NODE_COUNT}, () => new Animated.Value(0)),
  ).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isActive = status === 'downloading';

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
    // Only the actively-transferring state pulses -- queued/failed items
    // sit still so the animation itself communicates "not moving right
    // now" rather than implying activity that isn't happening.
    if (!isActive) {
      pulseAnim.setValue(1);
      return;
    }
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
  }, [pulseAnim, isActive]);

  // The node at the current leading edge pulses, like a neuron actively
  // firing, distinguishing "still filling" from the already-lit nodes
  // behind it.
  const activeIndex =
    !isActive || fraction >= 1
      ? -1
      : Math.min(NODE_COUNT - 1, Math.floor(fraction * (NODE_COUNT - 1)));

  const canRetry = status === 'failed' && !!onRetry;

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
      <Text
        style={[
          typography.small,
          styles.label,
          status === 'failed' && {color: colors.danger},
        ]}
        numberOfLines={status === 'failed' ? 2 : 1}>
        {status === 'failed' && error ? error : statusLabel(status, fraction, queuePosition)}
      </Text>
      <View style={styles.actions}>
        {canRetry && (
          <PrimaryButton
            label="Retry"
            variant="secondary"
            onPress={onRetry!}
            style={styles.actionButton}
            icon={color => <PlayIcon size={18} color={color} />}
          />
        )}
        <PrimaryButton
          label="Cancel"
          variant="secondary"
          onPress={onCancel}
          style={styles.actionButton}
          icon={color => <CloseIcon size={18} color={color} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {gap: spacing.xs},
  chain: {flexDirection: 'row', alignItems: 'center', height: 16},
  node: {width: 10, height: 10, borderRadius: 5},
  line: {flex: 1, height: 2, marginHorizontal: 3, borderRadius: 1},
  label: {textAlign: 'center'},
  actions: {flexDirection: 'row', gap: spacing.xs, marginTop: 2},
  actionButton: {flex: 1},
});
