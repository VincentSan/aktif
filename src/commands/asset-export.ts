import { writeFileSync } from 'fs';
import type { Command } from 'commander';
import { getDb } from '../context.js';
import { listAssets } from '../db/queries/assets.js';
import { exportToCsv } from '../export/csv.js';
import { exportToJson } from '../export/json.js';
import { exportToHtml } from '../export/html.js';
import { exportToPdf } from '../export/pdf.js';
import { getComplianceReport } from '../db/queries/compliance.js';
import { getChangelog } from '../db/queries/audit-log.js';
import type { AssetFilters } from '../types/filters.js';
import { ASSET_TYPES, CLASSIFICATIONS, ASSET_STATUSES } from '../types/asset.js';
import type { AssetType, Classification, AssetStatus } from '../types/asset.js';
import { t } from '../i18n.js';

export function registerAssetExport(asset: Command): void {
  asset
    .command('export')
    .description('Exporter les actifs au format CSV, JSON ou PDF')
    .option('--format <fmt>', 'Format d\'export : csv | json | pdf | html', 'json')
    .option('--output <path>', 'Chemin du fichier de sortie (stdout si absent, obligatoire pour pdf)')
    .option('--type <t>', `Filtrer par type (${ASSET_TYPES.join('|')})`)
    .option('--status <s>', `Filtrer par statut (${ASSET_STATUSES.join('|')})`)
    .option('--owner <o>', 'Filtrer par propriétaire')
    .option('--classification <c>', `Filtrer par classification (${CLASSIFICATIONS.join('|')})`)
    .action(async (opts: {
      format: string;
      output?: string;
      type?: string;
      status?: string;
      owner?: string;
      classification?: string;
    }) => {
      const format = opts.format.toLowerCase();

      if (format !== 'csv' && format !== 'json' && format !== 'pdf' && format !== 'html') {
        process.stderr.write(`${t('err_format_invalid')}${opts.format}${t('err_format_invalid_end')}\n`);
        process.exit(1);
      }

      if ((format === 'pdf' || format === 'html') && !opts.output) {
        process.stderr.write(`${t('err_output_required')}${format.toUpperCase()}${t('err_output_required_end')}\n`);
        process.exit(1);
      }

      const db = getDb();
      const filters: AssetFilters = {};
      if (opts.type) filters.type = opts.type as AssetType;
      if (opts.classification) filters.classification = opts.classification as Classification;
      if (opts.owner) filters.owner = opts.owner;
      if (opts.status) filters.status = opts.status as AssetStatus;

      const assets = listAssets(db, filters);

      if (format === 'pdf') {
        const report = getComplianceReport(db);
        const auditEntries = getChangelog(db, { limit: 20 });
        const bytes = await exportToPdf(assets, report, auditEntries);
        writeFileSync(opts.output!, Buffer.from(bytes));
        process.stdout.write(`${t('export_pdf_done')}${opts.output}\n`);
        return;
      }

      if (format === 'html') {
        const htmlContent = exportToHtml(assets);
        writeFileSync(opts.output!, htmlContent, 'utf-8');
        process.stdout.write(`${t('export_html_done')}${opts.output}\n`);
        return;
      }

      const content = format === 'csv' ? exportToCsv(assets) : exportToJson(assets);

      if (opts.output) {
        writeFileSync(opts.output, content, 'utf-8');
        process.stdout.write(`${t('export_done')}${format.toUpperCase()}${t('export_done_end')}${opts.output}\n`);
      } else {
        process.stdout.write(content);
      }
    });
}
