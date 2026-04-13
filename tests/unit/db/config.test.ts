import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { resolveConfig } from '../../../src/config.js';

describe('resolveConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore env
    process.env.AKTIF_DB = originalEnv.AKTIF_DB;
    process.env.AKTIF_USER = originalEnv.AKTIF_USER;
    if (!originalEnv.AKTIF_DB) delete process.env.AKTIF_DB;
    if (!originalEnv.AKTIF_USER) delete process.env.AKTIF_USER;
  });

  it('retourne les valeurs par défaut sans override', () => {
    delete process.env.AKTIF_DB;
    delete process.env.AKTIF_USER;
    const config = resolveConfig();
    expect(config.db).toContain('.aktif/aktif.db');
    expect(config.defaultReviewPeriodDays).toBe(365);
  });

  it('AKTIF_DB surcharge la valeur par défaut', () => {
    process.env.AKTIF_DB = '/tmp/test.db';
    const config = resolveConfig();
    expect(config.db).toBe('/tmp/test.db');
  });

  it('le flag --db surcharge AKTIF_DB', () => {
    process.env.AKTIF_DB = '/tmp/env.db';
    const config = resolveConfig({ db: '/tmp/cli.db' });
    expect(config.db).toBe('/tmp/cli.db');
  });

  it('AKTIF_USER surcharge la valeur par défaut', () => {
    process.env.AKTIF_USER = 'testuser';
    const config = resolveConfig();
    expect(config.user).toBe('testuser');
  });

  it('le flag --user surcharge AKTIF_USER', () => {
    process.env.AKTIF_USER = 'envuser';
    const config = resolveConfig({ user: 'cliuser' });
    expect(config.user).toBe('cliuser');
  });
});
