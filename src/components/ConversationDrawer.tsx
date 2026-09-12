import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Alert} from './AppDialog';
import {useTranslation} from 'react-i18next';
import {motion, radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {Conversation, DownloadedModel} from '../types';
import {getModelById} from '../data/models';
import {
  createConversation,
  deleteConversation,
  getConversations,
} from '../storage/conversations';
import {getDownloadedModels} from '../storage/modelRegistry';
import {CapabilityBadge} from './Badge';
import {ModelPickerList} from './ModelPickerList';
import {NewChatIcon} from './Icons';

const DRAWER_WIDTH = Math.min(320, Dimensions.get('window').width * 0.84);

function modelDisplayName(modelId: string, downloaded: DownloadedModel[]): string {
  const catalogModel = getModelById(modelId);
  if (catalogModel) {
    return catalogModel.name;
  }
  return downloaded.find(m => m.modelId === modelId)?.displayName ?? 'Model';
}

function formatRelativeDate(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) {
    return 'Just now';
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) {
    return `${diffHr}h ago`;
  }
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) {
    return `${diffDay}d ago`;
  }
  return new Date(ts).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
}

/**
 * Conversation history sidebar: New chat fixed at top, a scrollable
 * conversation list below it. App-section navigation (Models/AIPals/More)
 * now lives in the persistent bottom tab bar instead of here.
 */
export function ConversationDrawer({
  visible,
  onClose,
  onOpenConversation,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenConversation: (modelId: string, conversationId: string) => void;
}) {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [downloadedModels, setDownloadedModels] = useState<DownloadedModel[]>([]);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const {colors, typography} = useTheme();
  const {t} = useTranslation();

  const refresh = useCallback(async () => {
    const [convos, models] = await Promise.all([
      getConversations(),
      getDownloadedModels(),
    ]);
    setConversations(convos);
    setDownloadedModels(models);
  }, []);

  // Stays mounted at all times (animated off-screen via translateX rather
  // than unmounted) -- a previous mount/unmount state machine here had an
  // intermittent bug where the drawer would occasionally never reappear
  // after tapping the hamburger. Always-mounted + pointerEvents toggling is
  // a simpler, more robust pattern for a component this size.
  // Registered only while the drawer is open, so it takes priority over
  // RootNavigator's own hardwareBackPress handler (RN's BackHandler checks
  // the most-recently-added listener first) -- back closes the drawer
  // instead of falling through to navigate/exit.
  useEffect(() => {
    if (!visible) {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [visible, onClose]);

  useEffect(() => {
    if (visible) {
      setShowModelPicker(false);
      refresh();
    }
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: visible ? 0 : -DRAWER_WIDTH,
        duration: motion.base,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 1 : 0,
        duration: motion.base,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, refresh, translateX, backdropOpacity]);

  const handleStartNewChat = async (modelId: string) => {
    const conversation = await createConversation(modelId);
    onOpenConversation(modelId, conversation.id);
  };

  const handleDelete = (conversation: Conversation) => {
    Alert.alert('Delete chat', `Delete "${conversation.title}"?`, [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteConversation(conversation.id);
          await refresh();
        },
      },
    ]);
  };

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={visible ? 'box-none' : 'none'}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[styles.backdrop, {backgroundColor: colors.scrim, opacity: backdropOpacity}]}
          pointerEvents={visible ? 'auto' : 'none'}
        />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.drawer,
          {
            width: DRAWER_WIDTH,
            backgroundColor: colors.sidebarBackground,
            borderRightColor: colors.outlineVariant,
            transform: [{translateX}],
          },
        ]}>
        {showModelPicker ? (
          <View style={[styles.pickerSection, {backgroundColor: colors.surfaceContainer}]}>
            <Text style={typography.caption}>Start a new chat with:</Text>
            <ModelPickerList
              models={downloadedModels}
              onSelect={handleStartNewChat}
            />
            <TouchableOpacity onPress={() => setShowModelPicker(false)}>
              <Text style={[typography.caption, styles.cancelPicker, {color: colors.textPrimary}]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setShowModelPicker(true)}>
            <NewChatIcon color={colors.textPrimary} />
            <Text style={typography.body}>{t('drawer.newChat')}</Text>
          </TouchableOpacity>
        )}

        <Text style={[typography.small, styles.sectionLabel, {color: colors.textMuted}]}>
          {t('drawer.chats')}
        </Text>
        <FlatList
          data={conversations}
          keyExtractor={item => item.id}
          style={styles.list}
          ListEmptyComponent={
            <Text style={[typography.caption, styles.emptyHint]}>{t('drawer.noConversations')}</Text>
          }
          renderItem={({item}) => {
            const catalogModel = getModelById(item.modelId);
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => onOpenConversation(item.modelId, item.id)}
                onLongPress={() => handleDelete(item)}>
                <View style={{flex: 1}}>
                  <Text style={typography.body} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.rowMeta}>
                    <Text style={typography.small} numberOfLines={1}>
                      {modelDisplayName(item.modelId, downloadedModels)}
                    </Text>
                    {catalogModel?.capability === 'vision' && (
                      <CapabilityBadge capability="vision" compact />
                    )}
                  </View>
                </View>
                <Text style={typography.small}>{formatRelativeDate(item.updatedAt)}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRightWidth: 1,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 11,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  pickerSection: {
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  cancelPicker: {
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingVertical: 6,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  list: {flex: 1},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  rowMeta: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2},
  emptyHint: {marginTop: spacing.sm, paddingHorizontal: spacing.sm},
});
