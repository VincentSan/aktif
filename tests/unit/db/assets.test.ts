import { describe, it, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { runMigrations } from '../../../src/db/migrate.js';
import { insertAsset, getAssetById, listAssets } from '../../../src/db/queries/assets.js';
import * as schema from '../../../src/db/schema.js';

function createTestDb() {
  const sqlite = new Database(':memory:');
  runMigrations(sqlite);
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

const baseAsset = {
  name: 'Serveur X',
  type: 'matériel' as const,
  description: null,
  location: null,
  owner: null,
  owner_id: null,
  classification: null,
  access_restrictions: null,
  status: 'actif' as const,
  entry_date: '2026-01-01',
  review_date: null,
  next_review_date: null,
  disposal_method: null,
  tags: [],
  components: [],
  related_risks: [],
};

describe('insertAsset + getAssetById', () => {
  it('round-trip: inséré puis retrouvé par ID', () => {
    const { db } = createTestDb();
    const inserted = insertAsset(db, baseAsset);
    expect(inserted.id).toBeTypeOf('string');
    const found = getAssetById(db, inserted.id);
    expect(found).not.toBeNull();
    expect(found?.name).toBe('Serveur X');
    expect(found?.type).toBe('matériel');
  });

  it('getAssetById retourne null pour un ID inexistant', () => {
    const { db } = createTestDb();
    expect(getAssetById(db, 'non-existent')).toBeNull();
  });

  it('les colonnes JSON sont correctement désérialisées', () => {
    const { db } = createTestDb();
    const inserted = insertAsset(db, { ...baseAsset, tags: ['iso27001', 'serveur'] });
    const found = getAssetById(db, inserted.id);
    expect(found?.tags).toEqual(['iso27001', 'serveur']);
  });
});

describe('listAssets', () => {
  it('liste tous les actifs sans filtre', () => {
    const { db } = createTestDb();
    insertAsset(db, baseAsset);
    insertAsset(db, { ...baseAsset, name: 'Laptop Y', type: 'matériel' });
    const list = listAssets(db);
    expect(list.length).toBe(2);
  });

  it('filtre par type', () => {
    const { db } = createTestDb();
    insertAsset(db, baseAsset); // matériel
    insertAsset(db, { ...baseAsset, name: 'App Z', type: 'logiciel' });
    const list = listAssets(db, { type: 'logiciel' });
    expect(list.length).toBe(1);
    expect(list[0].name).toBe('App Z');
  });

  it('filtre par statut', () => {
    const { db } = createTestDb();
    insertAsset(db, baseAsset); // actif
    insertAsset(db, { ...baseAsset, name: 'Vieux Serveur', status: 'retiré' });
    const list = listAssets(db, { status: 'retiré' });
    expect(list.length).toBe(1);
  });
});
