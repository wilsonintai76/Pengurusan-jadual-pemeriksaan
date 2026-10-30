import { describe, expect, it } from 'vitest';
import { parseKewpa7Officers, parseKewpa7Text, parseOfficerEntry } from './kewpa7Text';

const PLAIN_TEXT = [
  'KEW.PA-7  SENARAI ASET ALIH',
  'Bahagian: JKM',
  'Lokasi: Bengkel Mesin',
  'Kod Lokasi: JKM/BGN',
  'Pegawai Bertanggungjawab: Ahmad bin Ali - PPAJ',
  '1  KPT/PKS/H/07/13  Mesin Larik CNC  12/03/2024  Baik',
  '2  KPT/PKS/H/07/14  Kompresor Udara  15/03/2024  Rosak',
  '3  JKM/BGN/2026/0042  Meja Kerja Kayu  01/01/2026  Baik',
].join('\n');

const MARKDOWN_TABLE = [
  '# KEW.PA-7 SENARAI ASET ALIH',
  '',
  '**Jabatan**: JKM',
  '',
  '**Kod Lokasi**: JKM/BGN',
  '',
  '| Bil | No. Siri Pendaftaran | Keterangan Aset | Tarikh | Status |',
  '| --- | --- | --- | --- | --- |',
  '| 1 | KPT/PKS/H/07/13 | Mesin Larik CNC | 12/03/2024 | Baik |',
  '| 2 | JKM/BGN/2026/0042 | Meja Kerja Kayu | 01/01/2026 | Rosak |',
].join('\n');

describe('parseKewpa7Text', () => {
  it('mengekstrak senarai aset daripada teks rata', () => {
    const result = parseKewpa7Text(PLAIN_TEXT);

    expect(result).not.toBeNull();
    expect(result?.bahagian).toBe('JKM');
    expect(result?.lokasi).toBe('Bengkel Mesin');
    expect(result?.kodLokasi).toBe('JKM/BGN');
    expect(result?.senaraiAset).toHaveLength(3);
    expect(result?.senaraiAset[0]).toEqual({
      bil: 1,
      noSiriPendaftaran: 'KPT/PKS/H/07/13',
      keteranganAset: 'Mesin Larik CNC',
      tarikhPenempatan: '12/03/2024',
      statusFizikal: 'Baik',
    });
    expect(result?.senaraiAset[1].statusFizikal).toBe('Rosak');
  });

  it('mengekstrak senarai aset daripada jadual markdown', () => {
    const result = parseKewpa7Text(MARKDOWN_TABLE);

    expect(result).not.toBeNull();
    expect(result?.bahagian).toBe('JKM');
    expect(result?.kodLokasi).toBe('JKM/BGN');
    expect(result?.senaraiAset).toHaveLength(2);
    expect(result?.senaraiAset[0].noSiriPendaftaran).toBe('KPT/PKS/H/07/13');
    expect(result?.senaraiAset[0].keteranganAset).toBe('Mesin Larik CNC');
    expect(result?.senaraiAset[1].statusFizikal).toBe('Rosak');
  });

  it('memulangkan null apabila tiada kod pendaftaran aset', () => {
    expect(parseKewpa7Text('Tiada aset di sini\nHanya teks biasa.')).toBeNull();
    expect(parseKewpa7Text('')).toBeNull();
  });

  it('mengekstrak pegawai bertanggungjawab daripada baris berlabel', () => {
    const result = parseKewpa7Text(PLAIN_TEXT);

    expect(result?.pegawaiBertanggungjawabList).toHaveLength(1);
    expect(result?.pegawaiBertanggungjawabList[0]).toMatchObject({
      nama: 'Ahmad bin Ali',
      jawatan: 'PPAJ',
    });
  });
});

describe('parseOfficerEntry', () => {
  it('memisahkan nama dan jawatan dalam pelbagai format', () => {
    expect(parseOfficerEntry('Ahmad bin Ali - PPAJ')).toMatchObject({
      nama: 'Ahmad bin Ali',
      jawatan: 'PPAJ',
    });
    expect(parseOfficerEntry('Siti Aminah (Penyelia Lokasi)')).toMatchObject({
      nama: 'Siti Aminah',
      jawatan: 'Penyelia Lokasi',
    });
    expect(parseOfficerEntry('1. Tan Ah Kow, Ketua Jabatan')).toMatchObject({
      nama: 'Tan Ah Kow',
      jawatan: 'Ketua Jabatan',
    });
  });

  it('menolak baris jadual aset atau nilai tidak sah', () => {
    expect(parseOfficerEntry('KPT/PKS/H/07/13 Mesin Larik CNC')).toBeNull();
    expect(parseOfficerEntry('12/03/2024')).toBeNull();
    expect(parseOfficerEntry('Tiada')).toBeNull();
    expect(parseOfficerEntry('')).toBeNull();
  });
});

const REAL_FORM = [
  'Bahagian : JABATAN KEJURUTERAAN MEKANIKAL',
  'Lokasi : BENGKEL AUTOMOTIF',
  'Kod Lokasi : 130101 / BGN / JKM1 / 01 / B04',
  'Bil No Siri Pendaftaran Keterangan Aset Tarikh Penempatan',
  '1. KPT/PKS/R/80/33 BEKALAN KUASA / BATTERY/JUMPER POWER CHARGER 18/01/2017',
  '2. KPT/PKS/H/16/39 PERALATAN PENYELIDIKAN DAN PENGUJIAN / MULTIPLE GAS ANALYSER 15/12/2016',
  '(a) Disediakan oleh : (b) Disahkan oleh :',
  'Tandatangan Tandatangan',
  'Nama : Wilson Bin Intai Jawatan : PPPT Nama : AHMAD FAIRUZ BIN MOHAMED Jawatan : PPPT',
].join('\n');

describe('parseKewpa7Text — kod lokasi terpotong', () => {
  const ASSET = '1. KPT/PKS/R/80/33 BEKALAN KUASA 18/01/2017';

  it('menyambung kod yang berakhir dengan "/" pada baris berikutnya', () => {
    const result = parseKewpa7Text(
      ['Lokasi : BENGKEL AUTOMOTIF', 'Kod Lokasi : 130101 / BGN / JKM1 / 01 /', 'B04', ASSET].join('\n')
    );

    expect(result?.lokasi).toBe('BENGKEL AUTOMOTIF');
    expect(result?.kodLokasi).toBe('130101 / BGN / JKM1 / 01 / B04');
  });

  it('menyambung segmen bilik yang tercicir pada baris berikutnya', () => {
    const result = parseKewpa7Text(
      ['Lokasi : BENGKEL AUTOMOTIF', 'Kod Lokasi : 130101 / BGN / JKM1 / 01', 'B04', ASSET].join('\n')
    );

    expect(result?.kodLokasi).toBe('130101 / BGN / JKM1 / 01 B04');
  });

  it('tidak menyambung perkataan biasa selepas kod lengkap', () => {
    const result = parseKewpa7Text(
      ['Kod Lokasi : 130101 / BGN / JKM1 / 01 / B04', 'Keterangan Aset', ASSET].join('\n')
    );

    expect(result?.kodLokasi).toBe('130101 / BGN / JKM1 / 01 / B04');
  });
});

describe('parseKewpa7Text — ruang tak pecah (NBSP) daripada PDF', () => {
  it('menghurai label dan nilai yang dipisah oleh NBSP', () => {
    const nbsp = '\u00A0';
    const result = parseKewpa7Text(
      [
        `Bahagian${nbsp}:${nbsp}JABATAN KEJURUTERAAN MEKANIKAL`,
        `Lokasi${nbsp}:${nbsp}BENGKEL AUTOMOTIF`,
        `Kod${nbsp}Lokasi${nbsp}:${nbsp}130101 / BGN / JKM1 / 01 / B04`,
        '1. KPT/PKS/R/80/33 BEKALAN KUASA 18/01/2017',
      ].join('\n')
    );

    expect(result?.bahagian).toBe('JABATAN KEJURUTERAAN MEKANIKAL');
    expect(result?.lokasi).toBe('BENGKEL AUTOMOTIF');
    expect(result?.kodLokasi).toBe('130101 / BGN / JKM1 / 01 / B04');
  });

  it('tidak mengisi lokasi dengan teks lain apabila label Lokasi tiada', () => {
    const result = parseKewpa7Text(
      [
        'Bahagian : JABATAN KEJURUTERAAN MEKANIKAL',
        'Kod Lokasi : 130101 / BGN / JKM1 / 01 / B04',
        'bilik Setiausaha Bahagian',
        '1. KPT/PKS/R/80/33 BEKALAN KUASA 18/01/2017',
      ].join('\n')
    );

    expect(result?.lokasi).toBe('');
    expect(result?.kodLokasi).toBe('130101 / BGN / JKM1 / 01 / B04');
  });
});

describe('parseKewpa7Text — format medan tidak konsisten', () => {
  const ASSET_LINE = '1. KPT/PKS/R/80/33 BEKALAN KUASA 18/01/2017';

  it('menerima label tanpa titik bertindih', () => {
    const result = parseKewpa7Text(
      ['Bahagian  JABATAN KEJURUTERAAN MEKANIKAL', 'Lokasi  BENGKEL AUTOMOTIF', 'Kod Lokasi  130101 / BGN / JKM1 / 01 / B04', ASSET_LINE].join('\n')
    );

    expect(result?.bahagian).toBe('JABATAN KEJURUTERAAN MEKANIKAL');
    expect(result?.lokasi).toBe('BENGKEL AUTOMOTIF');
    expect(result?.kodLokasi).toBe('130101 / BGN / JKM1 / 01 / B04');
  });

  it('menerima nilai pada baris berikutnya', () => {
    const result = parseKewpa7Text(
      ['Bahagian :', 'JABATAN KEJURUTERAAN MEKANIKAL', 'Lokasi :', 'BENGKEL AUTOMOTIF', 'Kod Lokasi :', '130101 / BGN / JKM1 / 01 / B04', ASSET_LINE].join('\n')
    );

    expect(result?.bahagian).toBe('JABATAN KEJURUTERAAN MEKANIKAL');
    expect(result?.lokasi).toBe('BENGKEL AUTOMOTIF');
    expect(result?.kodLokasi).toBe('130101 / BGN / JKM1 / 01 / B04');
  });

  it('memotong nilai apabila medan lain menyusul dalam baris yang sama', () => {
    const result = parseKewpa7Text(
      ['Bahagian : JABATAN KEJURUTERAAN MEKANIKAL Lokasi : BENGKEL AUTOMOTIF Kod Lokasi : 130101 / BGN / JKM1 / 01 / B04', ASSET_LINE].join('\n')
    );

    expect(result?.bahagian).toBe('JABATAN KEJURUTERAAN MEKANIKAL');
    expect(result?.lokasi).toBe('BENGKEL AUTOMOTIF');
    expect(result?.kodLokasi).toBe('130101 / BGN / JKM1 / 01 / B04');
  });

  it('tidak menggunakan baris medan lain sebagai nilai', () => {
    const result = parseKewpa7Text(
      ['Lokasi :', 'Kod Lokasi : 130101 / BGN / JKM1 / 01 / B04', ASSET_LINE].join('\n')
    );

    expect(result?.lokasi).toBe('');
    expect(result?.kodLokasi).toBe('130101 / BGN / JKM1 / 01 / B04');
  });
});

describe('parseKewpa7Text — borang sebenar', () => {
  it('memetakan Bahagian/Lokasi/Kod Lokasi dengan betul', () => {
    const result = parseKewpa7Text(REAL_FORM);

    expect(result).not.toBeNull();
    expect(result?.bahagian).toBe('JABATAN KEJURUTERAAN MEKANIKAL');
    expect(result?.lokasi).toBe('BENGKEL AUTOMOTIF');
    expect(result?.kodLokasi).toBe('130101 / BGN / JKM1 / 01 / B04');
    expect(result?.senaraiAset).toHaveLength(2);
  });

  it('mengekstrak kedua-dua pegawai dan mendahulukan "Disahkan oleh"', () => {
    const result = parseKewpa7Text(REAL_FORM);
    const officers = result?.pegawaiBertanggungjawabList ?? [];

    expect(officers).toHaveLength(2);
    expect(officers.map((officer) => officer.nama)).toEqual([
      'AHMAD FAIRUZ BIN MOHAMED',
      'Wilson Bin Intai',
    ]);
    expect(officers[0].jawatan).toBe('PPPT');
  });

  it('tidak menganggap penanda seksyen sebagai nama pegawai', () => {
    const result = parseKewpa7Text(REAL_FORM);
    const names = (result?.pegawaiBertanggungjawabList ?? []).map((officer) =>
      officer.nama.toLowerCase()
    );

    expect(names.some((name) => name.includes('disahkan'))).toBe(false);
    expect(names.some((name) => name.includes('disediakan'))).toBe(false);
    expect(names.some((name) => name.includes('tandatangan'))).toBe(false);
  });
});

describe('parseKewpa7Officers', () => {
  it('mengendalikan nilai pada baris berikutnya', () => {
    const officers = parseKewpa7Officers([
      'Pegawai Bertanggungjawab:',
      'Nurul Huda binti Hassan - Penyelia Lokasi',
      'Senarai Aset',
    ]);

    expect(officers).toHaveLength(1);
    expect(officers[0].nama).toBe('Nurul Huda binti Hassan');
    expect(officers[0].jawatan).toBe('Penyelia Lokasi');
  });

  it('menggabungkan pasangan Nama/Jawatan dalam blok tandatangan', () => {
    const officers = parseKewpa7Officers([
      'Disediakan oleh',
      'Nama: Wong Mei Ling',
      'Jawatan: PPAJ',
    ]);

    expect(officers).toHaveLength(1);
    expect(officers[0]).toMatchObject({ nama: 'Wong Mei Ling', jawatan: 'PPAJ' });
  });

  it('tidak mengulang pegawai yang sama', () => {
    const officers = parseKewpa7Officers([
      'Pegawai Bertanggungjawab: Ahmad bin Ali - PPAJ',
      'Nama: Ahmad bin Ali',
      'Jawatan: PPAJ',
    ]);

    expect(officers).toHaveLength(1);
  });

  it('memulangkan senarai kosong apabila tiada pegawai dinyatakan', () => {
    expect(parseKewpa7Officers(['Senarai Aset', 'KPT/PKS/H/07/13 Mesin Larik'])).toEqual([]);
  });
});
