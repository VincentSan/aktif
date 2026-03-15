import { describe, it, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { runMigrations } from '../../../src/db/migrate.js';
import { insertAsset } from '../../../src/db/queries/assets.js';
import {
  getOverdueAssets, getAssetsWithoutOwner, getUnclassifiedAssets, getComplianceReport,
} from '../../../src/db/queries/compliance.js';
import * as schema from '../../../src/db/schema.js';

function createTestDb() {
  const sqlite = new Database(':memory:');
  runMigrations(sqlite);
  return drizzle(sqlite, { schema });
}

const base = {
  name: 'Asset', type: 'matériel' as const, description: null, location: null,
  owner: 'Alice', owner_id: null, classification: 'interne' as const,
  access_restrictions: null, status: 'actif' as const, entry_date: '2026-01-01',
  review_date: null, next_review_date: '2099-01-01', disposal_method: null,
  tags: [], components: [], related_risks: [],
};

describe('getOverdueAssets', () => {
  it('retourne les actifs dont next_review_date est passée', () => {
    const db = createTestDb();
    insertAsset(db, { ...base, name: 'Old', next_review_date: '2020-01-01' });
    insertAsset(db, { ...base, name: 'Current', next_review_date: '2099-01-01' });
    const overdue = getOverdueAssets(db);
    expect(overdue.length).toBe(1);
    expect(overdue[0].name).toBe('Old');
  });

  it('exclut les actifs retirés', () => {
    const db = createTestDb();
    insertAsset(db, { ...base, name: 'Retired', status: 'retiré', next_review_date: '2020-01-01' });
    expect(getOverdueAssets(db).length).toBe(0);
  });
});

describe('getAssetsWithoutOwner', () => {
  it('retourne les actifs sans owner', () => {
    const db = createTestDb();
    insertAsset(db, { ...base, name: 'Owned', owner: 'Alice' });
    insertAsset(db, { ...base, name: 'Orphan', owner: null });
    const unowned = getAssetsWithoutOwner(db);
    expect(unowned.length).toBe(1);
    expect(unowned[0].name).toBe('Orphan');
  });
});

describe('getUnclassifiedAssets', () => {
  it('retourne les actifs sans classification', () => {
    const db = createTestDb();
    insertAsset(db, { ...base, name: 'Classified' });
    insertAsset(db, { ...base, name: 'Unclassified', classification: null });
    const unclassified = getUnclassifiedAssets(db);
    expect(unclassified.length).toBe(1);
    expect(unclassified[0].name).toBe('Unclassified');
  });
});

describe('getComplianceReport', () => {
  it('calcule les taux corrects', () => {
    const db = createTestDb();
    // 3 actifs : 2 avec owner, 3 avec classification, 2 avec review à jour
    insertAsset(db, { ...base, name: 'A1', owner: 'Alice', classification: 'interne', next_review_date: '2099-01-01' });
    insertAsset(db, { ...base, name: 'A2', owner: 'Bob', classification: 'public', next_review_date: '2020-01-01' });
    insertAsset(db, { ...base, name: 'A3', owner: null, classification: 'confidentiel', next_review_date: '2099-01-01' });
    const report = getComplianceReport(db);
    expect(report.totalActive).toBe(3);
    expect(report.withOwner).toBe(2);
    expect(report.withClassification).toBe(3);
    expect(report.reviewUpToDate).toBe(2);
    expect(report.ownerCoverageRate).toBe(67);
    expect(report.classificationCoverageRate).toBe(100);
  });

  it('retourne 100% sur une base vide', () => {
    const db = createTestDb();
    const report = getComplianceReport(db);
    expect(report.globalComplianceRate).toBe(100);
  });
});
