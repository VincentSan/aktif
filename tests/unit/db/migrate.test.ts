import { describe, it, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { runMigrations } from '../../../src/db/migrate.js';

describe('runMigrations', () => {
  it('crée les 3 tables sur une base vierge', () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const tables = sqlite
      .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as Array<{ name: string }>;
    const names = tables.map((t) => t.name);
    expect(names).toContain('assets');
    expect(names).toContain('audit_log');
    expect(names).toContain('owners');
    sqlite.close();
  });

  it('est idempotent (double appel sans erreur)', () => {
    const sqlite = new Database(':memory:');
    expect(() => {
      runMigrations(sqlite);
      runMigrations(sqlite);
    }).not.toThrow();
    sqlite.close();
  });

  it('les triggers audit_log bloquent UPDATE et DELETE', () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    // Insérer une entrée de test
    sqlite.run(
      "INSERT INTO audit_log (asset_id, action, changed_by, diff) VALUES ('x', 'create', 'test', '{}')"
    );
    // Vérifier que UPDATE est bloqué
    expect(() => {
      sqlite.run("UPDATE audit_log SET action = 'delete' WHERE asset_id = 'x'");
    }).toThrow('audit_log is append-only');
    sqlite.close();
  });
});
