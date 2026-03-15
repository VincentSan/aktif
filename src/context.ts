import type { Db } from './db/connection.js';
import type { Config } from './types/config.js';

let _db: Db | null = null;
let _config: Config | null = null;

export function setContext(db: Db, config: Config): void {
  _db = db;
  _config = config;
}

export function getDb(): Db {
  if (!_db) throw new Error('DB non initialisée — setContext() doit être appelé avant toute commande');
  return _db;
}

export function getConfig(): Config {
  if (!_config) throw new Error('Config non initialisée — setContext() doit être appelé avant toute commande');
  return _config;
}
