import type { Command } from 'commander';
import { getDb } from '../context.js';
import { insertTag, getTagByName } from '../db/queries/tags.js';
import { t } from '../i18n.js';

export function registerTagNew(parent: Command): void {
  parent
    .command('new <name>')
    .description('Créer un tag')
    .action((name: string) => {
      const db = getDb();
      const existing = getTagByName(db, name);
      if (existing) {
        process.stderr.write(`${t('err_tag_already_exists')}${existing.name}${t('err_tag_already_exists_end')}\n`);
        process.exit(1);
      }
      const created = insertTag(db, name);
      process.stdout.write(`${created.id}\n`);
    });
}
