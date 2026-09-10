import React, {useEffect, useState} from 'react';
import {AppState, PermissionsAndroid, Platform, View} from 'react-native';
import {hasSeenOnboarding, setOnboardingSeen} from './src/storage/asyncStore';
import {OnboardingScreen} from './src/screens/OnboardingScreen';
import {RootNavigator} from './src/navigation/RootNavigator';
import {ensureBuiltInPersonaSeeded} from './src/storage/personas';
import {getAppSettings, ensureNThreadsTuned} from './src/storage/appSettings';
import {releaseActiveContext} from './src/services/llamaSession';
import {analyzeDevice, getStoredDeviceTier, setStoredDeviceTier} from './src/services/deviceAnalyzer';
import {ThemeProvider} from './src/theme/ThemeContext';
import {initI18n} from './src/i18n';

type Route = {screen: 'loading'} | {screen: 'onboarding'} | {screen: 'app'};

export default function App() {
  const [route, setRoute] = useState<Route>({screen: 'loading'});

  useEffect(() => {
    (async () => {
      // Runs for both new and upgrading users -- idempotent, ensures the
      // built-in default persona always exists before Chat can need it.
      await ensureBuiltInPersonaSeeded();
      // Idempotent -- raises the nThreads default to this real device's
      // core count the first time the app ever boots (see the function's
      // own doc comment). Runs before getAppSettings() below so Chat's
      // first model load already sees the tuned value.
      await ensureNThreadsTuned();
      const settings = await getAppSettings();
      initI18n(settings.language);
      const seen = await hasSeenOnboarding();
      setRoute({screen: seen ? 'app' : 'onboarding'});

      // Device analysis runs exactly once, ever -- not on every visit to
      // the Models screen. Checked here (not gated on "onboarding just
      // finished") so it also covers users who already completed
      // onboarding under an older build and have never had a stored
      // result. Best-effort: a failure here just leaves the Models screen
      // without a recommendation, nothing else depends on it.
      if (!(await getStoredDeviceTier())) {
        try {
          await setStoredDeviceTier(await analyzeDevice());
        } catch {
          // Best-effort -- see comment above.
        }
      }

      // Best-effort: without this (Android 13+), GenerationForegroundService
      // can still run and protect the process while a reply generates in
      // the background, it just won't be able to show the notification
      // Android requires for a foreground service -- not fatal, just less
      // visible, so a denial here doesn't need any special handling.
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        ).catch(() => undefined);
      }
    })();
  }, []);

  // "Auto Offload/Load": frees the model's memory as soon as the app is
  // backgrounded, when enabled. The next send transparently reinits it
  // (same lazy-reinit path model-switching already uses), so this only
  // costs a reload, never correctness.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async nextState => {
      if (nextState === 'background') {
        const settings = await getAppSettings();
        if (settings.autoOffload) {
          await releaseActiveContext();
        }
      }
    });
    return () => subscription.remove();
  }, []);

  if (route.screen === 'loading') {
    // Rendered before ThemeProvider mounts, so this can't read the theme
    // system yet -- hardcoding the same OLED black the app always opens
    // into either way. Paired with android:windowBackground (styles.xml),
    // this keeps every cold start on a continuous black frame instead of
    // flashing AppCompat's default light background before this paints.
    return <View style={{flex: 1, backgroundColor: '#000000'}} />;
  }

  return (
    // No systemFont override -- text renders in the platform's own default
    // sans-serif (Roboto on Android), a real geometric/neo-grotesque
    // typeface, instead of the previously-bundled NotoSans.
    <ThemeProvider>
      {route.screen === 'onboarding' ? (
        <OnboardingScreen
          onDone={async () => {
            await setOnboardingSeen();
            setRoute({screen: 'app'});
          }}
        />
      ) : (
        <RootNavigator />
      )}
    </ThemeProvider>
  );
}
