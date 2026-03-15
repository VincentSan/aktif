import type { Command } from 'commander';
import { getDb } from '../context.js';
import { insertOwner } from '../db/queries/owners.js';

export function registerOwnerAdd(owner: Command): void {
  owner
    .command('add')
    .description('Ajouter un propriétaire')
    .requiredOption('--name <n>', 'Nom du propriétaire')
    .option('--email <e>', 'Adresse e-mail')
    .option('--department <d>', 'Département')
    .action((opts) => {
      const db = getDb();
      const created = insertOwner(db, {
        name: opts.name,
        email: opts.email ?? null,
        department: opts.department ?? null,
      });
      process.stdout.write(`${created.id}\n`);
    });
}
