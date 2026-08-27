import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {colors, radius, spacing, typography} from '../theme';
import {Conversation} from '../types';
import {
  createConversation,
  deleteConversation,
  getConversationsForModel,
} from '../storage/conversations';
import {getModelById} from '../data/models';
import {getDownloadedModel} from '../storage/modelRegistry';
import {PrimaryButton} from '../components/PrimaryButton';
import {Card} from '../components/Card';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
}

export function ConversationListScreen({
  modelId,
  onBack,
  onOpenConversation,
}: {
  modelId: string;
  onBack: () => void;
  onOpenConversation: (conversationId: string) => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [modelName, setModelName] = useState<string>('Chats');

  const refresh = useCallback(async () => {
    setConversations(await getConversationsForModel(modelId));
  }, [modelId]);

  useEffect(() => {
    refresh();
    const catalogModel = getModelById(modelId);
    if (catalogModel) {
      setModelName(catalogModel.name);
    } else {
      getDownloadedModel(modelId).then(downloaded => {
        if (downloaded) {
          setModelName(downloaded.displayName);
        }
      });
    }
  }, [refresh, modelId]);

  const handleNewChat = async () => {
    const convo = await createConversation(modelId);
    onOpenConversation(convo.id);
  };

  const handleDelete = (conversation: Conversation) => {
    Alert.alert('Delete chat', `Delete "${conversation.title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteConversation(conversation.id);
          await refresh();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹ Models</Text>
        </TouchableOpacity>
        <Text style={typography.heading}>{modelName}</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.newChatWrap}>
        <PrimaryButton label="+ New Chat" onPress={handleNewChat} />
      </View>

      <FlatList
        data={conversations}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No conversations yet. Start a new chat above.
          </Text>
        }
        renderItem={({item}) => (
          <TouchableOpacity onPress={() => onOpenConversation(item.id)}>
            <Card style={styles.conversationCard}>
              <View style={styles.conversationRow}>
                <View style={{flex: 1}}>
                  <Text style={styles.conversationTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.conversationDate}>
                    {formatDate(item.updatedAt)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  hitSlop={10}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
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
  newChatWrap: {paddingHorizontal: spacing.md, marginBottom: spacing.sm},
  list: {paddingHorizontal: spacing.md, paddingBottom: spacing.xl},
  conversationCard: {marginBottom: spacing.sm, borderRadius: radius.md},
  conversationRow: {flexDirection: 'row', alignItems: 'center'},
  conversationTitle: {...typography.body, fontWeight: '600'},
  conversationDate: {...typography.small, marginTop: 2},
  deleteText: {color: colors.danger, fontSize: 13, fontWeight: '600'},
  empty: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
