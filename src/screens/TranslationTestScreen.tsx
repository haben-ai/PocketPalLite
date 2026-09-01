import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {colors, spacing, typography} from '../theme';
import {TRANSLATION_MODEL_CATALOG} from '../data/translationModels';
import {DownloadedTranslationModel} from '../types';
import {
  getDownloadedTranslationModel,
  removeDownloadedTranslationModel,
} from '../storage/translationModelRegistry';
import {
  downloadTranslationModel,
  deleteTranslationModelFiles,
} from '../services/translationDownloadManager';
import {describeSessions} from '../services/translationEngine';
import {createNllbLanguagePipeline} from '../services/languagePipeline';
import {Card} from '../components/Card';
import {Chip} from '../components/Badge';
import {ProgressBar} from '../components/ProgressBar';
import {PrimaryButton} from '../components/PrimaryButton';

const MODEL = TRANSLATION_MODEL_CATALOG[0];
type Direction = 'en->sw' | 'sw->en';

export function TranslationTestScreen({onBack}: {onBack: () => void}) {
  const [downloaded, setDownloaded] = useState<DownloadedTranslationModel | null>(
    null,
  );
  const [progress, setProgress] = useState<number | null>(null);
  const [direction, setDirection] = useState<Direction>('en->sw');
  const [input, setInput] = useState('Hello, how are you today?');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const refresh = useCallback(async () => {
    setDownloaded((await getDownloadedTranslationModel(MODEL.id)) ?? null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDownload = () => {
    setProgress(0);
    const handle = downloadTranslationModel(MODEL, setProgress);
    handle.completion
      .then(async () => {
        setProgress(null);
        await refresh();
      })
      .catch(err => {
        setProgress(null);
        Alert.alert('Download failed', err?.message ?? String(err));
      });
  };

  const handleDelete = async () => {
    if (!downloaded) {
      return;
    }
    await deleteTranslationModelFiles([
      downloaded.encoderPath,
      downloaded.decoderPath,
      downloaded.tokenizerPath,
      downloaded.tokenizerConfigPath,
    ]);
    await removeDownloadedTranslationModel(MODEL.id);
    await refresh();
  };

  const handleInspect = async () => {
    if (!downloaded) {
      return;
    }
    setBusy(true);
    setStatus('Loading sessions...');
    try {
      const info = await describeSessions(downloaded);
      Alert.alert(
        'Session I/O',
        `Encoder in: ${info.encoderInputs.join(', ')}\nEncoder out: ${info.encoderOutputs.join(', ')}\n\nDecoder in: ${info.decoderInputs.join(', ')}\nDecoder out: ${info.decoderOutputs.join(', ')}`,
      );
    } catch (err: any) {
      Alert.alert('Failed to load sessions', err.message ?? String(err));
    } finally {
      setBusy(false);
      setStatus('');
    }
  };

  const handleTranslate = async () => {
    if (!downloaded || !input.trim()) {
      return;
    }
    setBusy(true);
    setOutput('');
    setStatus('Translating...');
    try {
      const [source, target] = direction.split('->') as ['en' | 'sw', 'en' | 'sw'];
      // Routed through the same LanguagePipeline interface ChatScreen uses
      // (getLanguagePipeline/NoOpLanguagePipeline) -- this is the concrete
      // proof that Phase 1's abstraction fits a real implementation.
      const pipeline = createNllbLanguagePipeline(downloaded, source);
      const result = await pipeline.translateIn(input.trim(), source, target);
      setOutput(result);
    } catch (err: any) {
      Alert.alert('Translation failed', err.message ?? String(err));
    } finally {
      setBusy(false);
      setStatus('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹ Models</Text>
        </TouchableOpacity>
        <Text style={typography.heading}>Translation Test (Dev)</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={typography.body}>{MODEL.name}</Text>
          <View style={styles.chipRow}>
            <Chip label="~890 MB total" />
            <Chip label="Spike / PoC only" />
          </View>

          {progress !== null ? (
            <View style={styles.progressRow}>
              <ProgressBar fraction={progress} />
              <Text style={styles.progressLabel}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
          ) : downloaded ? (
            <View style={styles.actionRow}>
              <PrimaryButton
                label="Inspect Sessions"
                variant="secondary"
                onPress={handleInspect}
                style={styles.flexButton}
                loading={busy}
              />
              <PrimaryButton
                label="Delete"
                variant="danger"
                onPress={handleDelete}
                style={styles.inlineButton}
              />
            </View>
          ) : (
            <PrimaryButton label="Download" onPress={handleDownload} />
          )}
        </Card>

        {downloaded && (
          <Card style={styles.card}>
            <View style={styles.chipRow}>
              <TouchableOpacity
                onPress={() => setDirection('en->sw')}
                style={[
                  styles.dirButton,
                  direction === 'en->sw' && styles.dirButtonActive,
                ]}>
                <Text style={styles.dirLabel}>English → Swahili</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDirection('sw->en')}
                style={[
                  styles.dirButton,
                  direction === 'sw->en' && styles.dirButtonActive,
                ]}>
                <Text style={styles.dirLabel}>Swahili → English</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Text to translate..."
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
            />

            <PrimaryButton
              label="Translate"
              onPress={handleTranslate}
              loading={busy}
              style={styles.translateButton}
            />

            {status ? <Text style={styles.status}>{status}</Text> : null}

            {output ? (
              <View style={styles.outputBox}>
                <Text style={styles.outputText}>{output}</Text>
              </View>
            ) : null}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {minWidth: 70},
  backText: {color: colors.accent, fontSize: 15, fontWeight: '600'},
  content: {padding: spacing.md, paddingBottom: spacing.xl * 2},
  card: {marginBottom: spacing.md},
  chipRow: {flexDirection: 'row', gap: spacing.xs, marginVertical: spacing.sm},
  progressRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  progressLabel: {...typography.small, width: 36},
  actionRow: {flexDirection: 'row', gap: spacing.sm},
  flexButton: {flex: 1},
  inlineButton: {paddingHorizontal: spacing.md},
  dirButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  dirButtonActive: {borderColor: colors.accent, backgroundColor: colors.accentMuted},
  dirLabel: {color: colors.textPrimary, fontSize: 13, fontWeight: '600'},
  input: {
    backgroundColor: colors.surfaceRaised,
    color: colors.textPrimary,
    borderRadius: 10,
    padding: spacing.sm,
    minHeight: 60,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  translateButton: {marginTop: spacing.xs},
  status: {...typography.caption, textAlign: 'center', marginTop: spacing.sm},
  outputBox: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outputText: {color: colors.textPrimary, fontSize: 15, lineHeight: 21},
});
