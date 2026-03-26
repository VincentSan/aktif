import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';
import type { Config } from './types/config.js';

const HOME = homedir();

export const RC_PATH = join(HOME, '.aktifrc');

const DEFAULTS: Config = {
  db: join(HOME, '.aktif', 'aktif.db'),
  user: process.env.USER ?? 'unknown',
  defaultReviewPeriodDays: 365,
};

function readJsonFile(path: string): Partial<Config> {
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as Partial<Config>;
  } catch {
    return {};
  }
}

export interface CliOverrides {
  db?: string;
  user?: string;
}

export function ensureRcFile(): Partial<Config> {
  const existing = readJsonFile(RC_PATH);
  const hasAllFields = (Object.keys(DEFAULTS) as (keyof Config)[]).every(
    (k) => k in existing
  );
  if (!hasAllFields) {
    writeFileSync(RC_PATH, JSON.stringify({ ...DEFAULTS, ...existing }, null, 2) + '\n', 'utf-8');
  }
  return existing;
}

export function resolveConfig(cliOverrides: CliOverrides = {}): Config {
  const homeRc = ensureRcFile();
  const localConfig = readJsonFile(resolve(process.cwd(), 'aktif.config.json'));

  const envOverrides: Partial<Config> = {};
  if (process.env.AKTIF_DB) envOverrides.db = process.env.AKTIF_DB;
  if (process.env.AKTIF_USER) envOverrides.user = process.env.AKTIF_USER;

  const cliConfig: Partial<Config> = {};
  if (cliOverrides.db) cliConfig.db = resolve(cliOverrides.db);
  if (cliOverrides.user) cliConfig.user = cliOverrides.user;

  return {
    ...DEFAULTS,
    ...homeRc,
    ...localConfig,
    ...envOverrides,
    ...cliConfig,
  };
}
