import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {AppScreen} from '../navigation/types';
import {SUGGESTED_TASKS, OFFLINE_CAPABILITY_CALLOUTS} from '../data/discoverContent';
import {getConversations} from '../storage/conversations';
import {getPersonas} from '../storage/personas';
import {getModelById} from '../data/models';
import {getStoredDeviceTier} from '../services/deviceAnalyzer';
import {Persona, DeviceTier} from '../types';
import {AIPalScaffold} from '../components/AIPalScaffold';
import {PromptSuggestion} from '../components/PromptSuggestion';
import {AIPalCard} from '../components/AIPalCard';
import {ModelCard} from '../components/ModelCard';
import {Card} from '../components/Card';

type Props = {onNavigate: (screen: AppScreen) => void};

export function DiscoverTabScreen({onNavigate}: Props) {
  const {colors, typography} = useTheme();
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
    // Reads the one persisted analysis result (see App.tsx) rather than
    // ever re-analyzing itself -- device analysis runs once, ever.
    getStoredDeviceTier().then(setDevice).catch(() => undefined);
  }, []);

  const recommendedModel = device ? getModelById(device.recommendedModelId) : undefined;

  return (
    <AIPalScaffold scroll onBack={() => onNavigate({name: 'chat'})}>
      <Text style={typography.title}>Discover</Text>
      <Text style={[typography.caption, styles.subtitle]}>Ideas for what to try next.</Text>

      <View style={styles.section}>
        <Text style={[typography.heading, styles.sectionTitle, {color: colors.textSecondary}]}>
          Suggested tasks
        </Text>
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
          <Text style={[typography.heading, styles.sectionTitle, {color: colors.textSecondary}]}>
            Recently used AIPals
          </Text>
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
          <Text style={[typography.heading, styles.sectionTitle, {color: colors.textSecondary}]}>
            Recommended model
          </Text>
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
        <Text style={[typography.heading, styles.sectionTitle, {color: colors.textSecondary}]}>
          Offline AI capabilities
        </Text>
        {OFFLINE_CAPABILITY_CALLOUTS.map(callout => (
          <Card key={callout.title} style={styles.calloutCard}>
            <Text style={[typography.body, styles.calloutTitle]}>
              {callout.emoji} {callout.title}
            </Text>
            <Text style={[typography.caption, styles.calloutBody]}>{callout.body}</Text>
          </Card>
        ))}
      </View>
    </AIPalScaffold>
  );
}

const styles = StyleSheet.create({
  subtitle: {marginTop: spacing.xs, marginBottom: spacing.md},
  section: {marginBottom: spacing.lg},
  sectionTitle: {
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  calloutCard: {marginBottom: spacing.sm},
  calloutTitle: {fontWeight: '700', marginBottom: 4},
  calloutBody: {lineHeight: 19},
});
