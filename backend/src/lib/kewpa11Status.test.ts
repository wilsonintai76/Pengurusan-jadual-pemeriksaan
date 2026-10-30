import { describe, expect, it } from 'vitest';
import {
  STATUS_ASET,
  STATUS_BERDOKUMEN,
  mapLegacyCounts,
  normalizePecahan,
  validatePecahanStatus,
} from './kewpa11Status';

describe('STATUS_ASET', () => {
  it('mempunyai enam kod A–F mengikut spesifikasi', () => {
    expect(STATUS_ASET.map((s) => s.kod)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(STATUS_ASET.find((s) => s.kod === 'A')?.label).toBe('Sedang Digunakan');
    expect(STATUS_ASET.find((s) => s.kod === 'D')?.label).toBe('Sedang Diselenggara');
  });

  it('hanya A dikira automatik dan B tiada dokumen', () => {
    expect(STATUS_ASET.filter((s) => s.auto).map((s) => s.kod)).toEqual(['A']);
    expect(STATUS_ASET.find((s) => s.kod === 'B')?.dokumen).toBeNull();
    expect(STATUS_BERDOKUMEN).toEqual(['C', 'D', 'E', 'F']);
  });
});

describe('normalizePecahan', () => {
  it('mengira A sebagai baki daripada jumlah aset', () => {
    expect(normalizePecahan({ B: 4, C: 2, D: 2, E: 2, F: 1 }, 94)).toEqual({
      A: 83,
      B: 4,
      C: 2,
      D: 2,
      E: 2,
      F: 1,
    });
  });

  it('tidak membenarkan A negatif apabila status lain melebihi jumlah aset', () => {
    expect(normalizePecahan({ B: 100 }, 94).A).toBe(0);
  });

  it('mengabaikan nilai tidak sah', () => {
    expect(normalizePecahan({ B: -2, C: '3' as unknown as number, D: 2.7 }, 10)).toEqual({
      A: 5,
      B: 0,
      C: 3,
      D: 2,
      E: 0,
      F: 0,
    });
  });

  it('menganggap semua aset digunakan apabila tiada status lain', () => {
    expect(normalizePecahan({}, 94)).toEqual({ A: 94, B: 0, C: 0, D: 0, E: 0, F: 0 });
  });
});

describe('validatePecahanStatus', () => {
  it('lulus apabila ada aset', () => {
    expect(validatePecahanStatus({ A: 94, B: 0, C: 0, D: 0, E: 0, F: 0 })).toEqual([]);
  });

  it('menolak jumlah sifar', () => {
    expect(validatePecahanStatus({ A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 })).toContain(
      'Jumlah aset diperiksa tidak boleh sifar.'
    );
  });
});

describe('mapLegacyCounts', () => {
  it('memetakan 6 kod kepada 4 lajur warisan', () => {
    expect(mapLegacyCounts({ A: 83, B: 4, C: 2, D: 2, E: 2, F: 1 })).toEqual({
      baik: 85, // A + E
      rosak: 4, // C + D
      usang: 4, // B
      hilang: 1, // F
    });
  });
});
