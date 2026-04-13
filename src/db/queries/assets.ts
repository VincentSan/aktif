import { eq, and, like, or, type SQL } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { assets } from '../schema.js';
import type { Db } from '../connection.js';
import type { Asset } from '../../types/asset.js';
import type { AssetFilters } from '../../types/filters.js';
import { serializeJson, rowToAsset } from './utils.js';
import { addDays, today } from '../../utils/date.js';

export type NewAsset = Omit<Asset, 'id'>;

export function insertAsset(db: Db, data: NewAsset): Asset {
  const id = uuidv4();
  const values = {
    id,
    ...data,
    tags: serializeJson(data.tags),
  };
  const rows = db.insert(assets).values(values).returning().all();
  return rowToAsset(rows[0]);
}

export function getAssetById(db: Db, id: string): Asset | null {
  const rows = db.select().from(assets).where(eq(assets.id, id)).all();
  if (rows.length > 0) return rowToAsset(rows[0]);
  // Recherche par préfixe (ex: "0f6a1547" au lieu de l'UUID complet)
  const prefixRows = db.select().from(assets).where(like(assets.id, `${id}%`)).all();
  if (prefixRows.length === 1) return rowToAsset(prefixRows[0]);
  if (prefixRows.length > 1) throw new Error(`Préfixe ambigü "${id}" : ${prefixRows.length} actifs correspondent`);
  return null;
}

export function listAssets(db: Db, filters: AssetFilters = {}): Asset[] {
  const conditions: SQL[] = [];
  if (filters.type) conditions.push(eq(assets.type, filters.type));
  if (filters.classification) conditions.push(eq(assets.classification, filters.classification));
  if (filters.owner) conditions.push(eq(assets.owner, filters.owner));
  if (filters.status) conditions.push(eq(assets.status, filters.status));

  const rows =
    conditions.length > 0
      ? db.select().from(assets).where(and(...conditions)).all()
      : db.select().from(assets).all();

  return rows.map(rowToAsset);
}

export function searchAssets(db: Db, query: string): Asset[] {
  const pattern = `%${query}%`;
  const tagPattern = `%"${query}"%`;
  const rows = db
    .select()
    .from(assets)
    .where(
      or(
        like(assets.name, pattern),
        like(assets.description, pattern),
        like(assets.tags, tagPattern),
      ) as SQL,
    )
    .all();
  return rows.map(rowToAsset);
}

export type AssetUpdate = Partial<Omit<Asset, 'id'>>;

export function updateAsset(db: Db, id: string, changes: AssetUpdate, reviewPeriodDays = 365): { before: Asset; after: Asset } {
  const before = getAssetById(db, id);
  if (!before) throw new Error(`Asset introuvable : ${id}`);

  const now = today();

  const serialized: Record<string, unknown> = { ...changes };
  if (changes.tags !== undefined) serialized.tags = serializeJson(changes.tags);

  // Mise à jour automatique des dates de revue
  serialized.review_date = now;
  serialized.next_review_date = addDays(now, reviewPeriodDays);

  db.update(assets)
    .set(serialized as Partial<typeof assets.$inferInsert>)
    .where(eq(assets.id, before.id))
    .run();

  const after = getAssetById(db, before.id)!;
  return { before, after };
}

export function retireAsset(db: Db, id: string): { before: Asset; after: Asset } {
  return updateAsset(db, id, { status: 'en_cours_de_mise_au_rebut' });
}

export function deleteAsset(db: Db, id: string): void {
  const asset = getAssetById(db, id);
  if (!asset) throw new Error(`Asset introuvable : ${id}`);
  db.delete(assets).where(eq(assets.id, asset.id)).run();
}
