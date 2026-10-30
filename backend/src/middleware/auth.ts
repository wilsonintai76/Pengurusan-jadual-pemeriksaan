import type { Context, MiddlewareHandler } from 'hono';
import type { Bindings } from '../types';
import { getSecret, verifyToken, type AuthUser } from '../lib/auth';

export interface AuthVariables {
  auth?: AuthUser;
}

export type AppEnv = { Bindings: Bindings; Variables: AuthVariables };

const OFFICER_QUERY = `
  SELECT id, nama, emel, peranan AS role, department_id AS dept
  FROM officers
  WHERE id = ?
  LIMIT 1
`;

/**
 * Mewajibkan token sesi yang sah. Pegawai dimuatkan semula daripada D1 pada
 * setiap permintaan supaya perubahan peranan/jabatan berkuat kuasa serta-merta.
 */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const secret = getSecret(c.env);
  if (!secret) {
    return c.json(
      {
        success: false,
        code: 'AUTH_NOT_CONFIGURED',
        message:
          'Pengesahan belum dikonfigurasi pada Worker. Tetapkan JWT_SECRET melalui `wrangler secret put JWT_SECRET`.',
      },
      503
    );
  }

  const header = c.req.header('authorization') ?? '';
  if (!header.toLowerCase().startsWith('bearer ')) {
    return c.json(
      {
        success: false,
        code: 'UNAUTHENTICATED',
        message: 'Sesi tidak sah. Sila log masuk ke portal.',
      },
      401
    );
  }

  const payload = await verifyToken(header.slice(7).trim(), secret);
  if (!payload) {
    return c.json(
      {
        success: false,
        code: 'SESSION_EXPIRED',
        message: 'Sesi telah tamat. Sila log masuk semula.',
      },
      401
    );
  }

  const officer = await c.env.DB.prepare(OFFICER_QUERY).bind(payload.sub).first<AuthUser>();
  if (!officer) {
    return c.json(
      {
        success: false,
        code: 'UNAUTHENTICATED',
        message: 'Akaun pegawai tidak dijumpai dalam direktori.',
      },
      401
    );
  }

  c.set('auth', officer);
  await next();
};

export function getAuthUser(c: Context<AppEnv>): AuthUser | null {
  return c.get('auth') ?? null;
}

/**
 * Menghadkan laluan kepada pegawai yang memegang peranan tertentu pada hari ini.
 * Digunakan selain `requireAuth` (yang hanya mengesahkan identiti).
 */
export const requireRole = (roleId: string): MiddlewareHandler<AppEnv> => async (c, next) => {
  const auth = getAuthUser(c);
  if (!auth) {
    return c.json(
      { success: false, code: 'UNAUTHENTICATED', message: 'Sesi tidak sah. Sila log masuk ke portal.' },
      401
    );
  }

  const row = await c.env.DB.prepare(
    `SELECT 1 AS ok FROM role_assignments
     WHERE officer_id = ? AND role_id = ? AND status = 'AKTIF'
       AND valid_from <= date('now') AND (valid_to IS NULL OR valid_to >= date('now'))
     LIMIT 1`
  )
    .bind(auth.id, roleId)
    .first<{ ok: number }>();

  if (!row) {
    return c.json(
      {
        success: false,
        code: 'FORBIDDEN',
        message: `Akses ditolak: tindakan ini memerlukan peranan ${roleId}.`,
      },
      403
    );
  }

  await next();
};
