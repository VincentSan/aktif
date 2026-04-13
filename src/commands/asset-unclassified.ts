import type { Command } from 'commander';
import { getDb } from '../context.js';
import { getUnclassifiedAssets } from '../db/queries/compliance.js';
import { formatTable, formatStatus, shortId } from '../utils/format.js';
import { formatDate } from '../utils/date.js';
import type { AssetStatus } from '../types/asset.js';
import { t } from '../i18n.js';

export function registerAssetUnclassified(asset: Command): void {
  asset
    .command('unclassified')
    .description('Lister les actifs sans classification (non conformes ISO 27001 A.5.9)')
    .action(() => {
      const db = getDb();
      const unclassifiedAssets = getUnclassifiedAssets(db);

      if (unclassifiedAssets.length === 0) {
        process.stdout.write(`${t('all_assets_classified')}\n`);
        process.exit(0);
      }

      const output = formatTable(unclassifiedAssets as unknown as Record<string, unknown>[], [
        { key: 'id', label: t('col_id'), format: (v) => shortId(v as string) },
        { key: 'name', label: t('col_name'), width: 20 },
        { key: 'type', label: t('col_type') },
        { key: 'owner', label: t('col_owner'), format: (v) => v ? String(v) : '—' },
        { key: 'status', label: t('col_status'), format: (v) => formatStatus(v as AssetStatus) },
        { key: 'next_review_date', label: t('col_next_review'), format: (v) => formatDate(v as string | null) },
      ]);

      process.stdout.write(output + '\n');
      process.exit(1);
    });
}
