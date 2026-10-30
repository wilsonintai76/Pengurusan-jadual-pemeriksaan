import type { SystemRole } from './types';

export type RoleKategori = 'JAWATAN' | 'LANTIKAN';

export interface RoleMeta {
  id: string;
  label: SystemRole;
  short: string;
  kategori: RoleKategori;
}

/**
 * Kamus peranan rasmi portal — dua dimensi berasingan:
 * - **JAWATAN**: jawatan hakiki HR (1 pegawai = 1), kekal sehingga ditukar.
 * - **LANTIKAN**: kuasa bertempoh (0..n), ada tarikh luput.
 *
 * Selaras dengan benih `roles` + `role_category` pada Worker
 * (`backend/src/lib/roles.ts`). `label` disimpan dalam `officers.peranan`.
 */
export const SYSTEM_ROLES: RoleMeta[] = [
  { id: 'KETUA_JABATAN', label: 'Ketua Jabatan / Unit (KJ/KU)', short: 'KJ/KU', kategori: 'JAWATAN' },
  { id: 'KETUA_PROGRAM', label: 'Ketua Program (KP)', short: 'KP', kategori: 'JAWATAN' },
  { id: 'PEGAWAI_ASET', label: 'Pegawai Aset (PA)', short: 'PA', kategori: 'JAWATAN' },
  {
    id: 'PENOLONG_PEGAWAI_ASET',
    label: 'Penolong Pegawai Aset Jabatan/Unit (PPAJ/PPAU)',
    short: 'PPAJ/PPAU',
    kategori: 'JAWATAN',
  },
  { id: 'PENYELIA_LOKASI', label: 'Penyelia Lokasi (PL)', short: 'PL', kategori: 'JAWATAN' },
  { id: 'PENSYARAH', label: 'Pensyarah / Pegawai Akademik', short: 'Pensyarah', kategori: 'JAWATAN' },
  { id: 'PEMERIKSA', label: 'Pegawai Pemeriksa (PP)', short: 'PP', kategori: 'LANTIKAN' },
  { id: 'PENTADBIR_SISTEM', label: 'Pentadbir Sistem', short: 'PS', kategori: 'LANTIKAN' },
];

/** Semua label peranan (untuk normalisasi / paparan). */
export const ROLE_LABELS: SystemRole[] = SYSTEM_ROLES.map((role) => role.label);

/** Jawatan hakiki — pilihan semasa pendaftaran pegawai. */
export const JAWATAN_ROLES: RoleMeta[] = SYSTEM_ROLES.filter((role) => role.kategori === 'JAWATAN');

/** Lantikan bertempoh — diberi melalui menu Peranan & Lantikan. */
export const LANTIKAN_ROLES: RoleMeta[] = SYSTEM_ROLES.filter((role) => role.kategori === 'LANTIKAN');

/** Label jawatan sahaja (5 + Pensyarah). */
export const ROLE_LABELS_JAWATAN: SystemRole[] = JAWATAN_ROLES.map((role) => role.label);

/** Pilihan jawatan semasa pendaftaran (PP & Pentadbir Sistem dikecualikan). */
export const REGISTRATION_ROLES: SystemRole[] = [...ROLE_LABELS_JAWATAN];

/** Jawatan lalai bagi staf akademik tanpa jawatan pentadbiran aset. */
export const DEFAULT_JAWATAN: SystemRole = 'Pensyarah / Pegawai Akademik';

const LEGACY_ALIASES: Record<string, string> = {
  'ketua jabatan': 'KETUA_JABATAN',
  'ketua jabatan/unit': 'KETUA_JABATAN',
  'ketua jabatan / unit': 'KETUA_JABATAN',
  kj: 'KETUA_JABATAN',
  ku: 'KETUA_JABATAN',
  'ketua program': 'KETUA_PROGRAM',
  kp: 'KETUA_PROGRAM',
  'pegawai aset': 'PEGAWAI_ASET',
  pa: 'PEGAWAI_ASET',
  pensyarah: 'PENSYARAH',
  'pensyarah (p)': 'PENSYARAH',
  'pegawai akademik': 'PENSYARAH',
  'pensyarah / pegawai akademik': 'PENSYARAH',
  'penolong pegawai aset': 'PENOLONG_PEGAWAI_ASET',
  'penolong pegawai aset jabatan/unit': 'PENOLONG_PEGAWAI_ASET',
  ppa: 'PENOLONG_PEGAWAI_ASET',
  ppaj: 'PENOLONG_PEGAWAI_ASET',
  ppau: 'PENOLONG_PEGAWAI_ASET',
  'penyelia lokasi': 'PENYELIA_LOKASI',
  pl: 'PENYELIA_LOKASI',
  'pegawai pemeriksa': 'PEMERIKSA',
  pemeriksa: 'PEMERIKSA',
  pp: 'PEMERIKSA',
  'pentadbir sistem': 'PENTADBIR_SISTEM',
  ps: 'PENTADBIR_SISTEM',
};

/** Id peranan (KETUA_JABATAN, …) daripada label lama/baharu. */
export function roleIdOf(value?: string | null): string | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  const byId = SYSTEM_ROLES.find((role) => role.id === upper);
  if (byId) return byId.id;

  const byLabel = SYSTEM_ROLES.find((role) => role.label.toLowerCase() === raw.toLowerCase());
  if (byLabel) return byLabel.id;

  const withoutAbbrev = raw.replace(/\([^)]*\)/g, '').trim().toLowerCase();
  return LEGACY_ALIASES[raw.toLowerCase()] ?? LEGACY_ALIASES[withoutAbbrev] ?? null;
}

export function roleMeta(value?: string | null): RoleMeta | null {
  const id = roleIdOf(value);
  return SYSTEM_ROLES.find((role) => role.id === id) ?? null;
}

export function roleKategori(value?: string | null): RoleKategori | null {
  return roleMeta(value)?.kategori ?? null;
}

/** Label rasmi daripada nilai peranan apa pun (legacy atau baharu). */
export function normalizeRole(value?: string | null, fallback: SystemRole = DEFAULT_JAWATAN): SystemRole {
  return roleMeta(value)?.label ?? fallback;
}

/** Lencana ringkas (KJ/KU, KP, PA, PPAJ/PPAU, PL, Pensyarah, PP, PS). */
export function roleShort(value?: string | null): string {
  return roleMeta(value)?.short ?? '—';
}

/** Semak sama ada nilai peranan sepadan dengan id tertentu. */
export function isRole(value: string | null | undefined, roleId: string): boolean {
  return roleIdOf(value) === roleId;
}
