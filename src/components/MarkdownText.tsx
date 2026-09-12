import React, {useMemo, useState} from 'react';
import {Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {CheckIcon, CopyIcon} from './Icons';

type Block =
  | {type: 'code'; code: string}
  | {type: 'heading'; level: number; text: string}
  | {type: 'list-item'; ordered: boolean; marker: string; text: string}
  | {type: 'paragraph'; text: string};

type InlineSpan = {text: string; bold?: boolean; italic?: boolean; code?: boolean; link?: string};

const CODE_FENCE = /```[^\n`]*\n([\s\S]*?)```/g;
const HEADING_LINE = /^(#{1,6})\s+(.*)$/;
const LIST_LINE = /^\s*([-*+]|\d+[.)])\s+(.*)$/;
// Trailing punctuation a bare URL match would otherwise swallow when it sits
// at the end of a sentence (e.g. "see https://x.com." shouldn't link the
// period) -- stripped off and re-emitted as plain text after the link span.
const URL_TRAILING_PUNCT = /[.,;:!?)\]}'"]+$/;
// Link alternatives come first: a markdown link or bare URL containing `_`/
// `*` (common in query strings/paths) must be consumed whole before the
// italic/bold alternatives below get a chance to misread those characters
// as emphasis markers. The first two *code* alternatives (bold-wrapped
// inline code, e.g. Gemma's own `**`count = 0`**: ...` list-item style)
// must come before the plain code and plain bold alternatives -- matched as
// one atomic token, otherwise the bold delimiters and the code delimiters
// get split into separate matches that can't be recombined, leaving literal
// `**`/backtick characters visible around the code chip.
const INLINE_TOKEN =
  /(\[[^\]]+\]\(https?:\/\/[^\s)]+\))|(https?:\/\/[^\s<>"')\]]+)|(\*\*`[^`]+`\*\*)|(__`[^`]+`__)|(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)/g;

/**
 * Splits message text into ```-fenced code segments (kept verbatim, a
 * streaming-in-progress fence is left as plain text until it closes rather
 * than guessed at) and everything else, which then gets parsed line-by-line
 * into headings/list items/paragraphs. Deliberately not a full CommonMark
 * parser -- chat model output only ever uses a handful of constructs
 * (headings, bold/italic, lists, inline/fenced code), and a small hand-rolled
 * parser matching exactly those stays cheap enough to re-run on every
 * streamed token without a debounce.
 */
function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  let lastIndex = 0;

  const pushTextRange = (text: string) => {
    const lines = text.split('\n');
    let paragraphLines: string[] = [];
    const flushParagraph = () => {
      if (paragraphLines.length > 0) {
        blocks.push({type: 'paragraph', text: paragraphLines.join(' ')});
        paragraphLines = [];
      }
    };
    for (const line of lines) {
      const heading = line.match(HEADING_LINE);
      const listItem = line.match(LIST_LINE);
      if (heading) {
        flushParagraph();
        blocks.push({type: 'heading', level: heading[1].length, text: heading[2]});
      } else if (listItem) {
        flushParagraph();
        const marker = listItem[1];
        blocks.push({
          type: 'list-item',
          ordered: /\d/.test(marker),
          marker,
          text: listItem[2],
        });
      } else if (line.trim() === '') {
        flushParagraph();
      } else {
        paragraphLines.push(line.trim());
      }
    }
    flushParagraph();
  };

  for (const match of content.matchAll(CODE_FENCE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      pushTextRange(content.slice(lastIndex, start));
    }
    blocks.push({type: 'code', code: match[1].replace(/\n$/, '')});
    lastIndex = start + match[0].length;
  }
  if (lastIndex < content.length) {
    pushTextRange(content.slice(lastIndex));
  }
  return blocks;
}

function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(INLINE_TOKEN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      spans.push({text: text.slice(lastIndex, start)});
    }
    const token = match[0];
    if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (linkMatch) {
        spans.push({text: linkMatch[1], link: linkMatch[2]});
      } else {
        spans.push({text: token});
      }
    } else if (token.startsWith('http://') || token.startsWith('https://')) {
      const trailingMatch = token.match(URL_TRAILING_PUNCT);
      const url = trailingMatch ? token.slice(0, -trailingMatch[0].length) : token;
      spans.push({text: url, link: url});
      if (trailingMatch) {
        spans.push({text: trailingMatch[0]});
      }
    } else if (token.startsWith('**`') || token.startsWith('__`')) {
      // Bold-wrapped code: render as a code chip -- the code styling
      // already reads as visually distinct, so the redundant bold doesn't
      // need its own treatment on top of it.
      spans.push({text: token.slice(3, -3), code: true});
    } else if (token.startsWith('`')) {
      spans.push({text: token.slice(1, -1), code: true});
    } else if (token.startsWith('**') || token.startsWith('__')) {
      spans.push({text: token.slice(2, -2), bold: true});
    } else {
      spans.push({text: token.slice(1, -1), italic: true});
    }
    lastIndex = start + token.length;
  }
  if (lastIndex < text.length) {
    spans.push({text: text.slice(lastIndex)});
  }
  return spans.length > 0 ? spans : [{text}];
}

function InlineText({
  text,
  color,
  codeColor,
  codeBg,
  linkColor,
}: {
  text: string;
  color: string;
  codeColor: string;
  codeBg: string;
  linkColor: string;
}) {
  const spans = useMemo(() => parseInline(text), [text]);
  return (
    <Text style={[styles.paragraph, {color}]}>
      {spans.map((span, i) => {
        if (span.link) {
          return (
            <Text
              key={i}
              style={[styles.link, {color: linkColor}]}
              onPress={() => Linking.openURL(span.link!)}>
              {span.text}
            </Text>
          );
        }
        if (span.code) {
          return (
            <Text
              key={i}
              style={[styles.inlineCode, {color: codeColor, backgroundColor: codeBg}]}>
              {span.text}
            </Text>
          );
        }
        return (
          <Text key={i} style={[span.bold && styles.bold, span.italic && styles.italic]}>
            {span.text}
          </Text>
        );
      })}
    </Text>
  );
}

function CodeBlock({code}: {code: string}) {
  const {colors, typography} = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    Clipboard.setString(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View style={[styles.codeBlock, {backgroundColor: colors.surfaceContainerHigh}]}>
      <View style={styles.codeBlockHeader}>
        <TouchableOpacity style={styles.codeCopyButton} onPress={handleCopy} hitSlop={6}>
          {copied ? (
            <CheckIcon size={14} color={colors.success} />
          ) : (
            <CopyIcon size={14} color={colors.textMuted} />
          )}
          <Text style={[styles.codeCopyLabel, {color: copied ? colors.success : colors.textMuted}]}>
            {copied ? 'Copied' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text style={[typography.code, styles.codeText, {color: colors.textPrimary}]} selectable>
          {code}
        </Text>
      </ScrollView>
    </View>
  );
}

/**
 * Renders chat message content with real (if minimal) markdown: headings,
 * bold/italic, unordered/ordered lists, inline code, and fenced code blocks
 * (each with its own Copy button) -- in place of showing the raw `**`/`#`/
 * `` ` `` characters as literal text. Re-parses on every content change, so
 * it's safe to feed this the growing streamed-in text directly.
 */
export function MarkdownText({content, color}: {content: string; color: string}) {
  const {colors} = useTheme();
  const blocks = useMemo(() => parseBlocks(content), [content]);
  let listIndex = 0;

  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === 'code') {
          listIndex = 0;
          return <CodeBlock key={i} code={block.code} />;
        }
        if (block.type === 'heading') {
          listIndex = 0;
          const headingStyle = HEADING_STYLES[Math.min(block.level, 3) - 1];
          return (
            <Text key={i} style={[headingStyle, {color}]}>
              {block.text}
            </Text>
          );
        }
        if (block.type === 'list-item') {
          listIndex = block.ordered ? listIndex + 1 : listIndex;
          return (
            <View key={i} style={styles.listRow}>
              <Text style={[styles.listMarker, {color}]}>
                {block.ordered ? `${listIndex}.` : '•'}
              </Text>
              <View style={styles.listContent}>
                <InlineText
                  text={block.text}
                  color={color}
                  codeColor={colors.textPrimary}
                  codeBg={colors.surfaceContainerHigh}
                  linkColor={colors.accent}
                />
              </View>
            </View>
          );
        }
        listIndex = 0;
        return (
          <InlineText
            key={i}
            text={block.text}
            color={color}
            codeColor={colors.textPrimary}
            codeBg={colors.surfaceContainerHigh}
            linkColor={colors.accent}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  paragraph: {fontSize: 15, lineHeight: 23, marginVertical: 2},
  bold: {fontWeight: '700'},
  italic: {fontStyle: 'italic'},
  link: {textDecorationLine: 'underline'},
  inlineCode: {
    fontSize: 13.5,
    borderRadius: 4,
    paddingHorizontal: 4,
    // A slightly negative vertical margin would be ideal to visually
    // center the code chip against surrounding text, but RN's inline Text
    // styling can't offset a nested span vertically -- padding alone still
    // reads clearly as "this is code" without it.
  },
  h1: {fontSize: 21, fontWeight: '700', lineHeight: 27, marginTop: 10, marginBottom: 4},
  h2: {fontSize: 18, fontWeight: '700', lineHeight: 24, marginTop: 8, marginBottom: 4},
  h3: {fontSize: 16, fontWeight: '700', lineHeight: 22, marginTop: 6, marginBottom: 2},
  listRow: {flexDirection: 'row', marginVertical: 2, paddingLeft: 4},
  listMarker: {fontSize: 15, lineHeight: 23, width: 20},
  listContent: {flex: 1},
  codeBlock: {
    borderRadius: radius.md,
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },
  codeBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xs,
    paddingTop: 4,
  },
  codeCopyButton: {flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4},
  codeCopyLabel: {fontSize: 11, fontWeight: '600'},
  codeText: {lineHeight: 19, padding: spacing.sm, paddingTop: 2},
});

const HEADING_STYLES = [styles.h1, styles.h2, styles.h3];
