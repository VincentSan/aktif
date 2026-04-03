import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { getDb } from '../context.js';
import {
  listOwners,
  deleteOwner,
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
import { t } from '../i18n.js';

type OwnerManagerView =
  | { view: 'list' }
  | { view: 'add-form' }
  | { view: 'edit'; ownerId: string }
  | { view: 'delete-confirm'; ownerId: string; ownerName: string }
  | { view: 'delete-action'; ownerId: string; ownerName: string; linkedAssets: Asset[] }
  | { view: 'reassign-select'; ownerId: string; ownerName: string; linkedAssets: Asset[]; candidates: Owner[]; selectedIndex: number };

interface OwnerManagerProps {
  onNavigate: NavigateFunction;
}

export function OwnerManager({ onNavigate }: OwnerManagerProps): React.ReactElement {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [state, setState] = useState<OwnerManagerView>({ view: 'list' });
  const [message, setMessage] = useState<string | null>(null);

  // Filter state
  const [filter, setFilter] = useState('');
  const [filterFocused, setFilterFocused] = useState(false);

  // Index du bouton Save dans les formulaires owner (nom=0, email=1, département=2, save=3)
  const FORM_SAVE_IDX = 3;

  // Edit form state
  const [editValues, setEditValues] = useState({ name: '', email: '', department: '' });
  const [editFocus, setEditFocus] = useState(0);
  const [editError, setEditError] = useState<string | null>(null);
  const [editOwnerId, setEditOwnerId] = useState<string | null>(null);

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
      setEditOwnerId(owner.id);
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
    if ((key.tab && !key.shift) || key.downArrow) { setAddFocus((i) => Math.min(i + 1, FORM_SAVE_IDX)); return; }
    if ((key.tab && key.shift) || key.upArrow) { setAddFocus((i) => Math.max(i - 1, 0)); return; }
    if (key.return) {
      if (addFocus === FORM_SAVE_IDX) {
        handleAddSubmit();
      } else {
        setAddFocus((i) => Math.min(i + 1, FORM_SAVE_IDX));
      }
    }
  });

  function handleAddSubmit() {
    if (!addValues.name.trim()) { setAddError(t('tui_owner_err_name_req')); return; }
    insertOwner(getDb(), {
      name: addValues.name.trim(),
      email: addValues.email.trim() || null,
      department: addValues.department.trim() || null,
    });
    setMessage(`${t('tui_owner_created')}${addValues.name.trim()}${t('tui_owner_created_end')}`);
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
    if ((key.tab && !key.shift) || key.downArrow) { setEditFocus((i) => Math.min(i + 1, FORM_SAVE_IDX)); return; }
    if ((key.tab && key.shift) || key.upArrow) { setEditFocus((i) => Math.max(i - 1, 0)); return; }
    if (key.return) {
      if (editFocus === FORM_SAVE_IDX) {
        handleEditSubmit();
      } else {
        setEditFocus((i) => Math.min(i + 1, FORM_SAVE_IDX));
      }
    }
  });

  function handleEditSubmit() {
    if (state.view !== 'edit') return;
    if (!editValues.name.trim()) { setEditError(t('tui_owner_err_name_req')); return; }
    const updated = updateOwner(getDb(), state.ownerId, {
      name: editValues.name.trim(),
      email: editValues.email.trim() || null,
      department: editValues.department.trim() || null,
    });
    if (!updated) { setEditError(t('tui_owner_err_update')); return; }
    setMessage(`${t('tui_owner_updated_msg')}${updated.name}${t('tui_owner_updated_msg_end')}`);
    setState({ view: 'list' });
    reload();
  }

  // ── Delete confirm / action / reassign-select navigation ─────────────────────

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
      if (key.escape || input === 'q') { setState({ view: 'list' }); setMessage(null); return; }
      const db = getDb();
      if (input === '1') {
        deleteAssetsByOwnerId(db, state.ownerId);
        deleteOwner(db, state.ownerId);
        setMessage(`${state.linkedAssets.length}${t('tui_owner_delete_assets_msg')}${state.ownerName}${t('tui_owner_delete_assets_end')}`);
        setState({ view: 'list' });
        reload();
      } else if (input === '2') {
        const candidates = owners.filter((o) => o.id !== state.ownerId);
        setState({ view: 'reassign-select', ownerId: state.ownerId, ownerName: state.ownerName, linkedAssets: state.linkedAssets, candidates, selectedIndex: 0 });
      } else if (input === '3') {
        clearOwnerOnAssets(db, state.ownerId);
        deleteOwner(db, state.ownerId);
        setMessage(`${state.linkedAssets.length}${t('tui_owner_cleared_msg')}${state.ownerName}${t('tui_owner_cleared_end')}`);
        setState({ view: 'list' });
        reload();
      }
    } else if (state.view === 'reassign-select') {
      if (key.escape || input === 'q') {
        setState({ view: 'delete-action', ownerId: state.ownerId, ownerName: state.ownerName, linkedAssets: state.linkedAssets });
        return;
      }
      if (key.upArrow || input === 'k') { setState((s) => s.view === 'reassign-select' ? { ...s, selectedIndex: Math.max(0, s.selectedIndex - 1) } : s); return; }
      if (key.downArrow || input === 'j') { setState((s) => s.view === 'reassign-select' ? { ...s, selectedIndex: Math.min(s.candidates.length - 1, s.selectedIndex + 1) } : s); return; }
      if (key.return) {
        if (state.candidates.length === 0) return;
        const newOwner = state.candidates[state.selectedIndex];
        if (!newOwner) return;
        const db = getDb();
        reassignAssets(db, state.ownerId, newOwner.id);
        deleteOwner(db, state.ownerId);
        setMessage(`${state.linkedAssets.length}${t('tui_owner_reassign_msg')}${newOwner.name}${t('tui_owner_reassign_msg_mid')}${state.ownerName}${t('tui_owner_reassign_msg_end')}`);
        setState({ view: 'list' });
        reload();
      }
    }
  });

  // ── Render: add-form view ────────────────────────────────────────────────────

  const labelWidth = 16;

  if (state.view === 'add-form') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="green">{t('tui_owner_add_title')}</Text>
        {addError && <Text color="red">⚠ {addError}</Text>}
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text color={addFocus === 0 ? 'cyan' : 'white'}>{t('tui_owner_label_name').padEnd(labelWidth)}</Text>
            <TextInput value={addValues.name} onChange={(v) => { setAddValues((p) => ({ ...p, name: v })); setAddError(null); }} focus={addFocus === 0} placeholder={t('tui_owner_placeholder_req')} />
          </Box>
          <Box>
            <Text color={addFocus === 1 ? 'cyan' : 'white'}>{t('tui_owner_label_email').padEnd(labelWidth)}</Text>
            <TextInput value={addValues.email} onChange={(v) => setAddValues((p) => ({ ...p, email: v }))} focus={addFocus === 1} placeholder={t('tui_owner_placeholder_opt')} />
          </Box>
          <Box>
            <Text color={addFocus === 2 ? 'cyan' : 'white'}>{t('tui_owner_label_dept').padEnd(labelWidth)}</Text>
            <TextInput value={addValues.department} onChange={(v) => setAddValues((p) => ({ ...p, department: v }))} focus={addFocus === 2} placeholder={t('tui_owner_placeholder_opt')} />
          </Box>
          <Box marginTop={1}>
            <Text color={addFocus === 3 ? 'black' : 'white'} backgroundColor={addFocus === 3 ? 'cyan' : undefined} bold={addFocus === 3}>
              {t('tui_owner_btn_create')}
            </Text>
            <Text color="gray">{t('tui_owner_cancel')}</Text>
          </Box>
        </Box>
        <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text color="gray">{t('tui_owner_form_hint')}</Text>
        </Box>
      </Box>
    );
  }

  // ── Render: edit view ────────────────────────────────────────────────────────

  if (state.view === 'edit') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="blue">{t('tui_owner_edit_title')}</Text>
        {editOwnerId && <Text color="gray">ID : {editOwnerId}</Text>}
        {editError && <Text color="red">⚠ {editError}</Text>}
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text color={editFocus === 0 ? 'cyan' : 'white'}>{t('tui_owner_label_name').padEnd(labelWidth)}</Text>
            <TextInput value={editValues.name} onChange={(v) => { setEditValues((p) => ({ ...p, name: v })); setEditError(null); }} focus={editFocus === 0} placeholder={t('tui_owner_placeholder_req')} />
          </Box>
          <Box>
            <Text color={editFocus === 1 ? 'cyan' : 'white'}>{t('tui_owner_label_email').padEnd(labelWidth)}</Text>
            <TextInput value={editValues.email} onChange={(v) => setEditValues((p) => ({ ...p, email: v }))} focus={editFocus === 1} placeholder={t('tui_owner_placeholder_opt')} />
          </Box>
          <Box>
            <Text color={editFocus === 2 ? 'cyan' : 'white'}>{t('tui_owner_label_dept').padEnd(labelWidth)}</Text>
            <TextInput value={editValues.department} onChange={(v) => setEditValues((p) => ({ ...p, department: v }))} focus={editFocus === 2} placeholder={t('tui_owner_placeholder_opt')} />
          </Box>
          <Box marginTop={1}>
            <Text color={editFocus === 3 ? 'black' : 'white'} backgroundColor={editFocus === 3 ? 'cyan' : undefined} bold={editFocus === 3}>
              {t('tui_owner_btn_save')}
            </Text>
            <Text color="gray">{t('tui_owner_cancel')}</Text>
          </Box>
        </Box>
        <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text color="gray">{t('tui_owner_form_hint')}</Text>
        </Box>
      </Box>
    );
  }

  // ── Render: delete-confirm ───────────────────────────────────────────────────

  if (state.view === 'delete-confirm') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="yellow">{t('tui_owner_delete_confirm_title')}"{state.ownerName}"{t('tui_owner_delete_confirm_end')}</Text>
        <Text color="gray">{t('tui_owner_delete_no_assets')}</Text>
      </Box>
    );
  }

  // ── Render: delete-action ────────────────────────────────────────────────────

  if (state.view === 'delete-action') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="yellow">
          Owner &quot;{state.ownerName}&quot; — {state.linkedAssets.length}{t('tui_owner_delete_action_suffix')}
        </Text>
        <Text>{t('tui_owner_delete_action_choose')}</Text>
        <Text>{t('tui_owner_delete_action_1')}</Text>
        <Text>{t('tui_owner_delete_action_2')}</Text>
        <Text>{t('tui_owner_delete_action_3')}</Text>
        <Text color="gray">{t('tui_owner_delete_action_q')}</Text>
      </Box>
    );
  }

  // ── Render: reassign-select ──────────────────────────────────────────────────

  if (state.view === 'reassign-select') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="yellow">
          {t('tui_owner_reassign_title')}&quot;{state.ownerName}&quot;{t('tui_owner_reassign_to')}
        </Text>
        {state.candidates.length === 0 && (
          <Text color="red">{t('tui_owner_reassign_none')}</Text>
        )}
        {state.candidates.map((candidate, index) => {
          const isSelected = index === state.selectedIndex;
          const prefix = isSelected ? '> ' : '  ';
          return (
            <Box key={candidate.id}>
              <Text bold={isSelected} inverse={isSelected}>
                {prefix}
                {col(candidate.name, 24)}
                {'  '}
                {col(candidate.email, 28)}
                {'  '}
                {col(candidate.department, 20)}
              </Text>
            </Box>
          );
        })}
        <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text color="gray">{t('tui_owner_reassign_hint')}</Text>
        </Box>
      </Box>
    );
  }

  // ── Render: list ─────────────────────────────────────────────────────────────

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="blue">{t('tui_owners_title')}</Text>

      {/* Filter bar */}
      <Box marginTop={1} marginBottom={1}>
        <Text color={filterFocused ? 'cyan' : 'white'}>{t('tui_filter_label')}</Text>
        <TextInput
          value={filter}
          onChange={setFilter}
          focus={filterFocused}
          placeholder={t('tui_owner_filter_placeholder')}
        />
        <Text color={filterFocused ? 'cyan' : 'white'}>]</Text>
        {!filterFocused && (
          <Text color="gray">{t('tui_filter_hint')}</Text>
        )}
      </Box>

      {message && <Text color="green">{message}</Text>}

      <Box>
        <Text bold color="blue">
          {'  '}
          {col(t('tui_col_id'), 36)}
          {'  '}
          {col(t('tui_col_name'), 20)}
          {'  '}
          {col(t('tui_col_email'), 24)}
          {'  '}
          {t('tui_col_dept')}
        </Text>
      </Box>
      {filtered.length === 0 && <Text color="gray">{t('tui_no_owner')}</Text>}
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
        <Text color="gray">{t('tui_owner_list_hint')}</Text>
      </Box>
    </Box>
  );
}
