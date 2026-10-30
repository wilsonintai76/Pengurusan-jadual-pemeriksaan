import { describe, expect, it } from 'vitest';
import { assetCsvFileName, buildAssetCsv, escapeCsvCell, type AssetCsvRow } from './assetCsv';

const ROW: AssetCsvRow = {
  bil: 1,
  noSiriPendaftaran: 'KPT/PKS/H/07/13',
  keterangan: 'Mesin Larik CNC',
};

describe('escapeCsvCell', () => {
  it('membiarkan nilai biasa tanpa petikan', () => {
    expect(escapeCsvCell('Mesin Larik CNC')).toBe('Mesin Larik CNC');
    expect(escapeCsvCell(12)).toBe('12');
  });

  it('memetik nilai yang mengandungi koma, petikan atau baris baharu', () => {
    expect(escapeCsvCell('Kabel, Wayar')).toBe('"Kabel, Wayar"');
    expect(escapeCsvCell('Mesin "Pressing"')).toBe('"Mesin ""Pressing"""');
    expect(escapeCsvCell('Baris 1\nBaris 2')).toBe('"Baris 1\nBaris 2"');
  });

  it('mengendalikan nilai kosong', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });
});

describe('buildAssetCsv', () => {
  it('menjana tajuk dan baris dalam susunan tetap', () => {
    const csv = buildAssetCsv([ROW, { ...ROW, bil: 2, noSiriPendaftaran: 'KPT/PKS/H/07/14' }]);
    const lines = csv.split('\r\n');

    expect(lines[0]).toBe('Bil,No. Siri Pendaftaran,Keterangan Aset');
    expect(lines[1]).toBe('1,KPT/PKS/H/07/13,Mesin Larik CNC');
    expect(lines).toHaveLength(3);
  });

  it('memetik sel yang mengandungi koma', () => {
    const csv = buildAssetCsv([{ ...ROW, keterangan: 'Kabel, Wayar' }]);
    expect(csv).toContain('"Kabel, Wayar"');
  });

  it('menghasilkan tajuk sahaja apabila tiada aset', () => {
    expect(buildAssetCsv([])).toBe('Bil,No. Siri Pendaftaran,Keterangan Aset');
  });
});

describe('assetCsvFileName', () => {
  it('membina nama fail selamat daripada nama dan kod lokasi', () => {
    expect(assetCsvFileName('BENGKEL MESIN', '130101 / BGN / JKM1 / 01 / B03')).toBe(
      'KEWPA7-BENGKEL-MESIN-130101-BGN-JKM1-01-B03.csv'
    );
  });

  it('mengendalikan nama kosong', () => {
    expect(assetCsvFileName('', '')).toBe('KEWPA7-ASET.csv');
  });
});
