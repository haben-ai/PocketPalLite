import React, {useEffect, useState} from 'react';
import {BackHandler, View} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {KEYS, setJSON} from '../storage/asyncStore';
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
import {DialogHost} from '../components/AppDialog';

/**
 * A persistent bottom tab bar (Chat/Models/New Chat/AIPals/More) sits below
 * whichever screen is current, as a flex sibling rather than an overlay --
 * every screen (including Chat's own keyboard-avoiding composer) just gets
 * less total height to lay out in, no per-screen bottom padding needed to
 * avoid being covered. "More" covers Discover/Benchmark/Settings/App Info,
 * which don't get their own tab slot.
 */
export function RootNavigator({initialScreen}: {initialScreen?: AppScreen}) {
  const {colors} = useTheme();
  const [screen, setScreen] = useState<AppScreen>(initialScreen ?? {name: 'chat'});

  // Persists whenever the user navigates, so a cold start after Android
  // kills the backgrounded process (not just a normal minimize, where the
  // JS context and this state survive on their own) still reopens on the
  // same screen/chat instead of resetting to a blank new chat. Transient,
  // one-shot navigation params (prefillText/highlightModelId) are stripped
  // before persisting -- replaying those on a later cold start would
  // re-trigger their one-time effect (re-prefilling old text, re-scrolling
  // to a model) rather than just restoring "where you were".
  useEffect(() => {
    let toPersist: AppScreen = screen;
    if (screen.name === 'chat' && screen.prefillText) {
      toPersist = {...screen, prefillText: undefined};
    } else if (screen.name === 'models' && screen.highlightModelId) {
      toPersist = {...screen, highlightModelId: undefined};
    }
    setJSON(KEYS.lastScreen, toPersist).catch(() => undefined);
  }, [screen]);

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
      {/* Mounted once here rather than per-screen -- every Alert.alert()
          call anywhere in the app (imported from AppDialog instead of
          react-native) renders through this single host. */}
      <DialogHost />
    </View>
  );
}
