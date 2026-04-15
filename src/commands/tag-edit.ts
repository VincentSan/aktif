import type { Command } from 'commander';
import { getDb } from '../context.js';
import { getTagByName, updateTag } from '../db/queries/tags.js';
import { t } from '../i18n.js';

export function registerTagEdit(parent: Command): void {
  parent
    .command('edit <old_name> <new_name>')
    .description('Renommer un tag')
    .action((oldName: string, newName: string) => {
      const db = getDb();

      const existing = getTagByName(db, oldName);
      if (!existing) {
        process.stderr.write(`${t('err_tag_not_found')}${oldName}${t('err_tag_not_found_end')}\n`);
        process.exit(1);
      }

      const conflict = getTagByName(db, newName);
      if (conflict) {
        process.stderr.write(`${t('err_tag_already_exists')}${conflict.name}${t('err_tag_already_exists_end')}\n`);
        process.exit(1);
      }

      const updated = updateTag(db, existing.id, newName);
      if (!updated) {
        process.stderr.write(`${t('err_tag_update_failed')}\n`);
        process.exit(1);
      }

      process.stdout.write(`${t('tag_updated')}${existing.name}${t('tag_updated_mid')}${updated.name}${t('tag_updated_end')}\n`);
    });
}
