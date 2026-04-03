import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { listAssets, deleteAsset } from '../db/queries/assets.js';
import { appendAuditLog } from '../db/queries/audit-log.js';
import { getDb, getConfig } from '../context.js';
import { resolveUser } from '../utils/user.js';
import { formatDate } from '../utils/date.js';
import { StatusBadge } from './shared/StatusBadge.js';
import { ClassificationBadge } from './shared/ClassificationBadge.js';
import { TypeIcon } from './shared/TypeIcon.js';
import { col } from './shared/col.js';
import type { Asset } from '../types/asset.js';
import type { NavigateFunction } from './App.js';
import { t } from '../i18n.js';

interface AssetTableProps {
  onNavigate: NavigateFunction;
}

export function AssetTable({ onNavigate }: AssetTableProps): React.ReactElement {
  const { exit } = useApp();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterFocused, setFilterFocused] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const reload = () => {
    try {
      setAssets(listAssets(getDb()));
    } catch {
      setAssets([]);
    }
  };

  // Chargement initial
  useEffect(() => { reload(); }, []);

  // Filtrage en temps réel sur name et owner
  const filtered = assets.filter((a) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      (a.owner ?? '').toLowerCase().includes(q)
    );
  });

  // Remet la sélection à 0 quand le filtre change
  useEffect(() => { setSelectedIndex(0); }, [filter]);

  const clampedIndex = filtered.length === 0 ? 0 : Math.min(selectedIndex, filtered.length - 1);

  useInput(
    (input, key) => {
      if (deleteConfirm !== null) {
        if (input === 'o') {
          try {
            const db = getDb();
            const config = getConfig();
            appendAuditLog(db, {
              asset_id: deleteConfirm.id,
              action: 'delete',
              changed_by: resolveUser(config),
              diff: {},
            });
            deleteAsset(db, deleteConfirm.id);
          } catch (e) {
            setDeleteError(e instanceof Error ? e.message : String(e));
            setDeleteConfirm(null);
            return;
          }
          setDeleteConfirm(null);
          reload();
        } else if (input === 'n' || key.escape) {
          setDeleteConfirm(null);
        }
        return;
      }

      // Tab : bascule le focus filtre/liste
      if (key.tab) {
        setFilterFocused((prev) => !prev);
        return;
      }

      // Quand le filtre a le focus : seuls Escape et Enter sont actifs
      if (filterFocused) {
        if (key.escape) {
          setFilter('');
          setFilterFocused(false);
        } else if (key.return) {
          setFilterFocused(false);
        }
        return;
      }

      if (key.upArrow || input === 'k') {
        setSelectedIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow || input === 'j') {
        setSelectedIndex((i) => Math.min(filtered.length - 1, i + 1));
        return;
      }
      if (key.return && filtered.length > 0) {
        onNavigate('detail', filtered[clampedIndex].id);
        return;
      }
      if (input === 'n') {
        onNavigate('form', undefined, 'add');
        return;
      }
      if (input === 'd' && filtered.length > 0) {
        const asset = filtered[clampedIndex];
        setDeleteConfirm({ id: asset.id, name: asset.name });
        return;
      }
      if (input === 'D') {
        onNavigate('dashboard');
        return;
      }
      if (input === 'o') {
        onNavigate('owners');
        return;
      }
      if (input === 'q') {
        exit();
        return;
      }
    },
  );

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Barre de filtre */}
      <Box marginBottom={1}>
        <Text color={filterFocused ? 'cyan' : 'white'}>{t('tui_filter_label')}</Text>
        <TextInput
          value={filter}
          onChange={setFilter}
          focus={filterFocused}
          placeholder={t('tui_filter_placeholder')}
        />
        <Text color={filterFocused ? 'cyan' : 'white'}>]</Text>
        {!filterFocused && (
          <Text color="gray">{t('tui_filter_hint')}</Text>
        )}
      </Box>

      {/* En-tête tableau */}
      <Box>
        <Box width={2} flexShrink={0} />
        <Box width={8}  flexShrink={0}><Text bold color="blue">ID</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box width={20} flexShrink={0}><Text bold color="blue">{t('col_name')}</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box width={13} flexShrink={0}><Text bold color="blue">{t('col_type')}</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box width={15} flexShrink={0}><Text bold color="blue">{t('col_classification')}</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box width={14} flexShrink={0}><Text bold color="blue">{t('col_owner')}</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box width={14} flexShrink={0}><Text bold color="blue">{t('col_status')}</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box flexShrink={0}><Text bold color="blue">{t('col_next_review')}</Text></Box>
      </Box>
      <Box>
        <Box width={2}  flexShrink={0} />
        <Box width={8}  flexShrink={0}><Text color="blue">{'─'.repeat(8)}</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box width={20} flexShrink={0}><Text color="blue">{'─'.repeat(20)}</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box width={13} flexShrink={0}><Text color="blue">{'─'.repeat(13)}</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box width={15} flexShrink={0}><Text color="blue">{'─'.repeat(15)}</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box width={14} flexShrink={0}><Text color="blue">{'─'.repeat(14)}</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box width={14} flexShrink={0}><Text color="blue">{'─'.repeat(14)}</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box flexShrink={0}><Text color="blue">{'─'.repeat(10)}</Text></Box>
      </Box>

      {/* Lignes */}
      {filtered.length === 0 && (
        <Box marginTop={1}>
          <Text color="gray">{t('tui_no_asset')}</Text>
        </Box>
      )}
      {filtered.map((asset, index) => {
        const isSelected = index === clampedIndex && !filterFocused;

        return (
          <Box key={asset.id}>
            <Box width={2}  flexShrink={0}><Text bold={isSelected} inverse={isSelected}>{isSelected ? '> ' : '  '}</Text></Box>
            <Box width={8}  flexShrink={0}><Text bold={isSelected} inverse={isSelected}>{asset.id.substring(0, 8)}</Text></Box>
            <Box width={2}  flexShrink={0} />
            <Box width={20} flexShrink={0}><Text bold={isSelected} inverse={isSelected}>{col(asset.name, 20)}</Text></Box>
            <Box width={2}  flexShrink={0} />
            <Box width={13} flexShrink={0}>
              <TypeIcon type={asset.type} />
              <Text bold={isSelected} inverse={isSelected}> {col(asset.type, 11)}</Text>
            </Box>
            <Box width={2}  flexShrink={0} />
            <Box width={15} flexShrink={0}><ClassificationBadge classification={asset.classification} /></Box>
            <Box width={2}  flexShrink={0} />
            <Box width={14} flexShrink={0}><Text bold={isSelected} inverse={isSelected}>{col(asset.owner, 14)}</Text></Box>
            <Box width={2}  flexShrink={0} />
            <Box width={14} flexShrink={0}><StatusBadge status={asset.status} /></Box>
            <Box width={2}  flexShrink={0} />
            <Box flexShrink={0}><Text bold={isSelected} inverse={isSelected}>{formatDate(asset.next_review_date)}</Text></Box>
          </Box>
        );
      })}

      {deleteError && (
        <Box marginTop={1}>
          <Text color="red">{t('tui_delete_error')}{deleteError}</Text>
        </Box>
      )}
      {deleteConfirm && (
        <Box marginTop={1}>
          <Text color="yellow">{t('tui_delete_confirm')}{deleteConfirm.name}{t('tui_delete_confirm_end')}</Text>
          <Text color="white">{t('tui_delete_confirm_keys')}</Text>
        </Box>
      )}

      {/* Aide clavier */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="gray">
          {t('tui_asset_table_hint')}
        </Text>
      </Box>
    </Box>
  );
}
