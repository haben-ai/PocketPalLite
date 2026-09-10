import React from 'react';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';
import {spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {Card} from './Card';

export function PromptSuggestion({label, onPress}: {label: string; onPress: () => void}) {
  const {typography} = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={styles.card}>
        <Text style={typography.body}>{label}</Text>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {marginBottom: spacing.sm, paddingVertical: spacing.sm},
});
