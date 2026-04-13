import { describe, it, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { runMigrations } from '../../src/db/migrate.js';
import { auditLog } from '../../src/db/schema.js';
import * as schema from '../../src/db/schema.js';

describe('audit_log immutabilité', () => {
  it('Drizzle update sur audit_log lève une exception', () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const db = drizzle(sqlite, { schema });

    // Insérer via Drizzle (append légal)
    db.insert(auditLog).values({
      asset_id: 'test-id',
      action: 'create',
      changed_by: 'alice',
      diff: '{}',
    }).run();

    // Tenter un UPDATE via Drizzle — doit déclencher le trigger
    expect(() => {
      db.update(auditLog)
        .set({ action: 'delete' })
        .run();
    }).toThrow('audit_log is append-only');

    sqlite.close();
  });

  it('DELETE direct sur audit_log lève une exception', () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);

    sqlite.run(
      "INSERT INTO audit_log (asset_id, action, changed_by, diff) VALUES ('x', 'create', 'test', '{}')"
    );

    expect(() => {
      sqlite.run("DELETE FROM audit_log WHERE asset_id = 'x'");
    }).toThrow('audit_log is append-only');

    sqlite.close();
  });
});
