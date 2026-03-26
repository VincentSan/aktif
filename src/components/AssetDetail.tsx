import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { getDb, getConfig } from '../context.js';
import { getAssetById, retireAsset, deleteAsset } from '../db/queries/assets.js';
import { appendAuditLog } from '../db/queries/audit-log.js';
import { resolveUser } from '../utils/user.js';
import { StatusBadge } from './shared/StatusBadge.js';
import { ClassificationBadge } from './shared/ClassificationBadge.js';
import type { Asset } from '../types/asset.js';
import type { NavigateFunction } from './App.js';

interface AssetDetailProps {
  assetId: string;
  onNavigate: NavigateFunction;
}

interface FieldRow {
  label: string;
  value: React.ReactNode;
}

export function AssetDetail({ assetId, onNavigate }: AssetDetailProps): React.ReactElement {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    try {
      const db = getDb();
      const found = getAssetById(db, assetId);
      setAsset(found);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [assetId]);

  useInput((input, key) => {
    if (deleteConfirm) {
      if (input === 'o') {
        try {
          const db = getDb();
          const config = getConfig();
          appendAuditLog(db, {
            asset_id: assetId,
            action: 'delete',
            changed_by: resolveUser(config),
            diff: {},
          });
          deleteAsset(db, assetId);
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          setDeleteConfirm(false);
          return;
        }
        onNavigate('list');
      } else if (input === 'n' || key.escape) {
        setDeleteConfirm(false);
      }
      return;
    }

    if (key.escape) {
      onNavigate('list');
    } else if (input === 'e') {
      onNavigate('form', assetId, 'edit');
    } else if (input === 'r') {
      try {
        const db = getDb();
        const config = getConfig();
        const { before, after } = retireAsset(db, assetId);
        appendAuditLog(db, {
          asset_id: assetId,
          action: 'retire',
          changed_by: resolveUser(config),
          diff: {
            status: { before: before.status, after: after.status },
          },
        });
        onNavigate('list');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    } else if (input === 'd') {
      setDeleteConfirm(true);
    } else if (input === 'h') {
      onNavigate('history', assetId);
    }
  });

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">Erreur : {error}</Text>
        <Text color="gray">Esc retour</Text>
      </Box>
    );
  }

  if (!asset) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="gray">Chargement…</Text>
      </Box>
    );
  }

  const fields: FieldRow[] = [
    { label: 'ID', value: <Text color="gray">{asset.id}</Text> },
    { label: 'Type', value: <Text>{asset.type}</Text> },
    { label: 'Statut', value: <StatusBadge status={asset.status} /> },
    { label: 'Classification', value: <ClassificationBadge classification={asset.classification} /> },
    { label: 'Propriétaire', value: <Text>{asset.owner ?? '—'}</Text> },
    { label: 'Localisation', value: <Text>{asset.location ?? '—'}</Text> },
    { label: 'Description', value: <Text>{asset.description ?? '—'}</Text> },
    { label: 'Date d\'entrée', value: <Text>{asset.entry_date}</Text> },
    { label: 'Dernière revue', value: <Text>{asset.review_date ?? '—'}</Text> },
    { label: 'Prochaine revue', value: <Text>{asset.next_review_date ?? '—'}</Text> },
    { label: 'Restrictions accès', value: <Text>{asset.access_restrictions ?? '—'}</Text> },
    { label: 'Méthode de rebut', value: <Text>{asset.disposal_method ?? '—'}</Text> },
    { label: 'Tags', value: <Text>{asset.tags.length > 0 ? asset.tags.join(', ') : '—'}</Text> },
    { label: 'Composants', value: <Text>{asset.components.length > 0 ? asset.components.map(c => c.version ? `${c.name}@${c.version}` : c.name).join(', ') : '—'}</Text> },
    { label: 'Risques liés', value: <Text>{asset.related_risks.length > 0 ? asset.related_risks.join(', ') : '—'}</Text> },
  ];

  // Split into two columns
  const half = Math.ceil(fields.length / 2);
  const leftFields = fields.slice(0, half);
  const rightFields = fields.slice(half);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">{asset.name}</Text>
      </Box>

      <Box flexDirection="row" gap={4}>
        <Box flexDirection="column" flexGrow={1}>
          {leftFields.map((f) => (
            <Box key={f.label} flexDirection="row" marginBottom={0}>
              <Box width={22}>
                <Text color="gray">{f.label}</Text>
              </Box>
              <Box flexGrow={1}>{f.value}</Box>
            </Box>
          ))}
        </Box>

        <Box flexDirection="column" flexGrow={1}>
          {rightFields.map((f) => (
            <Box key={f.label} flexDirection="row" marginBottom={0}>
              <Box width={22}>
                <Text color="gray">{f.label}</Text>
              </Box>
              <Box flexGrow={1}>{f.value}</Box>
            </Box>
          ))}
        </Box>
      </Box>

      {deleteConfirm && (
        <Box marginTop={1}>
          <Text color="yellow">Supprimer "{asset.name}" ? </Text>
          <Text color="white">(o/n)</Text>
        </Box>
      )}

      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="gray">e modifier  ·  r retirer  ·  d supprimer  ·  h historique  ·  Esc retour</Text>
      </Box>
    </Box>
  );
}
