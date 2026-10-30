import { describe, expect, it } from 'vitest';
import { BULAN_MALAY, SUKUAN_BULAN_LALAI, binaEntriSukuan } from './takwimSukuan';

describe('binaEntriSukuan', () => {
  it('menjana tiga sukuan pada hari pertama bulan masing-masing', () => {
    const entri = binaEntriSukuan(2027, [...SUKUAN_BULAN_LALAI]);

    expect(entri).toEqual([
      {
        tarikh: '2027-03-01',
        tajuk: 'Tempoh Pemeriksaan Sukuan 1/2027',
        catatan: 'Sepanjang Mac 2027',
      },
      {
        tarikh: '2027-06-01',
        tajuk: 'Tempoh Pemeriksaan Sukuan 2/2027',
        catatan: 'Sepanjang Jun 2027',
      },
      {
        tarikh: '2027-09-01',
        tajuk: 'Tempoh Pemeriksaan Sukuan 3/2027',
        catatan: 'Sepanjang September 2027',
      },
    ]);
  });

  it('mengendalikan bulan dua digit dan bulan tersuai', () => {
    const entri = binaEntriSukuan(2026, [11]);

    expect(entri[0].tarikh).toBe('2026-11-01');
    expect(entri[0].catatan).toBe('Sepanjang November 2026');
  });

  it('mempunyai dua belas nama bulan', () => {
    expect(BULAN_MALAY).toHaveLength(12);
    expect(BULAN_MALAY[2]).toBe('Mac');
  });
});
