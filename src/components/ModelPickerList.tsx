import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {DownloadedModel} from '../types';
import {getModelById} from '../data/models';
import {CapabilityBadge} from './Badge';
import {VendorLogo} from './VendorLogo';

/**
 * A list of downloaded models to pick from, shared by ConversationDrawer's
 * "+ New Chat" flow and ChatScreen's model switcher -- same list, same row
 * styling, two different call sites.
 */
export function ModelPickerList({
  models,
  onSelect,
  activeModelId,
}: {
  models: DownloadedModel[];
  onSelect: (modelId: string) => void;
  activeModelId?: string;
}) {
  const {colors, typography} = useTheme();

  if (models.length === 0) {
    return (
      <Text style={[typography.caption, styles.emptyHint]}>
        No models downloaded yet. Browse Models to get one.
      </Text>
    );
  }

  return (
    <View>
      {models.map(dm => {
        const catalogModel = getModelById(dm.modelId);
        const isActive = dm.modelId === activeModelId;
        return (
          <TouchableOpacity
            key={dm.modelId}
            style={[
              styles.row,
              {borderTopColor: colors.outlineVariant},
              isActive && {backgroundColor: colors.accentMuted},
            ]}
            onPress={() => onSelect(dm.modelId)}>
            <View style={styles.rowAvatar}>
              <VendorLogo vendor={catalogModel?.vendor} size={18} mutedColor={colors.textSecondary} />
            </View>
            <Text style={[typography.body, styles.rowText]} numberOfLines={1}>
              {dm.displayName}
            </Text>
            {catalogModel?.capability === 'vision' && (
              <CapabilityBadge capability="vision" />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    borderTopWidth: 1,
  },
  rowAvatar: {width: 20, alignItems: 'center', marginRight: spacing.xs},
  rowText: {flexShrink: 1, marginRight: spacing.xs},
  emptyHint: {marginTop: spacing.sm},
});
