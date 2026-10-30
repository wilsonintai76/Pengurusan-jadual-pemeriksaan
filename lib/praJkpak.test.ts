import { describe, expect, it } from 'vitest';
import {
  pecahanDaripadaLaporan,
  ringkasLaporan,
  teksDokumen,
  jumlahPecahanAset,
} from './praJkpak';
import type { LaporanPraJkpak } from './types';

const laporanAman = (overrides: Partial<LaporanPraJkpak> = {}): LaporanPraJkpak => ({
  baik: 87,
  rosak: 4,
  usang: 2,
  hilang: 1,
  pecahan: { A: 83, B: 2, C: 3, D: 1, E: 4, F: 1 },
  justifikasi: {
    B: { sebab: 'Aset lapuk (teknologi usang)' },
    C: { adaDokumen: true, rujukan: 'ADU/2026/001' },
    D: { adaDokumen: true, rujukan: 'LPO/2026/007' },
    E: { adaDokumen: true, rujukan: 'PINJ/2026/003' },
    F: { adaDokumen: false, rujukan: '' },
  },
  cadangan: 'Ujian sync',
  tarikhHantar: '2026-10-30',
  ...overrides,
});

describe('pecahanDaripadaLaporan', () => {
  it('menggunakan pecahan A–F apabila ada', () => {
    const { pecahan, warisan } = pecahanDaripadaLaporan(laporanAman());
    expect(pecahan).toEqual({ A: 83, B: 2, C: 3, D: 1, E: 4, F: 1 });
    expect(warisan).toBe(false);
  });

  it('memetakan rekod warisan 4 kategori apabila pecahan tiada', () => {
    const { pecahan, warisan } = pecahanDaripadaLaporan({
      baik: 10,
      rosak: 3,
      usang: 2,
      hilang: 1,
    });
    expect(pecahan).toEqual({ A: 10, B: 2, C: 3, D: 0, E: 0, F: 1 });
    expect(warisan).toBe(true);
  });

  it('menganggap pecahan sifar sebagai warisan', () => {
    const { warisan } = pecahanDaripadaLaporan({
      baik: 5,
      rosak: 0,
      usang: 0,
      hilang: 0,
      pecahan: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
    });
    expect(warisan).toBe(true);
  });

  it('memulangkan sifar tanpa laporan', () => {
    expect(pecahanDaripadaLaporan(null)).toEqual({
      pecahan: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
      warisan: false,
    });
  });
});

describe('ringkasLaporan', () => {
  it('menyediakan jumlah dan dokumen bagi status yang ada bilangan', () => {
    const ringkasan = ringkasLaporan(laporanAman());
    expect(ringkasan.jumlahDiperiksa).toBe(94);
    expect(ringkasan.sebabTidakDigunakan).toBe('Aset lapuk (teknologi usang)');
    expect(ringkasan.dokumen.map((item) => item.kod)).toEqual(['C', 'D', 'E', 'F']);
    expect(ringkasan.dokumen[0]).toMatchObject({
      kod: 'C',
      label: 'Perlu Pembaikan',
      jenisDokumen: 'Laporan kerosakan',
      bilangan: 3,
      adaDokumen: true,
      rujukan: 'ADU/2026/001',
    });
  });

  it('menapis status yang bilangannya sifar', () => {
    const ringkasan = ringkasLaporan(
      laporanAman({ pecahan: { A: 90, B: 4, C: 0, D: 0, E: 0, F: 0 } })
    );
    expect(ringkasan.dokumen).toHaveLength(0);
    expect(ringkasan.jumlahDiperiksa).toBe(94);
  });

  it('menandakan dokumen yang tidak direkod', () => {
    const ringkasan = ringkasLaporan({
      baik: 0,
      rosak: 2,
      usang: 0,
      hilang: 0,
      pecahan: { A: 0, B: 0, C: 2, D: 0, E: 0, F: 0 },
    });
    expect(ringkasan.dokumen[0].adaDokumen).toBeNull();
    expect(teksDokumen(ringkasan.dokumen[0])).toBe('Tidak direkod');
  });
});

describe('teksDokumen', () => {
  const asas = {
    kod: 'C' as const,
    label: 'Perlu Pembaikan',
    jenisDokumen: 'Laporan kerosakan',
    bilangan: 1,
  };

  it('memaparkan Ada dengan rujukan', () => {
    expect(teksDokumen({ ...asas, adaDokumen: true, rujukan: 'ADU/1' })).toBe('Ada · ADU/1');
  });

  it('memaparkan Ada tanpa rujukan', () => {
    expect(teksDokumen({ ...asas, adaDokumen: true, rujukan: '' })).toBe('Ada');
  });

  it('memaparkan Tiada', () => {
    expect(teksDokumen({ ...asas, adaDokumen: false, rujukan: '' })).toBe('Tiada');
  });
});

describe('jumlahPecahanAset', () => {
  it('menjumlahkan enam status', () => {
    expect(jumlahPecahanAset({ A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 })).toBe(21);
  });

  it('mengabaikan nilai tidak sah', () => {
    expect(
      jumlahPecahanAset({ A: 1, B: NaN, C: -3, D: 0, E: 0, F: 0 } as never)
    ).toBe(1);
  });
});
