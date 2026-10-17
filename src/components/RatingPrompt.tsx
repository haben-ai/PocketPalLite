import React, {useEffect, useState} from 'react';
import {Modal, Platform, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {
  isRatingPromptDue,
  openFeedbackEmail,
  openStoreReview,
  recordRatingDone,
  recordRatingPromptShown,
} from '../services/appRating';

// Let the screen settle first -- a dialog landing on top of a still-loading
// chat reads as a glitch, not a polite ask.
const SHOW_DELAY_MS = 2500;

const STORE_NAME = Platform.OS === 'ios' ? 'App Store' : 'Play Store';

/**
 * Asks the user to rate the app on their second launch (see
 * services/appRating.ts for the full schedule). 4-5 stars go to the store
 * listing -- where a rating actually helps -- while 1-3 go to a feedback
 * email instead, so a bad experience reaches the developer rather than
 * becoming a public low rating without a chance to fix it.
 */
export function RatingPrompt() {
  const {colors, typography} = useTheme();
  const [visible, setVisible] = useState(false);
  const [stars, setStars] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled || !(await isRatingPromptDue())) {
        return;
      }
      await recordRatingPromptShown();
      if (!cancelled) {
        setVisible(true);
      }
    }, SHOW_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const close = () => setVisible(false);

  const handlePrimary = async () => {
    close();
    await recordRatingDone();
    if (stars >= 4) {
      await openStoreReview();
    } else {
      await openFeedbackEmail(stars);
    }
  };

  const happy = stars >= 4;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={[styles.backdrop, {backgroundColor: colors.scrim}]}>
        <View style={[styles.card, {backgroundColor: colors.surfaceContainer, borderColor: colors.outline}]}>
          <Text style={[typography.title, styles.title, {color: colors.textPrimary}]}>
            {stars === 0 ? 'Enjoying Zayla?' : happy ? 'Glad to hear it!' : 'Sorry to hear that'}
          </Text>
          <Text style={[typography.body, styles.body, {color: colors.textSecondary}]}>
            {stars === 0
              ? 'Tap a star to rate your experience.'
              : happy
              ? `A quick rating on the ${STORE_NAME} helps other people find Zayla.`
              : 'Tell us what went wrong and we will work on it.'}
          </Text>

          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <TouchableOpacity key={n} onPress={() => setStars(n)} hitSlop={6} accessibilityLabel={`${n} stars`}>
                <Text style={[styles.star, {color: n <= stars ? colors.accent : colors.outline}]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>

          {stars > 0 && (
            <TouchableOpacity
              onPress={handlePrimary}
              style={[styles.primary, {backgroundColor: colors.accent}]}
              activeOpacity={0.85}>
              <Text style={[styles.primaryLabel, {color: colors.onAccent}]}>
                {happy ? `Rate on the ${STORE_NAME}` : 'Send feedback'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={close} hitSlop={8} style={styles.later}>
            <Text style={[typography.caption, {color: colors.textMuted}]}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg},
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  title: {textAlign: 'center'},
  body: {textAlign: 'center', marginTop: spacing.xs},
  starRow: {flexDirection: 'row', gap: 6, marginVertical: spacing.md},
  star: {fontSize: 40, lineHeight: 46},
  primary: {
    alignSelf: 'stretch',
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {fontSize: 16, fontWeight: '700'},
  later: {marginTop: spacing.md, paddingVertical: 4},
});
