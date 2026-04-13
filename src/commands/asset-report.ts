import type { Command } from 'commander';
import { getDb } from '../context.js';
import { getComplianceReport } from '../db/queries/compliance.js';
import { RESET, BOLD, RED, GREEN, YELLOW, CYAN, GRAY, MAGENTA } from '../utils/format.js';
import { t } from '../i18n.js';

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
      lines.push(`${BOLD}${CYAN}${t('report_title')}${RESET}`);
      lines.push(`${BOLD}${CYAN}╚══════════════════════════════════════════════╝${RESET}`);
      lines.push('');

      // Métadonnées
      lines.push(`  ${GRAY}${t('report_generated')}${RESET} ${now}`);
      lines.push(`  ${GRAY}${t('report_active_assets')}${RESET} ${BOLD}${report.totalActive}${RESET}`);
      lines.push('');

      // Métriques
      lines.push(`${BOLD}${t('report_coverage_title')}${RESET}`);
      lines.push(`  ${'─'.repeat(60)}`);
      lines.push(metricLine(t('report_metric_owner'), report.ownerCoverageRate, report.withOwner, report.totalActive));
      lines.push(metricLine(t('report_metric_classification'), report.classificationCoverageRate, report.withClassification, report.totalActive));
      lines.push(metricLine(t('report_metric_review'), report.reviewCoverageRate, report.reviewUpToDate, report.totalActive));
      lines.push('');

      // Taux global
      const globalColor = rateColor(report.globalComplianceRate);
      const globalBar = progressBar(report.globalComplianceRate);
      lines.push(`${BOLD}${t('report_compliance_title')}${RESET}`);
      lines.push(`  ${'─'.repeat(60)}`);
      lines.push(
        `  ${BOLD}${globalColor}${globalBar} ${report.globalComplianceRate}%${RESET}` +
        `  ${GRAY}${t('report_compliance_legend')}${RESET}`
      );
      lines.push('');

      // Alertes
      const hasAlerts = report.overdueAssets > 0 || report.unownedAssets > 0 || report.unclassifiedAssets > 0;
      lines.push(`${BOLD}${MAGENTA}${t('report_alerts_title')}${RESET}`);
      lines.push(`  ${'─'.repeat(60)}`);

      if (!hasAlerts) {
        lines.push(`  ${GREEN}${t('report_no_alerts')}${RESET}`);
      } else {
        if (report.overdueAssets > 0) {
          lines.push(`  ${RED}⚠  ${report.overdueAssets}${t('report_overdue')}${RESET}`);
        }
        if (report.unownedAssets > 0) {
          lines.push(`  ${YELLOW}⚠  ${report.unownedAssets}${t('report_unowned')}${RESET}`);
        }
        if (report.unclassifiedAssets > 0) {
          lines.push(`  ${YELLOW}⚠  ${report.unclassifiedAssets}${t('report_unclassified')}${RESET}`);
        }
      }

      lines.push('');

      process.stdout.write(lines.join('\n') + '\n');

      if (opts.failBelow !== undefined && report.globalComplianceRate < opts.failBelow) {
        process.stderr.write(
          `${RED}${t('report_fail_below')}${report.globalComplianceRate}${t('report_fail_below_mid')}${opts.failBelow}${t('report_fail_below_end')}${RESET}\n`
        );
        process.exit(1);
      }
    });
}
