import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, spacing, typography} from '../theme';
import {AppScreen} from '../navigation/types';
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

type Props = {onNavigate: (screen: AppScreen) => void};

export function DiscoverTabScreen({onNavigate}: Props) {
  const [recentPersonas, setRecentPersonas] = useState<Persona[]>([]);
  const [device, setDevice] = useState<DeviceTier | null>(null);

  // This screen fully mounts/unmounts on every sidebar navigation (no
  // persistent tab bar), so a mount-only effect always shows fresh data.
  useEffect(() => {
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
  }, []);

  const recommendedModel = device ? getModelById(device.recommendedModelId) : undefined;

  return (
    <AIPalScaffold scroll onBack={() => onNavigate({name: 'chat'})}>
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
                onNavigate({name: 'chat', modelId, prefillText: task.prompt});
              } else {
                onNavigate({name: 'models'});
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
              onPress={() => onNavigate({name: 'chat', personaId: persona.id})}
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
              onNavigate({name: 'models', highlightModelId: recommendedModel.id})
            }
            onChat={() => onNavigate({name: 'chat', modelId: recommendedModel.id})}
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
