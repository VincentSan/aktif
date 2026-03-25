import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
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
import { col } from './shared/col.js';
import type { NavigateFunction } from './App.js';

type OwnerManagerView =
  | { view: 'list' }
  | { view: 'delete-confirm'; ownerId: string; ownerName: string }
  | { view: 'delete-action'; ownerId: string; ownerName: string; linkedAssets: Asset[] };

interface OwnerManagerProps {
  onNavigate: NavigateFunction;
}

export function OwnerManager({ onNavigate }: OwnerManagerProps): React.ReactElement {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [state, setState] = useState<OwnerManagerView>({ view: 'list' });
  const [reassignInputValue, setReassignInputValue] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = () => {
    try {
      setOwners(listOwners(getDb()));
    } catch {
      setOwners([]);
    }
  };

  useEffect(() => { reload(); }, []);

  const clampedIndex = owners.length === 0 ? 0 : Math.min(selectedIndex, owners.length - 1);

  useInput((input, key) => {
    if (state.view === 'list') {
      if (key.escape) { onNavigate('list'); return; }
      if (key.upArrow || input === 'k') { setSelectedIndex((i) => Math.max(0, i - 1)); return; }
      if (key.downArrow || input === 'j') { setSelectedIndex((i) => Math.min(owners.length - 1, i + 1)); return; }
      if (input === 'd' && owners.length > 0) {
        const db = getDb();
        const owner = owners[clampedIndex];
        const linked = getAssetsByOwnerId(db, owner.id);
        if (linked.length > 0) {
          setState({ view: 'delete-action', ownerId: owner.id, ownerName: owner.name, linkedAssets: linked });
        } else {
          setState({ view: 'delete-confirm', ownerId: owner.id, ownerName: owner.name });
        }
      }
    } else if (state.view === 'delete-confirm') {
      if (key.escape || input === 'n') { setState({ view: 'list' }); setMessage(null); return; }
      if (input === 'o') {
        deleteOwner(getDb(), state.ownerId);
        setMessage(`Owner "${state.ownerName}" supprimé.`);
        setState({ view: 'list' });
        reload();
      }
    } else if (state.view === 'delete-action') {
      if (reassignInputValue !== null) return;
      if (key.escape || input === 'q') { setState({ view: 'list' }); setMessage(null); return; }
      const db = getDb();
      if (input === '1') {
        deleteAssetsByOwnerId(db, state.ownerId);
        deleteOwner(db, state.ownerId);
        setMessage(`${state.linkedAssets.length} actif(s) supprimé(s). Owner "${state.ownerName}" supprimé.`);
        setState({ view: 'list' });
        reload();
      } else if (input === '2') {
        setReassignInputValue('');
      } else if (input === '3') {
        clearOwnerOnAssets(db, state.ownerId);
        deleteOwner(db, state.ownerId);
        setMessage(`${state.linkedAssets.length} actif(s) mis à jour (owner = null). Owner "${state.ownerName}" supprimé.`);
        setState({ view: 'list' });
        reload();
      }
    }
  });

  const handleReassignSubmit = (value: string) => {
    if (state.view !== 'delete-action') return;
    setReassignInputValue(null);
    const db = getDb();
    const newOwner = getOwnerById(db, value.trim());
    if (!newOwner) {
      setMessage(`Erreur: owner "${value.trim()}" introuvable.`);
      return;
    }
    reassignAssets(db, state.ownerId, value.trim());
    deleteOwner(db, state.ownerId);
    setMessage(`${state.linkedAssets.length} actif(s) réassigné(s) à "${newOwner.name}". Owner "${state.ownerName}" supprimé.`);
    setState({ view: 'list' });
    reload();
  };

  if (state.view === 'delete-confirm') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="yellow">Supprimer l'owner "{state.ownerName}" ?</Text>
        <Text color="gray">Aucun actif lié. Confirmer ? [o/n]</Text>
      </Box>
    );
  }

  if (state.view === 'delete-action') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="yellow">
          Owner "{state.ownerName}" — {state.linkedAssets.length} actif(s) lié(s)
        </Text>
        <Text>Choisissez une action :</Text>
        <Text>  [1] Supprimer tous les actifs liés</Text>
        <Text>  [2] Réassigner à un autre owner</Text>
        <Text>  [3] Mettre owner à null sur les actifs</Text>
        <Text color="gray">  [q/Esc] Annuler</Text>
        {reassignInputValue !== null && (
          <Box marginTop={1}>
            <Text>ID du nouvel owner : </Text>
            <TextInput
              value={reassignInputValue}
              onChange={setReassignInputValue}
              onSubmit={handleReassignSubmit}
              focus
            />
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="blue">Propriétaires</Text>
      {message && <Text color="green">{message}</Text>}
      <Box marginTop={1}>
        <Text bold color="blue">
          {'  '}
          {col('ID', 36)}
          {'  '}
          {col('Nom', 20)}
          {'  '}
          {col('Email', 24)}
          {'  '}
          {'Département'}
        </Text>
      </Box>
      {owners.length === 0 && <Text color="gray">Aucun propriétaire.</Text>}
      {owners.map((owner, index) => {
        const isSelected = index === clampedIndex;
        const prefix = isSelected ? '> ' : '  ';
        return (
          <Box key={owner.id}>
            <Text bold={isSelected} inverse={isSelected}>
              {prefix}
              {col(owner.id, 36)}
              {'  '}
              {col(owner.name, 20)}
              {'  '}
              {col(owner.email, 24)}
              {'  '}
              {col(owner.department, 20)}
            </Text>
          </Box>
        );
      })}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="gray">↑↓/jk naviguer · d supprimer · Esc retour</Text>
      </Box>
    </Box>
  );
}
