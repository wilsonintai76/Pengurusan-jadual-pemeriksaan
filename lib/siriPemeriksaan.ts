import type { CalendarItem } from './dataApi';
import type { InspectionSchedule } from './types';

export const SIRI_LABEL: Record<number, string> = {
  1: 'Siri 1',
  2: 'Siri 2',
  3: 'Siri 3',
};

/** Bulan lalai bagi setiap siri jika takwim belum menetapkan tempoh pemeriksaan. */
export const SIRI_BULAN_LALAI: Record<number, string> = {
  1: 'Mac',
  2: 'Jun',
  3: 'September',
};

export const BULAN_NAMA = [
  'Januari',
  'Februari',
  'Mac',
  'April',
  'Mei',
  'Jun',
  'Julai',
  'Ogos',
  'September',
  'Oktober',
  'November',
  'Disember',
] as const;

/** Bulan (1–12) bagi setiap siri jika takwim belum menetapkan tempoh pemeriksaan. */
export const SIRI_BULAN_LALAI_NOMBOR: Record<number, number> = { 1: 3, 2: 6, 3: 9 };

/** Nombor bulan (1–12) bagi siri daripada takwim; lalai Mac/Jun/September. */
export function siriBulanNombor(siri: number, takwim: CalendarItem[] = []): number {
  const padanan = takwim.find((item) => {
    if (item.kategori !== 'PEMERIKSAAN') return false;
    const match = /sukuan\s*(\d)/i.exec(item.tajuk);
    return match ? Number(match[1]) === siri : false;
  });

  if (padanan?.catatan) {
    const index = BULAN_NAMA.findIndex((bulan) =>
      new RegExp(bulan, 'i').test(String(padanan.catatan))
    );
    if (index >= 0) return index + 1;
  }
  if (padanan?.tarikh) {
    const bulan = Number(String(padanan.tarikh).slice(5, 7));
    if (bulan >= 1 && bulan <= 12) return bulan;
  }

  return SIRI_BULAN_LALAI_NOMBOR[siri] ?? 3;
}

export interface SiriWindow {
  bulan: number;
  mula: string;
  tamat: string;
  label: string;
}

const pad2 = (value: number) => String(value).padStart(2, '0');

/** Julat tarikh siri: sebulan penuh dalam tahun sesi (sama seperti semakan pada Worker). */
export function siriWindow(tahun: number, bulan: number): SiriWindow {
  const selamatBulan = bulan >= 1 && bulan <= 12 ? bulan : 3;
  const hariTerakhir = new Date(Date.UTC(tahun, selamatBulan, 0)).getUTCDate();
  const namaBulan = BULAN_NAMA[selamatBulan - 1];

  return {
    bulan: selamatBulan,
    mula: `${tahun}-${pad2(selamatBulan)}-01`,
    tamat: `${tahun}-${pad2(selamatBulan)}-${pad2(hariTerakhir)}`,
    label: `${namaBulan} ${tahun} (01/${pad2(selamatBulan)}/${tahun} – ${pad2(hariTerakhir)}/${pad2(
      selamatBulan
    )}/${tahun})`,
  };
}

export function windowSiri(siri: number, takwim: CalendarItem[], tahun: number): SiriWindow {
  return siriWindow(tahun, siriBulanNombor(siri, takwim));
}

/**
 * Bulan bagi siri tertentu daripada takwim sesi: entri `PEMERIKSAAN` yang bertajuk
 * "Sukuan N" dipadankan dengan N; jika tiada, guna bulan lalai (Mac/Jun/Sep).
 */
export function bulanSiri(siri: number, takwim: CalendarItem[] = []): string {
  return BULAN_NAMA[siriBulanNombor(siri, takwim) - 1] ?? SIRI_BULAN_LALAI[siri] ?? '-';
}

export interface SasaranSiri {
  /** Bilangan ruang jabatan yang sudah ada jadual bagi siri ini. */
  terjadual: number;
  /** Jumlah ruang berdaftar jabatan itu. */
  jumlahRuang: number;
  /** Ruang yang belum mempunyai jadual (boleh dipilih). */
  baki: number;
  /** Peratus ruang yang sudah dijadualkan dalam siri ini. */
  peratus: number;
  /** Siri yang paling sedikit ruangnya — dicadangkan secara lalai. */
  siriDicadangkan: number;
}

/** Kiraan sasaran bagi satu jabatan, untuk dipaparkan selepas lokasi dipilih. */
export function kiraSasaranSiri(
  schedules: InspectionSchedule[],
  jumlahRuang: number,
  jabatan?: string
): SasaranSiri {
  const milikJabatan = jabatan ? schedules.filter((s) => s.jabatan === jabatan) : schedules;
  const jumlahPerSiri = [1, 2, 3].map(
    (siri) => milikJabatan.filter((s) => Number(s.siri ?? 1) === siri).length
  );

  const siriDicadangkan =
    jumlahPerSiri.indexOf(Math.min(...jumlahPerSiri)) + 1 || 1;
  const terjadual = milikJabatan.filter((s) => Number(s.siri ?? 1) === siriDicadangkan).length;

  return {
    terjadual,
    jumlahRuang,
    baki: Math.max(jumlahRuang - milikJabatan.length, 0),
    peratus: jumlahRuang > 0 ? Math.round((terjadual / jumlahRuang) * 100) : 0,
    siriDicadangkan,
  };
}

/** Bilangan ruang yang dijadualkan bagi siri tertentu. */
export function kiraRuangSiri(schedules: InspectionSchedule[], siri: number, jabatan?: string): number {
  return schedules.filter(
    (s) => Number(s.siri ?? 1) === siri && (!jabatan || s.jabatan === jabatan)
  ).length;
}
