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
  updateOwner,
  insertOwner,
} from '../db/queries/owners.js';
import type { Owner } from '../types/owner.js';
import type { Asset } from '../types/asset.js';
import { col } from './shared/col.js';
import type { NavigateFunction } from './App.js';

type OwnerManagerView =
  | { view: 'list' }
  | { view: 'add-form' }
  | { view: 'edit'; ownerId: string }
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

  // Filter state
  const [filter, setFilter] = useState('');
  const [filterFocused, setFilterFocused] = useState(false);

  // Edit form state
  const [editValues, setEditValues] = useState({ name: '', email: '', department: '' });
  const [editFocus, setEditFocus] = useState(0);
  const [editError, setEditError] = useState<string | null>(null);

  // Add form state
  const [addValues, setAddValues] = useState({ name: '', email: '', department: '' });
  const [addFocus, setAddFocus] = useState(0);
  const [addError, setAddError] = useState<string | null>(null);

  const reload = () => {
    try {
      setOwners(listOwners(getDb()));
    } catch {
      setOwners([]);
    }
  };

  useEffect(() => { reload(); }, []);

  // Filtered owners list
  const filtered = owners.filter((o) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      o.name.toLowerCase().includes(q) ||
      (o.email ?? '').toLowerCase().includes(q) ||
      (o.department ?? '').toLowerCase().includes(q)
    );
  });

  useEffect(() => { setSelectedIndex(0); }, [filter]);

  const clampedIndex = filtered.length === 0 ? 0 : Math.min(selectedIndex, filtered.length - 1);

  // ── List navigation ──────────────────────────────────────────────────────────

  useInput((input, key) => {
    if (state.view !== 'list') return;
    if (reassignInputValue !== null) return;

    if (key.tab) {
      setFilterFocused((prev) => !prev);
      return;
    }

    if (filterFocused) return;

    if (key.escape) { onNavigate('list'); return; }
    if (key.upArrow || input === 'k') { setSelectedIndex((i) => Math.max(0, i - 1)); return; }
    if (key.downArrow || input === 'j') { setSelectedIndex((i) => Math.min(filtered.length - 1, i + 1)); return; }

    if (input === 'n') {
      setAddValues({ name: '', email: '', department: '' });
      setAddFocus(0);
      setAddError(null);
      setState({ view: 'add-form' });
      return;
    }

    if (input === 'e' && filtered.length > 0) {
      const owner = filtered[clampedIndex];
      setEditValues({
        name: owner.name,
        email: owner.email ?? '',
        department: owner.department ?? '',
      });
      setEditFocus(0);
      setEditError(null);
      setState({ view: 'edit', ownerId: owner.id });
      return;
    }

    if (input === 'd' && filtered.length > 0) {
      const db = getDb();
      const owner = filtered[clampedIndex];
      const linked = getAssetsByOwnerId(db, owner.id);
      if (linked.length > 0) {
        setState({ view: 'delete-action', ownerId: owner.id, ownerName: owner.name, linkedAssets: linked });
      } else {
        setState({ view: 'delete-confirm', ownerId: owner.id, ownerName: owner.name });
      }
    }
  });

  // ── Add form navigation ───────────────────────────────────────────────────────

  useInput((input, key) => {
    if (state.view !== 'add-form') return;

    if (key.escape) {
      setState({ view: 'list' });
      setAddError(null);
      return;
    }
    if ((key.tab && !key.shift) || key.downArrow) { setAddFocus((i) => Math.min(i + 1, 3)); return; }
    if ((key.tab && key.shift) || key.upArrow) { setAddFocus((i) => Math.max(i - 1, 0)); return; }
    if (key.return) {
      if (addFocus === 3) {
        handleAddSubmit();
      } else {
        setAddFocus((i) => Math.min(i + 1, 3));
      }
    }
  });

  function handleAddSubmit() {
    if (!addValues.name.trim()) { setAddError('Le nom est requis.'); return; }
    insertOwner(getDb(), {
      name: addValues.name.trim(),
      email: addValues.email.trim() || null,
      department: addValues.department.trim() || null,
    });
    setMessage(`Owner "${addValues.name.trim()}" créé.`);
    setState({ view: 'list' });
    reload();
  }

  // ── Edit form navigation ──────────────────────────────────────────────────────

  useInput((input, key) => {
    if (state.view !== 'edit') return;

    if (key.escape) {
      setState({ view: 'list' });
      setEditError(null);
      return;
    }
    if ((key.tab && !key.shift) || key.downArrow) { setEditFocus((i) => Math.min(i + 1, 3)); return; }
    if ((key.tab && key.shift) || key.upArrow) { setEditFocus((i) => Math.max(i - 1, 0)); return; }
    if (key.return) {
      if (editFocus === 3) {
        handleEditSubmit();
      } else {
        setEditFocus((i) => Math.min(i + 1, 3));
      }
    }
  });

  function handleEditSubmit() {
    if (state.view !== 'edit') return;
    if (!editValues.name.trim()) { setEditError('Le nom est requis.'); return; }
    const updated = updateOwner(getDb(), state.ownerId, {
      name: editValues.name.trim(),
      email: editValues.email.trim() || null,
      department: editValues.department.trim() || null,
    });
    if (!updated) { setEditError('Erreur lors de la mise à jour.'); return; }
    setMessage(`Owner "${updated.name}" mis à jour.`);
    setState({ view: 'list' });
    reload();
  }

  // ── Delete confirm / action navigation ───────────────────────────────────────

  useInput((input, key) => {
    if (state.view === 'delete-confirm') {
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

  // ── Render: add-form view ────────────────────────────────────────────────────

  const labelWidth = 16;

  if (state.view === 'add-form') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="green">Nouveau propriétaire</Text>
        {addError && <Text color="red">⚠ {addError}</Text>}
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text color={addFocus === 0 ? 'cyan' : 'white'}>{'* Nom:'.padEnd(labelWidth)}</Text>
            <TextInput value={addValues.name} onChange={(v) => { setAddValues((p) => ({ ...p, name: v })); setAddError(null); }} focus={addFocus === 0} placeholder="requis…" />
          </Box>
          <Box>
            <Text color={addFocus === 1 ? 'cyan' : 'white'}>{'  Email:'.padEnd(labelWidth)}</Text>
            <TextInput value={addValues.email} onChange={(v) => setAddValues((p) => ({ ...p, email: v }))} focus={addFocus === 1} placeholder="optionnel…" />
          </Box>
          <Box>
            <Text color={addFocus === 2 ? 'cyan' : 'white'}>{'  Département:'.padEnd(labelWidth)}</Text>
            <TextInput value={addValues.department} onChange={(v) => setAddValues((p) => ({ ...p, department: v }))} focus={addFocus === 2} placeholder="optionnel…" />
          </Box>
          <Box marginTop={1}>
            <Text color={addFocus === 3 ? 'black' : 'white'} backgroundColor={addFocus === 3 ? 'cyan' : undefined} bold={addFocus === 3}>
              {' [Créer] '}
            </Text>
            <Text color="gray">    Esc: Annuler</Text>
          </Box>
        </Box>
        <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text color="gray">Tab/↓ suivant · Shift+Tab/↑ précédent · Enter valider · Esc annuler</Text>
        </Box>
      </Box>
    );
  }

  // ── Render: edit view ────────────────────────────────────────────────────────

  if (state.view === 'edit') {

    const owner = getOwnerById(getDb(), state.ownerId);
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="blue">Modifier le propriétaire</Text>
        {owner && <Text color="gray">ID : {owner.id}</Text>}
        {editError && <Text color="red">⚠ {editError}</Text>}
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text color={editFocus === 0 ? 'cyan' : 'white'}>{'* Nom:'.padEnd(labelWidth)}</Text>
            <TextInput value={editValues.name} onChange={(v) => { setEditValues((p) => ({ ...p, name: v })); setEditError(null); }} focus={editFocus === 0} placeholder="requis…" />
          </Box>
          <Box>
            <Text color={editFocus === 1 ? 'cyan' : 'white'}>{'  Email:'.padEnd(labelWidth)}</Text>
            <TextInput value={editValues.email} onChange={(v) => setEditValues((p) => ({ ...p, email: v }))} focus={editFocus === 1} placeholder="optionnel…" />
          </Box>
          <Box>
            <Text color={editFocus === 2 ? 'cyan' : 'white'}>{'  Département:'.padEnd(labelWidth)}</Text>
            <TextInput value={editValues.department} onChange={(v) => setEditValues((p) => ({ ...p, department: v }))} focus={editFocus === 2} placeholder="optionnel…" />
          </Box>
          <Box marginTop={1}>
            <Text color={editFocus === 3 ? 'black' : 'white'} backgroundColor={editFocus === 3 ? 'cyan' : undefined} bold={editFocus === 3}>
              {' [Sauvegarder] '}
            </Text>
            <Text color="gray">    Esc: Annuler</Text>
          </Box>
        </Box>
        <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text color="gray">Tab/↓ suivant · Shift+Tab/↑ précédent · Enter valider · Esc annuler</Text>
        </Box>
      </Box>
    );
  }

  // ── Render: delete-confirm ───────────────────────────────────────────────────

  if (state.view === 'delete-confirm') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="yellow">Supprimer l'owner "{state.ownerName}" ?</Text>
        <Text color="gray">Aucun actif lié. Confirmer ? [o/n]</Text>
      </Box>
    );
  }

  // ── Render: delete-action ────────────────────────────────────────────────────

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

  // ── Render: list ─────────────────────────────────────────────────────────────

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="blue">Propriétaires</Text>

      {/* Filter bar */}
      <Box marginTop={1} marginBottom={1}>
        <Text color={filterFocused ? 'cyan' : 'white'}>Filtre: [</Text>
        <TextInput
          value={filter}
          onChange={setFilter}
          focus={filterFocused}
          placeholder="nom, email ou département…"
        />
        <Text color={filterFocused ? 'cyan' : 'white'}>]</Text>
        {!filterFocused && (
          <Text color="gray">  Tab pour activer le filtre</Text>
        )}
      </Box>

      {message && <Text color="green">{message}</Text>}

      <Box>
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
      {filtered.length === 0 && <Text color="gray">Aucun propriétaire.</Text>}
      {filtered.map((owner, index) => {
        const isSelected = index === clampedIndex && !filterFocused;
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
        <Text color="gray">↑↓/jk naviguer · n nouveau · e éditer · d supprimer · Tab filtre · Esc retour</Text>
      </Box>
    </Box>
  );
}
