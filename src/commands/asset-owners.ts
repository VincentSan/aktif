import type { Command } from 'commander';
import { getDb } from '../context.js';
import { getAssetsWithoutOwner } from '../db/queries/compliance.js';
import { formatTable, formatStatus, formatClassification, shortId } from '../utils/format.js';
import { formatDate } from '../utils/date.js';
import type { AssetStatus } from '../types/asset.js';
import type { Classification } from '../types/asset.js';

export function registerAssetOwners(asset: Command): void {
  asset
    .command('owners')
    .description('Lister les actifs sans propriétaire (non conformes ISO 27001 A.5.9)')
    .action(() => {
      const db = getDb();
      const unownedAssets = getAssetsWithoutOwner(db);

      if (unownedAssets.length === 0) {
        process.stdout.write('✓ Tous les actifs ont un propriétaire assigné.\n');
        process.exit(0);
      }

      const output = formatTable(unownedAssets as unknown as Record<string, unknown>[], [
        { key: 'id', label: 'ID', format: (v) => shortId(v as string) },
        { key: 'name', label: 'Nom', width: 20 },
        { key: 'type', label: 'Type' },
        { key: 'classification', label: 'Classification', format: (v) => formatClassification(v as Classification | null) },
        { key: 'status', label: 'Statut', format: (v) => formatStatus(v as AssetStatus) },
        { key: 'next_review_date', label: 'Prochaine révision', format: (v) => formatDate(v as string | null) },
      ]);

      process.stdout.write(output + '\n');
      process.exit(1);
    });
}
