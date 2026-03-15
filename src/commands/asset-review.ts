import type { Command } from 'commander';
import { getDb } from '../context.js';
import { getOverdueAssets } from '../db/queries/compliance.js';
import { formatTable, formatStatus, formatClassification, shortId } from '../utils/format.js';
import { formatDate } from '../utils/date.js';
import type { AssetStatus } from '../types/asset.js';
import type { Classification } from '../types/asset.js';

export function registerAssetReview(asset: Command): void {
  asset
    .command('review')
    .description('Lister les actifs en retard de révision (non conformes ISO 27001 A.5.9)')
    .action(() => {
      const db = getDb();
      const overdueAssets = getOverdueAssets(db);

      if (overdueAssets.length === 0) {
        process.stdout.write('✓ Tous les actifs sont à jour de révision.\n');
        process.exit(0);
      }

      const output = formatTable(overdueAssets as unknown as Record<string, unknown>[], [
        { key: 'id', label: 'ID', format: (v) => shortId(v as string) },
        { key: 'name', label: 'Nom', width: 20 },
        { key: 'type', label: 'Type' },
        { key: 'classification', label: 'Classification', format: (v) => formatClassification(v as Classification | null) },
        { key: 'owner', label: 'Propriétaire', format: (v) => v ? String(v) : '—' },
        { key: 'status', label: 'Statut', format: (v) => formatStatus(v as AssetStatus) },
        { key: 'next_review_date', label: 'Prochaine révision', format: (v) => formatDate(v as string | null) },
      ]);

      process.stdout.write(output + '\n');
      process.exit(1);
    });
}
