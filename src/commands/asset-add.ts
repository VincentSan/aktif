import type { Command } from 'commander';
import { getDb, getConfig } from '../cli.js';
import { insertAsset } from '../db/queries/assets.js';
import { resolveOwnerCli } from '../db/queries/owners.js';
import { appendAuditLog } from '../db/queries/audit-log.js';
import { ASSET_TYPES, ASSET_STATUSES, CLASSIFICATIONS } from '../types/asset.js';
import { addDays, today } from '../utils/date.js';
import { resolveUser } from '../utils/user.js';

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
    .option('--access-restrictions <a>', "Restrictions d'accès")
    .option('-s, --status <s>', `Statut (${ASSET_STATUSES.join('|')})`, 'actif')
    .option('--entry-date <d>', "Date d'entrée (YYYY-MM-DD)")
    .option('--review-date <d>', 'Date de révision (YYYY-MM-DD)')
    .option('--next-review-date <d>', 'Prochaine révision (YYYY-MM-DD)')
    .option('--disposal-method <m>', 'Méthode de mise au rebut')
    .option('--tags <json>', 'Tags JSON (ex: ["tag1","tag2"])', '[]')
    .option('--components <json>', 'Composants JSON', '[]')
    .option('--related-risks <json>', 'Risques liés JSON', '[]')
    .action((opts) => {
      // Validation du type
      if (!ASSET_TYPES.includes(opts.type)) {
        process.stderr.write(
          `Erreur: type invalide "${opts.type}". Valeurs acceptées: ${ASSET_TYPES.join(', ')}\n`,
        );
        process.exit(1);
      }
      // Validation de la classification
      if (opts.classification && !CLASSIFICATIONS.includes(opts.classification)) {
        process.stderr.write(
          `Erreur: classification invalide "${opts.classification}". Valeurs acceptées: ${CLASSIFICATIONS.join(', ')}\n`,
        );
        process.exit(1);
      }
      // Validation du statut
      if (opts.status && !ASSET_STATUSES.includes(opts.status)) {
        process.stderr.write(
          `Erreur: statut invalide "${opts.status}". Valeurs acceptées: ${ASSET_STATUSES.join('|')}\n`,
        );
        process.exit(1);
      }

      // Parsing JSON
      let tags: string[] = [];
      let components: Array<{ name: string; version?: string }> = [];
      let relatedRisks: string[] = [];
      try {
        tags = JSON.parse(opts.tags);
      } catch {
        /* ignore */
      }
      try {
        components = JSON.parse(opts.components);
      } catch {
        /* ignore */
      }
      try {
        relatedRisks = JSON.parse(opts.relatedRisks ?? '[]');
      } catch {
        /* ignore */
      }

      const config = getConfig();
      const db = getDb();

      const { name: ownerName, id: ownerId } = opts.owner
        ? resolveOwnerCli(db, opts.owner)
        : { name: null, id: null };

      // Calculer next_review_date si non fourni
      const entryDate = opts.entryDate ?? today();
      const nextReviewDate = opts.nextReviewDate ?? addDays(entryDate, config.defaultReviewPeriodDays);

      const newAsset = insertAsset(db, {
        name: opts.name,
        type: opts.type,
        description: opts.description ?? null,
        location: opts.location ?? null,
        owner: ownerName,
        owner_id: ownerId,
        classification: opts.classification ?? null,
        access_restrictions: opts.accessRestrictions ?? null,
        status: opts.status ?? 'actif',
        entry_date: entryDate,
        review_date: opts.reviewDate ?? null,
        next_review_date: nextReviewDate,
        disposal_method: opts.disposalMethod ?? null,
        tags,
        components,
        related_risks: relatedRisks,
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
