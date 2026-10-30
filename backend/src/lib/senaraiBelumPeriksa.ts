/**
 * Padanan aset SPA (senarai belum diperiksa) kepada lokasi portal.
 * Nota: `normalisasiLabel` / `normalisasiNamaRuang` diselaraskan dengan `lib/senaraiBelumPeriksa.ts`
 * (klien menggunakannya untuk pratonton import) — ubah kedua-duanya serentak.
 */
export type KaedahPadanan = 'LABEL' | 'ALIAS' | 'NAMA' | 'MANUAL';

export interface RujukanPadanan {
  /** No. Siri Pendaftaran (dinormalisasi) → location_id, daripada jadual `assets`. */
  labelKeLokasi: Map<string, string>;
  /** Nama ruang SPA (dinormalisasi) → location_id, daripada `spa_room_alias`. */
  aliasKeLokasi: Map<string, string>;
  /** Nama lokasi portal (dinormalisasi) → location_id. */
  namaKeLokasi: Map<string, string>;
}

export function normalisasiTeks(nilai: unknown): string {
  return String(nilai ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalisasiLabel(nilai: unknown): string {
  return normalisasiTeks(nilai).toUpperCase();
}

export function normalisasiNamaRuang(nilai: unknown): string {
  return normalisasiTeks(nilai).toUpperCase();
}

export function rujukanKosong(): RujukanPadanan {
  return { labelKeLokasi: new Map(), aliasKeLokasi: new Map(), namaKeLokasi: new Map() };
}

export interface HasilPadanan {
  locationId: string | null;
  kaedah: KaedahPadanan | null;
}

/**
 * Empat lapis: label aset (paling tepat) → alias ruang → nama ruang portal → tiada.
 * Baris tanpa padanan disimpan dengan `locationId = null` untuk dipadankan secara manual.
 */
export function padanLokasi(
  baris: { label?: string; lokasiSpa?: string },
  rujukan: RujukanPadanan
): HasilPadanan {
  const label = normalisasiLabel(baris.label);
  if (label) {
    const melaluiLabel = rujukan.labelKeLokasi.get(label);
    if (melaluiLabel) return { locationId: melaluiLabel, kaedah: 'LABEL' };
  }

  const ruang = normalisasiNamaRuang(baris.lokasiSpa);
  if (ruang) {
    const melaluiAlias = rujukan.aliasKeLokasi.get(ruang);
    if (melaluiAlias) return { locationId: melaluiAlias, kaedah: 'ALIAS' };

    const melaluiNama = rujukan.namaKeLokasi.get(ruang);
    if (melaluiNama) return { locationId: melaluiNama, kaedah: 'NAMA' };
  }

  return { locationId: null, kaedah: null };
}

export interface KiraanPadanan {
  jumlahBaris: number;
  padan: number;
  belumPadan: number;
  kaedah: Record<'LABEL' | 'ALIAS' | 'NAMA', number>;
}

export function kiraPadanan(
  baris: Array<{ label?: string; lokasiSpa?: string }>,
  rujukan: RujukanPadanan
): KiraanPadanan {
  const kiraan: KiraanPadanan = {
    jumlahBaris: baris.length,
    padan: 0,
    belumPadan: 0,
    kaedah: { LABEL: 0, ALIAS: 0, NAMA: 0 },
  };

  for (const item of baris) {
    const hasil = padanLokasi(item, rujukan);
    if (hasil.locationId && hasil.kaedah && hasil.kaedah !== 'MANUAL') {
      kiraan.padan += 1;
      kiraan.kaedah[hasil.kaedah] += 1;
    } else {
      kiraan.belumPadan += 1;
    }
  }

  return kiraan;
}
