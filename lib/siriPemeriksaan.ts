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

/**
 * Bulan bagi siri tertentu daripada takwim sesi: entri `PEMERIKSAAN` yang bertajuk
 * "Sukuan N" dipadankan dengan N; jika tiada, guna bulan lalai (Mac/Jun/Sep).
 */
export function bulanSiri(siri: number, takwim: CalendarItem[] = []): string {
  const padanan = takwim.find((item) => {
    if (item.kategori !== 'PEMERIKSAAN') return false;
    const match = /sukuan\s*(\d)/i.exec(item.tajuk);
    return match ? Number(match[1]) === siri : false;
  });

  if (padanan?.catatan) {
    const nama = padanan.catatan.match(
      /(Januari|Februari|Mac|April|Mei|Jun|Julai|Ogos|September|Oktober|November|Disember)/i
    );
    if (nama) return nama[1];
  }
  if (padanan?.tarikh) {
    const bulan = Number(padanan.tarikh.slice(5, 7));
    if (bulan >= 1 && bulan <= 12) {
      return [
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
      ][bulan - 1];
    }
  }

  return SIRI_BULAN_LALAI[siri] ?? '-';
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
