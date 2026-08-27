import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, radius, spacing} from '../theme';
import {ChatMessage} from '../types';

export function ChatBubble({
  message,
  isStreaming,
}: {
  message: ChatMessage;
  isStreaming?: boolean;
}) {
  const isUser = message.role === 'user';
  return (
    <View
      style={[
        styles.row,
        {justifyContent: isUser ? 'flex-end' : 'flex-start'},
      ]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}>
        <Text style={styles.text}>
          {message.content}
          {isStreaming ? ' ▌' : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', marginVertical: 6, paddingHorizontal: spacing.md},
  bubble: {
    maxWidth: '82%',
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
  text: {color: colors.textPrimary, fontSize: 15, lineHeight: 21},
});
