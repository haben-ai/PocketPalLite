import React, {useEffect, useRef} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {PrimaryButton} from './PrimaryButton';
import {PlayIcon, CloseIcon} from './Icons';
import {QueueItemStatus} from '../services/downloadQueue';

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return '0 MB';
  }
  const gb = bytes / 1e9;
  if (gb >= 1) {
    return `${gb.toFixed(2)} GB`;
  }
  return `${Math.round(bytes / 1e6)} MB`;
}

function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '';
  }
  if (seconds < 60) {
    return `${Math.ceil(seconds)}s left`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `About ${minutes} min left`;
  }
  return `About ${(minutes / 60).toFixed(1)} hr left`;
}

/**
 * Download progress: a real horizontal fill bar (a plain width style
 * recomputed from props on each tick -- cheap, and accurate) plus real
 * numbers, downloaded/total size and an ETA derived from a locally smoothed
 * transfer rate. Replaces an earlier "neuron chain" of 6 restarting
 * Animated.timing calls per progress tick, which added real per-tick
 * JS-thread animation cost for a purely decorative effect and showed
 * nothing about actual transfer size or time remaining -- exactly the gap
 * between this app's download UI and a reference app's (real % + size +
 * ETA + a keep-the-app-open tip) that prompted this rewrite. No Pause
 * button: the underlying transfer (RNFS's downloadFile) has no true
 * Range-resume, so a retry after Cancel/failure always restarts from byte
 * 0 -- offering a "Pause" that silently re-downloads everything on
 * "Resume" would be a worse lie than just not having the button.
 */
export function NeuralDownloadProgress({
  fraction,
  status,
  bytesWritten,
  totalBytes,
  queuePosition,
  error,
  onCancel,
  onRetry,
}: {
  fraction: number;
  status: QueueItemStatus;
  /** Real bytes transferred so far (downloadQueue.ts's QueueItem.bytesWritten). */
  bytesWritten: number;
  /** Resolved size of the whole job (base model + mmproj, if any); 0 when
   * genuinely unknown (an unresolved remote URL). */
  totalBytes: number;
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
  const isActive = status === 'downloading';
  const isFailed = status === 'failed';
  const isQueued = status === 'queued';

  // Exponential moving average over consecutive progress ticks (0.3 weight
  // on the newest sample) -- a raw instantaneous delta between two ticks
  // jumps around too much (network jitter, RNFS's own ~2%-granularity
  // callback spacing) to read as a stable ETA.
  const sampleRef = useRef<{bytes: number; at: number} | null>(null);
  const smoothedRateRef = useRef(0);

  useEffect(() => {
    if (!isActive) {
      sampleRef.current = null;
      smoothedRateRef.current = 0;
      return;
    }
    const now = Date.now();
    const prev = sampleRef.current;
    if (prev && now > prev.at) {
      const instantRate = Math.max(0, ((bytesWritten - prev.bytes) / (now - prev.at)) * 1000);
      smoothedRateRef.current =
        smoothedRateRef.current === 0 ? instantRate : smoothedRateRef.current * 0.7 + instantRate * 0.3;
    }
    sampleRef.current = {bytes: bytesWritten, at: now};
  }, [bytesWritten, isActive]);

  const remaining = Math.max(0, totalBytes - bytesWritten);
  const eta = smoothedRateRef.current > 0 ? formatEta(remaining / smoothedRateRef.current) : '';
  const pct = Math.round(fraction * 100);

  let title: string;
  if (isQueued) {
    title = queuePosition ? `Queued (#${queuePosition})` : 'Queued';
  } else if (isFailed) {
    title = 'Download failed';
  } else {
    title = `Downloading... ${pct}%`;
  }

  const subtitle = isFailed
    ? error
    : isQueued
    ? 'Waiting for the current download to finish'
    : totalBytes > 0
    ? `${formatBytes(bytesWritten)} / ${formatBytes(totalBytes)}${eta ? ` · ${eta}` : ''}`
    : formatBytes(bytesWritten);

  const canRetry = isFailed && !!onRetry;

  return (
    <View style={styles.container}>
      <Text style={[typography.body, styles.title, isFailed && {color: colors.danger}]} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.track, {backgroundColor: colors.surfaceContainerHigh}]}>
        <View
          style={[
            styles.fill,
            {
              width: `${isFailed ? 0 : Math.max(2, pct)}%`,
              backgroundColor: isFailed ? colors.danger : colors.accent,
            },
          ]}
        />
      </View>
      <Text
        style={[typography.small, {color: isFailed ? colors.danger : colors.textMuted}]}
        numberOfLines={isFailed ? 2 : 1}>
        {subtitle}
      </Text>
      {isActive && (
        <Text style={[typography.small, styles.tip, {color: colors.textMuted}]} numberOfLines={1}>
          Keep the app open to avoid interrupting the download.
        </Text>
      )}
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
  container: {gap: 4},
  title: {fontWeight: '600'},
  track: {height: 6, borderRadius: radius.pill, overflow: 'hidden'},
  fill: {height: '100%', borderRadius: radius.pill},
  tip: {fontStyle: 'italic'},
  actions: {flexDirection: 'row', gap: spacing.xs, marginTop: 4},
  actionButton: {flex: 1},
});
