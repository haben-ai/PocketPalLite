import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {spacing, typography} from '../theme';
import {ProgressBar} from './ProgressBar';
import {PrimaryButton} from './PrimaryButton';

/**
 * Cancel-only, no pause: RNFS's stopDownload is one-shot/terminal (no
 * resume-from-byte-offset primitive exists in this codebase's use of
 * RNFS.downloadFile), so real pause/resume is out of scope for this pass.
 */
export function DownloadProgress({
  fraction,
  onCancel,
}: {
  fraction: number;
  onCancel: () => void;
}) {
  return (
    <View style={styles.row}>
      <ProgressBar fraction={fraction} />
      <Text style={styles.label}>{Math.round(fraction * 100)}%</Text>
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
  row: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  label: {...typography.small, width: 36},
  button: {paddingHorizontal: spacing.md},
});
