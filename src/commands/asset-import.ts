import { readFileSync } from 'fs';
import type { Command } from 'commander';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import { getDb, getConfig } from '../context.js';
import { insertAsset, updateAsset, getAssetById, type NewAsset } from '../db/queries/assets.js';
import { appendAuditLog } from '../db/queries/audit-log.js';
import { ASSET_TYPES, CLASSIFICATIONS, ASSET_STATUSES } from '../types/asset.js';
import type { AssetType, Classification, AssetStatus } from '../types/asset.js';
import { resolveUser } from '../utils/user.js';
import { today } from '../utils/date.js';
import { parseJson } from '../db/queries/utils.js';

interface CsvRow {
  id?: string;
  name?: string;
  type?: string;
  description?: string;
  location?: string;
  owner?: string;
  owner_id?: string;
  classification?: string;
  access_restrictions?: string;
  status?: string;
  entry_date?: string;
  review_date?: string;
  next_review_date?: string;
  disposal_method?: string;
  tags?: string;
  components?: string;
  related_risks?: string;
  [key: string]: string | undefined;
}

function rowToAssetData(row: CsvRow, tags: string[], components: Array<{ name: string; version?: string }>, related_risks: string[]): NewAsset {
  return {
    name: row.name!.trim(),
    type: row.type as AssetType,
    description: row.description?.trim() ?? null,
    location: row.location?.trim() ?? null,
    owner: row.owner?.trim() ?? null,
    owner_id: row.owner_id?.trim() ?? null,
    classification: (row.classification as Classification) ?? null,
    access_restrictions: row.access_restrictions?.trim() ?? null,
    status: (row.status as AssetStatus) ?? 'actif',
    entry_date: row.entry_date?.trim() ?? today(),
    review_date: row.review_date?.trim() ?? null,
    next_review_date: row.next_review_date?.trim() ?? null,
    disposal_method: row.disposal_method?.trim() ?? null,
    tags,
    components,
    related_risks,
  };
}

export function registerAssetImport(asset: Command): void {
  asset
    .command('import')
    .description('Importer des actifs depuis un fichier CSV')
    .requiredOption('--file <path>', 'Chemin vers le fichier CSV à importer')
    .option('--strict', "Arrêter au premier échec (défaut : continuer)", false)
    .option('--overwrite', "Écraser l'actif si l'ID existe déjà (défaut : ignorer)", false)
    .action((opts: { file: string; strict: boolean; overwrite: boolean }) => {
      const db = getDb();
      const config = getConfig();
      const changedBy = resolveUser(config);

      // Lecture du fichier
      let fileContent: string;
      try {
        fileContent = readFileSync(opts.file, 'utf-8');
      } catch (err) {
        process.stderr.write(`Erreur: impossible de lire le fichier "${opts.file}": ${(err as Error).message}\n`);
        process.exit(1);
      }

      // Parse CSV
      let rows: CsvRow[];
      try {
        rows = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }) as CsvRow[];
      } catch (err) {
        process.stderr.write(`Erreur: parsing CSV échoué: ${(err as Error).message}\n`);
        process.exit(1);
      }

      let imported = 0;
      let ignored = 0;
      let errors = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const lineNum = i + 2; // 1-based + header row

        // Validation des colonnes obligatoires
        if (!row.name || row.name.trim() === '') {
          process.stderr.write(`Ligne ${lineNum}: colonne "name" obligatoire manquante ou vide\n`);
          errors++;
          if (opts.strict) process.exit(1);
          continue;
        }

        if (!row.type || row.type.trim() === '') {
          process.stderr.write(`Ligne ${lineNum}: colonne "type" obligatoire manquante ou vide\n`);
          errors++;
          if (opts.strict) process.exit(1);
          continue;
        }

        if (!ASSET_TYPES.includes(row.type as AssetType)) {
          process.stderr.write(
            `Ligne ${lineNum}: type invalide "${row.type}". Valeurs acceptées: ${ASSET_TYPES.join(', ')}\n`,
          );
          errors++;
          if (opts.strict) process.exit(1);
          continue;
        }

        if (row.classification && !CLASSIFICATIONS.includes(row.classification as Classification)) {
          process.stderr.write(
            `Ligne ${lineNum}: classification invalide "${row.classification}". Valeurs acceptées: ${CLASSIFICATIONS.join(', ')}\n`,
          );
          errors++;
          if (opts.strict) process.exit(1);
          continue;
        }

        if (row.status && !ASSET_STATUSES.includes(row.status as AssetStatus)) {
          process.stderr.write(
            `Ligne ${lineNum}: statut invalide "${row.status}". Valeurs acceptées: ${ASSET_STATUSES.join(', ')}\n`,
          );
          errors++;
          if (opts.strict) process.exit(1);
          continue;
        }

        // Parsing des colonnes JSON
        const tags = parseJson<string[]>(row.tags);
        const components = parseJson<Array<{ name: string; version?: string }>>(row.components);
        const related_risks = parseJson<string[]>(row.related_risks);
        const assetData = rowToAssetData(row, tags, components, related_risks);

        const rowId = row.id && row.id.trim() !== '' ? row.id.trim() : null;

        // Cas : ID fourni et actif existant
        if (rowId) {
          const existing = getAssetById(db, rowId);

          if (existing) {
            if (opts.overwrite) {
              try {
                updateAsset(db, rowId, assetData);
                appendAuditLog(db, {
                  asset_id: rowId,
                  action: 'update',
                  changed_by: changedBy,
                  diff: {},
                });
                imported++;
              } catch (err) {
                process.stderr.write(`Ligne ${lineNum}: erreur lors de la mise à jour de l'actif "${rowId}": ${(err as Error).message}\n`);
                errors++;
                if (opts.strict) process.exit(1);
              }
            } else {
              process.stdout.write(`Ligne ${lineNum}: actif "${rowId}" déjà existant, ignoré (utilisez --overwrite pour écraser)\n`);
              ignored++;
            }
            continue;
          }
        }

        // Insertion d'un nouvel actif
        try {
          const newAsset = insertAsset(db, assetData);

          appendAuditLog(db, {
            asset_id: newAsset.id,
            action: 'create',
            changed_by: changedBy,
            diff: {},
          });

          imported++;
        } catch (err) {
          process.stderr.write(`Ligne ${lineNum}: erreur lors de l'insertion: ${(err as Error).message}\n`);
          errors++;
          if (opts.strict) process.exit(1);
        }
      }

      process.stdout.write(`\n${imported} actif(s) importé(s), ${ignored} ignoré(s), ${errors} erreur(s)\n`);
    });
}
