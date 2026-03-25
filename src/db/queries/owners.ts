import { eq } from 'drizzle-orm';
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

export function deleteOwner(db: Db, id: string): void {
  db.delete(owners).where(eq(owners.id, id)).run();
}

export function deleteAssetsByOwnerId(db: Db, ownerId: string): void {
  db.delete(assets).where(eq(assets.owner_id, ownerId)).run();
}

export function getAssetsByOwnerId(db: Db, ownerId: string): Asset[] {
  return db.select().from(assets).where(eq(assets.owner_id, ownerId)).all().map(rowToAsset);
}

export function reassignAssets(db: Db, fromOwnerId: string, toOwnerId: string): void {
  const newOwner = db.select().from(owners).where(eq(owners.id, toOwnerId)).get() as Owner | undefined;
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
