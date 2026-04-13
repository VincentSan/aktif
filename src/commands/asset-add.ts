import type { Command } from 'commander';
import { getDb, getConfig } from '../cli.js';
import { insertAsset } from '../db/queries/assets.js';
import { resolveOwnerCli } from '../db/queries/owners.js';
import { appendAuditLog } from '../db/queries/audit-log.js';
import { ASSET_TYPES, ASSET_STATUSES, CLASSIFICATIONS } from '../types/asset.js';
import { addDays, today } from '../utils/date.js';
import { resolveUser } from '../utils/user.js';
import { t } from '../i18n.js';

export function registerAssetAdd(asset: Command): void {
  asset
    .command('add')
    .description('Ajouter un nouvel actif')
    .requiredOption('-n, --name <n>', "Nom de l'actif")
    .requiredOption('-t, --type <t>', `Type (${ASSET_TYPES.join('|')})`)
    .option('-d, --description <d>', 'Description')
    .option('--location <l>', 'Localisation')
    .option('-o, --owner <o>', 'Propriétaire')
    .option('-c, --classification <c>', `Classification (${CLASSIFICATIONS.join('|')})`)
    .option('-s, --status <s>', `Statut (${ASSET_STATUSES.join('|')})`, 'actif')
    .option('--entry-date <d>', "Date d'entrée (YYYY-MM-DD)")
    .option('--disposal-method <m>', 'Méthode de mise au rebut')
    .option('--tags <json>', 'Tags JSON (ex: ["tag1","tag2"])', '[]')
    .action((opts) => {
      // Validation du type
      if (!ASSET_TYPES.includes(opts.type)) {
        process.stderr.write(
          `${t('err_type_invalid')}${opts.type}${t('err_type_invalid_end')}${ASSET_TYPES.join(', ')}\n`,
        );
        process.exit(1);
      }
      // Validation de la classification
      if (opts.classification && !CLASSIFICATIONS.includes(opts.classification)) {
        process.stderr.write(
          `${t('err_classification_invalid')}${opts.classification}${t('err_classification_invalid_end')}${CLASSIFICATIONS.join(', ')}\n`,
        );
        process.exit(1);
      }
      // Validation du statut
      if (opts.status && !ASSET_STATUSES.includes(opts.status)) {
        process.stderr.write(
          `${t('err_status_invalid')}${opts.status}${t('err_status_invalid_end')}${ASSET_STATUSES.join('|')}\n`,
        );
        process.exit(1);
      }

      // Parsing JSON
      let tags: string[] = [];
      try {
        tags = JSON.parse(opts.tags);
      } catch {
        /* ignore */
      }

      const config = getConfig();
      const db = getDb();

      const { name: ownerName, id: ownerId } = opts.owner
        ? resolveOwnerCli(db, opts.owner)
        : { name: null, id: null };

      const entryDate = opts.entryDate ?? today();
      const nextReviewDate = addDays(entryDate, config.defaultReviewPeriodDays);

      const newAsset = insertAsset(db, {
        name: opts.name,
        type: opts.type,
        description: opts.description ?? null,
        location: opts.location ?? null,
        owner: ownerName,
        owner_id: ownerId,
        classification: opts.classification ?? null,
        status: opts.status ?? 'actif',
        entry_date: entryDate,
        review_date: null,
        next_review_date: nextReviewDate,
        disposal_method: opts.disposalMethod ?? null,
        tags,
      });

      appendAuditLog(db, {
        asset_id: newAsset.id,
        action: 'create',
        changed_by: resolveUser(config),
        diff: {},
      });

      process.stdout.write(`${newAsset.id}\n`);
    });
}
