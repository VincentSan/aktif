import type { Command } from 'commander';
import { getDb, getConfig } from '../cli.js';
import { updateAsset } from '../db/queries/assets.js';
import { appendAuditLog } from '../db/queries/audit-log.js';
import { computeDiff } from '../utils/diff.js';
import { resolveUser } from '../utils/user.js';
import { ASSET_TYPES, CLASSIFICATIONS, ASSET_STATUSES } from '../types/asset.js';

export function registerAssetEdit(asset: Command): void {
  asset
    .command('edit <id>')
    .description('Modifier un actif')
    .option('-n, --name <n>', 'Nom')
    .option('-t, --type <t>', `Type (${ASSET_TYPES.join('|')})`)
    .option('-d, --description <d>', 'Description')
    .option('--location <l>', 'Localisation')
    .option('-o, --owner <o>', 'Propriétaire')
    .option('-c, --classification <c>', `Classification (${CLASSIFICATIONS.join('|')})`)
    .option('--access-restrictions <a>', "Restrictions d'accès")
    .option('-s, --status <s>', `Statut (${ASSET_STATUSES.join('|')})`)
    .option('--review-date <d>', 'Date de révision (YYYY-MM-DD)')
    .option('--next-review-date <d>', 'Prochaine révision (YYYY-MM-DD)')
    .option('--disposal-method <m>', 'Méthode de mise au rebut')
    .option('--tags <json>', 'Tags JSON')
    .option('--components <json>', 'Composants JSON')
    .option('--related-risks <json>', 'Risques liés JSON')
    .action((id, opts) => {
      // Validation
      if (opts.type && !ASSET_TYPES.includes(opts.type)) {
        process.stderr.write(`Erreur: type invalide "${opts.type}"\n`);
        process.exit(1);
      }
      if (opts.classification && !CLASSIFICATIONS.includes(opts.classification)) {
        process.stderr.write(`Erreur: classification invalide "${opts.classification}"\n`);
        process.exit(1);
      }
      if (opts.status && !ASSET_STATUSES.includes(opts.status)) {
        process.stderr.write(`Erreur: statut invalide "${opts.status}"\n`);
        process.exit(1);
      }

      const changes: Record<string, unknown> = {};
      if (opts.name !== undefined) changes.name = opts.name;
      if (opts.type !== undefined) changes.type = opts.type;
      if (opts.description !== undefined) changes.description = opts.description;
      if (opts.location !== undefined) changes.location = opts.location;
      if (opts.owner !== undefined) changes.owner = opts.owner;
      if (opts.classification !== undefined) changes.classification = opts.classification;
      if (opts.accessRestrictions !== undefined) changes.access_restrictions = opts.accessRestrictions;
      if (opts.status !== undefined) changes.status = opts.status;
      if (opts.reviewDate !== undefined) changes.review_date = opts.reviewDate;
      if (opts.nextReviewDate !== undefined) changes.next_review_date = opts.nextReviewDate;
      if (opts.disposalMethod !== undefined) changes.disposal_method = opts.disposalMethod;
      if (opts.tags !== undefined) {
        try { changes.tags = JSON.parse(opts.tags); } catch { /* ignore */ }
      }
      if (opts.components !== undefined) {
        try { changes.components = JSON.parse(opts.components); } catch { /* ignore */ }
      }
      if (opts.relatedRisks !== undefined) {
        try { changes.related_risks = JSON.parse(opts.relatedRisks); } catch { /* ignore */ }
      }

      if (Object.keys(changes).length === 0) {
        process.stderr.write('Erreur: aucun champ à modifier\n');
        process.exit(1);
      }

      const db = getDb();
      const config = getConfig();

      try {
        const { before, after } = updateAsset(db, id, changes as Parameters<typeof updateAsset>[2]);
        const diff = computeDiff(before, after);

        appendAuditLog(db, {
          asset_id: id,
          action: 'update',
          changed_by: resolveUser(config),
          diff,
        });

        process.stdout.write(`Actif ${id} modifié.\n`);
      } catch (err) {
        process.stderr.write(`Erreur: ${(err as Error).message}\n`);
        process.exit(1);
      }
    });
}
