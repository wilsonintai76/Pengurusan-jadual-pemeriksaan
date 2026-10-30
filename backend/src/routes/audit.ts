import { Hono } from 'hono';
import { getAuthUser, type AppEnv } from '../middleware/auth';

interface AuditRow {
  id: string;
  timestamp: string;
  userEmail: string | null;
  action: string;
  resourceId: string | null;
  decision: string | null;
  policyId: string | null;
  actedAsRole: string | null;
  reason: string | null;
  notes: string | null;
  status: string;
}

function mapAuditLog(row: AuditRow) {
  return {
    id: row.id,
    userEmail: row.userEmail ?? 'sistem@poliku.edu.my',
    action: row.action,
    resourceId: row.resourceId ?? undefined,
    decision: (row.decision === 'DENY' ? 'DENY' : 'PERMIT') as 'PERMIT' | 'DENY',
    policyId: row.policyId ?? 'POL_PBAC',
    actedAsRole: row.actedAsRole ?? undefined,
    reason: row.reason ?? undefined,
    notes: row.notes ?? '',
    timestamp: row.timestamp,
  };
}

export const auditRoute = new Hono<AppEnv>()

  // 1. LIST PBAC AUDIT TRAIL
  .get('/', async (c) => {
    const limit = Math.min(Number(c.req.query('limit')) || 200, 500);

    try {
      const { results } = await c.env.DB.prepare(
        `SELECT
           id,
           timestamp,
           actor_name AS userEmail,
           action,
           json_extract(details, '$.resourceId') AS resourceId,
           json_extract(details, '$.decision') AS decision,
           json_extract(details, '$.policyId') AS policyId,
           COALESCE(json_extract(details, '$.actedAsRole'), role) AS actedAsRole,
           json_extract(details, '$.reason') AS reason,
           COALESCE(json_extract(details, '$.notes'), details) AS notes,
           status
         FROM pbac_audit_logs
         ORDER BY timestamp DESC, id DESC
         LIMIT ?`
      )
        .bind(limit)
        .all<AuditRow>();

      return c.json({
        success: true,
        total: (results ?? []).length,
        data: (results ?? []).map(mapAuditLog),
      });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat mendapatkan jejak audit: ' + e.message }, 500);
    }
  })

  // 2. RECORD AUDIT ENTRY
  .post('/', async (c) => {
    try {
      const body = await c.req.json();

      if (!body.action) {
        return c.json({ success: false, message: 'Tindakan audit wajib diisi' }, 400);
      }

      const auth = getAuthUser(c);
      // Identiti diambil daripada token sesi; body hanya digunakan sebagai sandaran
      // untuk entri sistem yang dijana tanpa sesi pengguna.
      const userEmail = auth?.emel ?? String(body.userEmail || 'sistem@poliku.edu.my');
      const officer = auth
        ? await c.env.DB.prepare(
            'SELECT id, nama, department_id, peranan FROM officers WHERE id = ? LIMIT 1'
          )
            .bind(auth.id)
            .first<{ id: string; nama: string; department_id: string; peranan: string }>()
        : await c.env.DB.prepare(
            'SELECT id, nama, department_id, peranan FROM officers WHERE emel = ? COLLATE NOCASE LIMIT 1'
          )
            .bind(userEmail)
            .first<{ id: string; nama: string; department_id: string; peranan: string }>();

      const fallbackDept = await c.env.DB.prepare(
        'SELECT id FROM departments ORDER BY id ASC LIMIT 1'
      ).first<{ id: string }>();

      const departmentId = officer?.department_id ?? body.dept ?? fallbackDept?.id;

      if (!departmentId) {
        return c.json(
          { success: false, message: 'Jabatan tidak dijumpai untuk merekod audit' },
          400
        );
      }

      const id = `LOG-${Date.now().toString(36).toUpperCase()}`;
      const decision = body.decision === 'DENY' ? 'DENY' : 'PERMIT';
      const actedAsRole = officer?.peranan ?? body.actedAsRole ?? body.role ?? 'Sistem';
      const details = JSON.stringify({
        resourceId: body.resourceId ?? null,
        decision,
        policyId: body.policyId ?? 'POL_PBAC',
        actedAsRole,
        reason: body.reason ?? null,
        notes: body.notes ?? '',
      });

      await c.env.DB.prepare(
        `INSERT INTO pbac_audit_logs (id, timestamp, actor_id, actor_name, role, action, details, department_id, status)
         VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          id,
          officer?.id ?? null,
          userEmail,
          actedAsRole,
          body.action,
          details,
          departmentId,
          decision
        )
        .run();

      const saved = await c.env.DB.prepare(
        `SELECT
           id,
           timestamp,
           actor_name AS userEmail,
           action,
           json_extract(details, '$.resourceId') AS resourceId,
           json_extract(details, '$.decision') AS decision,
           json_extract(details, '$.policyId') AS policyId,
           COALESCE(json_extract(details, '$.actedAsRole'), role) AS actedAsRole,
           json_extract(details, '$.reason') AS reason,
           COALESCE(json_extract(details, '$.notes'), details) AS notes,
           status
         FROM pbac_audit_logs WHERE id = ?`
      )
        .bind(id)
        .first<AuditRow>();

      return c.json(
        { success: true, message: 'Jejak audit direkodkan', data: saved ? mapAuditLog(saved) : undefined },
        201
      );
    } catch (e: any) {
      return c.json({ success: false, message: 'Gagal merekod audit: ' + e.message }, 500);
    }
  });
