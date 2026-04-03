import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { getDb } from '../context.js';
import { getHistory } from '../db/queries/audit-log.js';
import { formatDate } from '../utils/date.js';
import type { AuditLogEntry } from '../types/audit-log.js';
import type { NavigateFunction } from './App.js';
import { t } from '../i18n.js';

const PAGE_SIZE = 20;

interface AssetHistoryProps {
  assetId: string;
  onNavigate: NavigateFunction;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'green',
  update: 'blue',
  retire: 'yellow',
  delete: 'red',
};

function formatDiff(diff: Record<string, { before: unknown; after: unknown }>): string {
  const entries = Object.entries(diff);
  if (entries.length === 0) return t('tui_history_diff_creation');
  return entries
    .map(([k, { before, after }]) => `${k}: ${String(before)} → ${String(after)}`)
    .join(', ');
}

export function AssetHistory({ assetId, onNavigate }: AssetHistoryProps): React.ReactElement {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    try {
      const db = getDb();
      setEntries(getHistory(db, assetId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [assetId]);

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));

  useInput((_input, key) => {
    if (key.escape) {
      onNavigate('detail', assetId);
    } else if (key.pageUp) {
      setPage((p) => Math.max(0, p - 1));
    } else if (key.pageDown) {
      setPage((p) => Math.min(totalPages - 1, p + 1));
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

  const pageEntries = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1} flexDirection="row" gap={2}>
        <Text bold color="cyan">{t('tui_history_title')}</Text>
        <Text color="gray">({entries.length} {entries.length !== 1 ? t('tui_history_entries') : t('tui_history_entry')})</Text>
        {totalPages > 1 && (
          <Text color="gray">{t('tui_history_page')}{page + 1}/{totalPages}</Text>
        )}
      </Box>

      {entries.length === 0 ? (
        <Text color="gray">{t('tui_history_no_entries')}</Text>
      ) : (
        <Box flexDirection="column">
          {/* Header */}
          <Box flexDirection="row" marginBottom={0}>
            <Box width={18}><Text bold color="gray">{t('tui_history_col_date')}</Text></Box>
            <Box width={16}><Text bold color="gray">{t('tui_history_col_author')}</Text></Box>
            <Box width={10}><Text bold color="gray">{t('tui_history_col_action')}</Text></Box>
            <Box flexGrow={1}><Text bold color="gray">{t('tui_history_col_diff')}</Text></Box>
          </Box>
          <Box marginBottom={1}>
            <Text color="gray">{'─'.repeat(80)}</Text>
          </Box>

          {pageEntries.map((entry) => (
            <Box key={entry.id} flexDirection="row" marginBottom={0}>
              <Box width={18}>
                <Text color="gray">{formatDate(entry.changed_at)}</Text>
              </Box>
              <Box width={16}>
                <Text>{entry.changed_by}</Text>
              </Box>
              <Box width={10}>
                <Text color={ACTION_COLORS[entry.action] ?? 'white'}>{entry.action}</Text>
              </Box>
              <Box flexGrow={1}>
                <Text color="gray">{formatDiff(entry.diff)}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="gray">
          {totalPages > 1 ? t('tui_history_hint_pages') : t('tui_history_hint')}
        </Text>
      </Box>
    </Box>
  );
}
