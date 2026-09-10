import React, {useEffect, useState} from 'react';
import {BackHandler, View} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {AppScreen} from './types';
import {ChatTabScreen} from '../screens/ChatTabScreen';
import {ModelsTabScreen} from '../screens/ModelsTabScreen';
import {AIPalsTabScreen} from '../screens/AIPalsTabScreen';
import {MoreScreen} from '../screens/MoreScreen';
import {DiscoverTabScreen} from '../screens/DiscoverTabScreen';
import {SettingsTabScreen} from '../screens/SettingsTabScreen';
import {BenchmarkScreen} from '../screens/BenchmarkScreen';
import {AppInfoScreen} from '../screens/AppInfoScreen';
import {OpenSourceLicensesScreen} from '../screens/OpenSourceLicensesScreen';
import {BottomTabBar} from '../components/BottomTabBar';

/**
 * A persistent bottom tab bar (Chat/Models/New Chat/AIPals/More) sits below
 * whichever screen is current, as a flex sibling rather than an overlay --
 * every screen (including Chat's own keyboard-avoiding composer) just gets
 * less total height to lay out in, no per-screen bottom padding needed to
 * avoid being covered. "More" covers Discover/Benchmark/Settings/App Info,
 * which don't get their own tab slot.
 */
export function RootNavigator() {
  const {colors} = useTheme();
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

  let content: React.ReactNode;
  switch (screen.name) {
    case 'models':
      content = <ModelsTabScreen highlightModelId={screen.highlightModelId} onNavigate={setScreen} />;
      break;
    case 'aipals':
      content = <AIPalsTabScreen onNavigate={setScreen} />;
      break;
    case 'more':
      content = <MoreScreen onNavigate={setScreen} />;
      break;
    case 'discover':
      content = <DiscoverTabScreen onNavigate={setScreen} />;
      break;
    case 'settings':
      content = <SettingsTabScreen onNavigate={setScreen} />;
      break;
    case 'benchmark':
      content = <BenchmarkScreen onNavigate={setScreen} />;
      break;
    case 'appInfo':
      content = <AppInfoScreen onNavigate={setScreen} />;
      break;
    case 'openSourceLicenses':
      content = <OpenSourceLicensesScreen onNavigate={setScreen} />;
      break;
    case 'chat':
    default:
      content = (
        <ChatTabScreen
          modelId={screen.modelId}
          conversationId={screen.conversationId}
          personaId={screen.personaId}
          prefillText={screen.prefillText}
          onNavigate={setScreen}
        />
      );
      break;
  }

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <View style={{flex: 1}}>{content}</View>
      <BottomTabBar current={screen.name} onNavigate={setScreen} />
    </View>
  );
}
