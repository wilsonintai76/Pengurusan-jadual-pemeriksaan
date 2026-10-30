import { describe, expect, it } from 'vitest';
import { bulanSiri, kiraRuangSiri, kiraSasaranSiri, windowSiri } from './siriPemeriksaan';
import type { CalendarItem } from './dataApi';
import type { InspectionSchedule } from './types';

function schedule(over: Partial<InspectionSchedule>): InspectionSchedule {
  return {
    id: 'JAD-1',
    kod: 'JAD/JKM/2026/01',
    siri: 1,
    jabatan: 'JKM',
    lokasi: 'BENGKEL MESIN',
    kategori: 'Semua (Harta Modal & Aset Bernilai Rendah)',
    kuantiti: 94,
    tarikhMula: '',
    tarikhTamat: '',
    pemeriksa1: '',
    pemeriksa2: '',
    penjaga: 'Ahmad',
    status: 'Belum Mula',
    ...over,
  } as InspectionSchedule;
}

function takwimItem(over: Partial<CalendarItem>): CalendarItem {
  return {
    id: 'CAL-1',
    tahun: 2026,
    tarikh: '2026-03-01',
    tajuk: 'Tempoh Pemeriksaan Sukuan 1/2026',
    kategori: 'PEMERIKSAAN',
    catatan: 'Sepanjang Mac 2026',
    ...over,
  };
}

describe('bulanSiri', () => {
  it('mengambil bulan daripada catatan takwim sukuan', () => {
    expect(bulanSiri(1, [takwimItem({})])).toBe('Mac');
    expect(
      bulanSiri(2, [
        takwimItem({
          id: 'CAL-2',
          tarikh: '2026-06-01',
          tajuk: 'Tempoh Pemeriksaan Sukuan 2/2026',
          catatan: 'Sepanjang Jun 2026',
        }),
      ])
    ).toBe('Jun');
  });

  it('jatuh balik ke bulan tarikh takwim apabila catatan kosong', () => {
    expect(bulanSiri(3, [takwimItem({ tajuk: 'Tempoh Pemeriksaan Sukuan 3/2026', tarikh: '2026-09-01', catatan: null })])).toBe(
      'September'
    );
  });

  it('menggunakan bulan lalai apabila takwim belum diisi', () => {
    expect(bulanSiri(1, [])).toBe('Mac');
    expect(bulanSiri(2, [])).toBe('Jun');
    expect(bulanSiri(3, [])).toBe('September');
  });
});

describe('kiraRuangSiri', () => {
  it('mengira ruang mengikut siri dan jabatan', () => {
    const rows = [
      schedule({ id: 'A', siri: 1 }),
      schedule({ id: 'B', siri: 2 }),
      schedule({ id: 'C', siri: 1, jabatan: 'JTMK' }),
    ];

    expect(kiraRuangSiri(rows, 1, 'JKM')).toBe(1);
    expect(kiraRuangSiri(rows, 1)).toBe(2);
    expect(kiraRuangSiri(rows, 3)).toBe(0);
  });
});

describe('windowSiri', () => {
  it('mengambil julat bulan daripada takwim siri', () => {
    expect(windowSiri(2, [takwimItem({ tarikh: '2026-06-01', tajuk: 'Tempoh Pemeriksaan Sukuan 2/2026', catatan: 'Sepanjang Jun 2026' })], 2026)).toMatchObject({
      mula: '2026-06-01',
      tamat: '2026-06-30',
    });
  });

  it('jatuh balik ke bulan lalai tanpa takwim', () => {
    expect(windowSiri(1, [], 2027)).toMatchObject({ mula: '2027-03-01', tamat: '2027-03-31' });
    expect(windowSiri(3, [], 2027)).toMatchObject({ mula: '2027-09-01', tamat: '2027-09-30' });
  });
});

describe('kiraSasaranSiri', () => {  it('mencadangkan siri dengan ruang paling sedikit dan mengira baki ruang', () => {
    const rows = [
      schedule({ id: 'A', siri: 1 }),
      schedule({ id: 'B', siri: 1 }),
      schedule({ id: 'C', siri: 2 }),
    ];

    const sasaran = kiraSasaranSiri(rows, 10, 'JKM');

    expect(sasaran.siriDicadangkan).toBe(3);
    expect(sasaran.terjadual).toBe(0);
    expect(sasaran.baki).toBe(7);
    expect(sasaran.peratus).toBe(0);
  });

  it('mengira peratus berdasarkan ruang siri yang dicadangkan', () => {
    const rows = [schedule({ id: 'A', siri: 1 }), schedule({ id: 'B', siri: 1 })];
    const sasaran = kiraSasaranSiri(rows, 4, 'JKM');

    expect(sasaran.siriDicadangkan).toBe(2);
    expect(sasaran.baki).toBe(2);
  });

  it('tidak membahagi dengan sifar apabila jabatan belum ada ruang', () => {
    const sasaran = kiraSasaranSiri([], 0, 'JKM');
    expect(sasaran.jumlahRuang).toBe(0);
    expect(sasaran.peratus).toBe(0);
    expect(sasaran.siriDicadangkan).toBe(1);
  });
});
