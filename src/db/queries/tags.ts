import { eq, asc, like } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { tags, assets } from '../schema.js';
import type { Db } from '../connection.js';
import type { Tag } from '../../types/tag.js';
import { parseJson, serializeJson } from './utils.js';

export function insertTag(db: Db, name: string): Tag {
  const normalized = name.trim().toLowerCase();
  const id = uuidv4();
  const now = new Date().toISOString();
  const rows = db
    .insert(tags)
    .values({ id, name: normalized, created_at: now })
    .returning()
    .all();
  return rows[0] as Tag;
}

export function listTags(db: Db): Tag[] {
  return db.select().from(tags).orderBy(asc(tags.name)).all() as Tag[];
}

export function getTagByName(db: Db, name: string): Tag | null {
  const normalized = name.trim().toLowerCase();
  const rows = db.select().from(tags).where(eq(tags.name, normalized)).all();
  return rows.length > 0 ? (rows[0] as Tag) : null;
}

export function getTagById(db: Db, id: string): Tag | null {
  const rows = db.select().from(tags).where(eq(tags.id, id)).all();
  return rows.length > 0 ? (rows[0] as Tag) : null;
}

export function updateTag(db: Db, id: string, newName: string): Tag | null {
  const normalized = newName.trim().toLowerCase();
  const rows = db
    .update(tags)
    .set({ name: normalized })
    .where(eq(tags.id, id))
    .returning()
    .all();
  return rows.length > 0 ? (rows[0] as Tag) : null;
}

export function deleteTag(db: Db, id: string): void {
  db.delete(tags).where(eq(tags.id, id)).run();
}

function patchTagInAssets(db: Db, tagName: string, transform: (tags: string[]) => string[]): number {
  const normalized = tagName.trim().toLowerCase();
  const rows = db.select().from(assets).where(like(assets.tags, `%"${normalized}"%`)).all();
  for (const row of rows) {
    const updated = transform(parseJson<string[]>(row.tags));
    db.update(assets).set({ tags: serializeJson(updated) }).where(eq(assets.id, row.id)).run();
  }
  return rows.length;
}

export function renameTagInAssets(db: Db, oldName: string, newName: string): number {
  const normalizedOld = oldName.trim().toLowerCase();
  const normalizedNew = newName.trim().toLowerCase();
  return patchTagInAssets(db, normalizedOld, (tags) =>
    tags.map((t) => (t === normalizedOld ? normalizedNew : t)),
  );
}

export function removeTagFromAssets(db: Db, tagName: string): number {
  const normalized = tagName.trim().toLowerCase();
  return patchTagInAssets(db, normalized, (tags) => tags.filter((t) => t !== normalized));
}
