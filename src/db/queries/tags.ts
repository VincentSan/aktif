import { eq, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { tags } from '../schema.js';
import type { Db } from '../connection.js';
import type { Tag } from '../../types/tag.js';

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
