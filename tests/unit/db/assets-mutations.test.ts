import { describe, it, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { runMigrations } from '../../../src/db/migrate.js';
import { insertAsset, getAssetById, updateAsset, retireAsset, deleteAsset } from '../../../src/db/queries/assets.js';
import * as schema from '../../../src/db/schema.js';

function createTestDb() {
  const sqlite = new Database(':memory:');
  runMigrations(sqlite);
  return drizzle(sqlite, { schema });
}

const base = {
  name: 'Serveur X', type: 'matériel' as const, description: null, location: null,
  owner: null, owner_id: null, classification: null, access_restrictions: null,
  status: 'actif' as const, entry_date: '2026-01-01', review_date: null,
  next_review_date: null, disposal_method: null, tags: [], components: [], related_risks: [],
};

describe('updateAsset', () => {
  it('modifie uniquement les champs passés', () => {
    const db = createTestDb();
    const inserted = insertAsset(db, base);
    const { before, after } = updateAsset(db, inserted.id, { owner: 'Sophie' });
    expect(before.owner).toBeNull();
    expect(after.owner).toBe('Sophie');
    expect(after.name).toBe('Serveur X'); // inchangé
  });

  it('lève une erreur pour un ID inexistant', () => {
    const db = createTestDb();
    expect(() => updateAsset(db, 'ghost', { owner: 'X' })).toThrow('introuvable');
  });
});

describe('retireAsset', () => {
  it('passe le statut à en_cours_de_mise_au_rebut', () => {
    const db = createTestDb();
    const inserted = insertAsset(db, base);
    const { after } = retireAsset(db, inserted.id);
    expect(after.status).toBe('en_cours_de_mise_au_rebut');
  });
});

describe('deleteAsset', () => {
  it('supprime la ligne', () => {
    const db = createTestDb();
    const inserted = insertAsset(db, base);
    deleteAsset(db, inserted.id);
    expect(getAssetById(db, inserted.id)).toBeNull();
  });
});
