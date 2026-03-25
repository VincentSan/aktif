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
        process.stderr.write(`Erreur: owner "${id}" introuvable\n`);
        process.exit(1);
      }

      const linkedAssets = getAssetsByOwnerId(db, id);

      if (linkedAssets.length > 0) {
        if (opts.reassign) {
          const targetOwner = getOwnerById(db, opts.reassign);
          if (!targetOwner) {
            process.stderr.write(`Erreur: owner de destination "${opts.reassign}" introuvable\n`);
            process.exit(1);
          }
          reassignAssets(db, id, opts.reassign);
          process.stdout.write(`${linkedAssets.length} actif(s) réassigné(s) à "${targetOwner.name}".\n`);
        } else if (opts.clear) {
          clearOwnerOnAssets(db, id);
          process.stdout.write(`${linkedAssets.length} actif(s) mis à jour (owner = null).\n`);
        } else if (opts.force) {
          deleteAssetsByOwnerId(db, id);
          process.stdout.write(`${linkedAssets.length} actif(s) supprimé(s).\n`);
        } else {
          const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          try {
            const answer = await ask(
              rl,
              `L'owner "${owner.name}" a ${linkedAssets.length} actif(s) lié(s).\n` +
              `Choisissez une action :\n` +
              `  [1] Supprimer tous les actifs liés\n` +
              `  [2] Réassigner à un autre owner\n` +
              `  [3] Mettre owner à null sur les actifs\n` +
              `  [q] Annuler\n` +
              `> `,
            );

            if (answer.trim() === '1') {
              deleteAssetsByOwnerId(db, id);
              process.stdout.write(`${linkedAssets.length} actif(s) supprimé(s).\n`);
            } else if (answer.trim() === '2') {
              const newOwnerId = await ask(rl, 'ID du nouvel owner : ');
              const targetOwner = getOwnerById(db, newOwnerId.trim());
              if (!targetOwner) {
                process.stderr.write(`Erreur: owner "${newOwnerId.trim()}" introuvable\n`);
                process.exit(1);
              }
              reassignAssets(db, id, newOwnerId.trim());
              process.stdout.write(`${linkedAssets.length} actif(s) réassigné(s) à "${targetOwner.name}".\n`);
            } else if (answer.trim() === '3') {
              clearOwnerOnAssets(db, id);
              process.stdout.write(`${linkedAssets.length} actif(s) mis à jour (owner = null).\n`);
            } else {
              process.stdout.write('Annulé.\n');
              process.exit(0);
            }
          } finally {
            rl.close();
          }
        }
      }

      deleteOwner(db, id);
      process.stdout.write(`Owner "${owner.name}" supprimé.\n`);
    });
}
