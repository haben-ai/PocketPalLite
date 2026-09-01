import React, {useCallback, useEffect, useState} from 'react';
import {Alert, StyleSheet, Text} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {spacing, typography} from '../theme';
import {Persona} from '../types';
import {getPersonas, createPersona, updatePersona, deletePersona} from '../storage/personas';
import {getDownloadedModels} from '../storage/modelRegistry';
import {AIPalScaffold} from '../components/AIPalScaffold';
import {AIPalCard} from '../components/AIPalCard';
import {PersonaEditorForm} from '../components/PersonaEditorForm';
import {EmptyState} from '../components/EmptyState';
import {PrimaryButton} from '../components/PrimaryButton';
import {DownloadedModel} from '../types';

type SubView = {mode: 'list'} | {mode: 'edit'; personaId: string | null};

export function AIPalsTabScreen() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [downloadedModels, setDownloadedModels] = useState<DownloadedModel[]>([]);
  const [subView, setSubView] = useState<SubView>({mode: 'list'});

  const refresh = useCallback(async () => {
    setPersonas(await getPersonas());
  }, []);

  // Bottom-tab screens stay mounted across tab switches -- re-fetch every
  // time this tab regains focus (e.g. ChatScreen's fallback seeding path
  // adding the built-in persona after this screen was first visited).
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (subView.mode === 'edit') {
      getDownloadedModels().then(setDownloadedModels);
    }
  }, [subView]);

  const handleDelete = (persona: Persona) => {
    Alert.alert('Delete AIPal', `Delete "${persona.name}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePersona(persona.id);
          await refresh();
        },
      },
    ]);
  };

  if (subView.mode === 'edit') {
    const editing = subView.personaId
      ? personas.find(p => p.id === subView.personaId)
      : undefined;
    return (
      <AIPalScaffold scroll>
        <Text style={typography.title}>{editing ? 'Edit AIPal' : 'Create AIPal'}</Text>
        <PersonaEditorForm
          initial={editing}
          downloadedModels={downloadedModels}
          onCancel={() => setSubView({mode: 'list'})}
          onSave={async draft => {
            if (editing) {
              await updatePersona(editing.id, draft);
            } else {
              await createPersona(draft);
            }
            await refresh();
            setSubView({mode: 'list'});
          }}
        />
      </AIPalScaffold>
    );
  }

  return (
    <AIPalScaffold scroll>
      <Text style={typography.title}>AIPals</Text>
      <Text style={styles.subtitle}>Distinct assistants with their own personality.</Text>

      <PrimaryButton
        label="+ Create AIPal"
        onPress={() => setSubView({mode: 'edit', personaId: null})}
        style={styles.createButton}
      />

      {personas.length === 0 ? (
        <EmptyState icon="🎭" title="No AIPals yet" body="Create your first one above." />
      ) : (
        personas.map(persona => (
          <AIPalCard
            key={persona.id}
            persona={persona}
            onPress={() => setSubView({mode: 'edit', personaId: persona.id})}
            onDelete={() => handleDelete(persona)}
          />
        ))
      )}
    </AIPalScaffold>
  );
}

const styles = StyleSheet.create({
  subtitle: {...typography.caption, marginTop: spacing.xs, marginBottom: spacing.md},
  createButton: {marginBottom: spacing.md},
});
