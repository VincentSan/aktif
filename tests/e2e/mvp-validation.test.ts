import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';
import { run } from './helpers.js';

describe('MVP validation e2e', () => {
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `aktif-mvp-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    dbPath = join(tmpDir, 'test.db');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('scénario complet bout-en-bout — import, list, report, export, changelog', async () => {
    // 1. Créer un CSV d'exemple avec 5 actifs variés
    const csvContent = [
      'name,type,owner,classification',
      'Serveur Web,matériel,Alice,confidentiel',
      'Application RH,logiciel,Bob,interne',
      'Service Cloud,service,Charlie,public',
      'Laptop Dev,matériel,Alice,interne',
      'Base de données,logiciel,Bob,confidentiel',
    ].join('\n');

    const csvPath = join(tmpDir, 'sample.csv');
    await Bun.write(csvPath, csvContent);

    // 2. asset import --file sample.csv
    const { stdout: importOut, exitCode: importCode } = await run(
      ['asset', 'import', '--file', csvPath],
      dbPath,
    );
    expect(importCode).toBe(0);
    expect(importOut).toContain('5 actif(s) importé(s)');

    // 3. asset list → vérifier 5 actifs
    const { stdout: listOut, exitCode: listCode } = await run(['asset', 'list'], dbPath);
    expect(listCode).toBe(0);
    expect(listOut).toContain('Serveur Web');
    expect(listOut).toContain('Application RH');
    expect(listOut).toContain('Service Cloud');
    expect(listOut).toContain('Laptop Dev');
    expect(listOut).toContain('Base de données');

    // 4. asset report → vérifier exit 0 + contient "%"
    const { stdout: reportOut, exitCode: reportCode } = await run(['asset', 'report'], dbPath);
    expect(reportCode).toBe(0);
    expect(reportOut).toMatch(/\d+%/);

    // 5. asset export --format csv --output exported.csv → vérifier exit 0
    const exportedPath = join(tmpDir, 'exported.csv');
    const { exitCode: exportCode } = await run(
      ['asset', 'export', '--format', 'csv', '--output', exportedPath],
      dbPath,
    );
    expect(exportCode).toBe(0);

    // 6. asset changelog → vérifier que des entrées existent
    const { stdout: changelogOut, exitCode: changelogCode } = await run(['asset', 'changelog'], dbPath);
    expect(changelogCode).toBe(0);
    expect(changelogOut.length).toBeGreaterThan(0);

    // 7. Vérifier que asset report s'exécute en < 2000 ms
    const start = Date.now();
    const { exitCode: reportCode2 } = await run(['asset', 'report'], dbPath);
    const elapsed = Date.now() - start;
    expect(reportCode2).toBe(0);
    expect(elapsed).toBeLessThan(2000);
  });
});
