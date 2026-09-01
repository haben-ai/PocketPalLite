import React from 'react';
import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {colors, radius, spacing, typography} from '../theme';
import {ChatMessage} from '../types';
import {BlinkingCursor} from './BlinkingCursor';

export function ChatBubble({
  message,
  isStreaming,
  onRegenerate,
  onEdit,
}: {
  message: ChatMessage;
  isStreaming?: boolean;
  /** Only passed for the last assistant message. */
  onRegenerate?: () => void;
  /** Only passed for the last user message. */
  onEdit?: () => void;
}) {
  const isUser = message.role === 'user';
  const showActions = !isStreaming && (isUser ? !!onEdit : true);

  return (
    <View
      style={[
        styles.row,
        {justifyContent: isUser ? 'flex-end' : 'flex-start'},
      ]}>
      <View style={{maxWidth: '82%'}}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          {message.imagePath && (
            <Image
              source={{uri: `file://${message.imagePath}`}}
              style={styles.image}
              resizeMode="cover"
            />
          )}
          <View style={styles.textRow}>
            <Text style={styles.text}>{message.content}</Text>
            {isStreaming && <BlinkingCursor />}
          </View>
        </View>

        {showActions && (
          <View style={[styles.actions, {justifyContent: isUser ? 'flex-end' : 'flex-start'}]}>
            {!isUser && (
              <TouchableOpacity
                onPress={() => Clipboard.setString(message.content)}
                hitSlop={6}>
                <Text style={styles.actionLabel}>Copy</Text>
              </TouchableOpacity>
            )}
            {!isUser && onRegenerate && (
              <TouchableOpacity onPress={onRegenerate} hitSlop={6}>
                <Text style={styles.actionLabel}>Regenerate</Text>
              </TouchableOpacity>
            )}
            {isUser && onEdit && (
              <TouchableOpacity onPress={onEdit} hitSlop={6}>
                <Text style={styles.actionLabel}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', marginVertical: 6, paddingHorizontal: spacing.md},
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
  },
  userBubble: {
    backgroundColor: colors.userBubble,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.assistantBubble,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.surfaceContainerHigh,
  },
  textRow: {flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap'},
  text: {color: colors.textPrimary, fontSize: 15, lineHeight: 21},
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  actionLabel: {...typography.small, color: colors.textSecondary},
});
