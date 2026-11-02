import type { DB } from './db';
import { isActiveOn, listAssignmentsForOfficer, roleDefinition, type AssignmentRow } from './roles';

/**
 * Enjin capaian PBAC — satu sumber kebenaran untuk memetakan
 * (peranan × skop × tempoh) kepada senarai kebenaran yang boleh diaudit.
 *
 * Kebenaran disimpan sebagai data, bukan sebagai `if (role === ...)` bertaburan,
 * supaya UI boleh memaparkan "apa yang boleh dibuat pegawai ini" dan semakan
 * pada Worker boleh merujuk senarai yang sama.
 */
export interface PermissionDef {
  kunci: string;
  label: string;
  modul: string;
}

/** Kebenaran asas: mana-mana pegawai yang telah log masuk. */
export const BASE_PERMISSIONS = [
  'lokasi.lihat',
  'jadual.lihat',
  'pegawai.lihat',
  'laporan.lihat',
] as const;

export const PERMISSION_CATALOG: PermissionDef[] = [
  { kunci: 'lokasi.lihat', label: 'Lihat direktori lokasi & ruang', modul: 'Lokasi' },
  { kunci: 'lokasi.urus', label: 'Daftar / kemaskini ruang', modul: 'Lokasi' },
  { kunci: 'kewpa7.muatnaik', label: 'Muat naik KEW.PA-7', modul: 'Lokasi' },
  { kunci: 'jadual.lihat', label: 'Lihat jadual pemeriksaan', modul: 'Jadual' },
  { kunci: 'jadual.urus', label: 'Cipta / ubah jadual pemeriksaan', modul: 'Jadual' },
  { kunci: 'jadual.tuntut', label: 'Tuntut slot pemeriksaan', modul: 'Pemeriksaan' },
  { kunci: 'pemeriksaan.sah', label: 'Sahkan dapatan (KEW.PA-11)', modul: 'Pemeriksaan' },
  { kunci: 'pegawai.lihat', label: 'Lihat direktori pegawai', modul: 'Pegawai' },
  { kunci: 'pegawai.urus', label: 'Daftar pegawai jabatan sendiri', modul: 'Pegawai' },
  { kunci: 'pegawai.kredensial', label: 'Jana semula kata laluan pegawai', modul: 'Pegawai' },
  { kunci: 'lantikan.urus', label: 'Beri / tamatkan lantikan', modul: 'Pentadbiran' },
  { kunci: 'tetapan.urus', label: 'Ubah tetapan sistem', modul: 'Pentadbiran' },
  { kunci: 'kalendar.urus', label: 'Ubah takwim tahunan', modul: 'Pentadbiran' },
  { kunci: 'kitaran.urus', label: 'Urus kitaran pemeriksaan', modul: 'Pentadbiran' },
  { kunci: 'audit.lihat', label: 'Lihat jejak audit PBAC', modul: 'Pentadbiran' },
  { kunci: 'laporan.lihat', label: 'Lihat / kompilasi laporan', modul: 'Laporan' },
];

/**
 * Pemetaan peranan → kebenaran. Selaras dengan semakan sebenar pada Worker:
 * `LOCATION_MANAGER_ROLES` (locations/schedules), `bolehUrusPegawaiJabatan`
 * (officers), `evaluateVerification` (schedules verify) dan `requireRole`
 * (tetapan, kalendar, kitaran, audit, kredensial).
 */
const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  PENTADBIR_SISTEM: PERMISSION_CATALOG.map((item) => item.kunci),
  KETUA_JABATAN: [
    'lokasi.urus',
    'kewpa7.muatnaik',
    'jadual.urus',
    'pemeriksaan.sah',
    'pegawai.urus',
  ],
  PENOLONG_PEGAWAI_ASET: ['lokasi.urus', 'kewpa7.muatnaik', 'jadual.urus', 'pegawai.urus'],
  PENYELIA_LOKASI: ['lokasi.urus', 'kewpa7.muatnaik', 'jadual.urus'],
  PEMERIKSA: ['jadual.tuntut', 'pemeriksaan.sah'],
  KETUA_PROGRAM: [],
  PEGAWAI_ASET: [],
  PENSYARAH: [],
};

/** Peranan yang memberi akses pentadbiran menyeluruh (skop GLOBAL). */
const GLOBAL_ROLES = new Set(['PENTADBIR_SISTEM']);

export interface ResolvedPermission extends PermissionDef {
  /** Peranan yang menjadi punca kebenaran ini (kosong = kebenaran asas). */
  melalui: string[];
}

export interface ResolvedAccess {
  officer: {
    id: string;
    nama: string;
    emel: string;
    dept: string;
    status: string;
  };
  peranan: Array<{
    roleId: string;
    roleName: string;
    kategori: string;
    scopeType: string;
    scopeId: string | null;
    validFrom: string;
    validTo: string | null;
  }>;
  skop: { global: boolean; jabatan: string[]; lokasi: string[] };
  kebenaran: ResolvedPermission[];
  /** Jumlah lantikan aktif yang akan tamat dalam 60 hari. */
  bakalLuput: number;
}

const HARI_AMARAN_LUPUT = 60;

const hariKeTamat = (validTo?: string | null): number | null => {
  if (!validTo) return null;
  const tamat = new Date(`${validTo}T23:59:59Z`).getTime();
  if (Number.isNaN(tamat)) return null;
  return Math.ceil((tamat - Date.now()) / 86_400_000);
};

/**
 * Terbitkan kebenaran daripada himpunan peranan + skop. Fungsi tulen (tiada I/O)
 * supaya boleh diuji tanpa pangkalan data.
 */
export function resolvePermissions(
  roles: Array<{ roleId: string; scopeType: string; scopeId: string | null }>
): ResolvedPermission[] {
  const melalui = new Map<string, string[]>();
  const tambah = (kunci: string, roleId: string) => {
    const senarai = melalui.get(kunci) ?? [];
    if (roleId && !senarai.includes(roleId)) senarai.push(roleId);
    melalui.set(kunci, senarai);
  };

  BASE_PERMISSIONS.forEach((kunci) => tambah(kunci, ''));
  roles.forEach((role) => {
    (ROLE_PERMISSIONS[role.roleId] ?? []).forEach((kunci) => tambah(kunci, role.roleId));
  });

  return PERMISSION_CATALOG.filter((item) => melalui.has(item.kunci)).map((item) => ({
    ...item,
    melalui: melalui.get(item.kunci) ?? [],
  }));
}

/** Baca pegawai + lantikan aktif, kemudian terbitkan capaian berkesan. */
export async function resolveAccess(
  db: DB,
  officerId: string,
  date: string = new Date().toISOString().slice(0, 10)
): Promise<ResolvedAccess | null> {
  const officer = await db
    .prepare(
      `SELECT id, nama, emel, department_id AS dept, status
         FROM officers WHERE id = ? LIMIT 1`
    )
    .bind(officerId)
    .first<ResolvedAccess['officer']>();

  if (!officer) return null;

  const assignments = await listAssignmentsForOfficer(db, officerId);
  const aktif = assignments.filter((row: AssignmentRow) => isActiveOn(row, date));

  const jabatan = new Set<string>();
  const lokasi = new Set<string>();
  let global = false;

  aktif.forEach((row) => {
    if (GLOBAL_ROLES.has(row.roleId) || row.scopeType === 'GLOBAL') {
      global = true;
    } else if (row.scopeType === 'DEPARTMENT' && row.scopeId) {
      jabatan.add(row.scopeId);
    } else if (row.scopeType === 'LOCATION' && row.scopeId) {
      lokasi.add(row.scopeId);
    }
  });
  if (global) {
    jabatan.add(officer.dept);
  }

  return {
    officer,
    peranan: aktif.map((row) => ({
      roleId: row.roleId,
      roleName: row.roleName,
      kategori: roleDefinition(row.roleId)?.kategori ?? 'LANTIKAN',
      scopeType: row.scopeType,
      scopeId: row.scopeId,
      validFrom: row.validFrom,
      validTo: row.validTo,
    })),
    skop: {
      global,
      jabatan: Array.from(jabatan),
      lokasi: Array.from(lokasi),
    },
    kebenaran: resolvePermissions(aktif),
    bakalLuput: aktif.filter((row) => {
      const hari = hariKeTamat(row.validTo);
      return hari !== null && hari >= 0 && hari <= HARI_AMARAN_LUPUT;
    }).length,
  };
}
