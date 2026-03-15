import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { mkdirSync, chmodSync } from 'fs';
import { dirname } from 'path';
import * as schema from './schema.js';

export function createConnection(dbPath: string) {
  // Créer le répertoire parent si absent (recursive: true est idempotent)
  mkdirSync(dirname(dbPath), { recursive: true });

  // Ouvrir la connexion SQLite
  const sqlite = new Database(dbPath);

  // Permissions 600 (propriétaire uniquement)
  chmodSync(dbPath, 0o600);

  // Activer WAL mode et foreign keys
  sqlite.exec('PRAGMA journal_mode = WAL');
  sqlite.exec('PRAGMA foreign_keys = ON');

  // Instancier Drizzle avec le schéma
  const db = drizzle(sqlite, { schema });

  return { db, sqlite };
}

export type Db = ReturnType<typeof createConnection>['db'];
