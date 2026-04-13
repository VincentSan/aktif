import { eq, like } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { owners, assets } from '../schema.js';
import type { Db } from '../connection.js';
import type { Owner } from '../../types/owner.js';
import type { Asset } from '../../types/asset.js';
import { rowToAsset } from './utils.js';

export function insertOwner(db: Db, data: Omit<Owner, 'id' | 'created_at'>): Owner {
  const id = uuidv4();
  const now = new Date().toISOString();
  const rows = db
    .insert(owners)
    .values({
      id,
      name: data.name,
      email: data.email ?? null,
      department: data.department ?? null,
      created_at: now,
    })
    .returning()
    .all();
  return rows[0] as Owner;
}

export function listOwners(db: Db): Owner[] {
  return db.select().from(owners).all() as Owner[];
}

export function getOwnerById(db: Db, id: string): Owner | null {
  const rows = db.select().from(owners).where(eq(owners.id, id)).all();
  return rows.length > 0 ? (rows[0] as Owner) : null;
}

/**
 * Résoudre un owner par nom exact ou par UUID (préfixe accepté pour l'UUID).
 * Retourne null si introuvable. Lève une erreur si ambigü.
 */
export function resolveOwner(db: Db, nameOrId: string): Owner | null {
  // Cherche par UUID exact
  const byId = db.select().from(owners).where(eq(owners.id, nameOrId)).all();
  if (byId.length > 0) return byId[0] as Owner;

  // Cherche par préfixe UUID
  const byPrefix = db.select().from(owners).where(like(owners.id, `${nameOrId}%`)).all();
  if (byPrefix.length === 1) return byPrefix[0] as Owner;
  if (byPrefix.length > 1) throw new Error(`Préfixe UUID ambigü "${nameOrId}" : ${byPrefix.length} owners correspondent`);

  // Cherche par nom exact (insensible à la casse)
  const byName = db.select().from(owners).all() as Owner[];
  const matches = byName.filter((o) => o.name.toLowerCase() === nameOrId.toLowerCase());
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) throw new Error(`Nom ambigü "${nameOrId}" : ${matches.length} owners correspondent`);

  return null;
}

export function resolveOwnerCli(db: Db, nameOrId: string): { name: string; id: string | null } {
  try {
    const resolved = resolveOwner(db, nameOrId);
    if (resolved) return { name: resolved.name, id: resolved.id };
    return { name: nameOrId, id: null };
  } catch (err) {
    process.stderr.write(`Erreur: ${(err as Error).message}\n`);
    process.exit(1);
  }
}

export function deleteOwner(db: Db, id: string): void {
  db.delete(owners).where(eq(owners.id, id)).run();
}

export function getAssetsByOwnerId(db: Db, ownerId: string): Asset[] {
  return db.select().from(assets).where(eq(assets.owner_id, ownerId)).all().map(rowToAsset);
}

export function reassignAssets(db: Db, fromOwnerId: string, toOwnerId: string): void {
  const newOwner = getOwnerById(db, toOwnerId);
  db.update(assets)
    .set({ owner_id: toOwnerId, owner: newOwner?.name ?? null })
    .where(eq(assets.owner_id, fromOwnerId))
    .run();
}

export function clearOwnerOnAssets(db: Db, ownerId: string): void {
  db.update(assets)
    .set({ owner_id: null, owner: null })
    .where(eq(assets.owner_id, ownerId))
    .run();
}

export function deleteAssetsByOwnerId(db: Db, ownerId: string): void {
  db.delete(assets).where(eq(assets.owner_id, ownerId)).run();
}

export function updateOwner(db: Db, id: string, data: Partial<Omit<Owner, 'id' | 'created_at'>>): Owner | null {
  const rows = db
    .update(owners)
    .set({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.department !== undefined ? { department: data.department } : {}),
    })
    .where(eq(owners.id, id))
    .returning()
    .all();

  // Synchroniser le champ texte owner sur les assets liés si le nom a changé
  if (rows.length > 0 && data.name !== undefined) {
    db.update(assets)
      .set({ owner: data.name })
      .where(eq(assets.owner_id, id))
      .run();
  }

  return rows.length > 0 ? (rows[0] as Owner) : null;
}
