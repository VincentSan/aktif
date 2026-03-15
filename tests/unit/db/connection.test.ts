import { describe, it, expect, afterEach } from 'bun:test';
import { createConnection } from '../../../src/db/connection.js';
import { statSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('createConnection', () => {
  const testDbPath = join(tmpdir(), 'aktif-test-' + Date.now() + '.db');

  afterEach(() => {
    if (existsSync(testDbPath)) unlinkSync(testDbPath);
  });

  it('crée le fichier SQLite avec permissions 600', () => {
    createConnection(testDbPath);
    const stat = statSync(testDbPath);
    expect(stat.mode & 0o777).toBe(0o600);
  });

  it('active le WAL mode', () => {
    const { sqlite } = createConnection(testDbPath);
    const result = sqlite.query('PRAGMA journal_mode').get() as { journal_mode: string };
    expect(result.journal_mode).toBe('wal');
    sqlite.close();
  });

  it('retourne une instance Drizzle fonctionnelle', () => {
    const { db } = createConnection(testDbPath);
    expect(db).toBeDefined();
  });
});
