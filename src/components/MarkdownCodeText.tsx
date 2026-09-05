import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';

type Segment = {type: 'text' | 'code'; value: string};

const CODE_FENCE = /```[^\n`]*\n([\s\S]*?)```/g;

/** Splits on complete ```-fenced blocks (the language tag after the
 * opening fence, if any, is discarded -- there's no syntax highlighting
 * here, just a distinct monospace treatment). An unterminated trailing
 * fence (still streaming) is left as plain text until it closes, rather
 * than guessing where it ends. */
function splitCodeBlocks(content: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  for (const match of content.matchAll(CODE_FENCE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({type: 'text', value: content.slice(lastIndex, start)});
    }
    segments.push({type: 'code', value: match[1]});
    lastIndex = start + match[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({type: 'text', value: content.slice(lastIndex)});
  }
  return segments.length > 0 ? segments : [{type: 'text', value: content}];
}

/** Renders chat message content with fenced code blocks (```...```) shown
 * in JetBrains Mono on a distinct surface, everything else in the normal
 * body font -- the only place in the app a monospace font is used. */
export function MarkdownCodeText({content, color}: {content: string; color: string}) {
  const {colors, typography} = useTheme();
  const segments = splitCodeBlocks(content);

  return (
    <>
      {segments.map((segment, index) =>
        segment.type === 'code' ? (
          <View
            key={index}
            style={[styles.codeBlock, {backgroundColor: colors.surfaceContainerHigh}]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text style={[typography.code, styles.codeText]} selectable>
                {segment.value.replace(/\n$/, '')}
              </Text>
            </ScrollView>
          </View>
        ) : (
          <Text key={index} style={[styles.text, {color}]}>
            {segment.value}
          </Text>
        ),
      )}
    </>
  );
}

const styles = StyleSheet.create({
  text: {fontSize: 15, lineHeight: 22},
  codeBlock: {
    borderRadius: radius.md,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  codeText: {lineHeight: 19},
});
