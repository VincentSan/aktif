import type { Command } from 'commander';
import { getDb } from '../cli.js';
import { searchAssets } from '../db/queries/assets.js';
import { formatTable, formatStatus, formatClassification, shortId } from '../utils/format.js';
import { formatDate } from '../utils/date.js';
import type { Classification, AssetStatus } from '../types/asset.js';
import { t } from '../i18n.js';

export function registerAssetSearch(asset: Command): void {
  asset
    .command('search <query>')
    .description('Rechercher des actifs par nom, description ou tags')
    .action((query: string) => {
      const db = getDb();
      const assets = searchAssets(db, query);

      if (assets.length === 0) {
        process.stdout.write(`${t('no_asset_found')}"${query}"\n`);
        return;
      }

      const output = formatTable(assets as unknown as Record<string, unknown>[], [
        { key: 'id', label: t('col_id'), format: (v) => shortId(v as string) },
        { key: 'name', label: t('col_name'), width: 20 },
        { key: 'type', label: t('col_type') },
        { key: 'classification', label: t('col_classification'), format: (v) => formatClassification(v as Classification | null) },
        { key: 'owner', label: t('col_owner'), format: (v) => v ? String(v) : '—' },
        { key: 'status', label: t('col_status'), format: (v) => formatStatus(v as AssetStatus) },
        { key: 'next_review_date', label: t('col_next_review'), format: (v) => formatDate(v as string | null) },
      ]);

      process.stdout.write(output + '\n');
    });
}
