import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync, existsSync } from 'fs';
import { run } from './helpers.js';

describe('asset CRUD e2e', () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = join(tmpdir(), `aktif-e2e-${Date.now()}.db`);
  });

  afterEach(() => {
    if (existsSync(dbPath)) unlinkSync(dbPath);
    // Aussi supprimer les fichiers WAL/SHM si présents
    if (existsSync(dbPath + '-wal')) unlinkSync(dbPath + '-wal');
    if (existsSync(dbPath + '-shm')) unlinkSync(dbPath + '-shm');
  });

  it('asset add crée un actif et retourne un UUID', async () => {
    const { stdout, exitCode } = await run(
      ['asset', 'add', '--name', 'Serveur Test', '--type', 'matériel'],
      dbPath
    );
    expect(exitCode).toBe(0);
    // UUID v4 format
    expect(stdout).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('asset add avec type invalide sort avec exit 1', async () => {
    const { stderr, exitCode } = await run(
      ['asset', 'add', '--name', 'Test', '--type', 'invalid'],
      dbPath
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain('invalide');
  });

  it('asset list affiche le tableau', async () => {
    await run(['asset', 'add', '--name', 'Serveur A', '--type', 'matériel'], dbPath);
    const { stdout, exitCode } = await run(['asset', 'list'], dbPath);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Serveur A');
  });

  it('asset show affiche les détails', async () => {
    const { stdout: addOut } = await run(
      ['asset', 'add', '--name', 'Laptop B', '--type', 'matériel'],
      dbPath
    );
    const id = addOut.trim();
    const { stdout, exitCode } = await run(['asset', 'show', id], dbPath);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Laptop B');
  });

  it('asset show avec ID inexistant sort avec exit 1', async () => {
    const { exitCode } = await run(['asset', 'show', 'non-existent-id'], dbPath);
    expect(exitCode).toBe(1);
  });

  it('scénario complet add→edit→retire→history', async () => {
    // add
    const { stdout: addOut } = await run(
      ['asset', 'add', '--name', 'Asset Complet', '--type', 'logiciel'],
      dbPath
    );
    const id = addOut.trim();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);

    // edit
    const { exitCode: editCode } = await run(
      ['asset', 'edit', id, '--owner', 'Sophie'],
      dbPath
    );
    expect(editCode).toBe(0);

    // retire
    const { exitCode: retireCode } = await run(['asset', 'retire', id], dbPath);
    expect(retireCode).toBe(0);

    // history : doit avoir 3 entrées (create, update, retire)
    const { stdout: historyOut, exitCode: historyCode } = await run(
      ['asset', 'history', id],
      dbPath
    );
    expect(historyCode).toBe(0);
    expect(historyOut).toContain('create');
    expect(historyOut).toContain('update');
    expect(historyOut).toContain('retire');
  });

  it('asset edit --disposal-method persiste la valeur', async () => {
    const { stdout: addOut } = await run(
      ['asset', 'add', '--name', 'Asset Rebut', '--type', 'matériel'],
      dbPath
    );
    const id = addOut.trim();

    const { exitCode } = await run(
      ['asset', 'edit', id, '--disposal-method', 'Recyclage certifié'],
      dbPath
    );
    expect(exitCode).toBe(0);

    const { stdout } = await run(['asset', 'show', id], dbPath);
    expect(stdout).toContain('Recyclage certifié');
  });

  it('asset edit --tags persiste les tags', async () => {
    const { stdout: addOut } = await run(
      ['asset', 'add', '--name', 'Asset Tags', '--type', 'logiciel'],
      dbPath
    );
    const id = addOut.trim();

    const { exitCode } = await run(
      ['asset', 'edit', id, '--tags', '["iso27001","critique"]'],
      dbPath
    );
    expect(exitCode).toBe(0);

    const { stdout } = await run(['asset', 'show', id], dbPath);
    expect(stdout).toContain('iso27001');
  });

  it('review_date est remplie après un asset edit', async () => {
    const { stdout: addOut } = await run(
      ['asset', 'add', '--name', 'Asset Review', '--type', 'service'],
      dbPath
    );
    const id = addOut.trim();

    await run(['asset', 'edit', id, '--description', 'Mise à jour'], dbPath);

    const { stdout } = await run(['asset', 'show', id], dbPath);
    // Le champ dernière revue ne doit plus être vide
    expect(stdout).not.toMatch(/Dernière revue\s*—/);
  });

  it('asset delete avec --yes supprime et laisse une trace dans changelog', async () => {
    const { stdout: addOut } = await run(
      ['asset', 'add', '--name', 'À Supprimer', '--type', 'service'],
      dbPath
    );
    const id = addOut.trim();

    const { exitCode: deleteCode } = await run(
      ['asset', 'delete', id, '--yes'],
      dbPath
    );
    expect(deleteCode).toBe(0);

    // L'actif ne doit plus exister
    const { exitCode: showCode } = await run(['asset', 'show', id], dbPath);
    expect(showCode).toBe(1);

    // Mais la trace dans changelog doit exister
    const { stdout: changelogOut } = await run(['asset', 'changelog'], dbPath);
    expect(changelogOut).toContain('delete');
  });
});
