import { describe, expect, it } from 'vitest';
import {
  STATUS_ASET,
  mapLegacyCounts,
  normalizePecahan,
  validatePecahanStatus,
  type JustifikasiMap,
  type PecahanStatus,
} from './kewpa11Status';

const PECAHAN: PecahanStatus = { A: 10, B: 0, C: 0, D: 0, E: 0, F: 0 };

describe('STATUS_ASET', () => {
  it('mempunyai enam kod A–F mengikut spesifikasi', () => {
    expect(STATUS_ASET.map((s) => s.kod)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(STATUS_ASET.find((s) => s.kod === 'A')?.label).toBe('Sedang Digunakan');
    expect(STATUS_ASET.find((s) => s.kod === 'F')?.label).toBe('Hilang');
  });
});

describe('normalizePecahan', () => {
  it('menukar nilai tidak sah kepada sifar', () => {
    expect(
      normalizePecahan({ A: '3' as unknown as number, B: -2, C: undefined, D: 2.7 })
    ).toEqual({ A: 3, B: 0, C: 0, D: 2, E: 0, F: 0 });
  });
});

describe('validatePecahanStatus', () => {
  it('lulus apabila hanya status A digunakan', () => {
    expect(validatePecahanStatus(PECAHAN, {})).toEqual([]);
  });

  it('menolak jumlah sifar', () => {
    expect(validatePecahanStatus({ A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 }, {})).toContain(
      'Jumlah aset diperiksa tidak boleh sifar.'
    );
  });

  it('mewajibkan justifikasi bagi B–F', () => {
    const ralat = validatePecahanStatus({ ...PECAHAN, A: 0, B: 2 }, {});
    expect(ralat.join(' ')).toContain('Status B (Tidak Digunakan)');
  });

  it('mewajibkan no. laporan bagi status C', () => {
    const justifikasi: JustifikasiMap = { C: { sebab: 'Kerosakan motor' } };
    const ralat = validatePecahanStatus({ ...PECAHAN, A: 0, C: 1 }, justifikasi);
    expect(ralat).toContain('Status C (Perlu Pembaikan): no. laporan kerosakan wajib diisi.');

    expect(
      validatePecahanStatus({ ...PECAHAN, A: 0, C: 1 }, { C: { sebab: 'Kerosakan', rujukan: 'AD/1' } })
    ).toEqual([]);
  });

  it('mewajibkan no. LPO bagi status D', () => {
    expect(
      validatePecahanStatus({ ...PECAHAN, A: 0, D: 1 }, { D: { sebab: 'Hantar vendor' } })
    ).toContain('Status D (Sedang Diselenggara): no. LPO / pesanan kerja wajib diisi.');
  });

  it('mewajibkan no. borang pinjaman bagi status E', () => {
    expect(
      validatePecahanStatus({ ...PECAHAN, A: 0, E: 1 }, { E: { sebab: 'Dipinjam JTMK' } })
    ).toContain('Status E (Pinjaman): no. borang pinjaman wajib diisi.');
  });

  it('menerima F dengan justifikasi sahaja', () => {
    expect(
      validatePecahanStatus({ ...PECAHAN, A: 9, F: 1 }, { F: { sebab: 'Hilang semasa pindah bilik' } })
    ).toEqual([]);
  });
});

describe('mapLegacyCounts', () => {
  it('memetakan 6 kod kepada 4 lajur warisan', () => {
    expect(mapLegacyCounts({ A: 5, B: 1, C: 2, D: 1, E: 3, F: 4 })).toEqual({
      baik: 8, // A + E
      rosak: 3, // C + D
      usang: 1, // B
      hilang: 4, // F
    });
  });
});
