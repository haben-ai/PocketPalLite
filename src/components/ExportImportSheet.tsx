import React, {useState} from 'react';
import {Alert, Modal, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {pick, isErrorWithCode, errorCodes} from '@react-native-documents/picker';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {Conversation} from '../types';
import {exportConversation, importConversationFromUri} from '../services/conversationExport';

export function ExportImportSheet({
  visible,
  conversation,
  onClose,
  onImported,
}: {
  visible: boolean;
  conversation: Conversation | null;
  onClose: () => void;
  /** Called with the id of the newly-created imported conversation. */
  onImported: (conversationId: string) => void;
}) {
  const {colors, typography} = useTheme();
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (!conversation) {
      return;
    }
    setBusy(true);
    try {
      await exportConversation(conversation);
      onClose();
    } catch (err: any) {
      Alert.alert('Export failed', err.message ?? String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    try {
      const [file] = await pick({type: ['application/json', '*/*']});
      if (!file?.uri) {
        return;
      }
      setBusy(true);
      const conversationId = await importConversationFromUri(file.uri);
      onClose();
      onImported(conversationId);
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert('Import failed', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View
          style={[
            styles.sheet,
            {backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant},
          ]}>
          <Text style={typography.heading}>Export / Import</Text>

          <TouchableOpacity
            style={[styles.row, {backgroundColor: colors.surfaceContainer}]}
            disabled={busy || !conversation}
            onPress={handleExport}>
            <Text style={[typography.body, styles.rowTitle]}>Export this conversation</Text>
            <Text style={[typography.caption, styles.rowHint]}>
              Share the current chat as a JSON file.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, {backgroundColor: colors.surfaceContainer}]}
            disabled={busy}
            onPress={handleImport}>
            <Text style={[typography.body, styles.rowTitle]}>Import conversation from file</Text>
            <Text style={[typography.caption, styles.rowHint]}>
              Load a previously exported .json file as a new chat.
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
  },
  row: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  rowTitle: {fontWeight: '600'},
  rowHint: {marginTop: 4},
});
