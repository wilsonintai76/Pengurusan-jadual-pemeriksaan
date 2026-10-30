import { describe, expect, it } from 'vitest';
import {
  gabungKeputusan,
  kumpulIkutRuangSpa,
  normalisasiLabel,
  normalisasiNamaRuang,
  parseSenaraiBelumPeriksa,
} from './senaraiBelumPeriksa';

const TAJUK = ['Label', 'Jenis Aset', 'Pegawai Penempatan', 'Bahagian', 'Lokasi Terkini', 'Status Aset'];

describe('normalisasi', () => {
  it('label dinormalkan kepada huruf besar tanpa ruang berganda', () => {
    expect(normalisasiLabel('  kpt/pks/i/05/7523 ')).toBe('KPT/PKS/I/05/7523');
    expect(normalisasiLabel('KPT/PKS/I/05/ 7523')).toBe('KPT/PKS/I/05/ 7523');
  });

  it('nama ruang tidak sensitif huruf besar/kecil', () => {
    expect(normalisasiNamaRuang(' bilik   penolong akauntan ')).toBe('BILIK PENOLONG AKAUNTAN');
  });
});

describe('parseSenaraiBelumPeriksa', () => {
  it('membaca fail standard SPA', () => {
    const rows = [
      TAJUK,
      ['KPT/PKS/I/05/7523', 'ALMARI BUKU', 'RASIDAH', 'UNIT PERAKAUNAN', 'BILIK PENOLONG AKAUNTAN', 'Sedang Digunakan'],
      ['KPT/PKS/H/06/61', 'PETI BESI', 'NURUDDIN', 'UNIT PENTADBIRAN', 'RUANG LEGAR', 'Perlu Pembaikan'],
    ];

    const hasil = parseSenaraiBelumPeriksa(rows, 'a.xlsx');

    expect(hasil.baris).toHaveLength(2);
    expect(hasil.baris[0]).toEqual({
      label: 'KPT/PKS/I/05/7523',
      jenisAset: 'ALMARI BUKU',
      pegawaiPenempatan: 'RASIDAH',
      bahagian: 'UNIT PERAKAUNAN',
      lokasiSpa: 'BILIK PENOLONG AKAUNTAN',
      statusAset: 'Sedang Digunakan',
    });
    expect(hasil.ditolak).toBe(0);
  });

  it('toleran apabila tajuk bukan pada baris pertama', () => {
    const rows = [['Senarai Aset Belum Diperiksa'], [], TAJUK, ['KPT/PKS/I/01/1', 'KERUSI', 'ALI', 'UNIT A', 'BILIK A', 'Sedang Digunakan']];
    const hasil = parseSenaraiBelumPeriksa(rows);
    expect(hasil.baris).toHaveLength(1);
    expect(hasil.baris[0].label).toBe('KPT/PKS/I/01/1');
  });

  it('menerima label dalam lajur bernama "No. Siri Pendaftaran"', () => {
    const rows = [
      ['No. Siri Pendaftaran', 'Jenis Aset', 'Lokasi Terkini'],
      ['KPT/PKS/H/01/9', 'MEJA', 'BILIK B'],
    ];
    const hasil = parseSenaraiBelumPeriksa(rows);
    expect(hasil.baris[0]).toMatchObject({ label: 'KPT/PKS/H/01/9', lokasiSpa: 'BILIK B' });
  });

  it('membuang label berulang dan baris tanpa label', () => {
    const rows = [
      TAJUK,
      ['KPT/PKS/I/01/1', 'KERUSI', '', '', 'BILIK A', ''],
      ['kpt/pks/i/01/1', 'KERUSI', '', '', 'BILIK A', ''],
      ['', 'Jumlah', '', '', '', '2'],
      ['   ', '', '', '', '', ''],
    ];
    const hasil = parseSenaraiBelumPeriksa(rows);
    expect(hasil.baris).toHaveLength(1);
    expect(hasil.gandaan).toBe(1);
    expect(hasil.ditolak).toBe(1);
  });

  it('memulangkan sifar baris apabila tajuk tidak dijumpai', () => {
    const hasil = parseSenaraiBelumPeriksa([['a', 'b'], ['c', 'd']]);
    expect(hasil.baris).toHaveLength(0);
    expect(hasil.ditolak).toBe(2);
  });
});

describe('gabungKeputusan', () => {
  it('label bertindih antara dua fail hanya dikira sekali', () => {
    const failA = parseSenaraiBelumPeriksa(
      [TAJUK, ['KPT/PKS/I/01/1', 'KERUSI', '', '', 'BILIK A', '']],
      'a.xlsx'
    );
    const failB = parseSenaraiBelumPeriksa(
      [TAJUK, ['KPT/PKS/I/01/1', 'KERUSI', '', '', 'BILIK A', ''], ['KPT/PKS/I/01/2', 'MEJA', '', '', 'BILIK A', '']],
      'b.xlsx'
    );

    const gabung = gabungKeputusan([failA, failB]);

    expect(gabung[0].baris).toHaveLength(1);
    expect(gabung[1].baris.map((b) => b.label)).toEqual(['KPT/PKS/I/01/2']);
    expect(gabung[1].gandaan).toBe(1);
  });
});

describe('kumpulIkutRuangSpa', () => {
  it('mengumpul bilangan aset ikut nama ruang dan menyusun menurun', () => {
    const rows = parseSenaraiBelumPeriksa([
      TAJUK,
      ['KPT/PKS/I/01/1', 'KERUSI', '', 'UNIT A', 'BILIK A', ''],
      ['KPT/PKS/I/01/2', 'MEJA', '', 'UNIT A', 'bilik a', ''],
      ['KPT/PKS/I/01/3', 'RAK', '', 'UNIT B', 'BILIK B', ''],
    ]).baris;

    expect(kumpulIkutRuangSpa(rows)).toEqual([
      { lokasiSpa: 'BILIK A', bahagian: 'UNIT A', bilangan: 2 },
      { lokasiSpa: 'BILIK B', bahagian: 'UNIT B', bilangan: 1 },
    ]);
  });
});
