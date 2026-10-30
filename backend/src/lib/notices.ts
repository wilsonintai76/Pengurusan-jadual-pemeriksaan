import type { DB } from './db';

export interface TenureNotice {
  id: string;
  assignmentId: string;
  officerId: string;
  officerName: string | null;
  officerEmail: string | null;
  roleId: string;
  roleName: string | null;
  jenis: 'LUPUT_60_HARI' | 'TAMAT';
  tarikhLuput: string | null;
  mesej: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'BARU' | 'DIBACA';
  createdAt: string;
}

export const NOTICE_WINDOW_DAYS = 60;

const NOTICE_SELECT = `
  SELECT
    n.id,
    n.assignment_id AS assignmentId,
    n.officer_id AS officerId,
    o.nama AS officerName,
    o.emel AS officerEmail,
    n.role_id AS roleId,
    r.nama AS roleName,
    n.jenis,
    n.tarikh_luput AS tarikhLuput,
    n.mesej,
    n.severity,
    n.status,
    n.created_at AS createdAt
  FROM tenure_notices n
  LEFT JOIN officers o ON o.id = n.officer_id
  LEFT JOIN roles r ON r.id = n.role_id
`;

/**
 * Imbasan lantikan yang akan luput dalam tempoh 60 hari atau sudah tamat tetapi
 * masih berstatus AKTIF. Notifikasi ditulis sekali sahaja bagi setiap
 * (assignment, jenis) melalui indeks unik.
 */
export async function scanTenureNotices(
  db: DB,
  windowDays: number = NOTICE_WINDOW_DAYS
): Promise<{ created: number; scanned: number }> {
  const { results } = await db
    .prepare(
      `SELECT
         ra.id,
         ra.officer_id AS officerId,
         ra.role_id AS roleId,
         ra.valid_to AS validTo,
         o.nama AS officerName,
         r.nama AS roleName
       FROM role_assignments ra
       JOIN officers o ON o.id = ra.officer_id
       JOIN roles r ON r.id = ra.role_id
       WHERE ra.status = 'AKTIF'
         AND ra.valid_to IS NOT NULL
         AND ra.valid_to <= date('now', '+' || ? || ' days')`
    )
    .bind(windowDays)
    .all<{
      id: string;
      officerId: string;
      roleId: string;
      validTo: string;
      officerName: string;
      roleName: string;
    }>();

  const assignments = results ?? [];
  let created = 0;

  for (const assignment of assignments) {
    const expired = assignment.validTo < new Date().toISOString().slice(0, 10);
    const jenis = expired ? 'TAMAT' : 'LUPUT_60_HARI';
    const severity = expired ? 'critical' : 'warning';
    const mesej = expired
      ? `Lantikan ${assignment.roleName} bagi ${assignment.officerName} telah tamat pada ${assignment.validTo}. Pembaharuan diperlukan sebelum tugasan pemeriksaan baharu.`
      : `Lantikan ${assignment.roleName} bagi ${assignment.officerName} akan tamat pada ${assignment.validTo} (dalam tempoh ${windowDays} hari). Sila rancang pembaharuan.`;

    const result = await db
      .prepare(
        `INSERT INTO tenure_notices
           (id, assignment_id, officer_id, role_id, jenis, tarikh_luput, mesej, severity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(assignment_id, jenis) DO NOTHING`
      )
      .bind(
        `NTF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        assignment.id,
        assignment.officerId,
        assignment.roleId,
        jenis,
        assignment.validTo,
        mesej,
        severity
      )
      .run();

    created += Number(result.meta.changes) || 0;
  }

  return { created, scanned: assignments.length };
}

/** Notifikasi untuk seorang pegawai (atau semua jika `officerId` tidak diberi). */
export async function listTenureNotices(
  db: DB,
  options: { officerId?: string | null; status?: string } = {}
): Promise<TenureNotice[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (options.officerId) {
    clauses.push('n.officer_id = ?');
    params.push(options.officerId);
  }
  if (options.status) {
    clauses.push('n.status = ?');
    params.push(options.status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { results } = await db
    .prepare(`${NOTICE_SELECT} ${where} ORDER BY n.status ASC, n.tarikh_luput ASC LIMIT 200`)
    .bind(...params)
    .all<TenureNotice>();

  return results ?? [];
}

export async function markNoticeRead(db: DB, id: string): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE tenure_notices
       SET status = 'DIBACA', read_at = datetime('now')
       WHERE id = ? AND status = 'BARU'`
    )
    .bind(id)
    .run();

  return (Number(result.meta.changes) || 0) > 0;
}
