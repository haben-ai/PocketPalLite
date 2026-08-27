import React, {useEffect, useState} from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';
import {colors} from './src/theme';
import {hasSeenOnboarding, setOnboardingSeen} from './src/storage/asyncStore';
import {OnboardingScreen} from './src/screens/OnboardingScreen';
import {ModelLibraryScreen} from './src/screens/ModelLibraryScreen';
import {ConversationListScreen} from './src/screens/ConversationListScreen';
import {ChatScreen} from './src/screens/ChatScreen';

type Route =
  | {screen: 'loading'}
  | {screen: 'onboarding'}
  | {screen: 'library'}
  | {screen: 'conversations'; modelId: string}
  | {screen: 'chat'; modelId: string; conversationId: string};

export default function App() {
  const [route, setRoute] = useState<Route>({screen: 'loading'});

  useEffect(() => {
    (async () => {
      const seen = await hasSeenOnboarding();
      setRoute({screen: seen ? 'library' : 'onboarding'});
    })();
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      {route.screen === 'onboarding' && (
        <OnboardingScreen
          onDone={async () => {
            await setOnboardingSeen();
            setRoute({screen: 'library'});
          }}
        />
      )}

      {route.screen === 'library' && (
        <ModelLibraryScreen
          onOpenModel={modelId => setRoute({screen: 'conversations', modelId})}
        />
      )}

      {route.screen === 'conversations' && (
        <ConversationListScreen
          modelId={route.modelId}
          onBack={() => setRoute({screen: 'library'})}
          onOpenConversation={conversationId =>
            setRoute({screen: 'chat', modelId: route.modelId, conversationId})
          }
        />
      )}

      {route.screen === 'chat' && (
        <ChatScreen
          modelId={route.modelId}
          conversationId={route.conversationId}
          onBack={() =>
            setRoute({screen: 'conversations', modelId: route.modelId})
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
});
