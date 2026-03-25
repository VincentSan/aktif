import { Command } from 'commander';
import { resolveConfig } from './config.js';
import { VERSION } from './version.js';
import { createConnection } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import { setContext } from './context.js';
import { registerAssetAdd } from './commands/asset-add.js';
import { registerAssetList } from './commands/asset-list.js';
import { registerAssetShow } from './commands/asset-show.js';
import { registerAssetHistory } from './commands/asset-history.js';
import { registerAssetChangelog } from './commands/asset-changelog.js';
import { registerAssetEdit } from './commands/asset-edit.js';
import { registerAssetRetire } from './commands/asset-retire.js';
import { registerAssetDelete } from './commands/asset-delete.js';
import { registerAssetReview } from './commands/asset-review.js';
import { registerAssetOwners } from './commands/asset-owners.js';
import { registerAssetUnclassified } from './commands/asset-unclassified.js';
import { registerAssetExport } from './commands/asset-export.js';
import { registerAssetImport } from './commands/asset-import.js';
import { registerAssetReport } from './commands/asset-report.js';
import { registerAssetConfig } from './commands/asset-config.js';
import { registerOwnerAdd } from './commands/owner-add.js';
import { registerOwnerList } from './commands/owner-list.js';
import { registerOwnerDelete } from './commands/owner-delete.js';
import { registerConfigEdit } from './commands/config-edit.js';

export const program = new Command();

program
  .name('aktif')
  .description("Inventaire d'actifs ISO 27001 A.5.9")
  .version(VERSION)
  .option('--db <path>', 'Chemin vers le fichier SQLite');

program.hook('preAction', () => {
  const opts = program.opts<{ db?: string }>();
  const config = resolveConfig({ db: opts.db });
  const { db, sqlite } = createConnection(config.db);
  runMigrations(sqlite);
  setContext(db, config);
});

const asset = program.command('asset').description('Gestion des actifs');
registerAssetAdd(asset);
registerAssetList(asset);
registerAssetShow(asset);
registerAssetHistory(asset);
registerAssetChangelog(asset);
registerAssetEdit(asset);
registerAssetRetire(asset);
registerAssetDelete(asset);
registerAssetReview(asset);
registerAssetOwners(asset);
registerAssetUnclassified(asset);
registerAssetExport(asset);
registerAssetImport(asset);
registerAssetReport(asset);
registerAssetConfig(asset);

export { asset };

program
  .command('tui')
  .description("Lancer l'interface interactive (TUI)")
  .action(async () => {
    const { render } = await import('ink');
    const React = await import('react');
    const { App } = await import('./components/App.js');
    render(React.default.createElement(App, null));
  });

const owner = program.command('owner').description('Gestion des propriétaires');
registerOwnerAdd(owner);
registerOwnerList(owner);
registerOwnerDelete(owner);
export { owner };

const config = program.command('config').description('Configuration de aktif');
registerConfigEdit(config);
export { config };

export { getDb, getConfig } from './context.js';

process.on('uncaughtException', (err) => {
  process.stderr.write(`Erreur: ${err.message}\n`);
  process.exit(1);
});

program.parseAsync(process.argv).catch((err: Error) => {
  process.stderr.write(`Erreur: ${err.message}\n`);
  process.exit(1);
});
