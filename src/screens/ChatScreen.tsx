import React, {useEffect, useRef, useState} from 'react';
import {
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {pick, isErrorWithCode, errorCodes} from '@react-native-documents/picker';
// Imported from the package's explicit index.js rather than the bare
// package name: @dariyd/react-native-pdf-page-image's package.json has a
// "react-native" field (src/index) that Metro prioritizes over "main", but
// that field fails to resolve under this Metro/Windows setup even though
// the file exists on disk. index.js (the plain "main" target) has the
// identical PdfPageImage API and resolves cleanly as a direct file path.
import PdfPageImage from '@dariyd/react-native-pdf-page-image/index';
import {spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {ChatMessage, DownloadedModel, Persona} from '../types';
import {getModelById} from '../data/models';
import {SYSTEM_PROMPT} from '../data/persona';
import {getDownloadedModel, getDownloadedModels} from '../storage/modelRegistry';
import {getPersona, ensureBuiltInPersonaSeeded, getPersonas} from '../storage/personas';
import {
  AppSettings,
  getAppSettings,
  setAppSettings,
  resetAppSettingsToDefaults,
  resolveNPredict,
} from '../storage/appSettings';
import {
  getMessages,
  saveMessages,
  touchConversation,
  updateConversationModel,
  updateConversationPersona,
  deriveTitle,
  getConversation,
  createConversation,
} from '../storage/conversations';
import {getInferenceEngine, getActiveModelId} from '../services/llamaSession';
import {InferenceEngine} from '../services/inferenceEngine';
import {truncateMessagesToContext, estimateTextTokens} from '../services/contextWindow';
import {getLanguagePipeline, DEFAULT_LANGUAGE} from '../services/languagePipeline';
import {copyPickedImage} from '../services/chatImages';
import {ChatBubble} from '../components/ChatBubble';
import {ChatComposer} from '../components/ChatComposer';
import {ModelSelector} from '../components/ModelSelector';
import {PersonaSelector} from '../components/PersonaSelector';
import {HeaderMenu} from '../components/HeaderMenu';
import {GlassIconButton, MenuIcon, NewChatIcon, DotsIcon} from '../components/Icons';
import {GenerationSettingsSheet} from '../components/GenerationSettingsSheet';
import {DottedSpinner} from '../components/DottedSpinner';
import {ChatLoadingState} from '../components/ChatLoadingState';
import {ExportImportSheet} from '../components/ExportImportSheet';
import {speak} from '../services/ttsService';
import {BraveSearchProvider, formatSearchResultsForContext} from '../services/searchProvider';
import {getSecret, SECRET_SERVICE} from '../services/secureStorage';
import {Conversation} from '../types';

const STOP_WORDS = [
  '</s>',
  '<|end|>',
  '<|eot_id|>',
  '<|end_of_text|>',
  '<|im_end|>',
  '<|EOT|>',
  '<|END_OF_TURN_TOKEN|>',
  '<|end_of_turn|>',
  '<|endoftext|>',
];

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ChatScreen({
  modelId,
  conversationId,
  personaId,
  initialInput,
  onOpenDrawer,
  onNewChat,
  onConversationImported,
}: {
  modelId: string;
  conversationId: string;
  personaId: string;
  /** Pre-fills the composer (unsent) -- used by Discover's suggested tasks. */
  initialInput?: string;
  onOpenDrawer: () => void;
  /** Starts a fresh conversation with the given (live, current) model/persona. */
  onNewChat: (modelId: string, personaId: string) => void;
  /** Switches to a conversation that was just created by importing a file. */
  onConversationImported: (conversationId: string) => void;
}) {
  const [activeModelId, setActiveModelId] = useState(modelId);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialInput ?? '');
  const [pendingImagePath, setPendingImagePath] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [status, setStatus] = useState('Loading model...');
  const [ready, setReady] = useState(false);
  const [showModelSwitcher, setShowModelSwitcher] = useState(false);
  const [showPersonaSwitcher, setShowPersonaSwitcher] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showGenerationSettings, setShowGenerationSettings] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);
  const [appSettings, setAppSettingsState] = useState<AppSettings | null>(null);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [downloadedModels, setDownloadedModels] = useState<DownloadedModel[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  // Bumped to re-run the engine-load effect below without changing model/
  // conversation/persona identity -- used to reinit after Auto Offload
  // released the context while the app was backgrounded.
  const [reloadTick, setReloadTick] = useState(0);
  const {colors, typography} = useTheme();
  const engineRef = useRef<InferenceEngine | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const streamingTextRef = useRef<string | null>(null);
  const stoppedRef = useRef(false);

  const model = getModelById(activeModelId);
  const modelName = model?.name ?? 'Model';
  const isVisionModel = model?.capability === 'vision';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const persisted = await getMessages(conversationId);
      if (!cancelled) {
        setMessages(persisted);
      }

      const resolvedPersona =
        (await getPersona(personaId)) ?? (await ensureBuiltInPersonaSeeded());
      if (!cancelled) {
        setPersona(resolvedPersona);
      }

      const conversation = await getConversation(conversationId);
      if (!cancelled) {
        setCurrentConversation(conversation ?? null);
      }

      const loadedSettings = await getAppSettings();
      if (!cancelled) {
        setAppSettingsState(loadedSettings);
      }

      const downloaded = await getDownloadedModel(activeModelId);
      if (!downloaded) {
        setStatus('Model file not found. Go back and re-download it.');
        return;
      }

      try {
        setReady(false);
        const engine = await getInferenceEngine(
          activeModelId,
          downloaded.filePath,
          downloaded.mmprojPath,
          progress => {
            if (!cancelled) {
              setStatus(`Loading model... ${progress}%`);
            }
          },
          {
            contextSize: loadedSettings.contextSize,
            useMlock: loadedSettings.useMlock,
            useMmap: loadedSettings.useMmap,
            nBatch: loadedSettings.nBatch,
            nUbatch: loadedSettings.nUbatch,
            nThreads: loadedSettings.nThreads,
            flashAttnType: loadedSettings.flashAttnType,
            cacheTypeK: loadedSettings.cacheTypeK,
            cacheTypeV: loadedSettings.cacheTypeV,
          },
        );
        if (!cancelled) {
          engineRef.current = engine;
          setReady(true);
          setStatus('');
        }
      } catch (err: any) {
        if (!cancelled) {
          setStatus(`Error loading model: ${err.message ?? err}`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeModelId, conversationId, personaId, reloadTick]);

  // Auto Offload releases the active context on background; if that
  // happened while this screen was already mounted, bump reloadTick on
  // return to foreground so the effect above reinits it before the next
  // send instead of failing against a released context.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active' && getActiveModelId() !== activeModelId) {
        setReloadTick(t => t + 1);
      }
    });
    return () => subscription.remove();
  }, [activeModelId]);

  const handleOpenModelSwitcher = async () => {
    setDownloadedModels(await getDownloadedModels());
    setShowModelSwitcher(true);
  };

  const handleSwitchModel = async (newModelId: string) => {
    setShowModelSwitcher(false);
    if (newModelId === activeModelId) {
      return;
    }
    await updateConversationModel(conversationId, newModelId);
    setActiveModelId(newModelId);
  };

  const handleOpenPersonaSwitcher = async () => {
    setPersonas(await getPersonas());
    setShowPersonaSwitcher(true);
  };

  const handleSwitchPersona = async (newPersonaId: string) => {
    setShowPersonaSwitcher(false);
    if (newPersonaId === persona?.id) {
      return;
    }
    await updateConversationPersona(conversationId, newPersonaId);
    const next = await getPersona(newPersonaId);
    if (next) {
      setPersona(next);
    }
  };

  const handleOpenHeaderMenu = async () => {
    // Load fresh so the menu's inline Model submenu always reflects
    // whatever's actually downloaded, not a possibly-stale mount snapshot.
    setDownloadedModels(await getDownloadedModels());
    setShowHeaderMenu(true);
  };

  const handleOpenGenerationSettings = async () => {
    // Re-fetch so the sheet always opens with whatever was last saved
    // (e.g. from a previous conversation's session), not this screen's
    // possibly-stale mount-time snapshot.
    setAppSettingsState(await getAppSettings());
    setShowGenerationSettings(true);
  };

  const handleSaveGenerationSettings = async (next: AppSettings) => {
    await setAppSettings(next);
    setAppSettingsState(next);
  };

  const handleResetGenerationSettings = async () => {
    const defaults = await resetAppSettingsToDefaults();
    setAppSettingsState(defaults);
  };

  const handleAttachMedia = async () => {
    try {
      const [file] = await pick({type: ['image/*', 'application/pdf']});
      if (!file?.uri) {
        return;
      }
      const isPdf =
        file.type === 'application/pdf' ||
        (file.name ?? '').toLowerCase().endsWith('.pdf');

      if (isPdf) {
        // PDFs are rendered to a JPEG of their first page and then treated
        // exactly like a picked image from that point on. Scoped to page 1
        // only for now -- multi-page would mean imagePath becoming a
        // per-message array, touching ChatMessage/ChatBubble/completion
        // params/context budget for a need not stated yet.
        const rendered = await PdfPageImage.generate(file.uri, 0, 2, {
          format: 'jpeg',
          maxDimension: 1600,
        });
        const localPath = await copyPickedImage(rendered.uri);
        await PdfPageImage.close(file.uri).catch(() => undefined);
        setPendingImagePath(localPath);
      } else {
        // Copy immediately: the picker's content:// URI's access grant can
        // be transient, and native completion() needs a real file path
        // anyway (it can't resolve content:// the way <Image> can).
        const localPath = await copyPickedImage(file.uri);
        setPendingImagePath(localPath);
      }
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
    }
  };

  /**
   * Shared by handleSend/handleRegenerate/the edit-submit path: takes the
   * message list to persist (already includes the user turn, if any) plus
   * the ChatMessage whose content is actually sent to the model this turn
   * (translateIn'd, image path attached), runs the completion, and
   * finalizes the result. Not used for anything that doesn't end in a
   * fresh model turn.
   */
  const runCompletion = async (
    nextMessages: ChatMessage[],
    userMessage: ChatMessage,
  ) => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }
    setStreamingText('');
    streamingTextRef.current = '';
    stoppedRef.current = false;
    try {
      // User -> LanguagePipeline -> InferenceEngine. NoOpLanguagePipeline
      // makes detectLanguage/translateIn identity operations, so this is a
      // no-op today; a real pipeline plugs in via setLanguagePipeline()
      // without any change here.
      const pipeline = getLanguagePipeline();
      const detectedLanguage = await pipeline.detectLanguage(userMessage.content);
      const llmInputText = await pipeline.translateIn(
        userMessage.content,
        detectedLanguage,
        DEFAULT_LANGUAGE,
      );

      const settings = await getAppSettings();
      const systemPrompt = persona?.systemPrompt ?? SYSTEM_PROMPT;
      const systemPromptTokens = estimateTextTokens(systemPrompt);

      // Internet Search: one search per turn (not a multi-call agentic
      // loop -- engine.completion() is a single one-shot call with no
      // native tool-calling support to hook a loop into), only when this
      // persona opts in AND the user has finished setup in Settings.
      let searchContextMessage: {role: string; content: string} | null = null;
      if (
        persona?.internetSearchEnabled &&
        settings.searchDisclosureAccepted &&
        settings.searchProvider === 'brave'
      ) {
        const apiKey = await getSecret(SECRET_SERVICE.braveApiKey);
        if (apiKey) {
          try {
            const provider = new BraveSearchProvider(apiKey);
            const results = await provider.search(userMessage.content, settings.searchResultsCount);
            searchContextMessage = {
              role: 'system',
              content: formatSearchResultsForContext(userMessage.content, results),
            };
          } catch {
            // A failed search shouldn't block the reply -- just skip augmentation.
          }
        }
      }

      const contextMessages = truncateMessagesToContext(
        nextMessages,
        settings.contextSize,
        systemPromptTokens,
      );
      const enginePayload = [
        {role: 'system', content: systemPrompt},
        ...(searchContextMessage ? [searchContextMessage] : []),
        ...contextMessages.map(m =>
          m.id === userMessage.id
            ? {role: m.role, content: llmInputText}
            : {role: m.role, content: m.content},
        ),
      ];

      const result = await engine.completion(
        {
          messages: enginePayload,
          n_predict: resolveNPredict(settings),
          temperature: settings.temperature,
          topK: settings.topK,
          topP: settings.topP,
          minP: settings.minP,
          xtcThreshold: settings.xtcThreshold,
          xtcProbability: settings.xtcProbability,
          typicalP: settings.typicalP,
          penaltyLastN: settings.penaltyLastN,
          penaltyRepeat: settings.penaltyRepeat,
          penaltyFreq: settings.penaltyFreq,
          penaltyPresent: settings.penaltyPresent,
          mirostat: settings.mirostat,
          seed: settings.seed,
          jinja: settings.jinja,
          enableThinking: settings.includeThinkingInContext,
          stop: STOP_WORDS,
          mediaPaths: userMessage.imagePath ? [userMessage.imagePath] : undefined,
        },
        token => {
          setStreamingText(prev => (prev ?? '') + token);
          streamingTextRef.current = (streamingTextRef.current ?? '') + token;
        },
      );

      // InferenceEngine -> LanguagePipeline -> User.
      const translatedOut = await pipeline.translateOut(
        result.text?.trim() || '',
        DEFAULT_LANGUAGE,
        detectedLanguage,
      );

      const assistantMessage: ChatMessage = {
        id: newId(),
        role: 'assistant',
        content: translatedOut || '(no response)',
        createdAt: Date.now(),
      };
      const finalMessages = [...nextMessages, assistantMessage];
      setMessages(finalMessages);
      setStreamingText(null);
      await saveMessages(conversationId, finalMessages);
      await touchConversation(conversationId);
      // Speak the finished reply, not the growing partial text -- reading
      // out a constantly-changing stream would be unusable.
      if (settings.ttsEnabled) {
        speak(assistantMessage.content);
      }
    } catch (err: any) {
      setStreamingText(null);
      const partial = streamingTextRef.current;
      // A user-initiated Stop interrupts the native completion() call,
      // which may resolve or reject depending on how far generation got --
      // either way, keep whatever text streamed in as the final reply
      // rather than showing an error for something the user asked for.
      const assistantMessage: ChatMessage = {
        id: newId(),
        role: 'assistant',
        content:
          stoppedRef.current && partial
            ? partial
            : stoppedRef.current
            ? '(stopped)'
            : `Error: ${err.message ?? err}`,
        createdAt: Date.now(),
      };
      const finalMessages = [...nextMessages, assistantMessage];
      setMessages(finalMessages);
      await saveMessages(conversationId, finalMessages);
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if ((!trimmed && !pendingImagePath) || !engineRef.current || streamingText !== null) {
      return;
    }

    if (editingMessageId) {
      await submitEdit(trimmed);
      return;
    }

    const userMessage: ChatMessage = {
      id: newId(),
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
      imagePath: pendingImagePath ?? undefined,
    };
    // The full, untruncated history is what gets persisted -- the user
    // always sees their complete conversation. Only the subset sent to the
    // model (below) is ever trimmed.
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setPendingImagePath(null);
    await saveMessages(conversationId, nextMessages);
    if (messages.length === 0) {
      await touchConversation(conversationId, deriveTitle(trimmed || 'Photo'));
    } else {
      await touchConversation(conversationId);
    }

    await runCompletion(nextMessages, userMessage);
  };

  const handleStop = async () => {
    stoppedRef.current = true;
    await engineRef.current?.stop();
  };

  const handleRegenerate = async () => {
    if (streamingText !== null || messages.length === 0) {
      return;
    }
    const last = messages[messages.length - 1];
    if (last.role !== 'assistant') {
      return;
    }
    const withoutLastReply = messages.slice(0, -1);
    const userMessage = withoutLastReply[withoutLastReply.length - 1];
    if (!userMessage || userMessage.role !== 'user') {
      return;
    }
    setMessages(withoutLastReply);
    await saveMessages(conversationId, withoutLastReply);
    await runCompletion(withoutLastReply, userMessage);
  };

  const handleEditLastMessage = () => {
    if (streamingText !== null) {
      return;
    }
    const target = lastUserMessage;
    if (!target) {
      return;
    }
    setEditingMessageId(target.id);
    setInput(target.content);
    setPendingImagePath(target.imagePath ?? null);
  };

  const submitEdit = async (trimmed: string) => {
    const editIndex = messages.findIndex(m => m.id === editingMessageId);
    if (editIndex === -1) {
      setEditingMessageId(null);
      return;
    }
    const editedMessage: ChatMessage = {
      ...messages[editIndex],
      content: trimmed,
      imagePath: pendingImagePath ?? undefined,
    };
    const nextMessages = [...messages.slice(0, editIndex), editedMessage];
    setEditingMessageId(null);
    setMessages(nextMessages);
    setInput('');
    setPendingImagePath(null);
    await saveMessages(conversationId, nextMessages);
    await touchConversation(conversationId);
    await runCompletion(nextMessages, editedMessage);
  };

  // The most recent user turn, whether or not a reply already followed it
  // -- editing after seeing a bad reply is the whole point, so this can't
  // require the user message to still be the very last array item.
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user') ?? null;
  const lastAssistantMessage =
    messages.length > 0 && messages[messages.length - 1].role === 'assistant'
      ? messages[messages.length - 1]
      : null;

  const displayMessages: ChatMessage[] =
    streamingText !== null
      ? [
          ...messages,
          {
            id: 'streaming',
            role: 'assistant',
            content: streamingText,
            createdAt: Date.now(),
          },
        ]
      : messages;

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={styles.header}>
        <GlassIconButton onPress={onOpenDrawer}>
          <MenuIcon color={colors.textPrimary} />
        </GlassIconButton>
        <View style={styles.headerTitles}>
          <TouchableOpacity
            onPress={handleOpenModelSwitcher}
            style={styles.switcherRow}
            hitSlop={4}>
            <Text style={typography.heading} numberOfLines={1}>
              {modelName}
            </Text>
            <Text style={[styles.chevron, {color: colors.textSecondary}]}>▾</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleOpenPersonaSwitcher}
            style={styles.switcherRow}
            hitSlop={4}>
            <Text style={[typography.caption, {color: colors.textSecondary}]} numberOfLines={1}>
              {persona ? `${persona.avatarEmoji} ${persona.name}` : 'AIPal'}
            </Text>
            <Text style={[styles.chevron, {color: colors.textSecondary}]}>▾</Text>
          </TouchableOpacity>
          {!ready && (
            <View style={styles.loadingDot}>
              <DottedSpinner size={18} color={colors.textSecondary} />
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          <GlassIconButton onPress={() => onNewChat(activeModelId, persona?.id ?? personaId)}>
            <NewChatIcon color={colors.textPrimary} />
          </GlassIconButton>
          <GlassIconButton onPress={handleOpenHeaderMenu}>
            <DotsIcon color={colors.textPrimary} />
          </GlassIconButton>
        </View>
      </View>

      <ModelSelector
        visible={showModelSwitcher}
        onClose={() => setShowModelSwitcher(false)}
        models={downloadedModels}
        activeModelId={activeModelId}
        onSelect={handleSwitchModel}
        title="Switch model"
        hint="This chat continues with the new model."
      />

      <PersonaSelector
        visible={showPersonaSwitcher}
        onClose={() => setShowPersonaSwitcher(false)}
        personas={personas}
        activePersonaId={persona?.id}
        onSelect={handleSwitchPersona}
      />

      <HeaderMenu
        visible={showHeaderMenu}
        onClose={() => setShowHeaderMenu(false)}
        onOpenGenerationSettings={handleOpenGenerationSettings}
        onOpenExportImport={() => setShowExportImport(true)}
        models={downloadedModels}
        activeModelId={activeModelId}
        onSelectModel={handleSwitchModel}
      />

      {appSettings && (
        <GenerationSettingsSheet
          visible={showGenerationSettings}
          settings={appSettings}
          onClose={() => setShowGenerationSettings(false)}
          onSave={handleSaveGenerationSettings}
          onResetToDefaults={handleResetGenerationSettings}
        />
      )}

      <ExportImportSheet
        visible={showExportImport}
        conversation={currentConversation}
        onClose={() => setShowExportImport(false)}
        onImported={onConversationImported}
      />

      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {ready ? (
          <FlatList
            ref={listRef}
            data={displayMessages}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            renderItem={({item}) => (
              <ChatBubble
                message={item}
                isStreaming={item.id === 'streaming'}
                onRegenerate={
                  lastAssistantMessage?.id === item.id ? handleRegenerate : undefined
                }
                onEdit={lastUserMessage?.id === item.id ? handleEditLastMessage : undefined}
              />
            )}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({animated: true})
            }
          />
        ) : (
          // The model isn't loaded yet (or failed to load) -- show the
          // centered icon/headline/status state instead of an empty list.
          // This entirely disappears once `ready` flips true, same turn the
          // FlatList above takes over.
          <ChatLoadingState status={status} />
        )}

        <ChatComposer
          value={input}
          onChangeText={setInput}
          onSend={handleSend}
          onStop={handleStop}
          onAttach={isVisionModel ? handleAttachMedia : undefined}
          pendingImagePath={pendingImagePath}
          onRemoveImage={() => setPendingImagePath(null)}
          ready={ready}
          isGenerating={streamingText !== null}
          isVisionModel={isVisionModel}
          editingLabel={editingMessageId ? 'Editing message' : null}
          onCancelEdit={() => {
            setEditingMessageId(null);
            setInput('');
            setPendingImagePath(null);
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Asymmetric on purpose: the hamburger sits close enough to the left
    // edge with the plain spacing.md padding that on some devices (seen on
    // a OnePlus/Realme ColorOS phone) the system's edge back-swipe gesture
    // zone swallows taps on it before the app ever sees them. Extra left
    // padding clears that zone; the right side isn't affected so it stays
    // as-is.
    paddingLeft: spacing.xl + spacing.md,
    paddingRight: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerActions: {flexDirection: 'row', gap: spacing.xs},
  headerTitles: {flexShrink: 1, alignItems: 'center'},
  loadingDot: {marginTop: 4},
  switcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  chevron: {fontSize: 14},
  list: {paddingVertical: spacing.sm, flexGrow: 1},
});
