import React from 'react';
import {Modal, StyleSheet, Switch, Text, TouchableOpacity, View} from 'react-native';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {AppSettings} from '../storage/appSettings';

type FilterMode = AppSettings['modelsFilterMode'];
type SortMode = AppSettings['modelsSortMode'];

const FILTER_OPTIONS: {value: FilterMode; label: string}[] = [
  {value: 'all', label: 'All Models'},
  {value: 'downloaded', label: 'Downloaded Models'},
  {value: 'available', label: 'Available to Download'},
];

const SORT_OPTIONS: {value: SortMode; label: string}[] = [
  {value: 'recommended', label: 'Recommended'},
  {value: 'name', label: 'Name'},
  {value: 'size', label: 'Size'},
];

/**
 * The Models screen's filter/sort/view panel, opened from the sliders icon
 * in the header. Every control here is real and immediately reflected in
 * the list below -- nothing is decorative.
 */
export function ModelsFilterMenu({
  visible,
  filterMode,
  sortMode,
  groupByType,
  hiddenCount,
  onFilterChange,
  onSortChange,
  onGroupByTypeChange,
  onReset,
  onClose,
}: {
  visible: boolean;
  filterMode: FilterMode;
  sortMode: SortMode;
  groupByType: boolean;
  hiddenCount: number;
  onFilterChange: (mode: FilterMode) => void;
  onSortChange: (mode: SortMode) => void;
  onGroupByTypeChange: (value: boolean) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const {colors, typography} = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={[styles.backdrop, {backgroundColor: colors.scrim}]}
        activeOpacity={1}
        onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => undefined}>
          <View
            style={[
              styles.sheet,
              {backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant},
            ]}>
            <Text style={[typography.small, styles.sectionLabel, {color: colors.textMuted}]}>
              FILTER
            </Text>
            {FILTER_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={styles.row}
                onPress={() => onFilterChange(opt.value)}>
                <Text
                  style={[
                    typography.body,
                    opt.value === filterMode && styles.rowLabelActive,
                  ]}>
                  {opt.label}
                </Text>
                {opt.value === filterMode && <Text style={{color: colors.accent}}>✓</Text>}
              </TouchableOpacity>
            ))}

            <View style={[styles.divider, {borderTopColor: colors.outlineVariant}]} />

            <Text style={[typography.small, styles.sectionLabel, {color: colors.textMuted}]}>
              SORT BY
            </Text>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.value} style={styles.row} onPress={() => onSortChange(opt.value)}>
                <Text style={[typography.body, opt.value === sortMode && styles.rowLabelActive]}>
                  {opt.label}
                </Text>
                {opt.value === sortMode && <Text style={{color: colors.accent}}>✓</Text>}
              </TouchableOpacity>
            ))}

            <View style={[styles.divider, {borderTopColor: colors.outlineVariant}]} />

            <Text style={[typography.small, styles.sectionLabel, {color: colors.textMuted}]}>
              VIEW
            </Text>
            <View style={styles.row}>
              <Text style={typography.body}>Group by Model Type</Text>
              <Switch
                value={groupByType}
                onValueChange={onGroupByTypeChange}
                trackColor={{false: colors.surfaceContainerHigh, true: colors.accent}}
                thumbColor={colors.textPrimary}
              />
            </View>

            <View style={[styles.divider, {borderTopColor: colors.outlineVariant}]} />

            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                onReset();
                onClose();
              }}>
              <Text style={[typography.body, {color: colors.danger}]}>Reset Models List</Text>
              {hiddenCount > 0 && (
                <Text style={[typography.small, {color: colors.textMuted}]}>
                  {hiddenCount} hidden
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, alignItems: 'flex-end', padding: spacing.md},
  sheet: {
    marginTop: 56,
    width: 260,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.xs,
  },
  sectionLabel: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 4,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  rowLabelActive: {fontWeight: '700'},
  divider: {borderTopWidth: 1, marginVertical: spacing.xs},
});
