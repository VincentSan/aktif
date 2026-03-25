import type { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { Config } from '../types/config.js';

export const RC_PATH = join(homedir(), '.aktifrc');
const SUPPORTED_KEYS: Array<keyof Config> = ['db', 'user', 'defaultReviewPeriodDays'];

function readRc(): Partial<Config> {
  try {
    return JSON.parse(readFileSync(RC_PATH, 'utf-8')) as Partial<Config>;
  } catch {
    return {};
  }
}

function writeRc(data: Partial<Config>): void {
  writeFileSync(RC_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

export function registerAssetConfig(asset: Command): void {
  const config = asset.command('config').description('Lire ou écrire la configuration ~/.aktifrc');

  config
    .command('get <key>')
    .description('Lire une valeur de ~/.aktifrc')
    .action((key: string) => {
      if (!SUPPORTED_KEYS.includes(key as keyof Config)) {
        process.stderr.write(
          `Erreur: clé inconnue "${key}". Clés supportées: ${SUPPORTED_KEYS.join(', ')}\n`,
        );
        process.exit(1);
      }
      const rc = readRc();
      const value = rc[key as keyof Config];
      if (value === undefined) {
        process.stdout.write(`(non défini)\n`);
      } else {
        process.stdout.write(`${value}\n`);
      }
    });

  config
    .command('set <key> <value>')
    .description('Écrire une valeur dans ~/.aktifrc')
    .action((key: string, value: string) => {
      if (!SUPPORTED_KEYS.includes(key as keyof Config)) {
        process.stderr.write(
          `Erreur: clé inconnue "${key}". Clés supportées: ${SUPPORTED_KEYS.join(', ')}\n`,
        );
        process.exit(1);
      }
      const rc = readRc();
      if (key === 'defaultReviewPeriodDays') {
        const num = Number(value);
        if (isNaN(num)) {
          process.stderr.write(`Erreur: "${key}" doit être un nombre.\n`);
          process.exit(1);
        }
        (rc as Record<string, unknown>)[key] = num;
      } else {
        (rc as Record<string, unknown>)[key] = value;
      }
      writeRc(rc);
      process.stdout.write(`Clé '${key}' mise à jour.\n`);
    });
}
