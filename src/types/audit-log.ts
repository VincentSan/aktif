export type AuditAction = 'create' | 'update' | 'retire' | 'delete';

export interface AuditLogEntry {
  id: number;
  asset_id: string;
  action: AuditAction;
  changed_by: string;
  changed_at: string;   // DATETIME as ISO string
  diff: Record<string, { before: unknown; after: unknown }>;  // JSON, désérialisé
}
