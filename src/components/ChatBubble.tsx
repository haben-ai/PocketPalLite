import React from 'react';
import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useTranslation} from 'react-i18next';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {ChatMessage} from '../types';
import {TypingIndicator} from './TypingIndicator';
import {GlassCopyIcon, GlassRegenerateIcon, GlassEditIcon} from './GlassIcons';

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
  // While waiting for the first token, show the wave instead of an empty
  // bubble; once text starts arriving, just show it plainly (matching
  // ChatGPT -- no trailing cursor once streaming is underway).
  const waitingForFirstToken = isStreaming && message.content.length === 0;
  const {colors} = useTheme();
  const {t} = useTranslation();

  return (
    <View
      style={[
        styles.row,
        {justifyContent: isUser ? 'flex-end' : 'flex-start'},
      ]}>
      <View style={isUser ? styles.userMaxWidth : styles.assistantMaxWidth}>
        <View
          style={[
            styles.bubble,
            {backgroundColor: isUser ? colors.userBubble : colors.assistantBubble},
            isUser ? styles.userBubbleCorner : styles.assistantBubblePadding,
          ]}>
          {message.imagePath && (
            <Image
              source={{uri: `file://${message.imagePath}`}}
              style={[styles.image, {backgroundColor: colors.surfaceContainerHigh}]}
              resizeMode="cover"
            />
          )}
          {waitingForFirstToken ? (
            <TypingIndicator />
          ) : (
            <Text style={[styles.text, {color: colors.textPrimary}]}>{message.content}</Text>
          )}
        </View>

        {showActions && (
          <View style={[styles.actions, {justifyContent: isUser ? 'flex-end' : 'flex-start'}]}>
            {!isUser && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => Clipboard.setString(message.content)}
                hitSlop={6}>
                <GlassCopyIcon />
                <Text style={[styles.actionLabel, {color: colors.textSecondary}]}>{t('chat.copy')}</Text>
              </TouchableOpacity>
            )}
            {!isUser && onRegenerate && (
              <TouchableOpacity style={styles.actionButton} onPress={onRegenerate} hitSlop={6}>
                <GlassRegenerateIcon />
                <Text style={[styles.actionLabel, {color: colors.textSecondary}]}>{t('chat.regenerate')}</Text>
              </TouchableOpacity>
            )}
            {isUser && onEdit && (
              <TouchableOpacity style={styles.actionButton} onPress={onEdit} hitSlop={6}>
                <GlassEditIcon />
                <Text style={[styles.actionLabel, {color: colors.textSecondary}]}>{t('chat.edit')}</Text>
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
  userMaxWidth: {maxWidth: '82%'},
  assistantMaxWidth: {maxWidth: '100%'},
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
  },
  userBubbleCorner: {borderBottomRightRadius: 4},
  // No fill, no border -- assistant replies are plain text on the
  // background, matching ChatGPT (only user messages get a bubble).
  assistantBubblePadding: {paddingHorizontal: 0},
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  text: {fontSize: 15, lineHeight: 22},
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  actionButton: {flexDirection: 'row', alignItems: 'center', gap: 4},
  actionLabel: {fontSize: 11, fontWeight: '500'},
});
