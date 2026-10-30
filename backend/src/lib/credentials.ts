import type { D1Database } from '@cloudflare/workers-types';
import type { Bindings } from '../types';
import { createSalt, hashPassword, resolveIterations } from './auth';

/** Domain emel rasmi bagi nama pengguna yang dijana automatik. */
export const ACCOUNT_EMAIL_DOMAIN = 'poliku.edu.my';

export interface IssuedCredentials {
  username: string;
  emel: string;
  temporaryPassword: string;
}

interface CredentialRow {
  officer_id: string;
  salt: string;
  password_hash: string;
  iterations: number;
}

/** Gelaran/awalan yang dibuang sebelum membentuk nama pengguna. */
const NAME_PREFIXES = new Set([
  'ts',
  'dr',
  'hj',
  'hjh',
  'hajah',
  'haji',
  'ir',
  'prof',
  'profesor',
  'encik',
  'cik',
  'puan',
  'tuan',
  'dato',
  'datuk',
  'mejar',
]);

function normalizeToken(token: string): string {
  return token
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Membentuk asas nama pengguna deterministik daripada nama penuh:
 * dua token bermakna pertama, contoh "Ts. Mohd Fadzli (DH44)" → "mohd.fadzli".
 */
export function usernameBaseFromName(nama: string): string {
  const withoutGrade = nama.replace(/\([^)]*\)/g, ' ');
  const tokens = withoutGrade
    .split(/\s+/)
    .map(normalizeToken)
    .filter((token) => token.length > 1 && !NAME_PREFIXES.has(token));

  if (!tokens.length) return 'pegawai';
  if (tokens.length === 1) return tokens[0];
  return `${tokens[0]}.${tokens[1]}`;
}

/** Kata laluan sementara yang kukuh, tanpa aksara mengelirukan (0/O, 1/l/I). */
export function generateTemporaryPassword(length = 14): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*?';
  const pool = upper + lower + digits + symbols;

  const randomInt = (max: number): number => {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] % max;
  };
  const pick = (chars: string): string => chars[randomInt(chars.length)];

  // Satu aksara daripada setiap kelas dahulu, kemudian penuhkan secara rawak.
  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const rest = Array.from({ length: Math.max(0, length - required.length) }, () => pick(pool));
  const all = [...required, ...rest];

  for (let i = all.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [all[i], all[j]] = [all[j], all[i]];
  }

  return all.join('');
}

async function usernameTaken(db: D1Database, username: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 AS taken FROM officers
       WHERE lower(emel) = lower(?)
          OR lower(substr(emel, 1, instr(emel, '@') - 1)) = lower(?)
       LIMIT 1`
    )
    .bind(`${username}@${ACCOUNT_EMAIL_DOMAIN}`, username)
    .first<{ taken: number }>();
  return Boolean(row);
}

/** Nama pengguna unik daripada nama penuh (`mohd.fadzli`, `mohd.fadzli2`, …). */
export async function generateUniqueUsername(db: D1Database, nama: string): Promise<string> {
  const base = usernameBaseFromName(nama);
  if (!(await usernameTaken(db, base))) return base;

  for (let suffix = 2; suffix <= 99; suffix += 1) {
    const candidate = `${base}${suffix}`;
    if (!(await usernameTaken(db, candidate))) return candidate;
  }

  return `${base}${Date.now().toString(36)}`;
}

export async function readCredential(
  db: D1Database,
  officerId: string
): Promise<CredentialRow | null> {
  return db
    .prepare(
      'SELECT officer_id, salt, password_hash, iterations FROM officer_credentials WHERE officer_id = ?'
    )
    .bind(officerId)
    .first<CredentialRow>();
}

export async function writeCredential(
  env: Bindings,
  officerId: string,
  emel: string,
  password: string
): Promise<void> {
  const iterations = resolveIterations(env);
  const salt = createSalt();
  const hash = await hashPassword(password, salt, iterations);

  await env.DB.prepare(
    `INSERT INTO officer_credentials (officer_id, emel, password_hash, salt, iterations, activated_at, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(officer_id) DO UPDATE SET
       emel = excluded.emel,
       password_hash = excluded.password_hash,
       salt = excluded.salt,
       iterations = excluded.iterations,
       updated_at = datetime('now')`
  )
    .bind(officerId, emel, hash, salt, iterations)
    .run();
}

/** Menjana dan menyimpan kredensial baharu untuk pegawai sedia ada. */
export async function issueCredentials(
  env: Bindings,
  officerId: string,
  emel: string,
  issuedBy?: string | null
): Promise<{ username: string; temporaryPassword: string; mustChangePassword: boolean }> {
  const temporaryPassword = generateTemporaryPassword();
  await writeCredential(env, officerId, emel, temporaryPassword);
  await setMustChangePassword(env.DB, officerId, true, issuedBy ?? null);
  return {
    username: emel.split('@')[0],
    temporaryPassword,
    mustChangePassword: true,
  };
}

/** Tetapkan bendera "wajib tukar kata laluan" bagi pegawai. */
export async function setMustChangePassword(
  db: D1Database,
  officerId: string,
  mustChange: boolean,
  issuedBy?: string | null
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO credential_flags (officer_id, must_change, issued_by, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(officer_id) DO UPDATE SET
         must_change = excluded.must_change,
         issued_by = excluded.issued_by,
         updated_at = datetime('now')`
    )
    .bind(officerId, mustChange ? 1 : 0, issuedBy ?? null)
    .run();
}

/** Adakah pegawai masih perlu menukar kata laluan sementara? */
export async function mustChangePassword(db: D1Database, officerId: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT must_change FROM credential_flags WHERE officer_id = ? LIMIT 1')
    .bind(officerId)
    .first<{ must_change: number }>();
  return Boolean(row?.must_change);
}
