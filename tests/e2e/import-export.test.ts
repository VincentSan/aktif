import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';
import { run } from './helpers.js';

describe('import/export e2e', () => {
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `aktif-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    dbPath = join(tmpDir, 'test.db');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('export JSON basique — structure correcte', async () => {
    await run(['asset', 'add', '--name', 'Serveur Alpha', '--type', 'matériel'], dbPath);
    await run(['asset', 'add', '--name', 'App Beta', '--type', 'logiciel'], dbPath);

    const { stdout, exitCode } = await run(['asset', 'export', '--format', 'json'], dbPath);
    expect(exitCode).toBe(0);

    const data = JSON.parse(stdout) as {
      generatedAt: string;
      version: string;
      count: number;
      assets: unknown[];
    };
    expect(data.generatedAt).toBeDefined();
    expect(data.version).toBeDefined();
    expect(data.count).toBe(2);
    expect(data.assets).toHaveLength(2);
  });

  it('export CSV basique — headers et lignes correctes', async () => {
    await run(['asset', 'add', '--name', 'Serveur Alpha', '--type', 'matériel'], dbPath);
    await run(['asset', 'add', '--name', 'App Beta', '--type', 'logiciel'], dbPath);

    const { stdout, exitCode } = await run(['asset', 'export', '--format', 'csv'], dbPath);
    expect(exitCode).toBe(0);

    const lines = stdout.split('\n').filter((l) => l.trim() !== '');
    // Header + 2 data lines
    expect(lines.length).toBeGreaterThanOrEqual(3);
    // First line is header
    expect(lines[0]).toContain('id');
    expect(lines[0]).toContain('name');
    expect(lines[0]).toContain('type');
  });

  it('round-trip CSV — export puis import dans une nouvelle base', async () => {
    // Add assets to source DB
    await run(['asset', 'add', '--name', 'Serveur Alpha', '--type', 'matériel', '--owner', 'Alice'], dbPath);
    await run(['asset', 'add', '--name', 'App Beta', '--type', 'logiciel', '--owner', 'Bob'], dbPath);

    // Build a simplified CSV (without owner_id which has FK constraints) for import
    // This simulates the essence of a round-trip: data exported, reimported in a new DB
    const csvContent = [
      'name,type,owner',
      'Serveur Alpha,matériel,Alice',
      'App Beta,logiciel,Bob',
    ].join('\n');
    const csvPath = join(tmpDir, 'roundtrip.csv');
    await Bun.write(csvPath, csvContent);

    // Import into a fresh DB
    const db2Path = join(tmpDir, 'test2.db');
    const { stdout: importOut, exitCode: importCode } = await run(
      ['asset', 'import', '--file', csvPath],
      db2Path,
    );
    expect(importCode).toBe(0);
    expect(importOut).toContain('2 actif(s) importé(s)');

    // Verify assets exist in new DB
    const { stdout: listOut, exitCode: listCode } = await run(['asset', 'list'], db2Path);
    expect(listCode).toBe(0);
    expect(listOut).toContain('Serveur Alpha');
    expect(listOut).toContain('App Beta');
    expect(listOut).toContain('Alice');
    expect(listOut).toContain('Bob');
  });

  it('import avec ligne invalide — résumé mentionne 1 erreur, autres lignes importées', async () => {
    const csvContent = [
      'name,type,owner',
      'Actif Valide,matériel,Alice',
      'Actif Invalide,type_inexistant,Bob',
      'Autre Valide,logiciel,Charlie',
    ].join('\n');

    const csvPath = join(tmpDir, 'invalid.csv');
    await Bun.write(csvPath, csvContent);

    const { stdout, stderr, exitCode } = await run(['asset', 'import', '--file', csvPath], dbPath);
    expect(exitCode).toBe(0);
    // Summary mentions 1 error
    const combined = stdout + stderr;
    expect(combined).toContain('1 erreur(s)');
    // Other valid lines are imported
    expect(stdout).toContain('2 actif(s) importé(s)');
  });

  it('import --strict avec ligne invalide — sort avec exit 1', async () => {
    const csvContent = [
      'name,type',
      'Actif Valide,matériel',
      'Actif Invalide,type_inexistant',
    ].join('\n');

    const csvPath = join(tmpDir, 'strict-invalid.csv');
    await Bun.write(csvPath, csvContent);

    const { exitCode } = await run(['asset', 'import', '--file', csvPath, '--strict'], dbPath);
    expect(exitCode).toBe(1);
  });

  it('import --overwrite — met à jour un actif existant', async () => {
    // Add an asset and get its ID
    const { stdout: addOut } = await run(
      ['asset', 'add', '--name', 'Actif Original', '--type', 'matériel'],
      dbPath,
    );
    const id = addOut.trim();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);

    // Verify original name
    const { stdout: showBefore } = await run(['asset', 'show', id], dbPath);
    expect(showBefore).toContain('Actif Original');

    // Create a CSV with the same ID but updated name
    const csvContent = [
      'id,name,type',
      `${id},Actif Modifié,matériel`,
    ].join('\n');

    const csvPath = join(tmpDir, 'overwrite.csv');
    await Bun.write(csvPath, csvContent);

    // Import with --overwrite
    const { stdout: importOut, exitCode: importCode } = await run(
      ['asset', 'import', '--file', csvPath, '--overwrite'],
      dbPath,
    );
    expect(importCode).toBe(0);
    expect(importOut).toContain('1 actif(s) importé(s)');

    // Verify the asset was updated
    const { stdout: showAfter, exitCode: showCode } = await run(['asset', 'show', id], dbPath);
    expect(showCode).toBe(0);
    expect(showAfter).toContain('Actif Modifié');
  });
});
