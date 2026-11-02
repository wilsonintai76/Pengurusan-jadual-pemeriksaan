import { API_BASE_URL } from './apiConfig';
import type { AppointmentSummary, RoleAssignment, UserSession } from './types';
import { normalizeRole } from './systemRoles';

const TOKEN_KEY = 'ejas_auth_token';
const USER_KEY = 'ejas_auth_user';

/**
 * Sesi disimpan dalam `sessionStorage`: pelayar mengosongkannya sendiri apabila tab/pelayar
 * ditutup, jadi token dan profil tidak kekal pada komputer kongsi. Kunci lama dalam
 * `localStorage` (sebelum perubahan ini) dibuang sekali supaya sesi lama tidak terus hidup.
 */
function sessionStore(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function purgeLegacyLocalSession(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch {
    // storan setempat tidak tersedia
  }
}

if (typeof window !== 'undefined') purgeLegacyLocalSession();

/** Selaras dengan `MIN_PASSWORD_LENGTH` pada Worker (`backend/src/lib/auth.ts`). */
export const MIN_PASSWORD_LENGTH = 8;

/** Dipancarkan apabila Worker menolak token (sesi tamat / tidak sah). */
export const UNAUTHORIZED_EVENT = 'ejas:unauthorized';

export interface AuthSession {
  token: string;
  expiresAt: string;
  user: UserSession;
  /** Kata laluan sementara dijana pentadbir — wajib ditukar sebelum portal digunakan. */
  mustChangePassword: boolean;
}

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly data?: unknown
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

export function getAuthToken(): string | null {
  try {
    return sessionStore()?.getItem(TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    const store = sessionStore();
    if (!store) return;
    if (token) store.setItem(TOKEN_KEY, token);
    else store.removeItem(TOKEN_KEY);
  } catch {
    // storan sesi tidak tersedia
  }
}

/** Profil pengguna yang disimpan bagi sesi tab ini (dikosongkan apabila tab ditutup). */
export function getSavedUser(): UserSession | null {
  try {
    const raw = sessionStore()?.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserSession) : null;
  } catch {
    return null;
  }
}

export function saveUser(user: UserSession | null): void {
  try {
    const store = sessionStore();
    if (!store) return;
    if (user) store.setItem(USER_KEY, JSON.stringify(user));
    else store.removeItem(USER_KEY);
  } catch {
    // storan sesi tidak tersedia
  }
}

/** Header `Authorization` untuk permintaan yang memerlukan sesi. */
export function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

export function clearSession(): void {
  setAuthToken(null);
  saveUser(null);
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof AuthApiError && error.status === 401;
}

interface AuthUserRow {
  id: string;
  nama: string;
  emel: string;
  gred?: string | null;
  telefon?: string | null;
  sambungan?: string | null;
  dept: string;
  role?: string | null;
  status?: string | null;
}

interface AuthSessionPayload {
  token: string;
  expiresAt: string;
  user: AuthUserRow;
  mustChangePassword?: boolean;
}

function toUserSession(row: AuthUserRow): UserSession {
  return {
    id: row.id,
    email: row.emel,
    name: row.nama,
    dept: row.dept,
    role: normalizeRole(row.role),
    grade: row.gred ?? undefined,
    phone: row.telefon ?? undefined,
    ext: row.sambungan ?? undefined,
    status: (row.status as UserSession['status']) ?? 'Aktif',
  };
}

function normalizeSession(payload: AuthSessionPayload): AuthSession {
  return {
    token: payload.token,
    expiresAt: payload.expiresAt,
    user: toUserSession(payload.user),
    mustChangePassword: Boolean(payload.mustChangePassword),
  };
}

async function authRequest<T>(path: string, body?: unknown, notifyUnauthorized = false): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AuthApiError(
      'Pelayan pengesahan tidak dapat dihubungi. Pastikan backend Worker (VITE_API_URL) sedang berjalan.',
      0,
      'NETWORK'
    );
  }

  if (notifyUnauthorized && response.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  const payload: any = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new AuthApiError(
      payload?.message || `Ralat pengesahan (${response.status}).`,
      response.status,
      payload?.code,
      payload?.data
    );
  }

  return (payload?.data ?? payload) as T;
}

function persist(payload: AuthSessionPayload): AuthSession {
  setAuthToken(payload.token);
  return normalizeSession(payload);
}

export async function login(username: string, password: string): Promise<AuthSession> {
  return persist(await authRequest<AuthSessionPayload>('/api/auth/login', { username, password }));
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await authRequest('/api/auth/password', { currentPassword, newPassword }, true);
}

export interface AuthMeta {
  user: UserSession;
  assignments: RoleAssignment[];
  appointment: AppointmentSummary | null;
  mustChangePassword: boolean;
}

/** Profil sesi + lantikan + tarikh luput pemeriksa (untuk UI gating). */
export async function fetchAuthMeta(): Promise<AuthMeta | null> {
  if (!getAuthToken()) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: { ...authHeaders() } });
    if (!response.ok) return null;

    const payload: any = await response.json().catch(() => null);
    const data = payload?.data;
    if (!data?.user) return null;

    return {
      user: toUserSession(data.user),
      assignments: (data.assignments ?? []) as RoleAssignment[],
      appointment: (data.appointment ?? null) as AppointmentSummary | null,
      mustChangePassword: Boolean(data.mustChangePassword),
    };
  } catch {
    return null;
  }
}
