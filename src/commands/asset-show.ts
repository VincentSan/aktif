import type { Command } from 'commander';
import { getDb } from '../cli.js';
import { getAssetById } from '../db/queries/assets.js';
import { formatAsset } from '../utils/format.js';
import { t } from '../i18n.js';

export function registerAssetShow(asset: Command): void {
  asset
    .command('show <id>')
    .description("Afficher le détail d'un actif")
    .action((id) => {
      const db = getDb();
      const found = getAssetById(db, id);
      if (!found) {
        process.stderr.write(`${t('err_asset_not_found')}${id}${t('err_asset_not_found_end')}\n`);
        process.exit(1);
      }
      process.stdout.write(formatAsset(found as unknown as Record<string, unknown>) + '\n');
    });
}
