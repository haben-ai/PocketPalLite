import React, {useMemo, useState} from 'react';
import {FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {AppScreen} from '../navigation/types';
import {AIPalScaffold} from '../components/AIPalScaffold';
import {Chip} from '../components/Badge';
import {ChevronDownIcon} from '../components/Icons';
import licenseEntries from '../legal/thirdPartyLicensesData.json';

type LicenseEntry = {
  name: string;
  version: string;
  license: string;
  repository: string | null;
  publisher: string | null;
  licenseText: string | null;
};

const ENTRIES = licenseEntries as LicenseEntry[];

/**
 * Settings > About > Open Source Licenses. Lists every third-party package
 * this build actually depends on -- generated from the real resolved
 * production dependency tree via `license-checker` (npm run gen:licenses ->
 * scripts/generate-third-party-licenses.js), not hand-picked. The repo
 * root's THIRD_PARTY_LICENSES.txt is the same data as one flat file, kept
 * in sync by the same script. Tapping a row shows that package's real
 * license text, read verbatim from the package's own LICENSE file at
 * generation time.
 */
export function OpenSourceLicensesScreen({onNavigate}: {onNavigate: (screen: AppScreen) => void}) {
  const {colors, typography} = useTheme();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<LicenseEntry | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return ENTRIES;
    }
    return ENTRIES.filter(e => e.name.toLowerCase().includes(q));
  }, [query]);

  if (selected) {
    return (
      <AIPalScaffold scroll onBack={() => setSelected(null)}>
        <Text style={typography.title}>{selected.name}</Text>
        <View style={styles.detailMetaRow}>
          <Text style={[typography.caption, {color: colors.textMuted}]}>v{selected.version}</Text>
          <Chip label={selected.license} />
        </View>
        {selected.repository && (
          <Text style={[typography.caption, styles.repoLine, {color: colors.textMuted}]}>
            {selected.repository}
          </Text>
        )}
        <View style={[styles.licenseBox, {backgroundColor: colors.surfaceContainer}]}>
          <Text style={[typography.code, styles.licenseText]}>
            {selected.licenseText ??
              `No separate license file was found in this package. SPDX license identifier: ${selected.license}.`}
          </Text>
        </View>
      </AIPalScaffold>
    );
  }

  return (
    <AIPalScaffold onBack={() => onNavigate({name: 'appInfo'})}>
      <Text style={typography.title}>Open Source Licenses</Text>
      <Text style={[typography.caption, styles.subtitle, {color: colors.textSecondary}]}>
        PocketPal is built with {ENTRIES.length} open-source packages. Tap any of them to read its
        license.
      </Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search packages..."
        placeholderTextColor={colors.textMuted}
        style={[
          styles.search,
          {backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border},
        ]}
      />
      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={item => `${item.name}@${item.version}`}
        keyboardShouldPersistTaps="handled"
        renderItem={({item}) => (
          <TouchableOpacity
            style={[styles.row, {borderBottomColor: colors.outlineVariant}]}
            onPress={() => setSelected(item)}
            activeOpacity={0.7}>
            <View style={styles.rowText}>
              <Text style={typography.body} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[typography.small, {color: colors.textMuted}]}>v{item.version}</Text>
            </View>
            <Chip label={item.license} />
            <View style={styles.chevron}>
              <ChevronDownIcon size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={[typography.caption, styles.emptyText, {color: colors.textMuted}]}>
            No packages match "{query}".
          </Text>
        }
      />
    </AIPalScaffold>
  );
}

const styles = StyleSheet.create({
  subtitle: {marginTop: spacing.xs, marginBottom: spacing.md, lineHeight: 18},
  list: {flex: 1},
  search: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {flex: 1},
  chevron: {transform: [{rotate: '-90deg'}]},
  emptyText: {textAlign: 'center', paddingVertical: spacing.xl},
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  repoLine: {marginBottom: spacing.md},
  licenseBox: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  licenseText: {lineHeight: 18},
});
