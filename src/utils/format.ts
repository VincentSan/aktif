import type { AssetStatus, Classification } from '../types/asset.js';

// Codes ANSI
export const RESET = '\x1b[0m';
export const BOLD = '\x1b[1m';
export const RED = '\x1b[31m';
export const GREEN = '\x1b[32m';
export const YELLOW = '\x1b[33m';
export const CYAN = '\x1b[36m';
export const GRAY = '\x1b[90m';
export const MAGENTA = '\x1b[35m';

const ANSI_RE = /\x1b\[[0-9;]*m/g;

function stripAnsi(str: string): string {
  return str.replace(ANSI_RE, '');
}

export function colorize(text: string, ...colors: string[]): string {
  return `${colors.join('')}${text}${RESET}`;
}

// Couleurs par statut
export function formatStatus(status: AssetStatus): string {
  switch (status) {
    case 'actif': return colorize(status, GREEN);
    case 'en_maintenance': return colorize(status, YELLOW);
    case 'en_cours_de_mise_au_rebut': return colorize(status, RED);
    case 'retiré': return colorize(status, GRAY);
  }
}

// Couleurs par classification
export function formatClassification(classification: Classification | null): string {
  if (!classification) return colorize('—', GRAY);
  switch (classification) {
    case 'secret': return colorize(classification, RED, BOLD);
    case 'confidentiel': return colorize(classification, RED);
    case 'interne': return colorize(classification, YELLOW);
    case 'public': return colorize(classification, GREEN);
  }
}

// Tronquer un UUID pour l'affichage
export function shortId(id: string): string {
  return id.substring(0, 8);
}

interface Column {
  key: string;
  label: string;
  width?: number;
  format?: (val: unknown) => string;
}

// Formater un tableau CLI avec alignement des colonnes
export function formatTable(rows: Record<string, unknown>[], columns: Column[]): string {
  if (rows.length === 0) return colorize('Aucun résultat.', GRAY);

  // Pré-calcul des cellules en une seule passe
  const cells: string[][] = rows.map((row) =>
    columns.map((col) => {
      const raw = row[col.key];
      return col.format ? col.format(raw) : String(raw ?? '—');
    })
  );

  // Calcul de la largeur de chaque colonne
  const widths = columns.map((col, i) => {
    const maxDataWidth = Math.max(...cells.map((row) => stripAnsi(row[i]).length));
    return Math.max(col.label.length, maxDataWidth, col.width ?? 0);
  });

  // Header
  const header = columns
    .map((col, i) => colorize(col.label.padEnd(widths[i]), BOLD, CYAN))
    .join('  ');

  const separator = widths.map((w) => '─'.repeat(w)).join('──');

  // Lignes de données
  const dataRows = cells.map((row) =>
    row
      .map((formatted, i) => {
        const visible = stripAnsi(formatted);
        return formatted + ' '.repeat(Math.max(0, widths[i] - visible.length));
      })
      .join('  ')
  );

  return [header, separator, ...dataRows].join('\n');
}

// Formater un actif complet pour `asset show`
export function formatAsset(asset: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(asset)) {
    let displayValue: string;
    if (value === null || value === undefined) {
      displayValue = colorize('—', GRAY);
    } else if (Array.isArray(value)) {
      displayValue = value.length === 0 ? colorize('[]', GRAY) : JSON.stringify(value, null, 2);
    } else {
      displayValue = String(value);
    }
    lines.push(`${colorize(key.padEnd(24), BOLD)}: ${displayValue}`);
  }
  return lines.join('\n');
}

// Formater un diff pour l'affichage dans l'historique
export function formatDiff(diff: Record<string, { before: unknown; after: unknown }>): string {
  const entries = Object.entries(diff);
  if (entries.length === 0) return colorize('(aucun changement)', GRAY);
  return entries
    .map(([key, { before, after }]) => {
      const b = before === null ? colorize('null', GRAY) : String(before);
      const a = after === null ? colorize('null', GRAY) : colorize(String(after), GREEN);
      return `  ${colorize(key, CYAN)}: ${b} → ${a}`;
    })
    .join('\n');
}
