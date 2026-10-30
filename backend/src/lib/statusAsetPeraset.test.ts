import { describe, expect, it } from 'vitest';
import {
  kiraBelumDitanda,
  kiraPecahanAset,
  normalisasiStatusAset,
  pecahanLengkap,
  jumlahPecahanAset,
} from './statusAsetPeraset';

describe('normalisasiStatusAset', () => {
  it('menerima huruf kecil, ruang dan menolak nilai lain', () => {
    expect(normalisasiStatusAset(' a ')).toBe('A');
    expect(normalisasiStatusAset('f')).toBe('F');
    expect(normalisasiStatusAset('G')).toBeNull();
    expect(normalisasiStatusAset('')).toBeNull();
    expect(normalisasiStatusAset(null)).toBeNull();
  });
});

describe('kiraPecahanAset', () => {
  it('mengira setiap status dan mengabaikan nilai tidak sah', () => {
    expect(kiraPecahanAset(['A', 'A', 'C', 'd', '', null, 'Z'])).toEqual({
      A: 2,
      B: 0,
      C: 1,
      D: 1,
      E: 0,
      F: 0,
    });
  });
});

describe('kiraBelumDitanda / pecahanLengkap', () => {
  const pecahan = { A: 5, B: 1, C: 0, D: 0, E: 0, F: 0 };

  it('mengira baki aset tanpa status', () => {
    expect(jumlahPecahanAset(pecahan)).toBe(6);
    expect(kiraBelumDitanda(10, pecahan)).toBe(4);
    expect(pecahanLengkap(10, pecahan)).toBe(false);
  });

  it('lengkap apabila semua aset ada status', () => {
    expect(kiraBelumDitanda(6, pecahan)).toBe(0);
    expect(pecahanLengkap(6, pecahan)).toBe(true);
  });

  it('ruang tanpa aset tidak dianggap lengkap', () => {
    expect(pecahanLengkap(0, { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 })).toBe(false);
  });

  it('tidak memulangkan baki negatif', () => {
    expect(kiraBelumDitanda(1, pecahan)).toBe(0);
  });
});
