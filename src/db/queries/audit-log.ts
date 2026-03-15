import { eq, asc, desc, gt, type SQL } from 'drizzle-orm';
import { auditLog } from '../schema.js';
import type { Db } from '../connection.js';
import type { AuditLogEntry, AuditAction } from '../../types/audit-log.js';

// Convertir une ligne SQLite brute en AuditLogEntry typé
function rowToEntry(row: typeof auditLog.$inferSelect): AuditLogEntry {
  return {
    ...row,
    diff: (() => {
      try { return JSON.parse(row.diff) as Record<string, { before: unknown; after: unknown }>; }
      catch { return {}; }
    })(),
  };
}

export interface AppendAuditLogParams {
  asset_id: string;
  action: AuditAction;
  changed_by: string;
  diff?: Record<string, { before: unknown; after: unknown }>;
}

export function appendAuditLog(db: Db, params: AppendAuditLogParams): void {
  db.insert(auditLog).values({
    asset_id: params.asset_id,
    action: params.action,
    changed_by: params.changed_by,
    diff: JSON.stringify(params.diff ?? {}),
  }).run();
}

export function getHistory(db: Db, assetId: string): AuditLogEntry[] {
  return db
    .select()
    .from(auditLog)
    .where(eq(auditLog.asset_id, assetId))
    .orderBy(asc(auditLog.changed_at))
    .all()
    .map(rowToEntry);
}

export interface GetChangelogOptions {
  limit?: number;
  since?: string; // ISO date string
}

export function getChangelog(db: Db, options: GetChangelogOptions = {}): AuditLogEntry[] {
  const conditions: SQL[] = [];
  if (options.since) conditions.push(gt(auditLog.changed_at, options.since));

  let query = db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.changed_at))
    .$dynamic();

  if (conditions.length > 0) query = query.where(conditions[0]);
  if (options.limit) query = query.limit(options.limit);

  return query.all().map(rowToEntry);
}
