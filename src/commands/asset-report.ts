import type { Command } from 'commander';
import { getDb } from '../context.js';
import { getComplianceReport } from '../db/queries/compliance.js';
import { RESET, BOLD, RED, GREEN, YELLOW, CYAN, GRAY, MAGENTA } from '../utils/format.js';

const BAR_WIDTH = 30;

function progressBar(rate: number): string {
  const filled = Math.round((rate / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}]`;
}

function rateColor(rate: number): string {
  if (rate >= 80) return GREEN;
  if (rate >= 50) return YELLOW;
  return RED;
}

function metricLine(label: string, rate: number, count: number, total: number): string {
  const bar = progressBar(rate);
  const color = rateColor(rate);
  const rateStr = `${rate}%`.padStart(4);
  const countStr = `${count}/${total}`;
  return (
    `  ${BOLD}${CYAN}${label.padEnd(22)}${RESET} ` +
    `${color}${bar} ${rateStr}${RESET}  ` +
    `${GRAY}${countStr}${RESET}`
  );
}

export function registerAssetReport(asset: Command): void {
  asset
    .command('report')
    .description('Afficher le rapport de conformité ISO 27001 A.5.9')
    .option('--fail-below <n>', 'Quitter avec exit 1 si le taux global est inférieur à N', parseInt)
    .action((opts: { failBelow?: number }) => {
      const db = getDb();
      const report = getComplianceReport(db);

      const now = new Date().toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      const lines: string[] = [];

      // Titre
      lines.push('');
      lines.push(`${BOLD}${CYAN}╔══════════════════════════════════════════════╗${RESET}`);
      lines.push(`${BOLD}${CYAN}║   Rapport de conformité ISO 27001 A.5.9      ║${RESET}`);
      lines.push(`${BOLD}${CYAN}╚══════════════════════════════════════════════╝${RESET}`);
      lines.push('');

      // Métadonnées
      lines.push(`  ${GRAY}Généré le :${RESET} ${now}`);
      lines.push(`  ${GRAY}Actifs actifs :${RESET} ${BOLD}${report.totalActive}${RESET}`);
      lines.push('');

      // Métriques
      lines.push(`${BOLD}Couverture par métrique${RESET}`);
      lines.push(`  ${'─'.repeat(60)}`);
      lines.push(metricLine('Propriétaire (owner)', report.ownerCoverageRate, report.withOwner, report.totalActive));
      lines.push(metricLine('Classification', report.classificationCoverageRate, report.withClassification, report.totalActive));
      lines.push(metricLine('Révision à jour', report.reviewCoverageRate, report.reviewUpToDate, report.totalActive));
      lines.push('');

      // Taux global
      const globalColor = rateColor(report.globalComplianceRate);
      const globalBar = progressBar(report.globalComplianceRate);
      lines.push(`${BOLD}Taux de conformité global${RESET}`);
      lines.push(`  ${'─'.repeat(60)}`);
      lines.push(
        `  ${BOLD}${globalColor}${globalBar} ${report.globalComplianceRate}%${RESET}` +
        `  ${GRAY}(moyenne owner + classification + révision)${RESET}`
      );
      lines.push('');

      // Alertes
      const hasAlerts = report.overdueAssets > 0 || report.unownedAssets > 0 || report.unclassifiedAssets > 0;
      lines.push(`${BOLD}${MAGENTA}Alertes${RESET}`);
      lines.push(`  ${'─'.repeat(60)}`);

      if (!hasAlerts) {
        lines.push(`  ${GREEN}Aucune alerte — inventaire conforme.${RESET}`);
      } else {
        if (report.overdueAssets > 0) {
          lines.push(`  ${RED}⚠  ${report.overdueAssets} actif(s) en retard de révision${RESET}`);
        }
        if (report.unownedAssets > 0) {
          lines.push(`  ${YELLOW}⚠  ${report.unownedAssets} actif(s) sans propriétaire${RESET}`);
        }
        if (report.unclassifiedAssets > 0) {
          lines.push(`  ${YELLOW}⚠  ${report.unclassifiedAssets} actif(s) non classifiés${RESET}`);
        }
      }

      lines.push('');

      process.stdout.write(lines.join('\n') + '\n');

      if (opts.failBelow !== undefined && report.globalComplianceRate < opts.failBelow) {
        process.stderr.write(
          `${RED}Taux global (${report.globalComplianceRate}%) inférieur au seuil requis (${opts.failBelow}%).${RESET}\n`
        );
        process.exit(1);
      }
    });
}
