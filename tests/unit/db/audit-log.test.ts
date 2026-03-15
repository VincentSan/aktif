import { describe, it, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { runMigrations } from '../../../src/db/migrate.js';
import { appendAuditLog, getHistory, getChangelog } from '../../../src/db/queries/audit-log.js';
import * as schema from '../../../src/db/schema.js';

function createTestDb() {
  const sqlite = new Database(':memory:');
  runMigrations(sqlite);
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

describe('appendAuditLog', () => {
  it('insère une entrée correctement', () => {
    const { db } = createTestDb();
    appendAuditLog(db, { asset_id: 'abc', action: 'create', changed_by: 'alice', diff: {} });
    const history = getHistory(db, 'abc');
    expect(history.length).toBe(1);
    expect(history[0].action).toBe('create');
    expect(history[0].changed_by).toBe('alice');
  });
});

describe('getHistory', () => {
  it('retourne les entrées dans l\'ordre chronologique', () => {
    const { db } = createTestDb();
    appendAuditLog(db, { asset_id: 'x', action: 'create', changed_by: 'alice' });
    appendAuditLog(db, { asset_id: 'x', action: 'update', changed_by: 'bob', diff: { name: { before: 'A', after: 'B' } } });
    const history = getHistory(db, 'x');
    expect(history.length).toBe(2);
    expect(history[0].action).toBe('create');
    expect(history[1].action).toBe('update');
    expect(history[1].diff).toEqual({ name: { before: 'A', after: 'B' } });
  });
});

describe('getChangelog', () => {
  it('retourne toutes les entrées sans options', () => {
    const { db } = createTestDb();
    appendAuditLog(db, { asset_id: 'a', action: 'create', changed_by: 'alice' });
    appendAuditLog(db, { asset_id: 'b', action: 'create', changed_by: 'bob' });
    expect(getChangelog(db).length).toBe(2);
  });

  it('respecte la limite', () => {
    const { db } = createTestDb();
    for (let i = 0; i < 5; i++) {
      appendAuditLog(db, { asset_id: `asset-${i}`, action: 'create', changed_by: 'alice' });
    }
    expect(getChangelog(db, { limit: 3 }).length).toBe(3);
  });
});

describe('triggers d\'immutabilité', () => {
  it('bloque UPDATE sur audit_log', () => {
    const { db, sqlite } = createTestDb();
    appendAuditLog(db, { asset_id: 'x', action: 'create', changed_by: 'alice' });
    expect(() => {
      sqlite.run("UPDATE audit_log SET action = 'delete' WHERE asset_id = 'x'");
    }).toThrow('audit_log is append-only');
  });

  it('bloque DELETE sur audit_log', () => {
    const { db, sqlite } = createTestDb();
    appendAuditLog(db, { asset_id: 'x', action: 'create', changed_by: 'alice' });
    expect(() => {
      sqlite.run("DELETE FROM audit_log WHERE asset_id = 'x'");
    }).toThrow('audit_log is append-only');
  });
});
