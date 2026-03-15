import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Asset } from '../types/asset.js';
import type { ComplianceReport } from '../types/compliance.js';
import type { AuditLogEntry } from '../types/audit-log.js';

// Helvetica standard ne supporte pas l'UTF-8 complet — remplacer les accents français
function sanitize(str: string): string {
  return str
    .replace(/[éê]/g, 'e')
    .replace(/[è]/g, 'e')
    .replace(/[à â]/g, 'a')
    .replace(/[ç]/g, 'c')
    .replace(/[ô]/g, 'o')
    .replace(/[î]/g, 'i')
    .replace(/[û ù]/g, 'u')
    .replace(/[ï]/g, 'i')
    .replace(/[ü]/g, 'u')
    .replace(/[ö]/g, 'o')
    .replace(/[É Ê]/g, 'E')
    .replace(/[È]/g, 'E')
    .replace(/[À Â]/g, 'A')
    .replace(/[Ç]/g, 'C')
    .replace(/[Ô]/g, 'O')
    .replace(/[Î]/g, 'I')
    .replace(/[Û Ù]/g, 'U');
}

function truncate(str: string, max = 25): string {
  const s = sanitize(str);
  return s.length > max ? s.slice(0, max - 1) + '\u2026'.replace(/\u2026/, '...') : s;
}

const MARGIN = 50;
const PAGE_WIDTH = 595.28;  // A4
const PAGE_HEIGHT = 841.89; // A4

export async function exportToPdf(
  assets: Asset[],
  report: ComplianceReport,
  auditEntries: AuditLogEntry[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const contentWidth = PAGE_WIDTH - MARGIN * 2;

  // -----------------------------------------------------------------------
  // PAGE DE GARDE
  // -----------------------------------------------------------------------
  const coverPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  // Titre
  const title = sanitize('Inventaire des actifs ISO 27001 A.5.9');
  coverPage.drawText(title, {
    x: MARGIN,
    y: y - 18,
    size: 18,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= 40;

  // Date de génération
  const now = new Date();
  const dateStr = sanitize(`Date de generation : ${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR')}`);
  coverPage.drawText(dateStr, {
    x: MARGIN,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 30;

  // Séparateur
  coverPage.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 25;

  // Sous-titre synthèse
  coverPage.drawText(sanitize('Synthese de conformite'), {
    x: MARGIN,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= 20;

  // Stats
  const stats: Array<[string, string]> = [
    [sanitize('Total actifs actifs'), String(report.totalActive)],
    [sanitize('Taux de couverture proprietaire'), `${report.ownerCoverageRate}%`],
    [sanitize('Taux de classification'), `${report.classificationCoverageRate}%`],
    [sanitize('Taux de revision a jour'), `${report.reviewCoverageRate}%`],
    [sanitize('Taux de conformite global'), `${report.globalComplianceRate}%`],
  ];

  for (const [label, value] of stats) {
    coverPage.drawText(`${label} :`, {
      x: MARGIN,
      y,
      size: 9,
      font: fontRegular,
      color: rgb(0, 0, 0),
    });
    coverPage.drawText(value, {
      x: MARGIN + 220,
      y,
      size: 9,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    y -= 16;
  }

  // -----------------------------------------------------------------------
  // PAGE TABLEAU DES ACTIFS
  // -----------------------------------------------------------------------
  const assetPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  y = PAGE_HEIGHT - MARGIN;

  assetPage.drawText(sanitize('Tableau des actifs'), {
    x: MARGIN,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= 20;

  // Colonnes : Nom | Type | Classification | Proprietaire | Statut | Prochaine revision
  const cols = [
    { label: sanitize('Nom'), width: 110 },
    { label: sanitize('Type'), width: 75 },
    { label: sanitize('Classification'), width: 85 },
    { label: sanitize('Proprietaire'), width: 95 },
    { label: sanitize('Statut'), width: 80 },
    { label: sanitize('Prochaine revision'), width: 90 },
  ];

  const rowHeight = 14;

  // Fond en-tête
  assetPage.drawRectangle({
    x: MARGIN,
    y: y - rowHeight,
    width: contentWidth,
    height: rowHeight,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Texte en-tête
  let x = MARGIN + 3;
  for (const col of cols) {
    assetPage.drawText(col.label, {
      x,
      y: y - rowHeight + 3,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    x += col.width;
  }
  y -= rowHeight;

  // Lignes actifs
  let currentPage = assetPage;
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];

    // Vérifier si on a besoin d'une nouvelle page
    if (y - rowHeight < MARGIN) {
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
      // Re-dessiner l'en-tête sur la nouvelle page
      currentPage.drawRectangle({
        x: MARGIN,
        y: y - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: rgb(0.2, 0.2, 0.2),
      });
      let hx = MARGIN + 3;
      for (const col of cols) {
        currentPage.drawText(col.label, {
          x: hx,
          y: y - rowHeight + 3,
          size: 9,
          font: fontBold,
          color: rgb(1, 1, 1),
        });
        hx += col.width;
      }
      y -= rowHeight;
    }

    // Fond alterné
    const isEven = i % 2 === 1;
    if (isEven) {
      currentPage.drawRectangle({
        x: MARGIN,
        y: y - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: rgb(0.95, 0.95, 0.95),
      });
    }

    const values = [
      truncate(asset.name),
      truncate(asset.type),
      truncate(asset.classification ?? '-'),
      truncate(asset.owner ?? '-'),
      truncate(asset.status),
      truncate(asset.next_review_date ?? '-'),
    ];

    let rx = MARGIN + 3;
    for (let c = 0; c < values.length; c++) {
      currentPage.drawText(values[c], {
        x: rx,
        y: y - rowHeight + 3,
        size: 9,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });
      rx += cols[c].width;
    }
    y -= rowHeight;
  }

  // -----------------------------------------------------------------------
  // PAGE JOURNAL AUDIT (20 dernières entrées)
  // -----------------------------------------------------------------------
  const auditPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  y = PAGE_HEIGHT - MARGIN;

  auditPage.drawText(sanitize('Journal des 20 dernieres entrees audit'), {
    x: MARGIN,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= 20;

  // Colonnes audit : Date | Auteur | Action | Actif
  const auditCols = [
    { label: 'Date', width: 130 },
    { label: 'Auteur', width: 110 },
    { label: 'Action', width: 80 },
    { label: 'Actif', width: 175 },
  ];

  // En-tête
  auditPage.drawRectangle({
    x: MARGIN,
    y: y - rowHeight,
    width: contentWidth,
    height: rowHeight,
    color: rgb(0.2, 0.2, 0.2),
  });
  let ax = MARGIN + 3;
  for (const col of auditCols) {
    auditPage.drawText(col.label, {
      x: ax,
      y: y - rowHeight + 3,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    ax += col.width;
  }
  y -= rowHeight;

  const recentEntries = auditEntries.slice(0, 20);
  for (let i = 0; i < recentEntries.length; i++) {
    const entry = recentEntries[i];

    const isEven = i % 2 === 1;
    if (isEven) {
      auditPage.drawRectangle({
        x: MARGIN,
        y: y - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: rgb(0.95, 0.95, 0.95),
      });
    }

    const values = [
      truncate(entry.changed_at.replace('T', ' ').slice(0, 19), 25),
      truncate(entry.changed_by, 20),
      truncate(entry.action, 12),
      truncate(entry.asset_id, 30),
    ];

    let ex = MARGIN + 3;
    for (let c = 0; c < values.length; c++) {
      auditPage.drawText(values[c], {
        x: ex,
        y: y - rowHeight + 3,
        size: 9,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });
      ex += auditCols[c].width;
    }
    y -= rowHeight;
  }

  return pdfDoc.save();
}
