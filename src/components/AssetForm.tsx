import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { getDb, getConfig } from '../context.js';
import { insertAsset, updateAsset, getAssetById } from '../db/queries/assets.js';
import { appendAuditLog } from '../db/queries/audit-log.js';
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
import type { NavigateFunction } from './App.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssetFormProps {
  mode: 'add' | 'edit';
  assetId?: string;
  onNavigate: NavigateFunction;
}

// Un champ peut être un text-input ou un select
type FieldKind = 'text' | 'select';

interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  kind: FieldKind;
  options?: readonly string[];
  nullable?: boolean; // si true, ajoute "(aucune)" en tête des options
}

// ─── Définition des champs ────────────────────────────────────────────────────

const FIELDS: FieldDef[] = [
  { key: 'name',           label: 'Nom',            required: true,  kind: 'text'   },
  { key: 'type',           label: 'Type',           required: true,  kind: 'select', options: ASSET_TYPES },
  { key: 'description',    label: 'Description',    required: false, kind: 'text'   },
  { key: 'owner',          label: 'Propriétaire',   required: false, kind: 'text'   },
  { key: 'classification', label: 'Classification', required: false, kind: 'select', options: CLASSIFICATIONS, nullable: true },
  { key: 'status',         label: 'Statut',         required: true,  kind: 'select', options: ASSET_STATUSES },
  { key: 'location',       label: 'Localisation',   required: false, kind: 'text'   },
];

// ─── Composant Select custom ──────────────────────────────────────────────────

interface InlineSelectProps {
  options: readonly string[];
  nullable?: boolean;
  value: string;
  onChange: (v: string) => void;
  isActive: boolean;
}

function InlineSelect({ options, nullable, value, onChange, isActive }: InlineSelectProps): React.ReactElement {
  const allOptions = nullable ? ['(aucune)', ...options] : [...options];
  const currentIndex = allOptions.indexOf(value === '' ? '(aucune)' : value);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

  useInput(
    (input, key) => {
      if (!isActive) return;
      if (key.leftArrow || (key.shift && key.tab)) {
        const next = (safeIndex - 1 + allOptions.length) % allOptions.length;
        const chosen = allOptions[next];
        onChange(chosen === '(aucune)' ? '' : chosen);
      }
      if (key.rightArrow) {
        const next = (safeIndex + 1) % allOptions.length;
        const chosen = allOptions[next];
        onChange(chosen === '(aucune)' ? '' : chosen);
      }
    },
  );

  return (
    <Box>
      {allOptions.map((opt, i) => {
        const isSelected = i === safeIndex;
        if (isActive) {
          return (
            <Box key={opt} marginRight={1}>
              <Text
                color={isSelected ? 'black' : 'gray'}
                backgroundColor={isSelected ? 'cyan' : undefined}
              >
                {opt}
              </Text>
            </Box>
          );
        }
        // Inactif : affiche uniquement la valeur courante
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
      {isActive && (
        <Text color="gray"> ←→ choisir</Text>
      )}
    </Box>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function AssetForm({ mode, assetId, onNavigate }: AssetFormProps): React.ReactElement {
  // Valeurs texte pour chaque champ
  const [values, setValues] = useState<Record<string, string>>({
    name: '',
    type: ASSET_TYPES[0],
    description: '',
    owner: '',
    classification: '',
    status: ASSET_STATUSES[0],
    location: '',
  });

  // Index du champ courant (0..FIELDS.length - 1) + bouton sauvegarder = FIELDS.length
  const [focusIndex, setFocusIndex] = useState(0);

  // Erreurs par champ
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Message d'erreur global (ex: asset non trouvé en edit)
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Indique si un select est en cours d'édition (désactive la nav globale)
  const currentField = FIELDS[focusIndex] ?? null;
  const selectActive = currentField?.kind === 'select';

  // Chargement de l'asset existant en mode edit
  useEffect(() => {
    if (mode === 'edit' && assetId) {
      try {
        const asset = getAssetById(getDb(), assetId);
        if (!asset) {
          setGlobalError(`Asset introuvable : ${assetId}`);
          return;
        }
        setValues({
          name: asset.name ?? '',
          type: asset.type ?? ASSET_TYPES[0],
          description: asset.description ?? '',
          owner: asset.owner ?? '',
          classification: asset.classification ?? '',
          status: asset.status ?? ASSET_STATUSES[0],
          location: asset.location ?? '',
        });
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
    const config = getConfig();
    const changedBy = resolveUser(config);

    const assetData = {
      name: values.name.trim(),
      type: values.type as AssetType,
      description: values.description.trim() || null,
      owner: values.owner.trim() || null,
      owner_id: null,
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
        appendAuditLog(db, {
          asset_id: created.id,
          action: 'create',
          changed_by: changedBy,
          diff: {},
        });
        onNavigate('list');
      } else if (mode === 'edit' && assetId) {
        const { before, after } = updateAsset(db, assetId, assetData);
        const diff = computeDiff(before, after);
        appendAuditLog(db, {
          asset_id: assetId,
          action: 'update',
          changed_by: changedBy,
          diff,
        });
        onNavigate('detail', assetId);
      }
    } catch (e: unknown) {
      setGlobalError(e instanceof Error ? e.message : String(e));
    }
  }

  // ── Navigation clavier globale ──────────────────────────────────────────────

  useInput((input, key) => {
    // Escape : annuler
    if (key.escape) {
      onNavigate('list');
      return;
    }

    // Quand un select est actif, les touches ←→ sont gérées par InlineSelect,
    // mais Tab/↓/↑/Enter restent ici pour avancer/soumettre
    if (key.tab || key.downArrow) {
      setFocusIndex((i) => Math.min(i + 1, FIELDS.length)); // FIELDS.length = bouton Save
      return;
    }
    if (key.upArrow) {
      setFocusIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (key.return) {
      if (focusIndex >= FIELDS.length - 1) {
        handleSubmit();
      } else if (!selectActive) {
        setFocusIndex((i) => Math.min(i + 1, FIELDS.length));
      }
      return;
    }
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  const title = mode === 'add' ? 'Ajouter un actif' : 'Modifier l\'actif';

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {/* Titre */}
      <Box marginBottom={1}>
        <Text bold color="blue">{title}</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="blue">{'─'.repeat(42)}</Text>
      </Box>

      {/* Erreur globale */}
      {globalError && (
        <Box marginBottom={1}>
          <Text color="red">Erreur : {globalError}</Text>
        </Box>
      )}

      {/* Champs */}
      {FIELDS.map((field, index) => {
        const isActive = focusIndex === index;
        const error = errors[field.key];
        const labelWidth = 15;
        const label = (field.required ? '* ' : '  ') + field.label;
        const paddedLabel = label.padEnd(labelWidth);

        return (
          <Box key={field.key} flexDirection="column">
            <Box>
              <Text color={isActive ? 'cyan' : error ? 'red' : 'white'}>
                {paddedLabel}
              </Text>
              <Text color={isActive ? 'cyan' : 'gray'}>[</Text>
              <Box flexGrow={1}>
                {field.kind === 'text' ? (
                  <TextInput
                    value={values[field.key] ?? ''}
                    onChange={(v) => {
                      setValues((prev) => ({ ...prev, [field.key]: v }));
                      if (errors[field.key]) {
                        setErrors((prev) => { const next = { ...prev }; delete next[field.key]; return next; });
                      }
                    }}
                    focus={isActive}
                    placeholder={field.required ? 'requis…' : 'optionnel…'}
                  />
                ) : (
                  <InlineSelect
                    options={field.options ?? []}
                    nullable={field.nullable}
                    value={values[field.key] ?? ''}
                    onChange={(v) => {
                      setValues((prev) => ({ ...prev, [field.key]: v }));
                      if (errors[field.key]) {
                        setErrors((prev) => { const next = { ...prev }; delete next[field.key]; return next; });
                      }
                    }}
                    isActive={isActive}
                  />
                )}
              </Box>
              {field.kind === 'text' && (
                <Text color={isActive ? 'cyan' : 'gray'}>]</Text>
              )}
            </Box>
            {error && (
              <Box marginLeft={labelWidth}>
                <Text color="red">  ⚠ {error}</Text>
              </Box>
            )}
          </Box>
        );
      })}

      {/* Bouton sauvegarder */}
      <Box marginTop={1}>
        <Text
          color={focusIndex === FIELDS.length ? 'black' : 'white'}
          backgroundColor={focusIndex === FIELDS.length ? 'cyan' : undefined}
          bold={focusIndex === FIELDS.length}
        >
          {' [Sauvegarder] '}
        </Text>
        <Text color="gray">    Esc: Annuler</Text>
      </Box>

      {/* Aide navigation */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="gray">
          Tab/↓ champ suivant · ↑ précédent · ←→ choisir option · Enter valider/sauvegarder · Esc annuler
        </Text>
      </Box>
    </Box>
  );
}
