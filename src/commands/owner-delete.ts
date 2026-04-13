import type { Command } from 'commander';
import * as readline from 'readline';
import { getDb } from '../context.js';
import {
  deleteOwner,
  getOwnerById,
  getAssetsByOwnerId,
  reassignAssets,
  clearOwnerOnAssets,
  deleteAssetsByOwnerId,
} from '../db/queries/owners.js';
import { t } from '../i18n.js';

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

export function registerOwnerDelete(parent: Command): void {
  parent
    .command('delete <id>')
    .description('Supprimer un propriétaire')
    .option('--reassign <owner-id>', 'Réassigner les actifs liés à un autre owner')
    .option('--clear', 'Mettre owner à null sur les actifs liés')
    .option('--force', 'Supprimer sans confirmation même si des actifs sont liés')
    .action(async (id, opts) => {
      const db = getDb();

      const owner = getOwnerById(db, id);
      if (!owner) {
        process.stderr.write(`${t('err_owner_not_found')}${id}${t('err_owner_not_found_end')}\n`);
        process.exit(1);
      }

      const linkedAssets = getAssetsByOwnerId(db, id);

      if (linkedAssets.length > 0) {
        if (opts.reassign) {
          const targetOwner = getOwnerById(db, opts.reassign);
          if (!targetOwner) {
            process.stderr.write(`${t('err_owner_dest_not_found')}${opts.reassign}${t('err_owner_not_found_end')}\n`);
            process.exit(1);
          }
          reassignAssets(db, id, opts.reassign);
          process.stdout.write(`${linkedAssets.length}${t('owner_assets_reassigned')}${targetOwner.name}${t('owner_assets_reassigned_end')}\n`);
        } else if (opts.clear) {
          clearOwnerOnAssets(db, id);
          process.stdout.write(`${linkedAssets.length}${t('owner_assets_cleared')}\n`);
        } else if (opts.force) {
          deleteAssetsByOwnerId(db, id);
          process.stdout.write(`${linkedAssets.length}${t('owner_assets_deleted')}\n`);
        } else {
          const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          try {
            const answer = await ask(
              rl,
              `${t('owner_delete_menu')}${owner.name}${t('owner_delete_menu_mid')}${linkedAssets.length}${t('owner_delete_menu_linked')}`,
            );

            if (answer.trim() === '1') {
              deleteAssetsByOwnerId(db, id);
              process.stdout.write(`${linkedAssets.length}${t('owner_assets_deleted')}\n`);
            } else if (answer.trim() === '2') {
              const newOwnerId = await ask(rl, t('owner_reassign_prompt'));
              const targetOwner = getOwnerById(db, newOwnerId.trim());
              if (!targetOwner) {
                process.stderr.write(`${t('err_owner_not_found')}${newOwnerId.trim()}${t('err_owner_not_found_end')}\n`);
                process.exit(1);
              }
              reassignAssets(db, id, newOwnerId.trim());
              process.stdout.write(`${linkedAssets.length}${t('owner_assets_reassigned')}${targetOwner.name}${t('owner_assets_reassigned_end')}\n`);
            } else if (answer.trim() === '3') {
              clearOwnerOnAssets(db, id);
              process.stdout.write(`${linkedAssets.length}${t('owner_assets_cleared')}\n`);
            } else {
              process.stdout.write(`${t('owner_delete_cancelled')}\n`);
              process.exit(0);
            }
          } finally {
            rl.close();
          }
        }
      }

      deleteOwner(db, id);
      process.stdout.write(`${t('owner_deleted')}${owner.name}${t('owner_deleted_end')}\n`);
    });
}
