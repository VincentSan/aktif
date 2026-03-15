import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { owners } from '../schema.js';
import type { Db } from '../connection.js';
import type { Owner } from '../../types/owner.js';

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
