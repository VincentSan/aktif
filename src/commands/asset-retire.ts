import type { Command } from 'commander';
import { getDb, getConfig } from '../cli.js';
import { retireAsset } from '../db/queries/assets.js';
import { appendAuditLog } from '../db/queries/audit-log.js';
import { resolveUser } from '../utils/user.js';

export function registerAssetRetire(asset: Command): void {
  asset
    .command('retire <id>')
    .description('Mettre un actif en cours de mise au rebut')
    .action((id) => {
      const db = getDb();
      const config = getConfig();

      try {
        const { after } = retireAsset(db, id);
        appendAuditLog(db, {
          asset_id: id,
          action: 'retire',
          changed_by: resolveUser(config),
        });
        process.stdout.write(`Actif ${id} retiré (statut: ${after.status}).\n`);
      } catch (err) {
        process.stderr.write(`Erreur: ${(err as Error).message}\n`);
        process.exit(1);
      }
    });
}
