import {Linking, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {getJSON, setJSON, KEYS} from '../storage/asyncStore';

export type RatingPromptState = {
  /** How many times the prompt has been shown (not how many launches). */
  shownCount: number;
  /** True once the user rated or sent feedback -- never ask again. */
  done: boolean;
};

const DEFAULT_STATE: RatingPromptState = {shownCount: 0, done: false};

/** Support address from PRIVACY_POLICY.md -- where low ratings go. */
const FEEDBACK_EMAIL = 'eriland707@gmail.com';

/**
 * First ask on the app's 2nd launch (the user has seen it once before and
 * came back -- the point they've actually formed an opinion). A "Not now"
 * is respected until the 5th launch, then one last time; after that, or
 * once they've rated, never again.
 */
export function shouldPromptForRating(launchCount: number, state: RatingPromptState): boolean {
  if (state.done) {
    return false;
  }
  if (state.shownCount === 0) {
    return launchCount >= 2;
  }
  if (state.shownCount === 1) {
    return launchCount >= 5;
  }
  return false;
}

// Once per JS context (i.e. once per process start) -- RootNavigator can
// mount more than once in a session (onboarding -> app), and that must not
// count as a second launch.
let launchRegistered = false;

export async function registerAppOpen(): Promise<number> {
  const current = await getJSON<number>(KEYS.appLaunchCount, 0);
  if (launchRegistered) {
    return current;
  }
  launchRegistered = true;
  const next = current + 1;
  await setJSON(KEYS.appLaunchCount, next);
  return next;
}

export async function isRatingPromptDue(): Promise<boolean> {
  const [launchCount, state] = await Promise.all([
    getJSON<number>(KEYS.appLaunchCount, 0),
    getJSON<RatingPromptState>(KEYS.ratingPrompt, DEFAULT_STATE),
  ]);
  return shouldPromptForRating(launchCount, state);
}

export async function recordRatingPromptShown(): Promise<void> {
  const state = await getJSON<RatingPromptState>(KEYS.ratingPrompt, DEFAULT_STATE);
  await setJSON(KEYS.ratingPrompt, {...state, shownCount: state.shownCount + 1});
}

export async function recordRatingDone(): Promise<void> {
  const state = await getJSON<RatingPromptState>(KEYS.ratingPrompt, DEFAULT_STATE);
  await setJSON(KEYS.ratingPrompt, {...state, done: true});
}

/** Opens the platform's store review page. On iOS the App Store id isn't
 * hardcoded anywhere -- it's looked up from the bundle id, so this works
 * the moment the app is published and does nothing before that. */
export async function openStoreReview(): Promise<void> {
  const bundleId = DeviceInfo.getBundleId();
  if (Platform.OS === 'android') {
    await Linking.openURL(`market://details?id=${bundleId}`).catch(() =>
      Linking.openURL(`https://play.google.com/store/apps/details?id=${bundleId}`),
    );
    return;
  }
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(bundleId)}`);
    const json = (await res.json()) as {results?: {trackId?: number}[]};
    const trackId = json.results?.[0]?.trackId;
    if (trackId) {
      await Linking.openURL(`itms-apps://itunes.apple.com/app/id${trackId}?action=write-review`);
    }
  } catch {
    // Not published yet, or offline -- nothing to open.
  }
}

export async function openFeedbackEmail(stars: number): Promise<void> {
  const subject = encodeURIComponent(`Zayla feedback (${stars}/5)`);
  await Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${subject}`).catch(() => undefined);
}
