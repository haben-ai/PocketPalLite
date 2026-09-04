import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {
  HfFileEntry,
  HfRepoResult,
  hfResolveDownloadUrl,
  listHfGgufFiles,
  searchHfGgufModels,
} from '../services/huggingFaceSearch';

function formatSize(bytes?: number): string {
  if (!bytes) {
    return '';
  }
  const gb = bytes / 1e9;
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${Math.round(bytes / 1e6)} MB`;
}

function formatDownloads(count?: number): string {
  if (!count) {
    return '';
  }
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M downloads`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K downloads`;
  }
  return `${count} downloads`;
}

/**
 * "Add from Hugging Face": searches the real Hub API for GGUF repos, lets
 * the user drill into a repo's file list, and hands the resolved direct
 * download URL back to the caller (which feeds it through the same
 * downloadRemoteModel() pipeline as a pasted URL).
 */
export function HuggingFaceSearchModal({
  visible,
  onClose,
  onSelectFile,
  authHeaders,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectFile: (params: {repoId: string; fileName: string; url: string; sizeBytes?: number}) => void;
  /** Optional Authorization header (from the stored HF token) -- needed to
   * list files in gated repos the user has access to. */
  authHeaders?: Record<string, string>;
}) {
  const {colors, typography} = useTheme();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<HfRepoResult[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [files, setFiles] = useState<HfFileEntry[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      setError(null);
      setSelectedRepo(null);
      setFiles([]);
      setSearched(false);
    }
  }, [visible]);

  const runSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      setResults(await searchHfGgufModels(trimmed));
    } catch (err: any) {
      setError(err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  const openRepo = async (repoId: string) => {
    setSelectedRepo(repoId);
    setFiles([]);
    setLoading(true);
    setError(null);
    try {
      setFiles(await listHfGgufFiles(repoId, authHeaders));
    } catch (err: any) {
      setError(err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  const inFileView = selectedRepo !== null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, {backgroundColor: colors.scrim}]}>
        <View
          style={[styles.sheet, {backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant}]}>
          <View style={styles.headerRow}>
            {inFileView ? (
              <TouchableOpacity onPress={() => setSelectedRepo(null)} hitSlop={8}>
                <Text style={[typography.body, {color: colors.accent}]}>‹ Back</Text>
              </TouchableOpacity>
            ) : (
              <Text style={typography.heading}>Add from Hugging Face</Text>
            )}
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={[typography.body, {color: colors.textMuted}]}>Close</Text>
            </TouchableOpacity>
          </View>

          {!inFileView ? (
            <>
              <Text style={[typography.caption, styles.hint]}>
                Searches huggingface.co for GGUF repositories.
              </Text>
              <View style={styles.searchRow}>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={runSearch}
                  placeholder="Search models, e.g. llama 3.2"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  style={[
                    styles.input,
                    {backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border},
                  ]}
                />
                <TouchableOpacity
                  style={[styles.searchButton, {backgroundColor: colors.accent}]}
                  onPress={runSearch}
                  disabled={!query.trim() || loading}>
                  <Text style={[typography.body, {color: colors.onAccent, fontWeight: '700'}]}>Search</Text>
                </TouchableOpacity>
              </View>

              {loading && <ActivityIndicator style={styles.spinner} color={colors.accent} />}
              {error && <Text style={[typography.caption, {color: colors.danger}]}>{error}</Text>}
              {!loading && searched && !error && results.length === 0 && (
                <Text style={[typography.caption, styles.emptyText]}>No GGUF repositories found.</Text>
              )}

              <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                {results.map(repo => (
                  <TouchableOpacity
                    key={repo.id}
                    style={[styles.resultRow, {borderColor: colors.outlineVariant}]}
                    onPress={() => openRepo(repo.id)}>
                    <View style={styles.resultText}>
                      <Text style={typography.body} numberOfLines={1}>
                        {repo.id}
                      </Text>
                      <Text style={[typography.small, {color: colors.textMuted}]}>
                        {formatDownloads(repo.downloads)}
                        {repo.gated ? ' · Gated' : ''}
                      </Text>
                    </View>
                    <Text style={{color: colors.textMuted}}>›</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : (
            <>
              <Text style={[typography.caption, styles.hint]} numberOfLines={1}>
                {selectedRepo}
              </Text>
              {loading && <ActivityIndicator style={styles.spinner} color={colors.accent} />}
              {error && <Text style={[typography.caption, {color: colors.danger}]}>{error}</Text>}
              {!loading && !error && files.length === 0 && (
                <Text style={[typography.caption, styles.emptyText]}>
                  No .gguf files found in this repository.
                </Text>
              )}
              <ScrollView style={styles.list}>
                {files.map(file => (
                  <TouchableOpacity
                    key={file.path}
                    style={[styles.resultRow, {borderColor: colors.outlineVariant}]}
                    onPress={() =>
                      onSelectFile({
                        repoId: selectedRepo!,
                        fileName: file.path,
                        url: hfResolveDownloadUrl(selectedRepo!, file.path),
                        sizeBytes: file.size,
                      })
                    }>
                    <View style={styles.resultText}>
                      <Text style={typography.body} numberOfLines={1}>
                        {file.path}
                      </Text>
                      {file.size !== undefined && (
                        <Text style={[typography.small, {color: colors.textMuted}]}>
                          {formatSize(file.size)}
                        </Text>
                      )}
                    </View>
                    <Text style={{color: colors.textMuted}}>⬇</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, justifyContent: 'flex-end'},
  sheet: {
    maxHeight: '80%',
    minHeight: '55%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  hint: {marginBottom: spacing.sm},
  searchRow: {flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm},
  input: {
    flex: 1,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  searchButton: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {marginVertical: spacing.md},
  emptyText: {textAlign: 'center', marginTop: spacing.lg},
  list: {flexGrow: 0},
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  resultText: {flex: 1},
});
