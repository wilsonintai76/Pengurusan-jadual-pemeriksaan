/** Bulan lalai bagi setiap siri jika takwim belum menetapkan tempoh pemeriksaan. */
export const SIRI_BULAN_LALAI: Record<number, number> = {
  1: 3, // Mac
  2: 6, // Jun
  3: 9, // September
};

const BULAN_NAMA = [
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
];

export interface SiriWindow {
  /** Bulan (1–12) bagi siri ini. */
  bulan: number;
  /** Hari pertama bulan siri (YYYY-MM-01). */
  mula: string;
  /** Hari terakhir bulan siri (YYYY-MM-DD). */
  tamat: string;
  /** Label paparan, cth. "Jun 2026 (01/06/2026 – 30/06/2026)". */
  label: string;
}

const pad = (value: number) => String(value).padStart(2, '0');

interface CalendarRow {
  tarikh: string;
  tajuk: string;
  kategori: string;
  catatan: string | null;
}

/**
 * Bulan bagi siri tertentu: ambil entri takwim `PEMERIKSAAN` yang tajuknya mengandungi
 * "Sukuan N"; jika tiada, guna bulan lalai (Mac/Jun/September).
 */
export function siriBulan(siri: number, takwim: CalendarRow[] = []): number {
  const padanan = takwim.find((item) => {
    if (item.kategori !== 'PEMERIKSAAN') return false;
    const match = /sukuan\s*(\d)/i.exec(item.tajuk);
    return match ? Number(match[1]) === siri : false;
  });

  if (padanan) {
    const nama = padanan.catatan
      ? BULAN_NAMA.findIndex((bulan) =>
          new RegExp(bulan, 'i').test(String(padanan.catatan))
        )
      : -1;
    if (nama >= 0) return nama + 1;

    const bulanTarikh = Number(String(padanan.tarikh).slice(5, 7));
    if (bulanTarikh >= 1 && bulanTarikh <= 12) return bulanTarikh;
  }

  return SIRI_BULAN_LALAI[siri] ?? 3;
}

/** Julat tarikh bagi siri: sebulan penuh dalam tahun sesi. */
export function siriWindow(tahun: number, bulan: number): SiriWindow {
  const selamatBulan = bulan >= 1 && bulan <= 12 ? bulan : 3;
  // Hari terakhir bulan: hari ke-0 bulan berikutnya.
  const hariTerakhir = new Date(Date.UTC(tahun, selamatBulan, 0)).getUTCDate();
  const mula = `${tahun}-${pad(selamatBulan)}-01`;
  const tamat = `${tahun}-${pad(selamatBulan)}-${pad(hariTerakhir)}`;
  const namaBulan = BULAN_NAMA[selamatBulan - 1];

  return {
    bulan: selamatBulan,
    mula,
    tamat,
    label: `${namaBulan} ${tahun} (01/${pad(selamatBulan)}/${tahun} – ${pad(hariTerakhir)}/${pad(
      selamatBulan
    )}/${tahun})`,
  };
}

export function windowUntukSiri(
  tahun: number,
  siri: number,
  takwim: CalendarRow[] = []
): SiriWindow {
  return siriWindow(tahun, siriBulan(siri, takwim));
}
