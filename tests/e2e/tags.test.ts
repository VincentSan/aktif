import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';
import { run } from './helpers.js';

describe('tags e2e', () => {
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `aktif-tags-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    dbPath = join(tmpDir, 'test.db');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── tags new ─────────────────────────────────────────────────────────────────

  it('tags new — crée un tag et retourne son UUID', async () => {
    const { stdout, exitCode } = await run(['tags', 'new', 'réseau'], dbPath);
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('tags new — normalise en minuscule (TesT → test)', async () => {
    await run(['tags', 'new', 'TesT'], dbPath);
    const { stdout } = await run(['tags', 'list'], dbPath);
    expect(stdout).toContain('test');
    expect(stdout).not.toContain('TesT');
  });

  it('tags new — doublon exit 1 avec message d\'erreur', async () => {
    await run(['tags', 'new', 'doublons'], dbPath);
    const { stderr, exitCode } = await run(['tags', 'new', 'doublons'], dbPath);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('doublons');
  });

  it('tags new — doublon insensible à la casse (Tag vs tag)', async () => {
    await run(['tags', 'new', 'tag'], dbPath);
    const { exitCode } = await run(['tags', 'new', 'TAG'], dbPath);
    expect(exitCode).toBe(1);
  });

  // ── tags list ────────────────────────────────────────────────────────────────

  it('tags list — liste vide retourne message dédié', async () => {
    const { stdout, exitCode } = await run(['tags', 'list'], dbPath);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Aucun tag');
  });

  it('tags list — affiche les tags créés', async () => {
    await run(['tags', 'new', 'alpha'], dbPath);
    await run(['tags', 'new', 'beta'], dbPath);
    const { stdout, exitCode } = await run(['tags', 'list'], dbPath);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('alpha');
    expect(stdout).toContain('beta');
  });

  // ── tags edit ────────────────────────────────────────────────────────────────

  it('tags edit — renomme un tag existant', async () => {
    await run(['tags', 'new', 'ancien'], dbPath);
    const { stdout, exitCode } = await run(['tags', 'edit', 'ancien', 'nouveau'], dbPath);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('ancien');
    expect(stdout).toContain('nouveau');

    const { stdout: listOut } = await run(['tags', 'list'], dbPath);
    expect(listOut).toContain('nouveau');
    expect(listOut).not.toContain('ancien');
  });

  it('tags edit — tag source inexistant exit 1', async () => {
    const { stderr, exitCode } = await run(['tags', 'edit', 'fantome', 'nouveau'], dbPath);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('fantome');
  });

  it('tags edit — conflit avec un tag existant exit 1', async () => {
    await run(['tags', 'new', 'alpha'], dbPath);
    await run(['tags', 'new', 'beta'], dbPath);
    const { exitCode } = await run(['tags', 'edit', 'alpha', 'beta'], dbPath);
    expect(exitCode).toBe(1);
  });

  it('tags edit — normalise en minuscule', async () => {
    await run(['tags', 'new', 'source'], dbPath);
    const { exitCode } = await run(['tags', 'edit', 'source', 'CIBLE'], dbPath);
    expect(exitCode).toBe(0);
    const { stdout } = await run(['tags', 'list'], dbPath);
    expect(stdout).toContain('cible');
    expect(stdout).not.toContain('CIBLE');
  });

  // ── tags delete ──────────────────────────────────────────────────────────────

  it('tags delete — supprime le tag', async () => {
    await run(['tags', 'new', 'temporaire'], dbPath);
    const { stdout, exitCode } = await run(['tags', 'delete', 'temporaire'], dbPath);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('temporaire');

    const { stdout: listOut } = await run(['tags', 'list'], dbPath);
    expect(listOut).not.toContain('temporaire');
  });

  it('tags delete — tag inexistant exit 1', async () => {
    const { stderr, exitCode } = await run(['tags', 'delete', 'fantome'], dbPath);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('fantome');
  });
});
