import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';
import { run } from './helpers.js';

describe('owner e2e', () => {
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `aktif-owner-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    dbPath = join(tmpDir, 'test.db');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('owner add puis owner list — le propriétaire apparaît dans la liste', async () => {
    const { exitCode: addCode } = await run(
      ['owner', 'add', '--name', 'Alice Dupont', '--email', 'alice@example.com', '--department', 'IT'],
      dbPath,
    );
    expect(addCode).toBe(0);

    const { stdout: listOut, exitCode: listCode } = await run(['owner', 'list'], dbPath);
    expect(listCode).toBe(0);
    expect(listOut).toContain('Alice Dupont');
  });

  it('owner add sans --name — exit 1 et message d\'erreur', async () => {
    const { stderr, exitCode } = await run(
      ['owner', 'add', '--email', 'noname@example.com'],
      dbPath,
    );
    expect(exitCode).toBe(1);
    expect(stderr.length).toBeGreaterThan(0);
  });

  it('asset config set puis get — retourne la valeur définie', async () => {
    const { exitCode: setCode } = await run(
      ['asset', 'config', 'set', 'user', 'TestUser'],
      dbPath,
    );
    expect(setCode).toBe(0);

    const { stdout: getOut, exitCode: getCode } = await run(
      ['asset', 'config', 'get', 'user'],
      dbPath,
    );
    expect(getCode).toBe(0);
    expect(getOut).toContain('TestUser');
  });

  it('asset config get clé invalide — exit 1 et message d\'erreur', async () => {
    const { stderr, exitCode } = await run(
      ['asset', 'config', 'get', 'cle_inexistante'],
      dbPath,
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Erreur');
  });
});
