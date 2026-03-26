import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { getDb, getConfig } from '../context.js';
import { insertAsset, updateAsset, getAssetById } from '../db/queries/assets.js';
import { appendAuditLog } from '../db/queries/audit-log.js';
import { listOwners, insertOwner } from '../db/queries/owners.js';
import { computeDiff } from '../utils/diff.js';
import { resolveUser } from '../utils/user.js';
import { today } from '../utils/date.js';
import {
  ASSET_TYPES,
  CLASSIFICATIONS,
  ASSET_STATUSES,
  type AssetType,
  type Classification,
  type AssetStatus,
} from '../types/asset.js';
import type { Owner } from '../types/owner.js';
import type { NavigateFunction } from './App.js';

// ─── Constantes ───────────────────────────────────────────────────────────────

const NONE_OPTION  = '(aucune)';  // InlineSelect nullable
const OWNER_NONE   = '(aucun)';   // OwnerSearchSelect
const OWNER_NEW    = '+ Nouveau owner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssetFormProps {
  mode: 'add' | 'edit';
  assetId?: string;
  onNavigate: NavigateFunction;
}

type FieldKind = 'text' | 'select' | 'owner-select';

interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  kind: FieldKind;
  options?: readonly string[];
  nullable?: boolean;
}

// ─── Définition des champs ────────────────────────────────────────────────────

const FIELDS: FieldDef[] = [
  { key: 'name',           label: 'Nom',            required: true,  kind: 'text'   },
  { key: 'type',           label: 'Type',           required: true,  kind: 'select', options: ASSET_TYPES },
  { key: 'description',    label: 'Description',    required: false, kind: 'text'   },
  { key: 'owner',          label: 'Propriétaire',   required: false, kind: 'owner-select' },
  { key: 'classification', label: 'Classification', required: false, kind: 'select', options: CLASSIFICATIONS, nullable: true },
  { key: 'status',         label: 'Statut',         required: true,  kind: 'select', options: ASSET_STATUSES },
  { key: 'location',       label: 'Localisation',   required: false, kind: 'text'   },
];

// ─── InlineSelect (petites listes fixes : type, classification, statut) ───────

interface InlineSelectProps {
  options: readonly string[];
  nullable?: boolean;
  value: string;
  onChange: (v: string) => void;
  isActive: boolean;
}

function InlineSelect({ options, nullable, value, onChange, isActive }: InlineSelectProps): React.ReactElement {
  const allOptions = nullable ? [NONE_OPTION, ...options] : [...options];
  const currentIndex = allOptions.indexOf(value === '' ? NONE_OPTION : value);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

  useInput((input, key) => {
    if (!isActive) return;
    if (key.leftArrow) {
      const next = (safeIndex - 1 + allOptions.length) % allOptions.length;
      const chosen = allOptions[next];
      onChange(chosen === NONE_OPTION ? '' : chosen);
    }
    if (key.rightArrow) {
      const next = (safeIndex + 1) % allOptions.length;
      const chosen = allOptions[next];
      onChange(chosen === NONE_OPTION ? '' : chosen);
    }
  });

  return (
    <Box>
      {allOptions.map((opt, i) => {
        const isSelected = i === safeIndex;
        if (isActive) {
          return (
            <Box key={opt} marginRight={1}>
              <Text color={isSelected ? 'black' : 'gray'} backgroundColor={isSelected ? 'cyan' : undefined}>
                {opt}
              </Text>
            </Box>
          );
        }
        if (isSelected) {
          return (
            <Box key={opt}>
              <Text color="white">{opt}</Text>
              <Text color="gray"> ▼</Text>
            </Box>
          );
        }
        return null;
      })}
      {isActive && <Text color="gray"> ←→ choisir</Text>}
    </Box>
  );
}

// ─── OwnerSearchSelect (liste filtrée avec recherche textuelle) ───────────────

const OWNER_MAX_VISIBLE = 8;

interface OwnerSearchSelectProps {
  owners: Owner[];
  value: string;
  onChange: (name: string, id: string | null) => void;
  onConfirm: () => void;
  onNewOwner: () => void;
  isActive: boolean;
}

function OwnerSearchSelect({ owners, value, onChange, onConfirm, onNewOwner, isActive }: OwnerSearchSelectProps): React.ReactElement {
  const [query, setQuery] = useState('');
  const [listIndex, setListIndex] = useState(0);

  useEffect(() => {
    if (!isActive) { setQuery(''); setListIndex(0); }
  }, [isActive]);

  const lowerQuery = query.toLowerCase();
  const filtered = owners.filter(o => !lowerQuery || o.name.toLowerCase().includes(lowerQuery));

  const listOptions: Array<{ label: string; id: string | null }> = [
    { label: OWNER_NONE, id: null },
    ...filtered.map(o => ({ label: o.name, id: o.id })),
    { label: OWNER_NEW, id: null },
  ];

  const safeIndex = Math.min(Math.max(0, listIndex), listOptions.length - 1);
  const scrollOffset = Math.min(
    Math.max(0, safeIndex - Math.floor(OWNER_MAX_VISIBLE / 2)),
    Math.max(0, listOptions.length - OWNER_MAX_VISIBLE),
  );
  const visible = listOptions.slice(scrollOffset, scrollOffset + OWNER_MAX_VISIBLE);

  useInput((input, key) => {
    if (!isActive) return;
    if (key.upArrow) { setListIndex(i => Math.max(i - 1, 0)); return; }
    if (key.downArrow) { setListIndex(i => Math.min(i + 1, listOptions.length - 1)); return; }
    if (key.return) {
      const chosen = listOptions[safeIndex];
      if (!chosen) return;
      if (chosen.label === OWNER_NEW) {
        onNewOwner();
      } else {
        onChange(chosen.label === OWNER_NONE ? '' : chosen.label, chosen.id);
        onConfirm();
      }
      return;
    }
  });

  if (!isActive) {
    return (
      <Box>
        <Text color="white">{value || OWNER_NONE}</Text>
        <Text color="gray"> ▼</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box>
        <TextInput value={query} onChange={setQuery} focus={true} placeholder="filtrer…" />
        <Text color="gray"> ↑↓ nav · Enter choisir</Text>
      </Box>
      {scrollOffset > 0 && (
        <Text color="gray">  ↑ {scrollOffset} de plus</Text>
      )}
      {visible.map((opt, i) => {
        const absIndex = scrollOffset + i;
        const isHighlighted = absIndex === safeIndex;
        const isSpecial = opt.label === OWNER_NEW;
        return (
          <Box key={opt.label}>
            <Text
              color={isHighlighted ? 'black' : isSpecial ? 'cyan' : 'white'}
              backgroundColor={isHighlighted ? 'cyan' : undefined}
            >
              {isHighlighted ? '▶ ' : '  '}{opt.label}
            </Text>
          </Box>
        );
      })}
      {scrollOffset + OWNER_MAX_VISIBLE < listOptions.length && (
        <Text color="gray">  ↓ {listOptions.length - scrollOffset - OWNER_MAX_VISIBLE} de plus</Text>
      )}
    </Box>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function AssetForm({ mode, assetId, onNavigate }: AssetFormProps): React.ReactElement {
  const [values, setValues] = useState<Record<string, string>>({
    name: '',
    type: ASSET_TYPES[0],
    description: '',
    owner: '',
    classification: '',
    status: ASSET_STATUSES[0],
    location: '',
  });

  const [focusIndex, setFocusIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [owners, setOwners] = useState<Owner[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);

  const [newOwnerMode, setNewOwnerMode] = useState(false);
  const [newOwnerValues, setNewOwnerValues] = useState({ name: '', email: '', department: '' });
  const [newOwnerFocus, setNewOwnerFocus] = useState(0);
  const [newOwnerError, setNewOwnerError] = useState<string | null>(null);

  const currentField = FIELDS[focusIndex] ?? null;

  // ── Chargement ───────────────────────────────────────────────────────────────

  useEffect(() => {
    setOwners(listOwners(getDb()));
  }, []);

  useEffect(() => {
    if (mode === 'edit' && assetId) {
      try {
        const asset = getAssetById(getDb(), assetId);
        if (!asset) { setGlobalError(`Asset introuvable : ${assetId}`); return; }
        setValues({
          name: asset.name ?? '',
          type: asset.type ?? ASSET_TYPES[0],
          description: asset.description ?? '',
          owner: asset.owner ?? '',
          classification: asset.classification ?? '',
          status: asset.status ?? ASSET_STATUSES[0],
          location: asset.location ?? '',
        });
        setSelectedOwnerId(asset.owner_id ?? null);
      } catch (e: unknown) {
        setGlobalError(e instanceof Error ? e.message : String(e));
      }
    }
  }, [mode, assetId]);

  // ── Validation ──────────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!values.name.trim()) newErrors.name = 'Le nom est requis.';
    if (!values.type) newErrors.type = 'Le type est requis.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      const errIndex = FIELDS.findIndex((f) => newErrors[f.key]);
      if (errIndex !== -1) setFocusIndex(errIndex);
      return false;
    }
    return true;
  }

  // ── Soumission ──────────────────────────────────────────────────────────────

  function handleSubmit() {
    if (!validate()) return;
    const db = getDb();
    const changedBy = resolveUser(getConfig());
    const ownerName = values.owner === OWNER_NEW ? null : (values.owner.trim() || null);
    const assetData = {
      name: values.name.trim(),
      type: values.type as AssetType,
      description: values.description.trim() || null,
      owner: ownerName,
      owner_id: selectedOwnerId,
      classification: (values.classification || null) as Classification | null,
      access_restrictions: null,
      status: values.status as AssetStatus,
      location: values.location.trim() || null,
      entry_date: today(),
      review_date: null,
      next_review_date: null,
      disposal_method: null,
      tags: [],
      components: [],
      related_risks: [],
    };
    try {
      if (mode === 'add') {
        const created = insertAsset(db, assetData);
        appendAuditLog(db, { asset_id: created.id, action: 'create', changed_by: changedBy, diff: {} });
        onNavigate('list');
      } else if (mode === 'edit' && assetId) {
        const { before, after } = updateAsset(db, assetId, assetData);
        appendAuditLog(db, { asset_id: assetId, action: 'update', changed_by: changedBy, diff: computeDiff(before, after) });
        onNavigate('detail', assetId);
      }
    } catch (e: unknown) {
      setGlobalError(e instanceof Error ? e.message : String(e));
    }
  }

  // ── Nouveau owner ────────────────────────────────────────────────────────────

  function resetNewOwnerForm() {
    setNewOwnerMode(false);
    setNewOwnerValues({ name: '', email: '', department: '' });
    setNewOwnerFocus(0);
    setNewOwnerError(null);
  }

  function handleNewOwnerSubmit() {
    if (!newOwnerValues.name.trim()) { setNewOwnerError('Le nom est requis.'); return; }
    const db = getDb();
    const created = insertOwner(db, {
      name: newOwnerValues.name.trim(),
      email: newOwnerValues.email.trim() || null,
      department: newOwnerValues.department.trim() || null,
    });
    setOwners(prev => [...prev, created]);
    setValues(prev => ({ ...prev, owner: created.name }));
    setSelectedOwnerId(created.id);
    resetNewOwnerForm();
    setFocusIndex(i => Math.min(i + 1, FIELDS.length));
  }

  function cancelNewOwner() {
    resetNewOwnerForm();
    setValues(prev => ({ ...prev, owner: '' }));
    setSelectedOwnerId(null);
  }

  // ── Navigation clavier principale ───────────────────────────────────────────

  useInput((input, key) => {
    if (newOwnerMode) return;

    if (key.escape) { onNavigate('list'); return; }

    if (key.ctrl && input === 's') { handleSubmit(); return; }

    if (key.tab && !key.shift) {
      setFocusIndex((i) => Math.min(i + 1, FIELDS.length));
      return;
    }
    if (key.tab && key.shift) {
      setFocusIndex((i) => Math.max(i - 1, 0));
      return;
    }

    // ↑↓ délégués à OwnerSearchSelect quand ce champ est actif
    if (key.downArrow) {
      if (currentField?.kind !== 'owner-select') setFocusIndex((i) => Math.min(i + 1, FIELDS.length));
      return;
    }
    if (key.upArrow) {
      if (currentField?.kind !== 'owner-select') setFocusIndex((i) => Math.max(i - 1, 0));
      return;
    }

    if (key.return) {
      if (focusIndex === FIELDS.length) {
        handleSubmit();
      } else if (currentField?.kind !== 'owner-select') {
        setFocusIndex((i) => Math.min(i + 1, FIELDS.length));
      }
      // owner-select : géré par OwnerSearchSelect via onConfirm/onNewOwner
      return;
    }
  });

  // ── Navigation mini-form nouveau owner ──────────────────────────────────────

  useInput((input, key) => {
    if (!newOwnerMode) return;
    if (key.escape) { cancelNewOwner(); return; }
    if ((key.tab && !key.shift) || key.downArrow) { setNewOwnerFocus(i => Math.min(i + 1, 3)); return; }
    if ((key.tab && key.shift) || key.upArrow) { setNewOwnerFocus(i => Math.max(i - 1, 0)); return; }
    if (key.return) {
      if (newOwnerFocus === 3) { handleNewOwnerSubmit(); }
      else { setNewOwnerFocus(i => Math.min(i + 1, 3)); }
      return;
    }
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  const title = mode === 'add' ? 'Ajouter un actif' : 'Modifier l\'actif';
  const labelWidth = 18;

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="blue">{title}</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="blue">{'─'.repeat(42)}</Text>
      </Box>

      {globalError && (
        <Box marginBottom={1}>
          <Text color="red">Erreur : {globalError}</Text>
        </Box>
      )}

      {FIELDS.map((field, index) => {
        const isActive = focusIndex === index && !newOwnerMode;
        const error = errors[field.key];
        const label = (field.required ? '* ' : '  ') + field.label + ':';
        const paddedLabel = label.padEnd(labelWidth);

        return (
          <Box key={field.key} flexDirection="column">
            <Box>
              <Text color={isActive ? 'cyan' : error ? 'red' : 'white'}>
                {paddedLabel}
              </Text>
              <Box flexGrow={1}>
                {field.kind === 'text' ? (
                  <TextInput
                    value={values[field.key] ?? ''}
                    onChange={(v) => {
                      setValues((prev) => ({ ...prev, [field.key]: v }));
                      if (errors[field.key]) setErrors((prev) => { const n = { ...prev }; delete n[field.key]; return n; });
                    }}
                    focus={isActive}
                    placeholder={field.required ? 'requis…' : 'optionnel…'}
                  />
                ) : field.kind === 'owner-select' ? (
                  <OwnerSearchSelect
                    owners={owners}
                    value={values[field.key] ?? ''}
                    onChange={(name, id) => {
                      setValues(prev => ({ ...prev, owner: name }));
                      setSelectedOwnerId(id);
                    }}
                    onConfirm={() => setFocusIndex(i => Math.min(i + 1, FIELDS.length))}
                    onNewOwner={() => { setNewOwnerMode(true); setNewOwnerFocus(0); }}
                    isActive={isActive}
                  />
                ) : (
                  <InlineSelect
                    options={field.options ?? []}
                    nullable={field.nullable}
                    value={values[field.key] ?? ''}
                    onChange={(v) => {
                      setValues((prev) => ({ ...prev, [field.key]: v }));
                      if (errors[field.key]) setErrors((prev) => { const n = { ...prev }; delete n[field.key]; return n; });
                    }}
                    isActive={isActive}
                  />
                )}
              </Box>
            </Box>
            {error && (
              <Box marginLeft={labelWidth}>
                <Text color="red">  ⚠ {error}</Text>
              </Box>
            )}

            {/* Mini-form nouveau owner */}
            {field.kind === 'owner-select' && newOwnerMode && (
              <Box flexDirection="column" marginLeft={2} borderStyle="single" borderColor="yellow" paddingX={1}>
                <Text color="yellow" bold>Nouveau propriétaire</Text>
                {newOwnerError && <Text color="red">⚠ {newOwnerError}</Text>}
                <Box>
                  <Text color={newOwnerFocus === 0 ? 'cyan' : 'white'}>{'* Nom:'.padEnd(labelWidth)}</Text>
                  <TextInput value={newOwnerValues.name} onChange={(v) => { setNewOwnerValues(p => ({ ...p, name: v })); setNewOwnerError(null); }} focus={newOwnerFocus === 0} placeholder="requis…" />
                </Box>
                <Box>
                  <Text color={newOwnerFocus === 1 ? 'cyan' : 'white'}>{'  Email:'.padEnd(labelWidth)}</Text>
                  <TextInput value={newOwnerValues.email} onChange={(v) => setNewOwnerValues(p => ({ ...p, email: v }))} focus={newOwnerFocus === 1} placeholder="optionnel…" />
                </Box>
                <Box>
                  <Text color={newOwnerFocus === 2 ? 'cyan' : 'white'}>{'  Département:'.padEnd(labelWidth)}</Text>
                  <TextInput value={newOwnerValues.department} onChange={(v) => setNewOwnerValues(p => ({ ...p, department: v }))} focus={newOwnerFocus === 2} placeholder="optionnel…" />
                </Box>
                <Box>
                  <Text color={newOwnerFocus === 3 ? 'black' : 'white'} backgroundColor={newOwnerFocus === 3 ? 'yellow' : undefined} bold={newOwnerFocus === 3}>
                    {' [Créer] '}
                  </Text>
                  <Text color="gray">    Esc: Annuler</Text>
                </Box>
              </Box>
            )}
          </Box>
        );
      })}

      <Box marginTop={1}>
        <Text color={focusIndex === FIELDS.length ? 'black' : 'white'} backgroundColor={focusIndex === FIELDS.length ? 'cyan' : undefined} bold={focusIndex === FIELDS.length}>
          {' [Sauvegarder] '}
        </Text>
        <Text color="gray">    Esc: Annuler</Text>
      </Box>

      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="gray">
          Tab/Enter suivant · Shift+Tab précédent · ↑↓ nav owner · ←→ option · Ctrl+S sauvegarder · Esc annuler
        </Text>
      </Box>
    </Box>
  );
}
