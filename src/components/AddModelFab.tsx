import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {elevation, radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {GlassCloudIcon, GlassFolderIcon} from './GlassIcons';

/**
 * Floating "+" button (bottom-right of the Models screen) that fans out
 * into the three real ways to add a model: search Hugging Face directly
 * from the app, import a .gguf already on the phone, or paste a direct
 * download URL. Tapping any option, or the backdrop, closes the menu.
 */
export function AddModelFab({
  onAddFromHuggingFace,
  onAddLocal,
  onAddRemote,
}: {
  onAddFromHuggingFace: () => void;
  onAddLocal: () => void;
  onAddRemote: () => void;
}) {
  const {colors, typography} = useTheme();
  const [open, setOpen] = useState(false);

  const select = (action: () => void) => {
    setOpen(false);
    action();
  };

  const menuItem = (label: string, icon: React.ReactNode, onPress: () => void) => (
    <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => select(onPress)}>
      <View style={[styles.labelPill, {backgroundColor: colors.surfaceContainerHigh}]}>
        <Text style={[typography.body, styles.labelText]}>{label}</Text>
      </View>
      <View
        style={[
          styles.iconChip,
          {backgroundColor: colors.surfaceContainerHighest, borderColor: colors.outlineVariant},
        ]}>
        {icon}
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      {open && (
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        />
      )}
      <View style={styles.container} pointerEvents="box-none">
        {open && (
          <View style={styles.menu}>
            {menuItem('Add from Hugging Face', <Text style={styles.emoji}>🤗</Text>, onAddFromHuggingFace)}
            {menuItem('Add Local Model', <GlassFolderIcon size={18} />, onAddLocal)}
            {menuItem('Add Remote Model', <GlassCloudIcon size={18} />, onAddRemote)}
          </View>
        )}
        <TouchableOpacity
          style={[styles.fab, elevation.level2, {backgroundColor: colors.accent}]}
          activeOpacity={0.85}
          onPress={() => setOpen(v => !v)}>
          <Text style={[styles.fabGlyph, {color: colors.onAccent}]}>{open ? '×' : '+'}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    alignItems: 'flex-end',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabGlyph: {fontSize: 30, fontWeight: '400', lineHeight: 32},
  menu: {marginBottom: spacing.md, gap: spacing.sm, alignItems: 'flex-end'},
  menuItem: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  labelPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  labelText: {fontWeight: '600'},
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {fontSize: 18},
});
