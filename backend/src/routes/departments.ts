import { Hono } from 'hono';
import { getAuthUser, requireAuth, requireRole, type AppEnv } from '../middleware/auth';
import { recordAudit } from '../lib/audit';

/** Kod jabatan: huruf besar, nombor, sengkang. Cth. JTMK, JKA-2. */
const DEPT_CODE = /^[A-Z][A-Z0-9-]{1,15}$/;

interface DepartmentRow {
  id: string;
  nama: string;
  crossPartnerId: string | null;
  ketuaJabatan: string | null;
  penolongPegawaiAset: string | null;
}

/**
 * Ketua Jabatan & Penolong Pegawai Aset dibaca daripada lantikan PBAC
 * (`role_assignments`), bukan medan teks — PPAJ/PPAU boleh lebih daripada seorang.
 */
const DEPARTMENT_FIELDS = `
    d.id,
    d.nama AS name,
    d.nama,
    d.cross_partner_id AS crossPartnerId,
    COALESCE(
      (SELECT GROUP_CONCAT(o.nama, ', ')
         FROM role_assignments ra
         JOIN officers o ON o.id = ra.officer_id
        WHERE ra.role_id = 'KETUA_JABATAN'
          AND ra.scope_type = 'DEPARTMENT'
          AND ra.scope_id = d.id
          AND ra.status = 'AKTIF'
          AND ra.valid_from <= date('now')
          AND (ra.valid_to IS NULL OR ra.valid_to >= date('now'))),
      NULLIF(d.ketua_jabatan, '')
    ) AS ketuaJabatan,
    COALESCE(
      (SELECT GROUP_CONCAT(o.nama, ', ')
         FROM role_assignments ra
         JOIN officers o ON o.id = ra.officer_id
        WHERE ra.role_id = 'PENOLONG_PEGAWAI_ASET'
          AND ra.scope_type = 'DEPARTMENT'
          AND ra.scope_id = d.id
          AND ra.status = 'AKTIF'
          AND ra.valid_from <= date('now')
          AND (ra.valid_to IS NULL OR ra.valid_to >= date('now'))),
      NULLIF(d.penolong_pegawai_aset, '')
    ) AS penolongPegawaiAset,
    COALESCE(ds.is_operational, 1) AS isOperational,
    (SELECT COUNT(*) FROM locations l WHERE l.department_id = d.id) AS totalLokasi,
    -- Jumlah aset disegerakkan daripada senarai aset KEW.PA-7 setiap ruang jabatan ini.
    COALESCE(
      (SELECT COUNT(*)
         FROM assets a
         JOIN locations l ON l.id = a.location_id
        WHERE l.department_id = d.id),
      0
    ) AS totalAset
`;

const SELECT_ONE = `
  SELECT ${DEPARTMENT_FIELDS}
  FROM departments d
  LEFT JOIN department_settings ds ON ds.department_id = d.id
  WHERE d.id = ?
`;

async function findDepartmentId(db: AppEnv['Bindings']['DB'], id: string): Promise<string | null> {
  const row = await db.prepare('SELECT id FROM departments WHERE id = ? LIMIT 1').bind(id).first<{
    id: string;
  }>();
  return row?.id ?? null;
}

interface DepartmentUsage {
  pegawai: number;
  lokasi: number;
  aset: number;
  jadual: number;
  statistikKitaran: number;
  rekodAudit: number;
}

/** Kiraan rekod yang merujuk sesuatu jabatan — menentukan sama ada ia boleh dipadam. */
async function loadDepartmentUsage(
  db: AppEnv['Bindings']['DB'],
  id: string
): Promise<DepartmentUsage> {
  const row = await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM officers WHERE department_id = ?) AS pegawai,
         (SELECT COUNT(*) FROM locations WHERE department_id = ?) AS lokasi,
         (SELECT COUNT(*)
            FROM assets a
            JOIN locations l ON l.id = a.location_id
           WHERE l.department_id = ?) AS aset,
         (SELECT COUNT(*) FROM inspection_schedules WHERE department_id = ?) AS jadual,
         (SELECT COUNT(*) FROM cycle_unit_stats WHERE unit_id = ?) AS statistikKitaran,
         (SELECT COUNT(*) FROM pbac_audit_logs WHERE department_id = ?) AS rekodAudit`
    )
    .bind(id, id, id, id, id, id)
    .first<DepartmentUsage>();

  return {
    pegawai: Number(row?.pegawai ?? 0),
    lokasi: Number(row?.lokasi ?? 0),
    aset: Number(row?.aset ?? 0),
    jadual: Number(row?.jadual ?? 0),
    statistikKitaran: Number(row?.statistikKitaran ?? 0),
    rekodAudit: Number(row?.rekodAudit ?? 0),
  };
}

export const departmentsRoute = new Hono<AppEnv>()

  // 0. SEMAK KESAN PADAM: kiraan pegawai/lokasi/aset/jadual yang merujuk jabatan ini
  // (`requireAuth` perlu eksplisit kerana middleware global hanya mengawal tulisan).
  .get('/:id/usage', requireAuth, requireRole('PENTADBIR_SISTEM'), async (c) => {
    try {
      const id = c.req.param('id').toUpperCase();
      const exists = await findDepartmentId(c.env.DB, id);
      if (!exists) {
        return c.json(
          { success: false, code: 'NOT_FOUND', message: 'Jabatan tidak dijumpai.' },
          404
        );
      }

      const usage = await loadDepartmentUsage(c.env.DB, id);
      const canDelete = [
        usage.pegawai,
        usage.lokasi,
        usage.jadual,
        usage.statistikKitaran,
        usage.rekodAudit,
      ].every((value) => value === 0);

      return c.json({ success: true, data: { ...usage, canDelete } });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat menyemak rujukan: ' + e.message }, 500);
    }
  })

  // 1. GET ALL DEPARTMENTS (3NF lookup table served to the SPA)
  .get('/', async (c) => {
    try {
      const { results } = await c.env.DB.prepare(
        `SELECT ${DEPARTMENT_FIELDS}
         FROM departments d
         LEFT JOIN department_settings ds ON ds.department_id = d.id
         ORDER BY COALESCE(ds.is_operational, 1) DESC, d.id ASC`
      ).all();

      return c.json({
        success: true,
        total: (results ?? []).length,
        data: results ?? [],
      });
    } catch (e: any) {
      return c.json(
        { success: false, message: 'Ralat mendapatkan senarai jabatan: ' + e.message },
        500
      );
    }
  })

  // 2. CREATE DEPARTMENT / UNIT (pentadbir sistem)
  .post('/', requireRole('PENTADBIR_SISTEM'), async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const id = String(body?.id ?? '').trim().toUpperCase();
      const nama = String(body?.nama ?? body?.name ?? '').trim();

      if (!id || !nama) {
        return c.json(
          { success: false, code: 'INVALID_INPUT', message: 'Kod dan nama jabatan wajib diisi.' },
          400
        );
      }
      if (!DEPT_CODE.test(id)) {
        return c.json(
          {
            success: false,
            code: 'INVALID_CODE',
            message:
              'Kod jabatan mesti bermula dengan huruf dan mengandungi huruf besar/nombor/sengkang sahaja (2–16 aksara).',
          },
          400
        );
      }

      if (await findDepartmentId(c.env.DB, id)) {
        return c.json(
          { success: false, code: 'CODE_EXISTS', message: `Kod jabatan '${id}' telah wujud.` },
          409
        );
      }

      const partnerInput = String(body?.crossPartnerId ?? '').trim().toUpperCase();
      if (partnerInput && partnerInput === id) {
        return c.json(
          {
            success: false,
            code: 'INVALID_PARTNER',
            message: 'Pasangan pemeriksaan silang tidak boleh jabatan yang sama.',
          },
          400
        );
      }
      if (partnerInput === 'SISTEM') {
        return c.json(
          {
            success: false,
            code: 'INVALID_PARTNER',
            message: 'Unit SISTEM bukan unit operasi dan tidak boleh menjadi pasangan pemeriksaan silang.',
          },
          400
        );
      }
      const partnerId = partnerInput ? await findDepartmentId(c.env.DB, partnerInput) : null;
      if (partnerInput && !partnerId) {
        return c.json(
          {
            success: false,
            code: 'UNKNOWN_PARTNER',
            message: `Pasangan '${partnerInput}' tidak dijumpai dalam direktori jabatan.`,
          },
          400
        );
      }

      await c.env.DB.prepare(
        `INSERT INTO departments (id, nama, cross_partner_id, ketua_jabatan, penolong_pegawai_aset)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(
          id,
          nama,
          partnerId,
          String(body?.ketuaJabatan ?? '').trim() || null,
          String(body?.penolongPegawaiAset ?? '').trim() || null
        )
        .run();

      // Gandingan timbal balik: hanya isi jika pasangan belum mempunyai pasangan.
      if (partnerId) {
        await c.env.DB.prepare(
          `UPDATE departments SET cross_partner_id = ?
           WHERE id = ? AND (cross_partner_id IS NULL OR cross_partner_id = '')`
        )
          .bind(id, partnerId)
          .run();
      }

      const auth = getAuthUser(c);
      await recordAudit(c.env.DB, {
        actorId: auth?.id ?? null,
        actorName: auth?.emel ?? 'sistem',
        actedAsRole: auth?.role ?? 'Pentadbir Sistem',
        action: 'department:create',
        departmentId: auth?.dept ?? 'PENTADBIRAN',
        decision: 'PERMIT',
        policyId: 'POL_ORGANISATION_DIRECTORY',
        resourceId: id,
        notes: `Jabatan ${id} (${nama}) ditambah${partnerId ? `; pasangan silang ${partnerId}` : ''}.`,
      });

      return c.json(
        {
          success: true,
          message: 'Jabatan berjaya ditambah.',
          data: await c.env.DB.prepare(SELECT_ONE).bind(id).first<DepartmentRow>(),
        },
        201
      );
    } catch (e: any) {
      const duplicate = /UNIQUE/i.test(e.message);
      return c.json(
        {
          success: false,
          code: duplicate ? 'CODE_EXISTS' : 'CREATE_FAILED',
          message: duplicate ? 'Kod jabatan telah wujud.' : 'Ralat menambah jabatan: ' + e.message,
        },
        duplicate ? 409 : 500
      );
    }
  })

  // 3. UPDATE DEPARTMENT (kod kekal — ia kunci rujukan dalam jadual lain)
  .put('/:id', requireRole('PENTADBIR_SISTEM'), async (c) => {
    try {
      const id = c.req.param('id').toUpperCase();
      const current = await c.env.DB.prepare(SELECT_ONE).bind(id).first<DepartmentRow>();

      if (!current) {
        return c.json({ success: false, code: 'NOT_FOUND', message: 'Jabatan tidak dijumpai.' }, 404);
      }

      const body = await c.req.json().catch(() => ({}));
      const assignments: string[] = [];
      const params: unknown[] = [];
      const set = (column: string, value: unknown) => {
        assignments.push(`${column} = ?`);
        params.push(value);
      };

      if (body?.nama !== undefined) {
        const nama = String(body.nama).trim();
        if (!nama) {
          return c.json(
            { success: false, code: 'INVALID_INPUT', message: 'Nama jabatan tidak boleh kosong.' },
            400
          );
        }
        set('nama', nama);
      }

      if (body?.crossPartnerId !== undefined) {
        const raw = String(body.crossPartnerId ?? '').trim().toUpperCase();
        if (raw && raw === id) {
          return c.json(
            {
              success: false,
              code: 'INVALID_PARTNER',
              message: 'Pasangan pemeriksaan silang tidak boleh jabatan yang sama.',
            },
            400
          );
        }
        if (!raw) {
          set('cross_partner_id', null);
        } else {
          const partnerId = await findDepartmentId(c.env.DB, raw);
          if (!partnerId) {
            return c.json(
              {
                success: false,
                code: 'UNKNOWN_PARTNER',
                message: `Pasangan '${raw}' tidak dijumpai dalam direktori jabatan.`,
              },
              400
            );
          }
          set('cross_partner_id', partnerId);
        }
      }

      if (body?.ketuaJabatan !== undefined) {
        set('ketua_jabatan', String(body.ketuaJabatan ?? '').trim() || null);
      }
      if (body?.penolongPegawaiAset !== undefined) {
        set('penolong_pegawai_aset', String(body.penolongPegawaiAset ?? '').trim() || null);
      }

      if (assignments.length > 0) {
        await c.env.DB.prepare(`UPDATE departments SET ${assignments.join(', ')} WHERE id = ?`)
          .bind(...params, id)
          .run();
      }

      const auth = getAuthUser(c);
      await recordAudit(c.env.DB, {
        actorId: auth?.id ?? null,
        actorName: auth?.emel ?? 'sistem',
        actedAsRole: auth?.role ?? 'Pentadbir Sistem',
        action: 'department:update',
        departmentId: auth?.dept ?? 'PENTADBIRAN',
        decision: 'PERMIT',
        policyId: 'POL_ORGANISATION_DIRECTORY',
        resourceId: id,
        notes: `Profil jabatan ${id} dikemas kini (${assignments.length} medan).`,
      });

      return c.json({
        success: true,
        message: 'Profil jabatan dikemas kini.',
        data: await c.env.DB.prepare(SELECT_ONE).bind(id).first<DepartmentRow>(),
      });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat mengemas kini jabatan: ' + e.message }, 500);
    }
  })

  // 4. DELETE DEPARTMENT (disekat jika masih dirujuk)
  .delete('/:id', requireRole('PENTADBIR_SISTEM'), async (c) => {
    try {
      const id = c.req.param('id').toUpperCase();
      const current = await c.env.DB.prepare('SELECT id, nama FROM departments WHERE id = ? LIMIT 1')
        .bind(id)
        .first<{ id: string; nama: string }>();

      if (!current) {
        return c.json({ success: false, code: 'NOT_FOUND', message: 'Jabatan tidak dijumpai.' }, 404);
      }

      if (id === 'SISTEM') {
        return c.json(
          {
            success: false,
            code: 'SYSTEM_UNIT',
            message:
              'Unit SISTEM diperlukan oleh sistem (akaun pentadbir) dan tidak boleh dipadam. Buat unit baharu untuk operasi.',
          },
          409
        );
      }

      const counts = await loadDepartmentUsage(c.env.DB, id);

      const blockers = (
        [
          ['pegawai', counts.pegawai],
          ['lokasi', counts.lokasi],
          ['jadual', counts.jadual],
          ['statistikKitaran', counts.statistikKitaran],
          ['rekodAudit', counts.rekodAudit],
        ] as const
      )
        .filter(([, value]) => value > 0)
        .map(([key, value]) => `${key}: ${value}`);

      if (blockers.length > 0) {
        return c.json(
          {
            success: false,
            code: 'IN_USE',
            message: `Jabatan ${id} tidak boleh dipadam kerana masih dirujuk (${blockers.join(', ')}). Pindahkan pegawai, lokasi dan jadual ke jabatan lain dahulu.`,
            data: counts,
          },
          409
        );
      }

      // Lepaskan gandingan silang daripada jabatan lain sebelum padam (FK).
      await c.env.DB.prepare('UPDATE departments SET cross_partner_id = NULL WHERE cross_partner_id = ?')
        .bind(id)
        .run();

      await c.env.DB.prepare('DELETE FROM departments WHERE id = ?').bind(id).run();

      const auth = getAuthUser(c);
      await recordAudit(c.env.DB, {
        actorId: auth?.id ?? null,
        actorName: auth?.emel ?? 'sistem',
        actedAsRole: auth?.role ?? 'Pentadbir Sistem',
        action: 'department:delete',
        departmentId: auth?.dept ?? 'PENTADBIRAN',
        decision: 'PERMIT',
        policyId: 'POL_ORGANISATION_DIRECTORY',
        resourceId: id,
        notes: `Jabatan ${id} (${current.nama}) dipadam.`,
      });

      return c.json({ success: true, message: `Jabatan ${id} dipadam.` });
    } catch (e: any) {
      const referenced = /FOREIGN KEY/i.test(e.message);
      return c.json(
        {
          success: false,
          code: referenced ? 'IN_USE' : 'DELETE_FAILED',
          message: referenced
            ? 'Jabatan tidak boleh dipadam kerana masih dirujuk oleh rekod lain.'
            : 'Ralat memadam jabatan: ' + e.message,
        },
        referenced ? 409 : 500
      );
    }
  });
