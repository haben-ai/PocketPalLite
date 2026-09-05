import React, {useEffect, useState} from 'react';
import {AppState, View} from 'react-native';
import {hasSeenOnboarding, setOnboardingSeen} from './src/storage/asyncStore';
import {OnboardingScreen} from './src/screens/OnboardingScreen';
import {RootNavigator} from './src/navigation/RootNavigator';
import {ensureBuiltInPersonaSeeded} from './src/storage/personas';
import {getAppSettings} from './src/storage/appSettings';
import {releaseActiveContext} from './src/services/llamaSession';
import {ThemeProvider} from './src/theme/ThemeContext';
import {initI18n} from './src/i18n';

type Route = {screen: 'loading'} | {screen: 'onboarding'} | {screen: 'app'};

export default function App() {
  const [route, setRoute] = useState<Route>({screen: 'loading'});

  useEffect(() => {
    (async () => {
      // Runs for both new and upgrading users -- idempotent, ensures the
      // built-in Riya/MustaAI persona always exists before Chat can need it.
      await ensureBuiltInPersonaSeeded();
      const settings = await getAppSettings();
      initI18n(settings.language);
      const seen = await hasSeenOnboarding();
      setRoute({screen: seen ? 'app' : 'onboarding'});
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
    <ThemeProvider systemFont="NotoSans">
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
