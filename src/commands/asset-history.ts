import type { Command } from 'commander';
import { getDb } from '../cli.js';
import { getHistory } from '../db/queries/audit-log.js';
import { formatTable, formatDiff } from '../utils/format.js';
import { formatDate } from '../utils/date.js';

export function registerAssetHistory(asset: Command): void {
  asset
    .command('history <id>')
    .description("Afficher l'historique d'un actif")
    .action((id) => {
      const db = getDb();
      const entries = getHistory(db, id);

      if (entries.length === 0) {
        process.stdout.write('Aucun historique pour cet actif.\n');
        return;
      }

      const output = formatTable(
        entries.map((e) => ({
          ...e,
          _diff_display: formatDiff(e.diff),
        })),
        [
          { key: 'changed_at', label: 'Date', format: (v) => formatDate(v as string) },
          { key: 'changed_by', label: 'Auteur' },
          { key: 'action', label: 'Action' },
          { key: '_diff_display', label: 'Modifications' },
        ]
      );
      process.stdout.write(output + '\n');
    });
}
