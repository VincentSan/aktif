import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { getDb, getConfig } from '../context.js';
import { getAssetById, retireAsset, deleteAsset } from '../db/queries/assets.js';
import { appendAuditLog } from '../db/queries/audit-log.js';
import { resolveUser } from '../utils/user.js';
import { StatusBadge } from './shared/StatusBadge.js';
import { ClassificationBadge } from './shared/ClassificationBadge.js';
import { TypeIcon } from './shared/TypeIcon.js';
import type { Asset } from '../types/asset.js';
import type { NavigateFunction } from './App.js';
import { t } from '../i18n.js';

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
        <Text color="red">{t('tui_error_prefix')}{error}</Text>
        <Text color="gray">{t('tui_back_hint')}</Text>
      </Box>
    );
  }

  if (!asset) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="gray">{t('tui_loading')}</Text>
      </Box>
    );
  }

  const fields: FieldRow[] = [
    { label: t('tui_detail_field_id'), value: <Text color="gray">{asset.id}</Text> },
    { label: t('tui_detail_field_type'), value: <><TypeIcon type={asset.type} /><Text> {asset.type}</Text></> },
    { label: t('tui_detail_field_status'), value: <StatusBadge status={asset.status} /> },
    { label: t('tui_detail_field_class'), value: <ClassificationBadge classification={asset.classification} /> },
    { label: t('tui_detail_field_owner'), value: <Text>{asset.owner ?? '—'}</Text> },
    { label: t('tui_detail_field_location'), value: <Text>{asset.location ?? '—'}</Text> },
    { label: t('tui_detail_field_description'), value: <Text>{asset.description ?? '—'}</Text> },
    { label: t('tui_detail_field_entry_date'), value: <Text>{asset.entry_date}</Text> },
    { label: t('tui_detail_field_last_review'), value: <Text>{asset.review_date ?? '—'}</Text> },
    { label: t('tui_detail_field_next_review'), value: <Text>{asset.next_review_date ?? '—'}</Text> },
    { label: t('tui_detail_field_disposal'), value: <Text>{asset.disposal_method ?? '—'}</Text> },
    { label: t('tui_detail_field_tags'), value: <Text>{asset.tags.length > 0 ? asset.tags.join(', ') : '—'}</Text> },
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
          <Text color="yellow">{t('tui_delete_confirm')}{asset.name}{t('tui_delete_confirm_end')}</Text>
          <Text color="white">{t('tui_delete_confirm_keys')}</Text>
        </Box>
      )}

      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="gray">{t('tui_detail_hint')}</Text>
      </Box>
    </Box>
  );
}
