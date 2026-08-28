import React, {useEffect, useRef, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {colors, spacing, typography} from '../theme';
import {ChatMessage} from '../types';
import {getModelById} from '../data/models';
import {getDownloadedModel} from '../storage/modelRegistry';
import {getMessages, saveMessages, touchConversation, deriveTitle} from '../storage/conversations';
import {getInferenceEngine} from '../services/llamaSession';
import {InferenceEngine} from '../services/inferenceEngine';
import {truncateMessagesToContext, DEFAULT_CONTEXT_SIZE} from '../services/contextWindow';
import {getLanguagePipeline, DEFAULT_LANGUAGE} from '../services/languagePipeline';
import {ChatBubble} from '../components/ChatBubble';

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
  onBack,
}: {
  modelId: string;
  conversationId: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [status, setStatus] = useState('Loading model...');
  const [ready, setReady] = useState(false);
  const engineRef = useRef<InferenceEngine | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const modelName =
    getModelById(modelId)?.name ?? 'Model';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const persisted = await getMessages(conversationId);
      if (!cancelled) {
        setMessages(persisted);
      }

      const downloaded = await getDownloadedModel(modelId);
      if (!downloaded) {
        setStatus('Model file not found. Go back and re-download it.');
        return;
      }

      try {
        const engine = await getInferenceEngine(
          modelId,
          downloaded.filePath,
          progress => {
            if (!cancelled) {
              setStatus(`Loading model... ${progress}%`);
            }
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
  }, [modelId, conversationId]);

  const handleSend = async () => {
    const trimmed = input.trim();
    const engine = engineRef.current;
    if (!trimmed || !engine || streamingText !== null) {
      return;
    }

    const userMessage: ChatMessage = {
      id: newId(),
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    };
    // The full, untruncated history is what gets persisted -- the user
    // always sees their complete conversation. Only the subset sent to the
    // model (below) is ever trimmed.
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    await saveMessages(conversationId, nextMessages);
    if (messages.length === 0) {
      await touchConversation(conversationId, deriveTitle(trimmed));
    } else {
      await touchConversation(conversationId);
    }

    setStreamingText('');
    try {
      // User -> LanguagePipeline -> InferenceEngine. NoOpLanguagePipeline
      // makes detectLanguage/translateIn identity operations, so this is a
      // no-op today; a real pipeline plugs in via setLanguagePipeline()
      // without any change here.
      const pipeline = getLanguagePipeline();
      const detectedLanguage = await pipeline.detectLanguage(trimmed);
      const llmInputText = await pipeline.translateIn(
        trimmed,
        detectedLanguage,
        DEFAULT_LANGUAGE,
      );

      const contextMessages = truncateMessagesToContext(
        nextMessages,
        DEFAULT_CONTEXT_SIZE,
      );
      const enginePayload = contextMessages.map(m =>
        m.id === userMessage.id
          ? {role: m.role, content: llmInputText}
          : {role: m.role, content: m.content},
      );

      const result = await engine.completion(
        {
          messages: enginePayload,
          n_predict: 512,
          stop: STOP_WORDS,
        },
        token => {
          setStreamingText(prev => (prev ?? '') + token);
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
    } catch (err: any) {
      setStreamingText(null);
      const assistantMessage: ChatMessage = {
        id: newId(),
        role: 'assistant',
        content: `Error: ${err.message ?? err}`,
        createdAt: Date.now(),
      };
      const finalMessages = [...nextMessages, assistantMessage];
      setMessages(finalMessages);
      await saveMessages(conversationId, finalMessages);
    }
  };

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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹ Chats</Text>
        </TouchableOpacity>
        <Text style={typography.heading} numberOfLines={1}>
          {modelName}
        </Text>
        <View style={styles.backButton} />
      </View>

      {status ? <Text style={styles.status}>{status}</Text> : null}

      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={displayMessages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({item}) => (
            <ChatBubble
              message={item}
              isStreaming={item.id === 'streaming'}
            />
          )}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({animated: true})
          }
        />

        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={ready ? 'Message...' : 'Waiting for model...'}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            editable={ready}
            multiline
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!ready || streamingText !== null || !input.trim()}
            style={[
              styles.sendButton,
              (!ready || streamingText !== null || !input.trim()) && {
                opacity: 0.4,
              },
            ]}>
            <Text style={styles.sendLabel}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {minWidth: 70},
  backText: {color: colors.accent, fontSize: 15, fontWeight: '600'},
  status: {
    ...typography.caption,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
  list: {paddingVertical: spacing.sm, flexGrow: 1},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    backgroundColor: colors.accent,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  sendLabel: {color: '#fff', fontWeight: '700'},
});
