import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {colors, motion, radius, spacing, typography} from '../theme';
import {Conversation, DownloadedModel} from '../types';
import {AppScreen} from '../navigation/types';
import {getModelById} from '../data/models';
import {
  createConversation,
  deleteConversation,
  getConversations,
} from '../storage/conversations';
import {getDownloadedModels} from '../storage/modelRegistry';
import {CapabilityBadge} from './Badge';
import {ModelPickerList} from './ModelPickerList';
import {
  GlassGridIcon,
  GlassMaskIcon,
  GlassSparkleIcon,
  GlassGearIcon,
  GlassNewChatIcon,
} from './GlassIcons';

const DRAWER_WIDTH = Math.min(320, Dimensions.get('window').width * 0.84);

const MENU_ITEMS: {icon: React.ReactNode; label: string; screen: AppScreen}[] = [
  {icon: <GlassGridIcon />, label: 'Models', screen: {name: 'models'}},
  {icon: <GlassMaskIcon />, label: 'AIPals', screen: {name: 'aipals'}},
  {icon: <GlassSparkleIcon />, label: 'Discover', screen: {name: 'discover'}},
  {icon: <GlassGearIcon />, label: 'Settings', screen: {name: 'settings'}},
];

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
 * ChatGPT-style sidebar: New chat + nav menu rows fixed at top, a
 * scrollable conversation list in the middle, and Settings pinned at the
 * very bottom -- the only way to reach Models/AIPals/Discover/Settings now
 * that there's no bottom tab bar.
 */
export function ConversationDrawer({
  visible,
  onClose,
  onOpenConversation,
  onNavigate,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenConversation: (modelId: string, conversationId: string) => void;
  onNavigate: (screen: AppScreen) => void;
}) {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [downloadedModels, setDownloadedModels] = useState<DownloadedModel[]>([]);
  const [showModelPicker, setShowModelPicker] = useState(false);

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

  const navigateAndClose = (screen: AppScreen) => {
    onClose();
    onNavigate(screen);
  };

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={visible ? 'box-none' : 'none'}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[styles.backdrop, {opacity: backdropOpacity}]}
          pointerEvents={visible ? 'auto' : 'none'}
        />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.drawer,
          {width: DRAWER_WIDTH, transform: [{translateX}]},
        ]}>
        {showModelPicker ? (
          <View style={styles.pickerSection}>
            <Text style={styles.pickerLabel}>Start a new chat with:</Text>
            <ModelPickerList
              models={downloadedModels}
              onSelect={handleStartNewChat}
            />
            <TouchableOpacity onPress={() => setShowModelPicker(false)}>
              <Text style={styles.cancelPicker}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setShowModelPicker(true)}>
            <GlassNewChatIcon />
            <Text style={styles.menuLabel}>New chat</Text>
          </TouchableOpacity>
        )}

        {MENU_ITEMS.map(item => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuRow}
            onPress={() => navigateAndClose(item.screen)}>
            {item.icon}
            <Text style={styles.menuLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionLabel}>Chats</Text>
        <FlatList
          data={conversations}
          keyExtractor={item => item.id}
          style={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyHint}>No conversations yet.</Text>
          }
          renderItem={({item}) => {
            const catalogModel = getModelById(item.modelId);
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => onOpenConversation(item.modelId, item.id)}
                onLongPress={() => handleDelete(item)}>
                <View style={{flex: 1}}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.rowMeta}>
                    <Text style={styles.rowModel} numberOfLines={1}>
                      {modelDisplayName(item.modelId, downloadedModels)}
                    </Text>
                    {catalogModel?.capability === 'vision' && (
                      <CapabilityBadge capability="vision" compact />
                    )}
                  </View>
                </View>
                <Text style={styles.rowDate}>{formatRelativeDate(item.updatedAt)}</Text>
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
    backgroundColor: '#000000',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.sidebarBackground,
    borderRightWidth: 1,
    borderRightColor: colors.outlineVariant,
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
  menuLabel: {...typography.body},
  pickerSection: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  pickerLabel: {...typography.caption, marginBottom: spacing.xs},
  cancelPicker: {
    ...typography.caption,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingVertical: 6,
  },
  sectionLabel: {
    ...typography.small,
    color: colors.textMuted,
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
  rowTitle: {...typography.body},
  rowMeta: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2},
  rowModel: {...typography.small, flexShrink: 1},
  rowDate: {...typography.small},
  emptyHint: {...typography.caption, marginTop: spacing.sm, paddingHorizontal: spacing.sm},
});
