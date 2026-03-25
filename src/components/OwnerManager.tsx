import React, { useState, useCallback, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { getDb } from '../context.js';
import {
  listOwners,
  deleteOwner,
  getOwnerById,
  getAssetsByOwnerId,
  reassignAssets,
  clearOwnerOnAssets,
  deleteAssetsByOwnerId,
} from '../db/queries/owners.js';
import type { Owner } from '../types/owner.js';
import type { Asset } from '../types/asset.js';
import type { NavigateFunction } from './App.js';

type OwnerView =
  | { kind: 'list' }
  | { kind: 'delete-confirm'; owner: Owner }
  | { kind: 'delete-action'; owner: Owner; linkedAssets: Asset[] }
  | { kind: 'reassign-input'; owner: Owner; linkedCount: number };

interface Props {
  onNavigate: NavigateFunction;
}

export function OwnerManager({ onNavigate }: Props): React.ReactElement {
  const dbRef = useRef(getDb());
  const db = dbRef.current;
  const [owners, setOwners] = useState<Owner[]>(() => listOwners(db));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [view, setView] = useState<OwnerView>({ kind: 'list' });
  const [reassignInput, setReassignInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setOwners(listOwners(dbRef.current));
  }, []);

  const finishDelete = useCallback(
    (owner: Owner, msg: string) => {
      deleteOwner(dbRef.current, owner.id);
      refresh();
      setView({ kind: 'list' });
      setReassignInput('');
      setMessage(msg);
    },
    [refresh],
  );

  useInput((input, key) => {
    if (view.kind === 'list') {
      if (key.upArrow) setSelectedIndex((i) => Math.max(0, i - 1));
      else if (key.downArrow) setSelectedIndex((i) => Math.min(owners.length - 1, i + 1));
      else if (key.escape) onNavigate('list');
      else if (input === 'd' && owners.length > 0) {
        const owner = owners[selectedIndex];
        const linked = getAssetsByOwnerId(db, owner.id);
        if (linked.length === 0) {
          setView({ kind: 'delete-confirm', owner });
        } else {
          setView({ kind: 'delete-action', owner, linkedAssets: linked });
        }
      }
    } else if (view.kind === 'delete-confirm') {
      if (input === 'o' || input === 'y') {
        finishDelete(view.owner, `Owner "${view.owner.name}" supprimé.`);
      } else if (input === 'n' || key.escape) {
        setView({ kind: 'list' });
      }
    } else if (view.kind === 'delete-action') {
      if (input === '1') {
        deleteAssetsByOwnerId(db, view.owner.id);
        finishDelete(
          view.owner,
          `${view.linkedAssets.length} actif(s) supprimé(s). Owner "${view.owner.name}" supprimé.`,
        );
      } else if (input === '2') {
        setReassignInput('');
        setView({ kind: 'reassign-input', owner: view.owner, linkedCount: view.linkedAssets.length });
      } else if (input === '3') {
        clearOwnerOnAssets(db, view.owner.id);
        finishDelete(view.owner, `Owner "${view.owner.name}" supprimé. Actifs mis à jour (owner = null).`);
      } else if (input === 'q' || key.escape) {
        setView({ kind: 'list' });
      }
    } else if (view.kind === 'reassign-input') {
      if (key.return) {
        const targetId = reassignInput.trim();
        const target = getOwnerById(db, targetId);
        if (!target) {
          setMessage(`Owner "${targetId}" introuvable.`);
          setView({ kind: 'list' });
        } else {
          reassignAssets(db, view.owner.id, targetId);
          finishDelete(
            view.owner,
            `Actifs réassignés à "${target.name}". Owner "${view.owner.name}" supprimé.`,
          );
        }
      } else if (key.escape) {
        setView({ kind: 'list' });
        setReassignInput('');
      } else if (key.backspace || key.delete) {
        setReassignInput((s) => s.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setReassignInput((s) => s + input);
      }
    }
  });

  if (view.kind === 'list') {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">Gestion des owners — ↑↓ naviguer, d supprimer, Esc retour</Text>
        {message && <Text color="green">{message}</Text>}
        {owners.length === 0 && <Text color="gray">Aucun owner.</Text>}
        {owners.map((o, i) => (
          <Text key={o.id} color={i === selectedIndex ? 'yellow' : undefined}>
            {i === selectedIndex ? '▶ ' : '  '}
            {o.name} {o.email ? `<${o.email}>` : ''} {o.department ? `[${o.department}]` : ''}
          </Text>
        ))}
      </Box>
    );
  }

  if (view.kind === 'delete-confirm') {
    return (
      <Box flexDirection="column">
        <Text>Supprimer l'owner <Text bold>"{view.owner.name}"</Text> ? (o/n)</Text>
      </Box>
    );
  }

  if (view.kind === 'delete-action') {
    return (
      <Box flexDirection="column">
        <Text>L'owner <Text bold>"{view.owner.name}"</Text> a {view.linkedAssets.length} actif(s) lié(s).</Text>
        <Text>[1] Supprimer tous les actifs liés</Text>
        <Text>[2] Réassigner à un autre owner</Text>
        <Text>[3] Mettre owner à null sur les actifs</Text>
        <Text>[q] Annuler</Text>
      </Box>
    );
  }

  if (view.kind === 'reassign-input') {
    return (
      <Box flexDirection="column">
        <Text>ID du nouvel owner : {reassignInput}<Text color="gray">█</Text></Text>
        <Text color="gray">Entrée pour valider, Esc pour annuler</Text>
      </Box>
    );
  }

  return <Text>...</Text>;
}
