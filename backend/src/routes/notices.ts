import { Hono } from 'hono';
import { listTenureNotices, markNoticeRead, scanTenureNotices } from '../lib/notices';
import { getAuthUser, requireAuth, requireRole, type AppEnv } from '../middleware/auth';
import { recordAudit } from '../lib/audit';

export const noticesRoute = new Hono<AppEnv>()

  // 1. SENARAI NOTIFIKASI LANTIKAN
  //    Pegawai biasa hanya melihat notifikasi sendiri; pentadbir boleh minta semua.
  //    Laluan ini memerlukan sesi walaupun GET (middleware global membenarkan GET terbuka).
  .get('/', requireAuth, async (c) => {
    const auth = getAuthUser(c);
    if (!auth) {
      return c.json(
        { success: false, code: 'UNAUTHENTICATED', message: 'Sesi tidak sah. Sila log masuk.' },
        401
      );
    }

    try {
      const scope = c.req.query('scope');
      const status = c.req.query('status') ?? undefined;

      const officerId =
        scope === 'all'
          ? await (async () => {
              const admin = await c.env.DB.prepare(
                `SELECT 1 AS ok FROM role_assignments
                 WHERE officer_id = ? AND role_id = 'PENTADBIR_SISTEM' AND status = 'AKTIF'
                   AND valid_from <= date('now') AND (valid_to IS NULL OR valid_to >= date('now'))
                 LIMIT 1`
              )
                .bind(auth.id)
                .first<{ ok: number }>();
              return admin ? null : auth.id;
            })()
          : null;

      const data = await listTenureNotices(c.env.DB, {
        officerId: officerId ?? (scope === 'all' ? null : auth.id),
        status,
      });

      return c.json({
        success: true,
        total: data.length,
        unread: data.filter((notice) => notice.status === 'BARU').length,
        data,
      });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat mendapatkan notifikasi: ' + e.message }, 500);
    }
  })

  // 2. IMBAS MANUAL (pentadbir) — sama seperti Cron Trigger
  .post('/scan', requireRole('PENTADBIR_SISTEM'), async (c) => {
    try {
      const result = await scanTenureNotices(c.env.DB);

      const auth = getAuthUser(c);
      await recordAudit(c.env.DB, {
        actorId: auth?.id ?? null,
        actorName: auth?.emel ?? 'sistem',
        actedAsRole: auth?.role ?? 'Pentadbir Sistem',
        action: 'tenure:scan',
        departmentId: auth?.dept ?? 'PENTADBIRAN',
        decision: 'PERMIT',
        policyId: 'POL_INSPECTOR_APPOINTMENT_REQUIRED',
        notes: `Imbasan lantikan: ${result.created} notifikasi baharu daripada ${result.scanned} lantikan.`,
      });

      return c.json({
        success: true,
        message: `${result.created} notifikasi baharu dijana (${result.scanned} lantikan diperiksa).`,
        data: result,
      });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat imbasan lantikan: ' + e.message }, 500);
    }
  })

  // 3. TANDA SEBAGAI DIBACA
  .post('/:id/read', async (c) => {
    const auth = getAuthUser(c);
    if (!auth) {
      return c.json(
        { success: false, code: 'UNAUTHENTICATED', message: 'Sesi tidak sah. Sila log masuk.' },
        401
      );
    }

    try {
      const id = c.req.param('id');
      const notice = await c.env.DB.prepare(
        'SELECT officer_id AS officerId FROM tenure_notices WHERE id = ? LIMIT 1'
      )
        .bind(id)
        .first<{ officerId: string }>();

      if (!notice) {
        return c.json({ success: false, code: 'NOT_FOUND', message: 'Notifikasi tidak dijumpai.' }, 404);
      }

      const isAdmin = await c.env.DB.prepare(
        `SELECT 1 AS ok FROM role_assignments
         WHERE officer_id = ? AND role_id = 'PENTADBIR_SISTEM' AND status = 'AKTIF'
         LIMIT 1`
      )
        .bind(auth.id)
        .first<{ ok: number }>();

      if (!isAdmin && notice.officerId !== auth.id) {
        return c.json(
          { success: false, code: 'FORBIDDEN', message: 'Anda hanya boleh menanda notifikasi sendiri.' },
          403
        );
      }

      const changed = await markNoticeRead(c.env.DB, id);
      return c.json({
        success: true,
        message: changed ? 'Notifikasi ditanda dibaca.' : 'Notifikasi sudah dibaca.',
      });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat menanda notifikasi: ' + e.message }, 500);
    }
  });
