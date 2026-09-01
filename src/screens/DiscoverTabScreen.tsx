import React, {useCallback, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {useFocusEffect} from '@react-navigation/native';
import {colors, spacing, typography} from '../theme';
import {RootTabParamList} from '../navigation/types';
import {SUGGESTED_TASKS, OFFLINE_CAPABILITY_CALLOUTS} from '../data/discoverContent';
import {getConversations} from '../storage/conversations';
import {getPersonas} from '../storage/personas';
import {getModelById} from '../data/models';
import {analyzeDevice} from '../services/deviceAnalyzer';
import {Persona, DeviceTier} from '../types';
import {AIPalScaffold} from '../components/AIPalScaffold';
import {PromptSuggestion} from '../components/PromptSuggestion';
import {AIPalCard} from '../components/AIPalCard';
import {ModelCard} from '../components/ModelCard';
import {Card} from '../components/Card';

type Props = BottomTabScreenProps<RootTabParamList, 'Discover'>;

export function DiscoverTabScreen({navigation}: Props) {
  const [recentPersonas, setRecentPersonas] = useState<Persona[]>([]);
  const [device, setDevice] = useState<DeviceTier | null>(null);

  // Bottom-tab screens stay mounted across tab switches -- re-fetch every
  // time this tab regains focus so "recently used" reflects conversations
  // started after this screen was first visited.
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [conversations, personas] = await Promise.all([
          getConversations(),
          getPersonas(),
        ]);
        const seen = new Set<string>();
        const ordered: Persona[] = [];
        for (const conversation of conversations) {
          const personaId = conversation.personaId;
          if (!personaId || seen.has(personaId)) {
            continue;
          }
          const persona = personas.find(p => p.id === personaId);
          if (persona) {
            seen.add(personaId);
            ordered.push(persona);
          }
          if (ordered.length >= 3) {
            break;
          }
        }
        setRecentPersonas(ordered);
      })();
      analyzeDevice().then(setDevice).catch(() => undefined);
    }, []),
  );

  const recommendedModel = device ? getModelById(device.recommendedModelId) : undefined;

  return (
    <AIPalScaffold scroll>
      <Text style={typography.title}>Discover</Text>
      <Text style={styles.subtitle}>Ideas for what to try next.</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suggested tasks</Text>
        {SUGGESTED_TASKS.map(task => (
          <PromptSuggestion
            key={task.label}
            label={task.label}
            onPress={() => {
              const modelId = recommendedModel?.id;
              if (modelId) {
                navigation.navigate('Chat', {modelId, prefillText: task.prompt});
              } else {
                navigation.navigate('Models');
              }
            }}
          />
        ))}
      </View>

      {recentPersonas.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently used AIPals</Text>
          {recentPersonas.map(persona => (
            <AIPalCard
              key={persona.id}
              persona={persona}
              onPress={() => navigation.navigate('Chat', {personaId: persona.id})}
            />
          ))}
        </View>
      )}

      {recommendedModel && device && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended model</Text>
          <ModelCard
            model={recommendedModel}
            device={device}
            onDownload={() =>
              navigation.navigate('Models', {highlightModelId: recommendedModel.id})
            }
            onChat={() => navigation.navigate('Chat', {modelId: recommendedModel.id})}
            onDelete={() => undefined}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Offline AI capabilities</Text>
        {OFFLINE_CAPABILITY_CALLOUTS.map(callout => (
          <Card key={callout.title} style={styles.calloutCard}>
            <Text style={styles.calloutTitle}>
              {callout.emoji} {callout.title}
            </Text>
            <Text style={styles.calloutBody}>{callout.body}</Text>
          </Card>
        ))}
      </View>
    </AIPalScaffold>
  );
}

const styles = StyleSheet.create({
  subtitle: {...typography.caption, marginTop: spacing.xs, marginBottom: spacing.md},
  section: {marginBottom: spacing.lg},
  sectionTitle: {
    ...typography.heading,
    marginBottom: spacing.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  calloutCard: {marginBottom: spacing.sm},
  calloutTitle: {...typography.body, fontWeight: '700', marginBottom: 4},
  calloutBody: {...typography.caption, lineHeight: 19},
});
