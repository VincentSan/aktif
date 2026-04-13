import type { Command } from 'commander';
import { getDb } from '../context.js';
import { getTagByName, deleteTag, removeTagFromAssets } from '../db/queries/tags.js';
import { t } from '../i18n.js';

export function registerTagDelete(parent: Command): void {
  parent
    .command('delete <name>')
    .description('Supprimer un tag')
    .action((name: string) => {
      const db = getDb();

      const existing = getTagByName(db, name);
      if (!existing) {
        process.stderr.write(`${t('err_tag_not_found')}${name}${t('err_tag_not_found_end')}\n`);
        process.exit(1);
      }

      const count = removeTagFromAssets(db, existing.name);
      deleteTag(db, existing.id);
      process.stdout.write(`${t('tag_deleted')}${existing.name}${t('tag_deleted_end')}\n`);
      if (count > 0) process.stdout.write(`${count}${t('tag_assets_updated')}\n`);
    });
}
