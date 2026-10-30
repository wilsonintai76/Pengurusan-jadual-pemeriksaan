import { describe, expect, it } from 'vitest';
import { deriveKategoriRuang, formatAras, parseKodLokasi } from './kodLokasi';

describe('parseKodLokasi', () => {
  it('memecahkan kod KEW.PA-7 penuh', () => {
    expect(parseKodLokasi('130101 / BGN / JKM1 / 01 / B09')).toEqual({
      kodRuang: '130101',
      kategoriKod: 'BGN',
      bangunan: 'JKM1',
      aras: 'Aras 1',
      bilik: 'B09',
    });
  });

  it('menerima kod tanpa jarak', () => {
    expect(parseKodLokasi('130101/BGN/JKM1/02/B10')).toMatchObject({
      kodRuang: '130101',
      bangunan: 'JKM1',
      aras: 'Aras 2',
    });
  });

  it('mengendalikan kod tidak lengkap', () => {
    expect(parseKodLokasi('130101')).toEqual({
      kodRuang: '130101',
      kategoriKod: '',
      bangunan: '',
      aras: '',
      bilik: '',
    });
    expect(parseKodLokasi('')).toMatchObject({ kodRuang: '', bangunan: '', aras: '' });
  });
});

describe('formatAras', () => {
  it('menukar nombor aras kepada label', () => {
    expect(formatAras('01')).toBe('Aras 1');
    expect(formatAras('2')).toBe('Aras 2');
    expect(formatAras('10')).toBe('Aras 10');
  });

  it('mengendalikan aras bawah dan teks bebas', () => {
    expect(formatAras('B')).toBe('Aras Bawah');
    expect(formatAras('bawah')).toBe('Aras Bawah');
    expect(formatAras('Aras 3A')).toBe('Aras 3A');
    expect(formatAras('')).toBe('');
  });
});

describe('deriveKategoriRuang', () => {
  it('menjajarkan kategori daripada nama ruang', () => {
    expect(deriveKategoriRuang('BENGKEL HI-TECH')).toBe('Bengkel Teknikal');
    expect(deriveKategoriRuang('Makmal Komputer 2')).toBe('Makmal Komputer');
    expect(deriveKategoriRuang('Bilik Kuliah Utama')).toBe('Bilik Kuliah');
    expect(deriveKategoriRuang('Stor Sukan')).toBe('Stor & Arkib');
    expect(deriveKategoriRuang('Bilik Server')).toBe('Bilik Pelayan');
    expect(deriveKategoriRuang('Studio Multimedia')).toBe('Studio');
    expect(deriveKategoriRuang('Pusat Sumber')).toBe('Pusat Sumber');
    expect(deriveKategoriRuang('Pejabat Am')).toBe('Pejabat Pentadbiran');
  });
});
