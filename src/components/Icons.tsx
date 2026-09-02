import React from 'react';
import {StyleSheet, View} from 'react-native';
import {colors} from '../theme';

/**
 * Hand-drawn (View/border based) line icons, matching this app's existing
 * no-icon-font convention (see ChatScreen's hamburger bars) rather than
 * pulling in react-native-vector-icons/react-native-svg -- these approximate
 * a clean outline style without another native dependency.
 */
const SIZE = 20;

function Box({children}: {children: React.ReactNode}) {
  return <View style={styles.box}>{children}</View>;
}

export function ChatBubbleIcon() {
  return (
    <Box>
      <View style={styles.bubbleOutline} />
    </Box>
  );
}

export function SparkleIcon() {
  return (
    <Box>
      <View style={styles.sparkleV} />
      <View style={styles.sparkleH} />
    </Box>
  );
}

export function GridIcon() {
  return (
    <Box>
      <View style={styles.gridWrap}>
        <View style={styles.gridCell} />
        <View style={styles.gridCell} />
        <View style={styles.gridCell} />
        <View style={styles.gridCell} />
      </View>
    </Box>
  );
}

export function GearIcon() {
  return (
    <Box>
      <View style={styles.gearOuter} />
      <View style={styles.gearInner} />
    </Box>
  );
}

export function MaskIcon() {
  return (
    <Box>
      <View style={styles.maskWrap}>
        <View style={styles.maskEye} />
        <View style={styles.maskEye} />
      </View>
    </Box>
  );
}

export function UploadIcon() {
  return (
    <Box>
      <View style={styles.uploadArrow} />
      <View style={styles.uploadBar} />
    </Box>
  );
}

export function PencilIcon() {
  return (
    <Box>
      <View style={styles.pencilBody} />
      <View style={styles.pencilTip} />
    </Box>
  );
}

export function DotsIcon() {
  return (
    <View style={styles.dotsWrap}>
      <View style={styles.dot} />
      <View style={styles.dot} />
      <View style={styles.dot} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center'},
  bubbleOutline: {
    width: 16,
    height: 12,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.textSecondary,
  },
  sparkleV: {
    position: 'absolute',
    width: 2,
    height: 14,
    borderRadius: 1,
    backgroundColor: colors.textSecondary,
  },
  sparkleH: {
    position: 'absolute',
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.textSecondary,
  },
  gridWrap: {width: 16, height: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 2},
  gridCell: {width: 7, height: 7, borderRadius: 1.5, backgroundColor: colors.textSecondary},
  gearOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.textSecondary,
  },
  gearInner: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.textSecondary,
  },
  maskWrap: {
    width: 16,
    height: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.textSecondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  maskEye: {width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textSecondary},
  uploadArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.textSecondary,
  },
  uploadBar: {
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.textSecondary,
    marginTop: 3,
  },
  pencilBody: {
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.textPrimary,
    transform: [{rotate: '45deg'}],
  },
  pencilTip: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 4,
    height: 4,
    borderRadius: 1,
    backgroundColor: colors.textPrimary,
    transform: [{rotate: '45deg'}],
  },
  dotsWrap: {width: 18, height: 18, alignItems: 'center', justifyContent: 'center', gap: 3},
  dot: {width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textPrimary},
});
