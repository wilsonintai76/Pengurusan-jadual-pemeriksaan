import { describe, expect, it } from 'vitest';
import {
  kiraPadanan,
  normalisasiLabel,
  normalisasiNamaRuang,
  padanLokasi,
  rujukanKosong,
  type RujukanPadanan,
} from './senaraiBelumPeriksa';

function rujukan(partial: Partial<{
  label: Record<string, string>;
  alias: Record<string, string>;
  nama: Record<string, string>;
}>): RujukanPadanan {
  return {
    labelKeLokasi: new Map(Object.entries(partial.label ?? {})),
    aliasKeLokasi: new Map(Object.entries(partial.alias ?? {})),
    namaKeLokasi: new Map(Object.entries(partial.nama ?? {})),
  };
}

describe('normalisasi (pelayan)', () => {
  it('sama seperti klien', () => {
    expect(normalisasiLabel(' kpt/pks/i/05/7523 ')).toBe('KPT/PKS/I/05/7523');
    expect(normalisasiNamaRuang('bilik  a')).toBe('BILIK A');
  });
});

describe('padanLokasi', () => {
  it('lapis 1 — label aset mengatasi semua lapisan lain', () => {
    const hasil = padanLokasi(
      { label: 'KPT/PKS/I/01/1', lokasiSpa: 'BILIK LAIN' },
      rujukan({
        label: { 'KPT/PKS/I/01/1': 'LOK-1' },
        alias: { 'BILIK LAIN': 'LOK-9' },
        nama: { 'BILIK LAIN': 'LOK-8' },
      })
    );
    expect(hasil).toEqual({ locationId: 'LOK-1', kaedah: 'LABEL' });
  });

  it('lapis 2 — alias ruang apabila label tiada dalam aset portal', () => {
    const hasil = padanLokasi(
      { label: 'KPT/PKS/I/99/9', lokasiSpa: 'bilik penolong akauntan' },
      rujukan({ alias: { 'BILIK PENOLONG AKAUNTAN': 'LOK-2' } })
    );
    expect(hasil).toEqual({ locationId: 'LOK-2', kaedah: 'ALIAS' });
  });

  it('lapis 3 — nama lokasi portal sama dengan nama ruang SPA', () => {
    const hasil = padanLokasi(
      { label: '', lokasiSpa: 'bengkel mesin' },
      rujukan({ nama: { 'BENGKEL MESIN': 'LOK-3' } })
    );
    expect(hasil).toEqual({ locationId: 'LOK-3', kaedah: 'NAMA' });
  });

  it('lapis 4 — belum dipadankan apabila tiada padanan', () => {
    expect(padanLokasi({ label: 'X/1', lokasiSpa: 'RUANG BARU' }, rujukanKosong())).toEqual({
      locationId: null,
      kaedah: null,
    });
  });
});

describe('kiraPadanan', () => {
  it('mengira bilangan padan, belum padan dan pecahan kaedah', () => {
    const kiraan = kiraPadanan(
      [
        { label: 'A/1', lokasiSpa: 'BILIK A' },
        { label: 'B/2', lokasiSpa: 'BILIK B' },
        { label: 'C/3', lokasiSpa: 'BILIK C' },
        { label: 'D/4', lokasiSpa: 'BILIK D' },
      ],
      rujukan({
        label: { 'A/1': 'LOK-1' },
        alias: { 'BILIK B': 'LOK-2' },
        nama: { 'BILIK C': 'LOK-3' },
      })
    );

    expect(kiraan).toEqual({
      jumlahBaris: 4,
      padan: 3,
      belumPadan: 1,
      kaedah: { LABEL: 1, ALIAS: 1, NAMA: 1 },
    });
  });
});
