import type { Database } from 'bun:sqlite';

// SQL inliné pour fonctionner dans le binaire compilé (import.meta.dir indisponible)
const MIGRATIONS: string[] = [
  // 0000
  `
CREATE TABLE IF NOT EXISTS \`assets\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`name\` text NOT NULL,
  \`type\` text NOT NULL,
  \`description\` text,
  \`location\` text,
  \`owner\` text,
  \`owner_id\` text,
  \`classification\` text,
  \`access_restrictions\` text,
  \`status\` text DEFAULT 'actif' NOT NULL,
  \`entry_date\` text DEFAULT (DATE('now')) NOT NULL,
  \`review_date\` text,
  \`next_review_date\` text,
  \`disposal_method\` text,
  \`tags\` text DEFAULT '[]' NOT NULL,
  \`components\` text DEFAULT '[]' NOT NULL,
  \`related_risks\` text DEFAULT '[]' NOT NULL,
  \`created_at\` text DEFAULT (DATETIME('now')) NOT NULL,
  \`updated_at\` text DEFAULT (DATETIME('now')) NOT NULL,
  FOREIGN KEY (\`owner_id\`) REFERENCES \`owners\`(\`id\`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS \`audit_log\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`asset_id\` text NOT NULL,
  \`action\` text NOT NULL,
  \`changed_by\` text NOT NULL,
  \`changed_at\` text DEFAULT (DATETIME('now')) NOT NULL,
  \`diff\` text DEFAULT '{}' NOT NULL
);

CREATE TABLE IF NOT EXISTS \`owners\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`name\` text NOT NULL,
  \`email\` text,
  \`department\` text,
  \`created_at\` text DEFAULT (DATETIME('now')) NOT NULL
);

CREATE INDEX IF NOT EXISTS \`idx_assets_type\` ON \`assets\`(\`type\`);
CREATE INDEX IF NOT EXISTS \`idx_assets_status\` ON \`assets\`(\`status\`);
CREATE INDEX IF NOT EXISTS \`idx_assets_classification\` ON \`assets\`(\`classification\`);
CREATE INDEX IF NOT EXISTS \`idx_assets_next_review_date\` ON \`assets\`(\`next_review_date\`);
CREATE INDEX IF NOT EXISTS \`idx_assets_owner\` ON \`assets\`(\`owner\`);
CREATE INDEX IF NOT EXISTS \`idx_audit_log_asset_id\` ON \`audit_log\`(\`asset_id\`);
CREATE INDEX IF NOT EXISTS \`idx_audit_log_changed_at\` ON \`audit_log\`(\`changed_at\`);

CREATE TRIGGER IF NOT EXISTS \`audit_log_no_update\`
  BEFORE UPDATE ON \`audit_log\`
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;

CREATE TRIGGER IF NOT EXISTS \`audit_log_no_delete\`
  BEFORE DELETE ON \`audit_log\`
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;

CREATE TRIGGER IF NOT EXISTS \`assets_updated_at\`
  AFTER UPDATE ON \`assets\`
  FOR EACH ROW
BEGIN
  UPDATE \`assets\` SET \`updated_at\` = DATETIME('now') WHERE \`id\` = NEW.\`id\`;
END;
  `,
];

export function runMigrations(sqlite: Database): void {
  const versionResult = sqlite.query('PRAGMA user_version').get() as { user_version: number };
  const currentVersion = versionResult.user_version;

  for (let i = currentVersion; i < MIGRATIONS.length; i++) {
    sqlite.exec('BEGIN');
    try {
      sqlite.exec(MIGRATIONS[i]);
      sqlite.exec(`PRAGMA user_version = ${i + 1}`);
      sqlite.exec('COMMIT');
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw new Error(`Migration ${i} failed: ${err}`);
    }
  }
}
