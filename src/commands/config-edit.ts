import { spawnSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import type { Command } from 'commander';
import { RC_PATH } from './asset-config.js';

const RC_TEMPLATE =
  JSON.stringify(
    {
      defaultReviewPeriodDays: 365,
      db: '~/.aktif/aktif.db',
      user: 'votre-nom',
    },
    null,
    2,
  ) + '\n';

export function registerConfigEdit(parent: Command): void {
  parent
    .command('edit')
    .description("Ouvrir ~/.aktifrc dans l'éditeur système")
    .action(() => {
      if (!existsSync(RC_PATH)) {
        writeFileSync(RC_PATH, RC_TEMPLATE, 'utf8');
        process.stdout.write(`Fichier ${RC_PATH} créé avec le template par défaut.\n`);
      }

      const editor = process.env.EDITOR ?? process.env.VISUAL ?? 'vi';
      const result = spawnSync(editor, [RC_PATH], { stdio: 'inherit' });

      if (result.error) {
        process.stderr.write(
          `Erreur: impossible d'ouvrir l'éditeur "${editor}": ${result.error.message}\n`,
        );
        process.exit(1);
      }
    });
}
