import type { Command } from 'commander';
import { getDb } from '../context.js';
import { getOverdueAssets } from '../db/queries/compliance.js';
import { formatTable, formatStatus, formatClassification, shortId } from '../utils/format.js';
import { formatDate } from '../utils/date.js';
import type { AssetStatus } from '../types/asset.js';
import type { Classification } from '../types/asset.js';
import { t } from '../i18n.js';

function runReviewCheck(exitOnOverdue: boolean): boolean {
  const db = getDb();
  const overdueAssets = getOverdueAssets(db);
  const timestamp = new Date().toLocaleTimeString();

  if (overdueAssets.length === 0) {
    process.stdout.write(`[${timestamp}] ${t('all_assets_reviewed')}\n`);
    if (exitOnOverdue) process.exit(0);
    return false;
  }

  process.stdout.write(`[${timestamp}] ⚠ ${overdueAssets.length}${t('overdue_assets')}\n`);

  const output = formatTable(overdueAssets as unknown as Record<string, unknown>[], [
    { key: 'id', label: t('col_id'), format: (v) => shortId(v as string) },
    { key: 'name', label: t('col_name'), width: 20 },
    { key: 'type', label: t('col_type') },
    { key: 'classification', label: t('col_classification'), format: (v) => formatClassification(v as Classification | null) },
    { key: 'owner', label: t('col_owner'), format: (v) => v ? String(v) : '—' },
    { key: 'status', label: t('col_status'), format: (v) => formatStatus(v as AssetStatus) },
    { key: 'next_review_date', label: t('col_next_review'), format: (v) => formatDate(v as string | null) },
  ]);

  process.stdout.write(output + '\n');
  if (exitOnOverdue) process.exit(1);
  return true;
}

export function registerAssetReview(asset: Command): void {
  asset
    .command('review')
    .description('Lister les actifs en retard de révision (non conformes ISO 27001 A.5.9)')
    .option('--watch', 'Surveiller en continu les révisions dépassées')
    .option('--interval <seconds>', 'Intervalle de vérification en secondes (défaut : 60)', '60')
    .action((options: { watch?: boolean; interval: string }) => {
      if (!options.watch) {
        runReviewCheck(true);
        return;
      }

      const intervalSeconds = Math.max(1, parseInt(options.interval, 10) || 60);
      process.stdout.write(`${t('review_watch_start')}${intervalSeconds}${t('review_watch_start_end')}\n\n`);

      runReviewCheck(false);

      const timer = setInterval(() => {
        runReviewCheck(false);
      }, intervalSeconds * 1000);

      process.once('SIGINT', () => {
        clearInterval(timer);
        process.stdout.write(`${t('review_watch_stop')}\n`);
        process.exit(0);
      });
    });
}
