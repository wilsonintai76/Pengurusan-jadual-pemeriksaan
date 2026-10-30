import type { Bindings } from '../types';

/** Identiti pemanggil yang telah disahkan oleh `requireAuth`. */
export interface AuthUser {
  id: string;
  nama: string;
  emel: string;
  role: string;
  dept: string;
}

export interface TokenPayload {
  sub: string;
  emel: string;
  iat: number;
  exp: number;
}

/**
 * Laluan terendah masih diterima untuk kata laluan. Workers Free mempunyai had
 * CPU 10ms; nilai boleh dinaikkan melalui `AUTH_ITERATIONS` jika akaun
 * menggunakan had CPU yang lebih tinggi.
 */
const DEFAULT_ITERATIONS = 25_000;
const MIN_ITERATIONS = 10_000;
const KEY_LENGTH_BITS = 256;
const SALT_BYTES = 16;
const TOKEN_HEADER = { alg: 'HS256', typ: 'JWT' } as const;

export const TOKEN_TTL_SECONDS = 8 * 60 * 60;
export const MIN_PASSWORD_LENGTH = 8;

export function resolveIterations(env: Bindings): number {
  const raw = Number((env as Bindings & { AUTH_ITERATIONS?: string }).AUTH_ITERATIONS);
  return Number.isFinite(raw) && raw >= MIN_ITERATIONS ? Math.floor(raw) : DEFAULT_ITERATIONS;
}

/** Rahsia penandatangan token; `null` apabila Worker belum dikonfigurasi. */
export function getSecret(env: Bindings): string | null {
  const secret = (env.JWT_SECRET ?? '').trim();
  return secret.length >= 16 ? secret : null;
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeText(value: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    Math.ceil(value.length / 4) * 4,
    '='
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Perbandingan pemalar-masa untuk elak kebocoran melalui tempoh perbandingan. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function createSalt(): string {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  return toHex(salt.buffer as ArrayBuffer);
}

export async function hashPassword(
  password: string,
  salt: string,
  iterations: number
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(salt), iterations },
    key,
    KEY_LENGTH_BITS
  );

  return toHex(bits);
}

export async function verifyPassword(
  password: string,
  salt: string,
  iterations: number,
  expectedHash: string
): Promise<boolean> {
  const hash = await hashPassword(password, salt, iterations);
  return timingSafeEqual(hash, expectedHash);
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/** Menjana token sesi bertandatangan HS256 (format JWT). */
export async function signToken(
  subject: { id: string; emel: string },
  secret: string,
  ttlSeconds = TOKEN_TTL_SECONDS
): Promise<{ token: string; expiresAt: string }> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: subject.id,
    emel: subject.emel,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
  };

  const header = base64UrlEncodeText(JSON.stringify(TOKEN_HEADER));
  const body = base64UrlEncodeText(JSON.stringify(payload));
  const signature = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(secret),
    new TextEncoder().encode(`${header}.${body}`)
  );

  return {
    token: `${header}.${body}.${base64UrlEncodeBytes(new Uint8Array(signature))}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}

/** Mengesahkan tandatangan dan tempoh token; `null` jika tidak sah. */
export async function verifyToken(token: string, secret: string): Promise<TokenPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      base64UrlDecode(signature),
      new TextEncoder().encode(`${header}.${body}`)
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body))) as TokenPayload;
    if (!payload?.sub || !payload.exp) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}
