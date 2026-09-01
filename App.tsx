import React, {useEffect, useState} from 'react';
import {hasSeenOnboarding, setOnboardingSeen} from './src/storage/asyncStore';
import {OnboardingScreen} from './src/screens/OnboardingScreen';
import {RootNavigator} from './src/navigation/RootNavigator';
import {ensureBuiltInPersonaSeeded} from './src/storage/personas';

type Route = {screen: 'loading'} | {screen: 'onboarding'} | {screen: 'app'};

export default function App() {
  const [route, setRoute] = useState<Route>({screen: 'loading'});

  useEffect(() => {
    (async () => {
      // Runs for both new and upgrading users -- idempotent, ensures the
      // built-in Riya/MustaAI persona always exists before Chat can need it.
      await ensureBuiltInPersonaSeeded();
      const seen = await hasSeenOnboarding();
      setRoute({screen: seen ? 'app' : 'onboarding'});
    })();
  }, []);

  if (route.screen === 'loading') {
    return null;
  }

  if (route.screen === 'onboarding') {
    return (
      <OnboardingScreen
        onDone={async () => {
          await setOnboardingSeen();
          setRoute({screen: 'app'});
        }}
      />
    );
  }

  return <RootNavigator />;
}
