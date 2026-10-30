import { describe, expect, it } from 'vitest';
import { derivePrimaryRole, resolveDisplayRole } from './roles';

const PPAJ = { roleId: 'PENOLONG_PEGAWAI_ASET', roleName: 'Penolong Pegawai Aset Jabatan/Unit (PPAJ/PPAU)' };
const PL = { roleId: 'PENYELIA_LOKASI', roleName: 'Penyelia Lokasi (PL)' };
const KJ = { roleId: 'KETUA_JABATAN', roleName: 'Ketua Jabatan / Unit (KJ/KU)' };
const PP = { roleId: 'PEMERIKSA', roleName: 'Pegawai Pemeriksa (PP)' };

describe('derivePrimaryRole', () => {
  it('mengikut keutamaan tetap apabila pegawai memegang pelbagai peranan', () => {
    expect(derivePrimaryRole([PP, PL, PPAJ])).toBe(PPAJ.roleName);
    expect(derivePrimaryRole([PP, KJ])).toBe(KJ.roleName);
  });

  it('memulangkan label pertama jika tiada peranan dalam senarai keutamaan', () => {
    expect(derivePrimaryRole([PP])).toBe(PP.roleName);
  });

  it('memulangkan fallback apabila tiada lantikan aktif', () => {
    expect(derivePrimaryRole([], 'Tiada')).toBe('Tiada');
  });
});

describe('resolveDisplayRole', () => {
  it('menerima pilihan manual yang masih disokong lantikan aktif', () => {
    expect(resolveDisplayRole([PPAJ, PL], PL.roleName)).toBe(PL.roleName);
  });

  it('menolak label lapuk yang tiada lantikan aktif (contoh: Penyelia Lokasi bagi ruang yang dipadam)', () => {
    expect(resolveDisplayRole([PPAJ], PL.roleName)).toBe(PPAJ.roleName);
  });

  it('menggunakan keutamaan apabila tiada pilihan manual', () => {
    expect(resolveDisplayRole([PP, PPAJ], '')).toBe(PPAJ.roleName);
    expect(resolveDisplayRole([PP, PPAJ], null)).toBe(PPAJ.roleName);
  });

  it('memulangkan fallback apabila pegawai tiada lantikan aktif', () => {
    expect(resolveDisplayRole([], PL.roleName, 'Tiada Peranan')).toBe('Tiada Peranan');
  });
});
