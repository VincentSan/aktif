import type { Command } from 'commander';
import { createInterface } from 'readline';
import { getDb, getConfig } from '../cli.js';
import { getAssetById, deleteAsset } from '../db/queries/assets.js';
import { appendAuditLog } from '../db/queries/audit-log.js';
import { resolveUser } from '../utils/user.js';
import { t } from '../i18n.js';

export function registerAssetDelete(asset: Command): void {
  asset
    .command('delete <id>')
    .description('Supprimer un actif')
    .option('--yes', 'Confirmer sans prompt interactif')
    .action(async (id, opts) => {
      const db = getDb();
      const config = getConfig();

      const found = getAssetById(db, id);
      if (!found) {
        process.stderr.write(`${t('err_asset_not_found')}${id}${t('err_asset_not_found_end')}\n`);
        process.exit(1);
      }

      if (!opts.yes) {
        const confirmed = await confirm(`${t('delete_confirm_prompt')}${found.name}" (${id})${t('delete_confirm_prompt_end')}`);
        if (!confirmed) {
          process.stdout.write(`${t('delete_cancelled')}\n`);
          return;
        }
      }

      // Écrire le log AVANT la suppression (l'actif n'existera plus après)
      appendAuditLog(db, {
        asset_id: id,
        action: 'delete',
        changed_by: resolveUser(config),
      });

      deleteAsset(db, id);
      process.stdout.write(`${t('asset_deleted')}${id}${t('asset_deleted_end')}\n`);
    });
}

function confirm(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes' || answer === 'o');
    });
  });
}
