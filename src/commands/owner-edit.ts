import type { Command } from 'commander';
import { getDb } from '../cli.js';
import { updateOwner, resolveOwner } from '../db/queries/owners.js';
import { t } from '../i18n.js';

export function registerOwnerEdit(owner: Command): void {
  owner
    .command('edit <id>')
    .description('Modifier un propriétaire (par UUID ou préfixe)')
    .option('--name <n>', 'Nouveau nom')
    .option('--email <e>', 'Nouvel e-mail')
    .option('--department <d>', 'Nouveau département')
    .action((id, opts) => {
      if (!opts.name && !opts.email && !opts.department) {
        process.stderr.write(`${t('err_owner_edit_required')}\n`);
        process.exit(1);
      }

      const db = getDb();

      // Résoudre l'owner par UUID ou préfixe
      let ownerId = id;
      try {
        const resolved = resolveOwner(db, id);
        if (!resolved) {
          process.stderr.write(`${t('err_owner_id_not_found')}${id}${t('err_owner_id_not_found_end')}\n`);
          process.exit(1);
        }
        ownerId = resolved.id;
      } catch (err) {
        process.stderr.write(`${t('err_generic')}${(err as Error).message}\n`);
        process.exit(1);
      }

      const changes: { name?: string; email?: string; department?: string } = {};
      if (opts.name !== undefined) changes.name = opts.name;
      if (opts.email !== undefined) changes.email = opts.email;
      if (opts.department !== undefined) changes.department = opts.department;

      const updated = updateOwner(db, ownerId, changes);
      if (!updated) {
        process.stderr.write(`${t('err_owner_id_not_found')}${ownerId}${t('err_owner_id_not_found_end')}\n`);
        process.exit(1);
      }

      process.stdout.write(`${t('owner_updated')}${updated.id}${t('owner_updated_end')}\n`);
    });
}
