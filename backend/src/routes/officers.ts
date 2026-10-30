import { Hono } from 'hono';
import { resolveDepartmentId } from '../lib/db';
import { resolveRegistrationDepartment } from '../lib/departments';
import {
  ACCOUNT_EMAIL_DOMAIN,
  generateUniqueUsername,
  issueCredentials,
} from '../lib/credentials';
import { DEFAULT_JAWATAN_ID, assignDefaultRoleForOfficer, resolveDisplayRole, resolveRoleId, roleDefinition } from '../lib/roles';
import { getAuthUser, requireRole, type AppEnv } from '../middleware/auth';
import { canManageDepartment, loadManageScope } from '../lib/permissions';

const OFFICER_SELECT = `
  SELECT
    o.id,
    o.nama,
    o.emel,
    o.jawatan,
    o.gred,
    o.telefon,
    o.sambungan,
    o.department_id AS dept,
    o.peranan AS role,
    o.status
  FROM officers o
`;

export interface OfficerRoleRow {
  roleId: string;
  roleName: string;
  kategori: string;
  scopeType: string;
  scopeId: string | null;
  validTo: string | null;
}

/** Peranan aktif (jawatan + lantikan) bagi sekumpulan pegawai, dikumpul sekali gus. */
async function loadActiveRoles(
  db: AppEnv['Bindings']['DB'],
  officerIds: string[]
): Promise<Map<string, OfficerRoleRow[]>> {
  const grouped = new Map<string, OfficerRoleRow[]>();
  if (!officerIds.length) return grouped;

  // D1 mengehadkan bilangan parameter; proses dalam kelompok kecil.
  for (let index = 0; index < officerIds.length; index += 40) {
    const chunk = officerIds.slice(index, index + 40);
    const placeholders = chunk.map(() => '?').join(',');
    const { results } = await db
      .prepare(
        `SELECT ra.officer_id AS officerId, ra.role_id AS roleId, r.nama AS roleName,
                COALESCE(rc.kategori, 'LANTIKAN') AS kategori,
                ra.scope_type AS scopeType, ra.scope_id AS scopeId, ra.valid_to AS validTo
         FROM role_assignments ra
         JOIN roles r ON r.id = ra.role_id
         LEFT JOIN role_category rc ON rc.role_id = ra.role_id
         WHERE ra.status = 'AKTIF' AND ra.officer_id IN (${placeholders})
           AND ra.valid_from <= date('now') AND (ra.valid_to IS NULL OR ra.valid_to >= date('now'))
         ORDER BY ra.role_id`
      )
      .bind(...chunk)
      .all<{ officerId: string } & OfficerRoleRow>();

    (results ?? []).forEach((row) => {
      const list = grouped.get(row.officerId) ?? [];
      list.push({
        roleId: row.roleId,
        roleName: row.roleName,
        kategori: row.kategori,
        scopeType: row.scopeType,
        scopeId: row.scopeId,
        validTo: row.validTo,
      });
      grouped.set(row.officerId, list);
    });
  }

  return grouped;
}

export const officersRoute = new Hono<AppEnv>()

  // 1. LIST OFFICERS (optionally filtered by department)
  .get('/', async (c) => {
    const dept = c.req.query('dept');

    try {
      const isFiltered = !!dept && dept !== 'SEMUA';
      const statement = c.env.DB.prepare(
        `${OFFICER_SELECT} ${isFiltered ? 'WHERE o.department_id = ?' : ''} ORDER BY o.nama ASC`
      );

      const { results } = isFiltered
        ? await statement.bind(dept).all()
        : await statement.all();

      const officers = (results ?? []) as Array<{ id: string }>;
      const rolesByOfficer = await loadActiveRoles(
        c.env.DB,
        officers.map((officer) => officer.id)
      );

      const data = officers.map((officer) => {
        const roles = rolesByOfficer.get(officer.id) ?? [];
        return {
          ...officer,
          // Label jawatan diterbitkan daripada lantikan aktif — bukan terus daripada `officers.peranan`.
          role: resolveDisplayRole(roles, (officer as { role?: string }).role ?? ''),
          roles,
        };
      });

      return c.json({ success: true, total: data.length, data });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat mendapatkan direktori pegawai: ' + e.message }, 500);
    }
  })

  // 2. DAFTAR PEGAWAI + JANA NAMA PENGGUNA & KATA LALUAN (Pentadbir Sistem sahaja)
  .post('/', requireRole('PENTADBIR_SISTEM'), async (c) => {
    try {
      const body = await c.req.json();

      if (!body.nama || !body.dept) {
        return c.json(
          { success: false, message: 'Nama penuh dan jabatan / unit wajib diisi.' },
          400
        );
      }

      const requestedJawatan = body.role || body.peranan || body.jawatan || null;
      const jawatanId = resolveRoleId(requestedJawatan) ?? DEFAULT_JAWATAN_ID;
      const jawatan = roleDefinition(jawatanId);

      // Hanya JAWATAN boleh ditetapkan semasa pendaftaran. Lantikan (PP / Pentadbir
      // Sistem) diberi melalui menu Peranan & Lantikan atau pendaftaran khas.
      if (!jawatan || jawatan.kategori !== 'JAWATAN') {
        return c.json(
          {
            success: false,
            code: 'APPOINTMENT_REQUIRED',
            message:
              'Pegawai Pemeriksa (PP) ialah lantikan, bukan jawatan. Daftarkan pegawai dengan jawatan hakiki (contoh: Pensyarah / Pegawai Akademik), kemudian lantik sebagai pemeriksa melalui menu Peranan & Lantikan.',
          },
          400
        );
      }

      const role = jawatan.nama;
      const department = await resolveRegistrationDepartment(c.env.DB, String(body.dept), role);
      if (!department.departmentId) {
        return c.json(
          {
            success: false,
            code: department.error?.code ?? 'UNKNOWN_DEPARTMENT',
            message: department.error?.message ?? 'Jabatan tidak sah',
          },
          400
        );
      }
      const departmentId = department.departmentId;

      // Emel pilihan: jika pentadbir beri emel rasmi, guna; jika tidak, jana daripada nama.
      const requestedEmail = String(body.emel ?? body.email ?? '').trim().toLowerCase();
      let emel: string;
      if (requestedEmail) {
        if (!/^[^@\s]+@[^@\s]+$/.test(requestedEmail)) {
          return c.json({ success: false, message: 'Format emel tidak sah.' }, 400);
        }
        const clash = await c.env.DB.prepare(
          'SELECT id FROM officers WHERE emel = ? COLLATE NOCASE LIMIT 1'
        )
          .bind(requestedEmail)
          .first<{ id: string }>();
        if (clash) {
          return c.json(
            { success: false, code: 'EMAIL_EXISTS', message: 'Emel pegawai telah didaftarkan.' },
            409
          );
        }
        emel = requestedEmail;
      } else {
        const username = await generateUniqueUsername(c.env.DB, String(body.nama));
        emel = `${username}@${ACCOUNT_EMAIL_DOMAIN}`;
      }

      const id = body.id || `PEG-${Date.now().toString(36).toUpperCase()}`;

      await c.env.DB.prepare(
        `INSERT INTO officers (id, nama, emel, jawatan, gred, telefon, sambungan, department_id, peranan, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          id,
          String(body.nama).trim(),
          emel,
          body.jawatan || role || 'Pegawai',
          body.gred || body.grade || '-',
          body.telefon || body.phone || null,
          body.sambungan || body.ext || null,
          departmentId,
          role,
          body.status || 'Aktif'
        )
        .run();

      // Lantikan PBAC awal supaya pegawai baharu terus memegang peranan skopnya.
      await assignDefaultRoleForOfficer(c.env.DB, {
        officerId: id,
        roleValue: role,
        departmentId,
        createdById: getAuthUser(c)?.id ?? null,
      });

      // Kredensial dijana serta-merta; kata laluan hanya dipaparkan sekali kepada pentadbir.
      const credentials = await issueCredentials(c.env, id, emel, getAuthUser(c)?.id ?? null);

      const saved = await c.env.DB.prepare(`${OFFICER_SELECT} WHERE o.id = ?`)
        .bind(id)
        .first();

      return c.json(
        {
          success: true,
          message: 'Pegawai berjaya didaftarkan. Serahkan kredensial kepada pegawai berkenaan.',
          data: saved,
          credentials,
        },
        201
      );
    } catch (e: any) {
      const duplicate = /UNIQUE/i.test(e.message);
      return c.json(
        { success: false, message: duplicate ? 'Emel pegawai telah wujud' : e.message },
        duplicate ? 409 : 500
      );
    }
  })

  // 2a. DAFTAR PEGAWAI KE DIREKTORI SAHAJA (tanpa akaun log masuk)
  // PPAJ/PPAU & Ketua Jabatan boleh mendaftar nama daripada KEW.PA-7 bagi jabatan
  // sendiri; kredensial tetap dijana oleh Pentadbir Sistem kemudian.
  .post('/directory', async (c) => {
    try {
      const body = await c.req.json();
      const auth = getAuthUser(c);
      if (!auth) {
        return c.json(
          { success: false, code: 'UNAUTHENTICATED', message: 'Sesi tidak sah. Sila log masuk semula.' },
          401
        );
      }

      if (!body.nama || !body.dept) {
        return c.json(
          { success: false, message: 'Nama penuh dan jabatan / unit wajib diisi.' },
          400
        );
      }

      const scope = await loadManageScope(c.env.DB, auth.id);
      if (!scope.canManage) {
        return c.json(
          {
            success: false,
            code: 'FORBIDDEN',
            message:
              'Akses ditolak: hanya Ketua Jabatan, Penolong Pegawai Aset atau Penyelia Lokasi boleh mendaftar pegawai.',
          },
          403
        );
      }

      const requestedJawatan = body.role || body.peranan || body.jawatan || null;
      const jawatanId = resolveRoleId(requestedJawatan) ?? DEFAULT_JAWATAN_ID;
      const jawatan = roleDefinition(jawatanId);
      if (!jawatan || jawatan.kategori !== 'JAWATAN') {
        return c.json(
          {
            success: false,
            code: 'APPOINTMENT_REQUIRED',
            message:
              'Pegawai Pemeriksa (PP) ialah lantikan, bukan jawatan. Daftarkan dengan jawatan hakiki dahulu.',
          },
          400
        );
      }

      const department = await resolveRegistrationDepartment(c.env.DB, String(body.dept), jawatan.nama);
      if (!department.departmentId) {
        return c.json(
          {
            success: false,
            code: department.error?.code ?? 'UNKNOWN_DEPARTMENT',
            message: department.error?.message ?? 'Jabatan tidak sah',
          },
          400
        );
      }

      if (!canManageDepartment(scope, department.departmentId)) {
        return c.json(
          {
            success: false,
            code: 'DEPARTMENT_FORBIDDEN',
            message: 'Akses ditolak: anda hanya boleh mendaftar pegawai bagi jabatan/unit anda sendiri.',
          },
          403
        );
      }

      const nama = String(body.nama).trim();
      const existing = await c.env.DB.prepare(
        'SELECT id FROM officers WHERE nama = ? COLLATE NOCASE LIMIT 1'
      )
        .bind(nama)
        .first<{ id: string }>();
      if (existing) {
        return c.json(
          { success: false, code: 'OFFICER_EXISTS', message: `${nama} sudah ada dalam direktori.` },
          409
        );
      }

      const username = await generateUniqueUsername(c.env.DB, nama);
      const emel = `${username}@${ACCOUNT_EMAIL_DOMAIN}`;
      const id = `PEG-${Date.now().toString(36).toUpperCase()}`;

      await c.env.DB.prepare(
        `INSERT INTO officers (id, nama, emel, jawatan, gred, telefon, sambungan, department_id, peranan, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(id, nama, emel, jawatan.nama, '-', body.telefon || null, null, department.departmentId, jawatan.nama, 'Aktif')
        .run();

      await assignDefaultRoleForOfficer(c.env.DB, {
        officerId: id,
        roleValue: jawatan.nama,
        departmentId: department.departmentId,
        createdById: auth.id,
      });

      const saved = await c.env.DB.prepare(`${OFFICER_SELECT} WHERE o.id = ?`).bind(id).first();

      return c.json(
        {
          success: true,
          message: `${nama} didaftarkan dalam direktori. Akaun log masuk perlu dijana oleh Pentadbir Sistem.`,
          data: saved,
        },
        201
      );
    } catch (e: any) {
      return c.json({ success: false, message: 'Gagal mendaftar pegawai: ' + e.message }, 500);
    }
  })

  // 2b. JANA SEMULA KATA LALUAN SEMENTARA (Pentadbir Sistem sahaja)
  .post('/:id/credentials', requireRole('PENTADBIR_SISTEM'), async (c) => {
    const identifier = c.req.param('id');
    try {
      const officer = await c.env.DB.prepare(
        'SELECT id, emel FROM officers WHERE id = ? OR emel = ? COLLATE NOCASE LIMIT 1'
      )
        .bind(identifier, identifier)
        .first<{ id: string; emel: string }>();

      if (!officer) {
        return c.json({ success: false, message: 'Pegawai tidak dijumpai.' }, 404);
      }

      const credentials = await issueCredentials(c.env, officer.id, officer.emel, getAuthUser(c)?.id ?? null);
      return c.json({
        success: true,
        message: 'Kata laluan sementara baharu dijana. Kata laluan lama tidak lagi sah.',
        credentials,
      });
    } catch (e: any) {
      return c.json({ success: false, message: 'Gagal menjana kata laluan: ' + e.message }, 500);
    }
  })
  // 2c. TETAPKAN JAWATAN UTAMA (Pentadbir Sistem sahaja)
  .put('/:id/primary-role', requireRole('PENTADBIR_SISTEM'), async (c) => {
    const identifier = c.req.param('id');
    try {
      const body = await c.req.json().catch(() => ({}));
      const roleId = resolveRoleId(String(body?.roleId ?? body?.role ?? ''));
      const definition = roleId ? roleDefinition(roleId) : null;

      if (!definition || definition.kategori !== 'JAWATAN') {
        return c.json(
          {
            success: false,
            code: 'JAWATAN_REQUIRED',
            message: 'Jawatan utama mesti salah satu jawatan hakiki (bukan lantikan).',
          },
          400
        );
      }

      const officer = await c.env.DB.prepare(
        'SELECT id FROM officers WHERE id = ? OR emel = ? COLLATE NOCASE LIMIT 1'
      )
        .bind(identifier, identifier)
        .first<{ id: string }>();

      if (!officer) {
        return c.json({ success: false, message: 'Pegawai tidak dijumpai.' }, 404);
      }

      const active = await c.env.DB.prepare(
        `SELECT 1 AS ok FROM role_assignments
         WHERE officer_id = ? AND role_id = ? AND status = 'AKTIF'
           AND valid_from <= date('now') AND (valid_to IS NULL OR valid_to >= date('now'))
         LIMIT 1`
      )
        .bind(officer.id, definition.id)
        .first<{ ok: number }>();

      if (!active) {
        return c.json(
          {
            success: false,
            code: 'ASSIGNMENT_REQUIRED',
            message: `Pegawai belum memegang ${definition.nama}. Tambah peranan itu dahulu.`,
          },
          409
        );
      }

      await c.env.DB.prepare(
        "UPDATE officers SET peranan = ?, updated_at = datetime('now') WHERE id = ?"
      )
        .bind(definition.nama, officer.id)
        .run();

      const saved = await c.env.DB.prepare(`${OFFICER_SELECT} WHERE o.id = ?`)
        .bind(officer.id)
        .first();

      return c.json({
        success: true,
        message: `Jawatan utama ditetapkan kepada ${definition.nama}.`,
        data: saved,
      });
    } catch (e: any) {
      return c.json({ success: false, message: 'Gagal menetapkan jawatan utama: ' + e.message }, 500);
    }
  })

  // 3. UPDATE OFFICER (by id or e-mail)
  .put('/:id', async (c) => {
    const identifier = c.req.param('id');

    try {
      const body = await c.req.json();

      const current = await c.env.DB.prepare(
        'SELECT id, peranan FROM officers WHERE id = ? OR emel = ? COLLATE NOCASE LIMIT 1'
      )
        .bind(identifier, identifier)
        .first<{ id: string; peranan: string }>();

      if (!current) {
        return c.json({ success: false, message: 'Pegawai tidak dijumpai' }, 404);
      }

      const assignments: string[] = [];
      const params: unknown[] = [];
      const set = (column: string, value: unknown) => {
        assignments.push(`${column} = ?`);
        params.push(value);
      };

      if (body.nama !== undefined) set('nama', body.nama);
      if (body.emel !== undefined) set('emel', body.emel);
      if (body.jawatan !== undefined) set('jawatan', body.jawatan);
      if (body.gred !== undefined) set('gred', body.gred);
      if (body.grade !== undefined) set('gred', body.grade);
      if (body.telefon !== undefined) set('telefon', body.telefon);
      if (body.phone !== undefined) set('telefon', body.phone);
      if (body.sambungan !== undefined) set('sambungan', body.sambungan);
      if (body.ext !== undefined) set('sambungan', body.ext);
      if (body.role !== undefined) {
        const jawatanId = resolveRoleId(String(body.role));
        const jawatan = jawatanId ? roleDefinition(jawatanId) : null;

        // Segerak profil (cth. selepas log masuk) menghantar nilai sedia ada —
        // biarkan tanpa validasi jawatan supaya peranan sistem tidak ditolak.
        if (jawatan && jawatan.nama === current.peranan) {
          // tiada perubahan
        } else if (!jawatan || jawatan.kategori !== 'JAWATAN') {
          return c.json(
            {
              success: false,
              code: 'APPOINTMENT_REQUIRED',
              message:
                'Jawatan pegawai mesti salah satu jawatan hakiki. Pegawai Pemeriksa (PP) ialah lantikan — urus melalui menu Peranan & Lantikan.',
            },
            400
          );
        } else {
          set('peranan', jawatan.nama);
        }
      }
      if (body.status !== undefined) set('status', body.status);

      if (body.dept !== undefined) {
        const departmentId = await resolveDepartmentId(c.env.DB, body.dept);
        if (!departmentId) {
          return c.json({ success: false, message: `Jabatan '${body.dept}' tidak dijumpai` }, 400);
        }
        set('department_id', departmentId);
      }

      if (assignments.length > 0) {
        await c.env.DB.prepare(
          `UPDATE officers SET ${assignments.join(', ')}, updated_at = datetime('now') WHERE id = ?`
        )
          .bind(...params, current.id)
          .run();
      }

      const saved = await c.env.DB.prepare(`${OFFICER_SELECT} WHERE o.id = ?`)
        .bind(current.id)
        .first();

      return c.json({ success: true, message: 'Maklumat pegawai dikemaskini', data: saved });
    } catch (e: any) {
      const duplicate = /UNIQUE/i.test(e.message);
      return c.json(
        { success: false, message: duplicate ? 'E-mel pegawai telah wujud' : e.message },
        duplicate ? 409 : 500
      );
    }
  })

  // 4. DELETE OFFICER
  .delete('/:id', async (c) => {
    const identifier = c.req.param('id');

    try {
      const existing = await c.env.DB.prepare(
        'SELECT id FROM officers WHERE id = ? OR emel = ? COLLATE NOCASE LIMIT 1'
      )
        .bind(identifier, identifier)
        .first<{ id: string }>();

      if (!existing) {
        return c.json({ success: false, message: 'Pegawai tidak dijumpai' }, 404);
      }

      await c.env.DB.prepare('DELETE FROM officers WHERE id = ?').bind(existing.id).run();

      return c.json({ success: true, message: 'Pegawai berjaya dipadam' });
    } catch (e: any) {
      const referenced = /FOREIGN KEY/i.test(e.message);
      return c.json(
        {
          success: false,
          message: referenced
            ? 'Pegawai tidak boleh dipadam kerana masih dirujuk oleh lokasi atau jadual pemeriksaan'
            : e.message,
        },
        referenced ? 409 : 500
      );
    }
  });
