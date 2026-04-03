import type { Asset } from '../types/asset.js';
import type { Classification, AssetStatus } from '../types/asset.js';
import { VERSION } from '../version.js';
import { formatDate } from '../utils/date.js';

const CLASSIFICATION_COLORS: Record<Classification, string> = {
  public: '#2e7d32',
  interne: '#1565c0',
  confidentiel: '#e65100',
  secret: '#b71c1c',
};

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


function badge(text: string, bg: string): string {
  return `<span style="display:inline-block;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:600;color:#fff;background:${bg}">${esc(text)}</span>`;
}

function classificationBadge(c: Classification | null): string {
  if (!c) return '—';
  return badge(c, CLASSIFICATION_COLORS[c]);
}

function statusBadge(s: AssetStatus): string {
  const colors: Record<string, string> = {
    actif: '#2e7d32',
    en_maintenance: '#f57f17',
    en_cours_de_mise_au_rebut: '#6a1b9a',
    retiré: '#455a64',
  };
  return badge(s, colors[s] ?? '#555');
}

function renderRow(asset: Asset, index: number): string {
  const bg = index % 2 === 0 ? '#fff' : '#f8f9fa';
  const tags = asset.tags.length > 0 ? asset.tags.map(esc).join(', ') : '—';

  return `
    <tr style="background:${bg}">
      <td style="padding:8px 10px;border-bottom:1px solid #e0e0e0;font-family:monospace;font-size:11px;color:#666">${esc(asset.id.slice(0, 8))}…</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e0e0e0;font-weight:500">${esc(asset.name)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e0e0e0">${esc(asset.type)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e0e0e0">${classificationBadge(asset.classification)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e0e0e0">${asset.owner ? esc(asset.owner) : '—'}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e0e0e0">${statusBadge(asset.status)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e0e0e0">${formatDate(asset.review_date)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e0e0e0">${formatDate(asset.next_review_date)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e0e0e0;font-size:12px;color:#555">${tags}</td>
    </tr>`;
}

export function exportToHtml(assets: Asset[]): string {
  const generatedAt = new Date().toLocaleString();
  const rows = assets.map((a, i) => renderRow(a, i)).join('');

  const counts = assets.reduce((acc, a) => {
    if (a.classification) acc[a.classification] = (acc[a.classification] ?? 0) + 1;
    return acc;
  }, {} as Partial<Record<Classification, number>>);

  const countByClassification = (Object.entries(CLASSIFICATION_COLORS) as [Classification, string][])
    .map(([c, color]) => `<span style="margin-right:16px">${badge(c, color)} <strong>${counts[c] ?? 0}</strong></span>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inventaire des actifs — ISO 27001 A.5.9</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 14px; color: #212121; background: #fafafa; }
    .container { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
    header { margin-bottom: 28px; border-bottom: 2px solid #1565c0; padding-bottom: 16px; }
    header h1 { font-size: 22px; color: #1565c0; font-weight: 700; }
    header p { margin-top: 4px; font-size: 12px; color: #757575; }
    .meta { display: flex; gap: 24px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
    .meta-item { font-size: 13px; color: #555; }
    .meta-item strong { color: #212121; }
    .summary { background: #fff; border: 1px solid #e0e0e0; border-radius: 6px; padding: 14px 18px; margin-bottom: 24px; }
    .summary h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: #757575; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden; }
    thead { background: #1565c0; color: #fff; }
    thead th { padding: 10px 10px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; white-space: nowrap; }
    tbody tr:hover { background: #e3f2fd !important; }
    footer { margin-top: 24px; font-size: 11px; color: #9e9e9e; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Inventaire des actifs informationnels</h1>
      <p>ISO 27001 — Contrôle A.5.9 &nbsp;·&nbsp; Généré le ${esc(generatedAt)} &nbsp;·&nbsp; aktif v${esc(VERSION)}</p>
    </header>

    <div class="meta">
      <div class="meta-item">Total : <strong>${assets.length} actif${assets.length !== 1 ? 's' : ''}</strong></div>
    </div>

    <div class="summary">
      <h2>Répartition par classification</h2>
      <div>${countByClassification}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Nom</th>
          <th>Type</th>
          <th>Classification</th>
          <th>Propriétaire</th>
          <th>Statut</th>
          <th>Dernière révision</th>
          <th>Prochaine révision</th>
          <th>Tags</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="9" style="padding:20px;text-align:center;color:#9e9e9e">Aucun actif trouvé</td></tr>'}
      </tbody>
    </table>

    <footer>aktif v${esc(VERSION)} — Rapport généré automatiquement. Ne pas distribuer sans validation.</footer>
  </div>
</body>
</html>`;
}
