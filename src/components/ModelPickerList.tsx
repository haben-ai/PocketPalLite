import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {colors, radius, spacing, typography} from '../theme';
import {DownloadedModel} from '../types';
import {getModelById} from '../data/models';
import {CapabilityBadge} from './Badge';

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
  if (models.length === 0) {
    return (
      <Text style={styles.emptyHint}>
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
            style={[styles.row, isActive && styles.rowActive]}
            onPress={() => onSelect(dm.modelId)}>
            <Text style={styles.rowText} numberOfLines={1}>
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
    borderTopColor: colors.outlineVariant,
  },
  rowActive: {backgroundColor: colors.accentMuted},
  rowText: {...typography.body, flexShrink: 1, marginRight: spacing.xs},
  emptyHint: {...typography.caption, marginTop: spacing.sm},
});
