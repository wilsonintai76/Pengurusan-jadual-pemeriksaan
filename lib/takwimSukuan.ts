export const BULAN_MALAY = [
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

/** Bulan lalai bagi 3 sukuan pemeriksaan: Mac, Jun, September. */
export const SUKUAN_BULAN_LALAI = [3, 6, 9] as const;

export interface EntriSukuan {
  tarikh: string;
  tajuk: string;
  catatan: string;
}

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Takwim menyimpan satu tarikh bagi setiap perkara, jadi setiap sukuan didaftarkan pada
 * hari pertama bulannya dan julat sebulan penuh dicatat dalam `catatan`.
 */
export function binaEntriSukuan(tahun: number, bulanList: number[]): EntriSukuan[] {
  return bulanList.map((bulan, index) => {
    const namaBulan = BULAN_MALAY[bulan - 1] ?? `Bulan ${bulan}`;
    return {
      tarikh: `${tahun}-${pad(bulan)}-01`,
      tajuk: `Tempoh Pemeriksaan Sukuan ${index + 1}/${tahun}`,
      catatan: `Sepanjang ${namaBulan} ${tahun}`,
    };
  });
}
