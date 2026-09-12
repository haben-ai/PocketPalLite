import React, {useEffect, useState} from 'react';
import {Modal, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';

export type DialogButtonStyle = 'default' | 'cancel' | 'destructive';

export type DialogButton = {
  text: string;
  style?: DialogButtonStyle;
  onPress?: () => void;
};

type DialogState = {
  title: string;
  message?: string;
  buttons: DialogButton[];
} | null;

let current: DialogState = null;
const listeners = new Set<(state: DialogState) => void>();

function setState(next: DialogState): void {
  current = next;
  listeners.forEach(l => l(next));
}

/**
 * Drop-in replacement for React Native's `Alert` -- same `alert(title,
 * message, buttons)` call signature, so every existing `Alert.alert(...)`
 * call site keeps working unchanged after just swapping the import source
 * (`from 'react-native'` -> `from './AppDialog'`). Renders as a themed,
 * rounded card (see DialogHost below) instead of the platform's default
 * dialog -- Android's stock AlertDialog (dark gray box, ALL-CAPS buttons)
 * reads jarringly out of place against this app's own clean, rounded,
 * restrained design language everywhere else.
 */
export const Alert = {
  alert(title: string, message?: string, buttons?: DialogButton[]) {
    setState({title, message, buttons: buttons && buttons.length > 0 ? buttons : [{text: 'OK'}]});
  },
};

/**
 * Mounted once near the app root (see RootNavigator.tsx) -- subscribes to
 * the same module-level state Alert.alert() above writes to, the same
 * singleton+listener pattern this codebase already uses for the download
 * queue (services/downloadQueue.ts).
 */
export function DialogHost() {
  const {colors, typography} = useTheme();
  const [state, setLocalState] = useState<DialogState>(current);

  useEffect(() => {
    listeners.add(setLocalState);
    return () => {
      listeners.delete(setLocalState);
    };
  }, []);

  const close = () => setState(null);

  if (!state) {
    return null;
  }

  const buttonColor = (style: DialogButtonStyle | undefined) => {
    if (style === 'destructive') {
      return colors.danger;
    }
    if (style === 'cancel') {
      return colors.textSecondary;
    }
    return colors.accent;
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={[styles.backdrop, {backgroundColor: colors.scrim}]}>
        <View
          style={[
            styles.card,
            {backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant},
          ]}>
          <View style={styles.textBlock}>
            <Text style={[typography.heading, styles.title]}>{state.title}</Text>
            {state.message && (
              <Text style={[typography.body, styles.message, {color: colors.textSecondary}]}>
                {state.message}
              </Text>
            )}
          </View>
          <View style={[styles.buttonRow, {borderTopColor: colors.outlineVariant}]}>
            {state.buttons.map((button, i) => (
              <TouchableOpacity
                key={`${button.text}-${i}`}
                style={[
                  styles.button,
                  i > 0 && [styles.buttonDivider, {borderLeftColor: colors.outlineVariant}],
                ]}
                onPress={() => {
                  close();
                  button.onPress?.();
                }}
                activeOpacity={0.6}>
                <Text
                  style={[
                    typography.body,
                    styles.buttonLabel,
                    {color: buttonColor(button.style)},
                    button.style !== 'cancel' && styles.buttonLabelEmphasis,
                  ]}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl},
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  textBlock: {paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md},
  title: {textAlign: 'center'},
  message: {textAlign: 'center', marginTop: spacing.xs, lineHeight: 20},
  buttonRow: {flexDirection: 'row', borderTopWidth: 1},
  button: {flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center'},
  buttonDivider: {borderLeftWidth: 1},
  buttonLabel: {fontSize: 15},
  buttonLabelEmphasis: {fontWeight: '700'},
});
