import type { Command } from 'commander';
import { getDb } from '../cli.js';
import { getChangelog } from '../db/queries/audit-log.js';
import { formatTable, formatDiff } from '../utils/format.js';
import { formatDate } from '../utils/date.js';
import { t } from '../i18n.js';

export function registerAssetChangelog(asset: Command): void {
  asset
    .command('changelog')
    .description('Afficher le journal global des modifications')
    .option('--limit <n>', "Nombre maximum d'entrées", (v) => parseInt(v, 10))
    .option('--since <date>', 'Depuis une date (YYYY-MM-DD)')
    .action((opts) => {
      const db = getDb();
      const entries = getChangelog(db, {
        limit: opts.limit,
        since: opts.since,
      });

      if (entries.length === 0) {
        process.stdout.write(`${t('no_changelog')}\n`);
        return;
      }

      const output = formatTable(
        entries.map((e) => ({
          ...e,
          _diff_display: formatDiff(e.diff),
        })),
        [
          { key: 'changed_at', label: t('col_date'), format: (v) => formatDate(v as string) },
          { key: 'asset_id', label: 'Asset ID', width: 12 },
          { key: 'changed_by', label: t('col_author') },
          { key: 'action', label: t('col_action') },
          { key: '_diff_display', label: t('col_changes') },
        ]
      );
      process.stdout.write(output + '\n');
    });
}
