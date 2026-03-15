import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';
import { run } from './helpers.js';

describe('compliance e2e', () => {
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `aktif-compliance-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    dbPath = join(tmpDir, 'test.db');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('asset review sur base vide — exit 0 et message de conformité', async () => {
    const { stdout, exitCode } = await run(['asset', 'review'], dbPath);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('à jour');
  });

  it('asset review avec actifs en retard — exit 1 et actifs listés', async () => {
    // Add assets with past next-review-date
    const pastDate = '2020-01-01';
    await run(
      ['asset', 'add', '--name', 'Actif Retard A', '--type', 'matériel', '--next-review-date', pastDate],
      dbPath,
    );
    await run(
      ['asset', 'add', '--name', 'Actif Retard B', '--type', 'logiciel', '--next-review-date', pastDate],
      dbPath,
    );

    const { stdout, exitCode } = await run(['asset', 'review'], dbPath);
    expect(exitCode).toBe(1);
    expect(stdout).toContain('Actif Retard A');
    expect(stdout).toContain('Actif Retard B');
  });

  it('asset owners avec actifs sans propriétaire — exit 1', async () => {
    // Add assets without --owner
    await run(['asset', 'add', '--name', 'Actif Sans Owner', '--type', 'matériel'], dbPath);

    const { stdout, exitCode } = await run(['asset', 'owners'], dbPath);
    expect(exitCode).toBe(1);
    expect(stdout).toContain('Actif Sans Owner');
  });

  it('asset owners sur base vide — exit 0', async () => {
    const { stdout, exitCode } = await run(['asset', 'owners'], dbPath);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('propriétaire');
  });

  it('asset unclassified avec actifs non classifiés — exit 1', async () => {
    // Add an asset without classification
    await run(['asset', 'add', '--name', 'Actif Non Classifié', '--type', 'service'], dbPath);

    const { stdout, exitCode } = await run(['asset', 'unclassified'], dbPath);
    expect(exitCode).toBe(1);
    expect(stdout).toContain('Actif Non Classifié');
  });

  it('asset unclassified sur base vide — exit 0', async () => {
    const { stdout, exitCode } = await run(['asset', 'unclassified'], dbPath);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('classifiés');
  });

  it('asset report basique — contient "conformité" et les taux', async () => {
    // Add a few assets to populate the report
    await run(
      ['asset', 'add', '--name', 'Actif A', '--type', 'matériel', '--owner', 'Alice', '--classification', 'confidentiel'],
      dbPath,
    );
    await run(
      ['asset', 'add', '--name', 'Actif B', '--type', 'logiciel', '--owner', 'Bob', '--classification', 'interne'],
      dbPath,
    );

    const { stdout, exitCode } = await run(['asset', 'report'], dbPath);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('conformité');
    // Contains percentage rates
    expect(stdout).toMatch(/\d+%/);
  });
});
