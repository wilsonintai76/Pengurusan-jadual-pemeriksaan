import { Hono } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';
import type { Bindings } from '../types';
import { getAuthUser, requireAuth, type AppEnv } from '../middleware/auth';
import { listAssignmentsForOfficer, resolveDisplayRole } from '../lib/roles';
import { summarizeInspectorAppointment } from '../lib/policies';
import { mustChangePassword, readCredential, setMustChangePassword, writeCredential } from '../lib/credentials';
import {
  MIN_PASSWORD_LENGTH,
  getSecret,
  signToken,
  verifyPassword,
} from '../lib/auth';

const PROFILE_SELECT = `
  SELECT
    o.id,
    o.nama,
    o.emel,
    o.gred,
    o.telefon,
    o.sambungan,
    o.department_id AS dept,
    o.peranan AS role,
    o.status
  FROM officers o
  WHERE o.id = ?
  LIMIT 1
`;

interface OfficerRow {
  id: string;
  nama: string;
  emel: string;
  role: string;
  dept: string;
}

const notConfigured = () => ({
  success: false as const,
  code: 'AUTH_NOT_CONFIGURED',
  message:
    'Pengesahan belum dikonfigurasi pada Worker. Tetapkan JWT_SECRET melalui `wrangler secret put JWT_SECRET`.',
});

/** Cari pegawai melalui emel penuh atau bahagian sebelum `@`. */
async function findOfficerByUsername(db: D1Database, username: string): Promise<OfficerRow | null> {
  return db
    .prepare(
      `SELECT o.id, o.nama, o.emel, o.peranan AS role, o.department_id AS dept
       FROM officers o
       WHERE o.emel = ? COLLATE NOCASE
          OR lower(substr(o.emel, 1, instr(o.emel, '@') - 1)) = lower(?)
       LIMIT 1`
    )
    .bind(username, username)
    .first<OfficerRow>();
}

async function loadProfile(db: D1Database, officerId: string) {
  const profile = await db.prepare(PROFILE_SELECT).bind(officerId).first<{ role?: string }>();
  if (!profile) return profile;

  // Label jawatan diterbitkan daripada lantikan aktif supaya tidak boleh menyimpang.
  const assignments = await listAssignmentsForOfficer(db as never, officerId);
  const today = new Date().toISOString().slice(0, 10);
  const active = assignments
    .filter((assignment) => assignment.status === 'AKTIF')
    .filter(
      (assignment) =>
        assignment.validFrom <= today && (!assignment.validTo || assignment.validTo >= today)
    )
    .map((assignment) => ({ roleId: assignment.roleId, roleName: assignment.roleName }));

  return { ...profile, role: resolveDisplayRole(active, profile.role) };
}

async function issueSession(env: Bindings, officer: OfficerRow) {
  const secret = getSecret(env);
  if (!secret) return null;

  const { token, expiresAt } = await signToken({ id: officer.id, emel: officer.emel }, secret);
  const user = await loadProfile(env.DB, officer.id);
  return { token, expiresAt, user };
}

export const authRoute = new Hono<AppEnv>()

  // 1. LOG MASUK (nama pengguna + kata laluan)
  .post('/login', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const username = String(body?.username ?? '').trim();
      const password = String(body?.password ?? '');

      if (!username || !password) {
        return c.json(
          { success: false, code: 'INVALID_INPUT', message: 'Nama pengguna dan kata laluan wajib diisi.' },
          400
        );
      }

      const officer = await findOfficerByUsername(c.env.DB, username);
      if (!officer) {
        return c.json(
          {
            success: false,
            code: 'UNKNOWN_USER',
            message: 'Nama pengguna tidak ditemui dalam direktori pegawai.',
          },
          404
        );
      }

      const credential = await readCredential(c.env.DB, officer.id);
      if (!credential) {
        return c.json(
          {
            success: false,
            code: 'ACTIVATION_REQUIRED',
            message:
              'Akaun ini belum mempunyai kata laluan. Hubungi Pentadbir Sistem untuk menjana kata laluan sementara.',
            data: { email: officer.emel, name: officer.nama },
          },
          409
        );
      }

      const valid = await verifyPassword(
        password,
        credential.salt,
        credential.iterations,
        credential.password_hash
      );
      if (!valid) {
        return c.json(
          { success: false, code: 'INVALID_PASSWORD', message: 'Kata laluan tidak sah.' },
          401
        );
      }

      const session = await issueSession(c.env, officer);
      if (!session) return c.json(notConfigured(), 503);

      const mustChange = await mustChangePassword(c.env.DB, officer.id);
      return c.json({
        success: true,
        message: mustChange
          ? 'Log masuk berjaya. Sila tukar kata laluan sementara anda.'
          : 'Log masuk berjaya.',
        data: { ...session, mustChangePassword: mustChange },
      });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat log masuk: ' + e.message }, 500);
    }
  })

  // 2. PENDAFTARAN DIRI DIMATIKAN (akaun hanya dicipta oleh Pentadbir Sistem)
  .post('/register', (c) =>
    c.json(
      {
        success: false,
        code: 'SELF_REGISTRATION_DISABLED',
        message:
          'Pendaftaran sendiri dimatikan. Akaun pegawai hanya didaftarkan oleh Pentadbir Sistem melalui Direktori Pegawai.',
      },
      403
    )
  )

  .post('/activate', (c) =>
    c.json(
      {
        success: false,
        code: 'SELF_REGISTRATION_DISABLED',
        message:
          'Pengaktifan sendiri dimatikan. Nama pengguna dan kata laluan dijana oleh Pentadbir Sistem semasa pendaftaran.',
      },
      403
    )
  )
  
  // 3. PROFIL SESI SEMASA
  .get('/me', requireAuth, async (c) => {
    const auth = getAuthUser(c);
    if (!auth) {
      return c.json({ success: false, code: 'UNAUTHENTICATED', message: 'Sesi tidak sah.' }, 401);
    }

    const user = await loadProfile(c.env.DB, auth.id);
    const assignments = await listAssignmentsForOfficer(c.env.DB, auth.id);

    return c.json({
      success: true,
      data: {
        user,
        assignments,
        appointment: summarizeInspectorAppointment(assignments),
        mustChangePassword: await mustChangePassword(c.env.DB, auth.id),
      },
    });
  })

  // 4. TUKAR KATA LALUAN (sesi sendiri)
  .post('/password', requireAuth, async (c) => {
    try {
      const auth = getAuthUser(c);
      if (!auth) {
        return c.json({ success: false, code: 'UNAUTHENTICATED', message: 'Sesi tidak sah.' }, 401);
      }

      const body = await c.req.json().catch(() => ({}));
      const currentPassword = String(body?.currentPassword ?? '');
      const newPassword = String(body?.newPassword ?? '');

      if (!currentPassword) {
        return c.json(
          { success: false, code: 'INVALID_INPUT', message: 'Sila masukkan kata laluan semasa.' },
          400
        );
      }
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        return c.json(
          {
            success: false,
            code: 'WEAK_PASSWORD',
            message: `Kata laluan baharu mestilah sekurang-kurangnya ${MIN_PASSWORD_LENGTH} aksara.`,
          },
          400
        );
      }

      const credential = await readCredential(c.env.DB, auth.id);
      if (!credential) {
        return c.json(
          { success: false, code: 'ACTIVATION_REQUIRED', message: 'Akaun belum diaktifkan.' },
          409
        );
      }

      const valid = await verifyPassword(
        currentPassword,
        credential.salt,
        credential.iterations,
        credential.password_hash
      );
      if (!valid) {
        return c.json(
          { success: false, code: 'INVALID_PASSWORD', message: 'Kata laluan semasa tidak sah.' },
          401
        );
      }

      await writeCredential(c.env, auth.id, auth.emel, newPassword);
      await setMustChangePassword(c.env.DB, auth.id, false, null);
      return c.json({ success: true, message: 'Kata laluan berjaya dikemaskini.' });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat menukar kata laluan: ' + e.message }, 500);
    }
  });
