import React, {useCallback, useEffect, useState} from 'react';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {RootTabParamList} from '../navigation/types';
import {AIPalScaffold} from '../components/AIPalScaffold';
import {EmptyState} from '../components/EmptyState';
import {ConversationDrawer} from '../components/ConversationDrawer';
import {ChatScreen} from './ChatScreen';
import {createConversation, getConversations} from '../storage/conversations';
import {getDownloadedModels} from '../storage/modelRegistry';
import {getPersonas} from '../storage/personas';
import {BUILT_IN_PERSONA_ID} from '../data/persona';

type Props = BottomTabScreenProps<RootTabParamList, 'Chat'>;

type ActiveConversation = {
  modelId: string;
  conversationId: string;
  personaId: string;
  initialInput?: string;
};

/**
 * Owns which conversation is showing, the conversation-history drawer, and
 * cross-tab deep-link handling (a model tapped in Models, a suggestion
 * tapped in Discover). ConversationDrawer itself is unmodified -- it's
 * simply re-parented here from the old App.tsx.
 */
export function ChatTabScreen({navigation, route}: Props) {
  const [active, setActive] = useState<ActiveConversation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkedInitial, setCheckedInitial] = useState(false);

  // Chat-first boot: land on the most recent conversation, if any, the
  // first time this tab mounts with no explicit params -- this used to be
  // App.tsx's job before routing moved to the tab navigator.
  useEffect(() => {
    if (checkedInitial) {
      return;
    }
    (async () => {
      setCheckedInitial(true);
      if (route.params?.modelId || route.params?.conversationId) {
        return; // handled by the deep-link effect below
      }
      const conversations = await getConversations();
      const mostRecent = conversations[0];
      if (mostRecent) {
        setActive({
          modelId: mostRecent.modelId,
          conversationId: mostRecent.id,
          personaId: mostRecent.personaId ?? BUILT_IN_PERSONA_ID,
        });
      }
    })();
  }, [checkedInitial, route.params]);

  // Cross-tab deep links: Models' "Use this model" / Discover's suggested
  // task or recently-used AIPal navigate here with params instead of a
  // conversationId. Consumed once, then cleared so re-focusing this tab
  // later doesn't re-trigger.
  useEffect(() => {
    const {modelId, conversationId, personaId} = route.params ?? {};
    if (!modelId && !conversationId) {
      return;
    }
    (async () => {
      const {prefillText} = route.params ?? {};
      if (conversationId && modelId) {
        setActive({
          modelId,
          conversationId,
          personaId: personaId ?? BUILT_IN_PERSONA_ID,
          initialInput: prefillText,
        });
      } else if (modelId) {
        // No existing conversation -- start a new one for this model.
        const conversation = await createConversation(modelId, personaId);
        setActive({
          modelId,
          conversationId: conversation.id,
          personaId: personaId ?? BUILT_IN_PERSONA_ID,
          initialInput: prefillText,
        });
      } else if (personaId) {
        // Persona-only deep link (Discover's "recently used AIPal"): use
        // its default model if set, else the most-recently-used downloaded
        // model.
        const [personasList, downloaded] = await Promise.all([
          getPersonas(),
          getDownloadedModels(),
        ]);
        const chosenPersona = personasList.find(p => p.id === personaId);
        const fallbackModelId = chosenPersona?.defaultModelId ?? downloaded[0]?.modelId;
        if (fallbackModelId) {
          const conversation = await createConversation(fallbackModelId, personaId);
          setActive({
            modelId: fallbackModelId,
            conversationId: conversation.id,
            personaId,
            initialInput: prefillText,
          });
        }
      } else if (prefillText) {
        // prefillText with no model/persona specified isn't a supported
        // deep-link shape yet (Discover's suggested tasks always pass a
        // modelId too) -- nothing to do.
      }
      navigation.setParams({
        modelId: undefined,
        conversationId: undefined,
        personaId: undefined,
        prefillText: route.params?.prefillText,
      });
    })();
    // route.params is read fresh above via the closure each time this
    // effect fires; only re-run when the specific fields that matter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.modelId, route.params?.conversationId, route.params?.personaId]);

  const handleOpenConversation = useCallback((modelId: string, conversationId: string) => {
    setDrawerOpen(false);
    getConversations().then(all => {
      const conversation = all.find(c => c.id === conversationId);
      setActive({
        modelId,
        conversationId,
        personaId: conversation?.personaId ?? BUILT_IN_PERSONA_ID,
      });
    });
  }, []);

  if (!active) {
    return (
      <AIPalScaffold>
        <EmptyState
          icon="💬"
          title="No conversations yet"
          body="Download a model to start chatting."
          actionLabel="Browse Models"
          onAction={() => navigation.navigate('Models')}
        />
        <ConversationDrawer
          visible={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onOpenConversation={handleOpenConversation}
          onBrowseModels={() => {
            setDrawerOpen(false);
            navigation.navigate('Models');
          }}
        />
      </AIPalScaffold>
    );
  }

  return (
    <>
      <ChatScreen
        key={active.conversationId}
        modelId={active.modelId}
        conversationId={active.conversationId}
        personaId={active.personaId}
        initialInput={active.initialInput}
        onOpenDrawer={() => setDrawerOpen(true)}
      />
      <ConversationDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenConversation={handleOpenConversation}
        onBrowseModels={() => {
          setDrawerOpen(false);
          navigation.navigate('Models');
        }}
      />
    </>
  );
}
