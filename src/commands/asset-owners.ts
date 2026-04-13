import type { Command } from 'commander';
import { getDb } from '../context.js';
import { getAssetsWithoutOwner } from '../db/queries/compliance.js';
import { formatTable, formatStatus, formatClassification, shortId } from '../utils/format.js';
import { formatDate } from '../utils/date.js';
import type { AssetStatus } from '../types/asset.js';
import type { Classification } from '../types/asset.js';
import { t } from '../i18n.js';

export function registerAssetOwners(asset: Command): void {
  asset
    .command('owners')
    .description('Lister les actifs sans propriétaire (non conformes ISO 27001 A.5.9)')
    .action(() => {
      const db = getDb();
      const unownedAssets = getAssetsWithoutOwner(db);

      if (unownedAssets.length === 0) {
        process.stdout.write(`${t('all_assets_owned')}\n`);
        process.exit(0);
      }

      const output = formatTable(unownedAssets as unknown as Record<string, unknown>[], [
        { key: 'id', label: t('col_id'), format: (v) => shortId(v as string) },
        { key: 'name', label: t('col_name'), width: 20 },
        { key: 'type', label: t('col_type') },
        { key: 'classification', label: t('col_classification'), format: (v) => formatClassification(v as Classification | null) },
        { key: 'status', label: t('col_status'), format: (v) => formatStatus(v as AssetStatus) },
        { key: 'next_review_date', label: t('col_next_review'), format: (v) => formatDate(v as string | null) },
      ]);

      process.stdout.write(output + '\n');
      process.exit(1);
    });
}
