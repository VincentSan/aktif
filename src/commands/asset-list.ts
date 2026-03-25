import type { Command } from 'commander';
import { getDb } from '../cli.js';
import { listAssets } from '../db/queries/assets.js';
import { formatTable, formatStatus, formatClassification, shortId } from '../utils/format.js';
import { formatDate } from '../utils/date.js';
import type { AssetFilters } from '../types/filters.js';
import { ASSET_TYPES, CLASSIFICATIONS, ASSET_STATUSES } from '../types/asset.js';
import type { AssetType, Classification, AssetStatus } from '../types/asset.js';

export function registerAssetList(asset: Command): void {
  asset
    .command('list')
    .description('Lister les actifs')
    .option('-t, --type <t>', `Filtrer par type (${ASSET_TYPES.join('|')})`)
    .option('-c, --classification <c>', `Filtrer par classification (${CLASSIFICATIONS.join('|')})`)
    .option('-o, --owner <o>', 'Filtrer par propriétaire')
    .option('-s, --status <s>', `Filtrer par statut (${ASSET_STATUSES.join('|')})`)
    .action((opts) => {
      const db = getDb();
      const filters: AssetFilters = {};
      if (opts.type) filters.type = opts.type as AssetType;
      if (opts.classification) filters.classification = opts.classification as Classification;
      if (opts.owner) filters.owner = opts.owner as string;
      if (opts.status) filters.status = opts.status as AssetStatus;

      const assets = listAssets(db, filters);

      const output = formatTable(assets as unknown as Record<string, unknown>[], [
        { key: 'id', label: 'ID', format: (v) => shortId(v as string) },
        { key: 'name', label: 'Nom', width: 20 },
        { key: 'type', label: 'Type' },
        { key: 'classification', label: 'Classification', format: (v) => formatClassification(v as Classification | null) },
        { key: 'owner', label: 'Propriétaire', format: (v) => v ? String(v) : '—' },
        { key: 'status', label: 'Statut', format: (v) => formatStatus(v as AssetStatus) },
        { key: 'next_review_date', label: 'Prochaine révision', format: (v) => formatDate(v as string | null) },
      ]);

      process.stdout.write(output + '\n');
    });
}
