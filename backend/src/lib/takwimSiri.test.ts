import { describe, expect, it } from 'vitest';
import { siriBulan, siriWindow, windowUntukSiri } from './takwimSiri';

const TAKWIM = [
  {
    tarikh: '2026-03-01',
    tajuk: 'Tempoh Pemeriksaan Sukuan 1/2026',
    kategori: 'PEMERIKSAAN',
    catatan: 'Sepanjang Mac 2026',
  },
  {
    tarikh: '2026-06-01',
    tajuk: 'Tempoh Pemeriksaan Sukuan 2/2026',
    kategori: 'PEMERIKSAAN',
    catatan: 'Sepanjang Jun 2026',
  },
  {
    tarikh: '2026-11-01',
    tajuk: 'Tempoh Pemeriksaan Sukuan 3/2026',
    kategori: 'PEMERIKSAAN',
    catatan: null,
  },
  {
    tarikh: '2026-01-15',
    tajuk: 'Mesyuarat JKPAK Bil. 1/2026',
    kategori: 'MESYUARAT_JKPAK',
    catatan: 'Bilik Mesyuarat',
  },
];

describe('siriBulan', () => {
  it('membaca bulan daripada catatan takwim', () => {
    expect(siriBulan(1, TAKWIM)).toBe(3);
    expect(siriBulan(2, TAKWIM)).toBe(6);
  });

  it('jatuh balik ke bulan tarikh takwim apabila catatan kosong', () => {
    expect(siriBulan(3, TAKWIM)).toBe(11);
  });

  it('abaikan entri bukan tempoh pemeriksaan', () => {
    const hanyaMesyuarat = TAKWIM.filter((row) => row.kategori !== 'PEMERIKSAAN');
    expect(siriBulan(1, hanyaMesyuarat)).toBe(3);
  });

  it('menggunakan bulan lalai tanpa takwim', () => {
    expect(siriBulan(1, [])).toBe(3);
    expect(siriBulan(2, [])).toBe(6);
    expect(siriBulan(3, [])).toBe(9);
  });
});

describe('siriWindow', () => {
  it('menghasilkan hari pertama dan terakhir bulan', () => {
    expect(siriWindow(2026, 6)).toMatchObject({ mula: '2026-06-01', tamat: '2026-06-30' });
    expect(siriWindow(2026, 2)).toMatchObject({ mula: '2026-02-01', tamat: '2026-02-28' });
    expect(siriWindow(2027, 2)).toMatchObject({ mula: '2027-02-01', tamat: '2027-02-28' });
    expect(siriWindow(2028, 2)).toMatchObject({ tamat: '2028-02-29' });
    expect(siriWindow(2026, 12)).toMatchObject({ tamat: '2026-12-31' });
  });

  it('membina label paparan yang menyebut julat', () => {
    expect(siriWindow(2026, 6).label).toBe('Jun 2026 (01/06/2026 – 30/06/2026)');
  });
});

describe('windowUntukSiri', () => {
  it('menggabungkan takwim + julat bulan', () => {
    expect(windowUntukSiri(2026, 2, TAKWIM)).toMatchObject({
      mula: '2026-06-01',
      tamat: '2026-06-30',
    });
    expect(windowUntukSiri(2026, 1, []).bulan).toBe(3);
  });
});
