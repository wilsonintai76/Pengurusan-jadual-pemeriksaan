import type { DB } from './db';

export interface AuditEntry {
  actorId?: string | null;
  actorName: string;
  /** Peranan yang digunakan semasa tindakan (acted_as_role). */
  actedAsRole: string;
  action: string;
  departmentId: string;
  decision: 'PERMIT' | 'DENY';
  policyId: string;
  resourceId?: string | null;
  notes: string;
  reason?: string | null;
}

/**
 * Tulis satu entri jejak audit PBAC. `decision` disimpan dalam `status` dan juga
 * dalam `details.decision`; `reason` direkodkan dalam `details.reason`.
 */
export async function recordAudit(db: DB, entry: AuditEntry): Promise<void> {
  const id = `LOG-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

  const details = JSON.stringify({
    resourceId: entry.resourceId ?? null,
    decision: entry.decision,
    policyId: entry.policyId,
    actedAsRole: entry.actedAsRole,
    reason: entry.reason ?? null,
    notes: entry.notes,
  });

  await db
    .prepare(
      `INSERT INTO pbac_audit_logs
         (id, timestamp, actor_id, actor_name, role, action, details, department_id, status)
       VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      entry.actorId ?? null,
      entry.actorName,
      entry.actedAsRole,
      entry.action,
      details,
      entry.departmentId,
      entry.decision
    )
    .run();
}
