import type { Command } from 'commander';
import { getDb } from '../context.js';
import { listOwners } from '../db/queries/owners.js';
import { formatTable, shortId, GRAY, RESET } from '../utils/format.js';

export function registerOwnerList(owner: Command): void {
  owner
    .command('list')
    .description('Lister les propriétaires')
    .action(() => {
      const db = getDb();
      const rows = listOwners(db);

      if (rows.length === 0) {
        process.stdout.write(`${GRAY}Aucun propriétaire enregistré.${RESET}\n`);
        return;
      }

      const output = formatTable(rows as unknown as Record<string, unknown>[], [
        { key: 'id', label: 'ID', format: (v) => shortId(v as string) },
        { key: 'name', label: 'Nom', width: 20 },
        { key: 'email', label: 'E-mail', width: 25, format: (v) => (v ? String(v) : '—') },
        { key: 'department', label: 'Département', width: 15, format: (v) => (v ? String(v) : '—') },
      ]);

      process.stdout.write(output + '\n');
    });
}
