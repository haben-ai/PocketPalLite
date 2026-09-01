import React, {useState} from 'react';
import {AppScreen} from './types';
import {ChatTabScreen} from '../screens/ChatTabScreen';
import {ModelsTabScreen} from '../screens/ModelsTabScreen';
import {AIPalsTabScreen} from '../screens/AIPalsTabScreen';
import {DiscoverTabScreen} from '../screens/DiscoverTabScreen';
import {SettingsTabScreen} from '../screens/SettingsTabScreen';

/**
 * ChatGPT-style shell: Chat is the sole default surface, reached directly
 * on launch with no tab bar. Every other screen (Models/AIPals/Discover/
 * Settings) is reached only via the hamburger sidebar and fully replaces
 * the screen below it -- no persistent chrome, no bottom navigation.
 */
export function RootNavigator() {
  const [screen, setScreen] = useState<AppScreen>({name: 'chat'});

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
