import { resolveDepartmentId, type DB } from './db';
import { resolveRoleId } from './roles';

/** Unit pentadbiran sistem — bukan unit operasi, tidak menerima pegawai operasi. */
export const SYSTEM_DEPARTMENT_ID = 'SISTEM';

export interface DepartmentResolution {
  departmentId?: string;
  error?: { code: string; message: string };
}

/**
 * Menentukan jabatan sebenar bagi pendaftaran pegawai:
 * - `Pentadbir Sistem` sentiasa diletakkan dalam unit SISTEM.
 * - Unit bukan operasi (SISTEM) tidak menerima pegawai operasi.
 */
export async function resolveRegistrationDepartment(
  db: DB,
  requested: string,
  roleValue: string
): Promise<DepartmentResolution> {
  if (resolveRoleId(roleValue) === 'PENTADBIR_SISTEM') {
    const system = await db
      .prepare('SELECT id FROM departments WHERE id = ? LIMIT 1')
      .bind(SYSTEM_DEPARTMENT_ID)
      .first<{ id: string }>();
    if (!system) {
      return {
        error: {
          code: 'SYSTEM_UNIT_MISSING',
          message: 'Unit SISTEM belum disediakan. Hubungi pentadbir sistem.',
        },
      };
    }
    return { departmentId: system.id };
  }

  const departmentId = await resolveDepartmentId(db, requested);
  if (!departmentId) {
    return {
      error: { code: 'UNKNOWN_DEPARTMENT', message: `Jabatan '${requested}' tidak dijumpai.` },
    };
  }

  const settings = await db
    .prepare(
      `SELECT COALESCE(ds.is_operational, 1) AS is_operational
       FROM departments d
       LEFT JOIN department_settings ds ON ds.department_id = d.id
       WHERE d.id = ?
       LIMIT 1`
    )
    .bind(departmentId)
    .first<{ is_operational: number }>();
  if (settings && !settings.is_operational) {
    return {
      error: {
        code: 'NON_OPERATIONAL_UNIT',
        message: `Unit '${departmentId}' bukan unit operasi dan tidak menerima pendaftaran pegawai.`,
      },
    };
  }

  return { departmentId };
}
