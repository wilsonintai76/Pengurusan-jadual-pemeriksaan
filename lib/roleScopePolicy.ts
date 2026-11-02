import type { RoleScopeType } from './types';

/**
 * Polisi skop per peranan PBAC.
 *
 * Setiap peranan hanya boleh dilantik pada skop yang munasabah mengikut 1PP AM 2.4.
 * Peranan jabatan (KJ/KU, KP, PA, PPAJ/PPAU) terhad kepada **akses utama jabatan/unit
 * sendiri** — bukan global, bukan per-ruang. Penyelia Lokasi pula sentiasa per-ruang.
 *
 * Peranan pentadbiran dan pemeriksaan boleh memilih antara **global** (seluruh POLIKU)
 * atau **berjabatan** (hanya unit sendiri / unit dalam skop pemeriksaan).
 */
export interface RoleScopePolicy {
  dibenarkan: RoleScopeType[];
  lalai: RoleScopeType;
  nota: string;
}

export const ROLE_SCOPE_POLICY: Record<string, RoleScopePolicy> = {
  KETUA_JABATAN: {
    dibenarkan: ['DEPARTMENT'],
    lalai: 'DEPARTMENT',
    nota: 'Akses utama jabatan/unit sendiri sahaja (bukan global).',
  },
  KETUA_PROGRAM: {
    dibenarkan: ['DEPARTMENT'],
    lalai: 'DEPARTMENT',
    nota: 'Akses utama jabatan/unit sendiri sahaja (bukan global).',
  },
  PEGAWAI_ASET: {
    dibenarkan: ['DEPARTMENT'],
    lalai: 'DEPARTMENT',
    nota: 'Pegawai aset bagi jabatan/unit sendiri.',
  },
  PENOLONG_PEGAWAI_ASET: {
    dibenarkan: ['DEPARTMENT'],
    lalai: 'DEPARTMENT',
    nota: 'Pendaftaran pegawai & ruang bagi jabatan/unit sendiri.',
  },
  PENYELIA_LOKASI: {
    dibenarkan: ['LOCATION'],
    lalai: 'LOCATION',
    nota: 'Satu atau beberapa ruang dalam jabatan/unit berkenaan.',
  },
  PEMERIKSA: {
    dibenarkan: ['GLOBAL', 'DEPARTMENT'],
    lalai: 'GLOBAL',
    nota: 'Global: mana-mana ruang rakan silang yang layak. Jabatan: terhad kepada unit yang ditetapkan.',
  },
  PENTADBIR_SISTEM: {
    dibenarkan: ['GLOBAL', 'DEPARTMENT'],
    lalai: 'GLOBAL',
    nota: 'Global: semua jabatan/unit. Jabatan: pentadbir bagi jabatan/unit sendiri sahaja.',
  },
};

/** Polisi lalai bagi peranan yang tidak tersenarai (ikut takrif peranan pada Worker). */
export function skopPolisi(roleId: string, takrifSkop?: RoleScopeType): RoleScopePolicy {
  const polisi = ROLE_SCOPE_POLICY[roleId];
  if (polisi) return polisi;
  const lalai = takrifSkop ?? 'GLOBAL';
  return { dibenarkan: [lalai], lalai, nota: 'Skop mengikut takrif peranan.' };
}

/** Adakah peranan ini boleh dilantik pada skop tersebut? */
export function skopDibenarkan(roleId: string, scopeType: RoleScopeType): boolean {
  return skopPolisi(roleId).dibenarkan.includes(scopeType);
}
