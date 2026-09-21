import React, {useCallback, useEffect, useState} from 'react';
import {AppScreen} from '../navigation/types';
import {AIPalScaffold} from '../components/AIPalScaffold';
import {EmptyState} from '../components/EmptyState';
import {ConversationDrawer} from '../components/ConversationDrawer';
import {ChatScreen} from './ChatScreen';
import {createConversation, getConversations} from '../storage/conversations';
import {getDownloadedModels} from '../storage/modelRegistry';
import {getPersonas} from '../storage/personas';
import {BUILT_IN_PERSONA_ID} from '../data/persona';
import {consumeIsColdStart} from '../services/appLifecycle';

type Props = {
  modelId?: string;
  conversationId?: string;
  personaId?: string;
  prefillText?: string;
  onNavigate: (screen: AppScreen) => void;
};

type ActiveConversation = {
  modelId: string;
  conversationId: string;
  personaId: string;
  initialInput?: string;
  /** Pop the keyboard once the composer is ready -- true for a new/home
   * entry into Chat (cold launch, New Chat, new AIPal chat), false when
   * resuming a specific past conversation (reopening it to read is not an
   * intent to start typing immediately). */
  autoFocus: boolean;
};

/**
 * Owns which conversation is showing and the conversation-history drawer.
 * No more tab-focus/deep-link param dance -- this screen fully
 * mounts/unmounts each time the user navigates to and from Chat via the
 * sidebar, so a plain mount effect is all that's needed.
 */
export function ChatTabScreen({
  modelId,
  conversationId,
  personaId,
  prefillText,
  onNavigate,
}: Props) {
  const [active, setActive] = useState<ActiveConversation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      if (conversationId && modelId) {
        setActive({
          modelId,
          conversationId,
          personaId: personaId ?? BUILT_IN_PERSONA_ID,
          initialInput: prefillText,
          autoFocus: false,
        });
      } else if (modelId) {
        // No existing conversation -- start a new one for this model.
        const conversation = await createConversation(modelId, personaId);
        setActive({
          modelId,
          conversationId: conversation.id,
          personaId: personaId ?? BUILT_IN_PERSONA_ID,
          initialInput: prefillText,
          autoFocus: true,
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
            autoFocus: true,
          });
        }
      } else {
        // Chat-first boot: land on the most recent conversation, if any --
        // but only when this app instance was already running (e.g. the
        // user navigated back to Chat from the sidebar). If the process was
        // actually killed and just cold-started, start a fresh conversation
        // instead, carrying over whichever model/persona was last used
        // rather than resuming the old chat's history.
        const conversations = await getConversations();
        const mostRecent = conversations[0];
        const coldStart = consumeIsColdStart();
        if (mostRecent && coldStart) {
          const conversation = await createConversation(
            mostRecent.modelId,
            mostRecent.personaId ?? BUILT_IN_PERSONA_ID,
          );
          setActive({
            modelId: mostRecent.modelId,
            conversationId: conversation.id,
            personaId: mostRecent.personaId ?? BUILT_IN_PERSONA_ID,
            autoFocus: true,
          });
        } else if (mostRecent) {
          setActive({
            modelId: mostRecent.modelId,
            conversationId: mostRecent.id,
            personaId: mostRecent.personaId ?? BUILT_IN_PERSONA_ID,
            autoFocus: false,
          });
        }
      }
    })();
    // Intentionally only re-runs when the identity of the requested
    // conversation/model/persona changes, not on every prop object identity
    // change from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, conversationId, personaId]);

  const handleOpenConversation = useCallback((modelId: string, conversationId: string) => {
    setDrawerOpen(false);
    getConversations().then(all => {
      const conversation = all.find(c => c.id === conversationId);
      setActive({
        modelId,
        conversationId,
        personaId: conversation?.personaId ?? BUILT_IN_PERSONA_ID,
        autoFocus: false,
      });
    });
  }, []);

  const handleNewChat = useCallback((newChatModelId: string, newChatPersonaId: string) => {
    createConversation(newChatModelId, newChatPersonaId).then(conversation => {
      setActive({
        modelId: newChatModelId,
        conversationId: conversation.id,
        personaId: newChatPersonaId,
        autoFocus: true,
      });
    });
  }, []);

  // An imported conversation's model/persona come from whatever was in the
  // export file, not from this screen's own state -- look them up fresh
  // from storage rather than assuming they match the conversation we're
  // currently on.
  const handleConversationImported = useCallback((importedConversationId: string) => {
    getConversations().then(all => {
      const conversation = all.find(c => c.id === importedConversationId);
      if (conversation) {
        setActive({
          modelId: conversation.modelId,
          conversationId: conversation.id,
          personaId: conversation.personaId ?? BUILT_IN_PERSONA_ID,
          autoFocus: false,
        });
      }
    });
  }, []);

  if (!active) {
    return (
      <AIPalScaffold>
        <EmptyState
          useAppIcon
          title="No Models Available"
          body="Download a model to chat."
          actionLabel="Browse Models"
          onAction={() => onNavigate({name: 'models'})}
        />
        <ConversationDrawer
          visible={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onOpenConversation={handleOpenConversation}
          onNavigate={onNavigate}
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
        autoFocus={active.autoFocus}
        onOpenDrawer={() => setDrawerOpen(true)}
        onNewChat={handleNewChat}
        onConversationImported={handleConversationImported}
      />
      <ConversationDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenConversation={handleOpenConversation}
        onNavigate={onNavigate}
      />
    </>
  );
}
