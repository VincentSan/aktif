import type { Command } from 'commander';
import { getDb } from '../context.js';
import { listTags } from '../db/queries/tags.js';
import { formatTable, shortId, GRAY, RESET } from '../utils/format.js';
import { t } from '../i18n.js';

export function registerTagList(parent: Command): void {
  parent
    .command('list')
    .description('Lister les tags')
    .action(() => {
      const db = getDb();
      const rows = listTags(db);

      if (rows.length === 0) {
        process.stdout.write(`${GRAY}${t('no_tags')}${RESET}\n`);
        return;
      }

      const output = formatTable(rows as unknown as Record<string, unknown>[], [
        { key: 'id', label: t('col_id'), format: (v) => shortId(v as string) },
        { key: 'name', label: t('col_name'), width: 30 },
        { key: 'created_at', label: t('col_date'), width: 20 },
      ]);

      process.stdout.write(output + '\n');
    });
}
