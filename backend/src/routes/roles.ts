import { Hono } from 'hono';
import { resolveDepartmentId } from '../lib/db';
import {
  ROLE_DEFINITIONS,
  assignRole,
  getAssignment,
  listAssignments,
  resolveRoleId,
  roleDefinition,
  type ScopeType,
} from '../lib/roles';
import { getAuthUser, requireRole, type AppEnv } from '../middleware/auth';

const VALID_SCOPES: ScopeType[] = ['GLOBAL', 'DEPARTMENT', 'LOCATION'];
const todayIso = () => new Date().toISOString().slice(0, 10);

async function resolveOfficerId(
  db: AppEnv['Bindings']['DB'],
  officerId?: string | null,
  email?: string | null
): Promise<{ id: string; departmentId: string } | null> {
  if (officerId) {
    return db
      .prepare('SELECT id, department_id AS departmentId FROM officers WHERE id = ? LIMIT 1')
      .bind(officerId)
      .first<{ id: string; departmentId: string }>();
  }
  if (email) {
    return db
      .prepare(
        'SELECT id, department_id AS departmentId FROM officers WHERE emel = ? COLLATE NOCASE LIMIT 1'
      )
      .bind(email)
      .first<{ id: string; departmentId: string }>();
  }
  return null;
}

/** Kamus peranan PBAC (baca sahaja, terbuka untuk pelawat). */
export const rolesRoute = new Hono<AppEnv>().get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT r.id, r.nama, r.scope_type AS scopeType, r.default_tenure_months AS defaultTenureMonths,
              r.keterangan, COALESCE(rc.kategori, 'LANTIKAN') AS kategori
       FROM roles r
       LEFT JOIN role_category rc ON rc.role_id = r.id
       ORDER BY COALESCE(rc.kategori, 'LANTIKAN') ASC, r.nama ASC`
    ).all();

    const data = results?.length ? results : ROLE_DEFINITIONS;
    return c.json({ success: true, total: data.length, data });
  } catch {
    return c.json({ success: true, total: ROLE_DEFINITIONS.length, data: ROLE_DEFINITIONS });
  }
});

export const roleAssignmentsRoute = new Hono<AppEnv>()

  // 1. SENARAI LANTIKAN (pilihan: officerId / email / roleId / status)
  .get('/', async (c) => {
    try {
      const email = c.req.query('email');
      const officer = await resolveOfficerId(c.env.DB, c.req.query('officerId'), email);

      if ((c.req.query('officerId') || email) && !officer) {
        return c.json({ success: false, code: 'UNKNOWN_OFFICER', message: 'Pegawai tidak dijumpai.' }, 404);
      }

      const data = await listAssignments(c.env.DB, {
        officerId: officer?.id,
        roleId: c.req.query('roleId') ?? undefined,
        status: c.req.query('status') ?? undefined,
      });

      return c.json({ success: true, total: data.length, data });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat mendapatkan lantikan: ' + e.message }, 500);
    }
  })

  // 2. TAMBAH LANTIKAN (pentadbir sistem sahaja)
  .post('/', requireRole('PENTADBIR_SISTEM'), async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const roleId = resolveRoleId(body?.roleId ?? body?.role);
      if (!roleId) {
        return c.json(
          {
            success: false,
            code: 'UNKNOWN_ROLE',
            message: `Peranan '${body?.roleId ?? body?.role ?? ''}' tidak sah.`,
          },
          400
        );
      }

      const definition = roleDefinition(roleId);
      if (!definition) {
        return c.json({ success: false, code: 'UNKNOWN_ROLE', message: 'Peranan tidak sah.' }, 400);
      }

      const officer = await resolveOfficerId(c.env.DB, body?.officerId, body?.officerEmail ?? body?.emel);
      if (!officer) {
        return c.json({ success: false, code: 'UNKNOWN_OFFICER', message: 'Pegawai tidak dijumpai.' }, 404);
      }

      const scopeType = (String(body?.scopeType ?? definition.scopeType).toUpperCase() as ScopeType) ?? definition.scopeType;
      if (!VALID_SCOPES.includes(scopeType)) {
        return c.json(
          { success: false, code: 'INVALID_SCOPE', message: `Skop '${scopeType}' tidak sah.` },
          400
        );
      }

      let scopeId: string | null = null;
      if (scopeType === 'DEPARTMENT') {
        scopeId =
          (await resolveDepartmentId(c.env.DB, body?.scopeId ?? officer.departmentId)) ?? null;
        if (!scopeId) {
          return c.json(
            { success: false, code: 'UNKNOWN_DEPARTMENT', message: 'Jabatan skop tidak dijumpai.' },
            400
          );
        }
      } else if (scopeType === 'LOCATION') {
        const location = await c.env.DB.prepare('SELECT id FROM locations WHERE id = ? LIMIT 1')
          .bind(String(body?.scopeId ?? ''))
          .first<{ id: string }>();
        if (!location) {
          return c.json(
            { success: false, code: 'UNKNOWN_LOCATION', message: 'Lokasi skop tidak dijumpai.' },
            400
          );
        }
        scopeId = location.id;
      }

      const auth = getAuthUser(c);
      const result = await assignRole(c.env.DB, {
        officerId: officer.id,
        roleId,
        scopeType,
        scopeId,
        validFrom: body?.validFrom ?? null,
        validTo: body?.validTo ?? null,
        createdById: auth?.id ?? null,
        notes: body?.notes ?? null,
      });

      return c.json(
        {
          success: true,
          message: result.created
            ? `Lantikan ${definition.nama} berjaya ditambah.`
            : `Lantikan ${definition.nama} bagi skop ini sudah aktif.`,
          data: result.assignment,
        },
        result.created ? 201 : 200
      );
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat menambah lantikan: ' + e.message }, 500);
    }
  })

  // 3. TAMATKAN / PERBAHARUI LANTIKAN (pentadbir sistem sahaja)
  .put('/:id', requireRole('PENTADBIR_SISTEM'), async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json().catch(() => ({}));
      const action = String(body?.action ?? 'end').toLowerCase();

      const current = await getAssignment(c.env.DB, id);
      if (!current) {
        return c.json({ success: false, code: 'NOT_FOUND', message: 'Lantikan tidak dijumpai.' }, 404);
      }

      if (action === 'end') {
        if (current.status === 'DITAMATKAN') {
          return c.json(
            { success: false, code: 'ALREADY_ENDED', message: 'Lantikan ini telah ditamatkan.' },
            409
          );
        }

        const validTo = String(body?.validTo ?? todayIso());
        await c.env.DB.prepare(
          `UPDATE role_assignments
           SET status = 'DITAMATKAN', valid_to = ?, updated_at = datetime('now')
           WHERE id = ?`
        )
          .bind(validTo, id)
          .run();

        return c.json({
          success: true,
          message: 'Lantikan ditamatkan. Rekod sejarah dikekalkan.',
          data: await getAssignment(c.env.DB, id),
        });
      }

      if (action === 'renew') {
        const validFrom = String(body?.validFrom ?? todayIso());

        // Pembaharuan = baris baharu; lantikan lama ditutup pada tarikh mula baharu.
        await c.env.DB.prepare(
          `UPDATE role_assignments
           SET status = 'DITAMATKAN', valid_to = ?, updated_at = datetime('now')
           WHERE id = ?`
        )
          .bind(validFrom, id)
          .run();

        const auth = getAuthUser(c);
        const result = await assignRole(c.env.DB, {
          officerId: current.officerId,
          roleId: current.roleId,
          scopeType: current.scopeType,
          scopeId: current.scopeId,
          validFrom,
          validTo: body?.validTo ?? null,
          createdById: auth?.id ?? null,
          notes: body?.notes ?? `Pembaharuan lantikan ${current.roleName}`,
        });

        return c.json(
          { success: true, message: 'Lantikan diperbaharui sebagai rekod baharu.', data: result.assignment },
          201
        );
      }

      return c.json(
        { success: false, code: 'INVALID_ACTION', message: "Tindakan mesti 'end' atau 'renew'." },
        400
      );
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat mengemas kini lantikan: ' + e.message }, 500);
    }
  });
