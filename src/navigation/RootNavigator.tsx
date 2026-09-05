import React, {useEffect, useState} from 'react';
import {BackHandler} from 'react-native';
import {AppScreen} from './types';
import {ChatTabScreen} from '../screens/ChatTabScreen';
import {ModelsTabScreen} from '../screens/ModelsTabScreen';
import {AIPalsTabScreen} from '../screens/AIPalsTabScreen';
import {DiscoverTabScreen} from '../screens/DiscoverTabScreen';
import {SettingsTabScreen} from '../screens/SettingsTabScreen';
import {BenchmarkScreen} from '../screens/BenchmarkScreen';
import {AppInfoScreen} from '../screens/AppInfoScreen';

/**
 * ChatGPT-style shell: Chat is the sole default surface, reached directly
 * on launch with no tab bar. Every other screen (Models/AIPals/Discover/
 * Settings/Benchmark/App Info) is reached only via the hamburger sidebar
 * and fully replaces the screen below it -- no persistent chrome, no
 * bottom navigation.
 */
export function RootNavigator() {
  const [screen, setScreen] = useState<AppScreen>({name: 'chat'});

  // Without this, Android's hardware back button has no in-app screen
  // stack to pop -- since `screen` just gets fully replaced rather than
  // pushed/popped, the OS default kicks in and exits (kills) the app from
  // any non-chat screen. Chat itself is the app's "home", so back from
  // there still exits normally (returns false = not handled).
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen.name !== 'chat') {
        setScreen({name: 'chat'});
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [screen.name]);

  switch (screen.name) {
    case 'models':
      return (
        <ModelsTabScreen
          highlightModelId={screen.highlightModelId}
          onNavigate={setScreen}
        />
      );
    case 'aipals':
      return <AIPalsTabScreen onNavigate={setScreen} />;
    case 'discover':
      return <DiscoverTabScreen onNavigate={setScreen} />;
    case 'settings':
      return <SettingsTabScreen onNavigate={setScreen} />;
    case 'benchmark':
      return <BenchmarkScreen onNavigate={setScreen} />;
    case 'appInfo':
      return <AppInfoScreen onNavigate={setScreen} />;
    case 'chat':
    default:
      return (
        <ChatTabScreen
          modelId={screen.modelId}
          conversationId={screen.conversationId}
          personaId={screen.personaId}
          prefillText={screen.prefillText}
          onNavigate={setScreen}
        />
      );
  }
}
