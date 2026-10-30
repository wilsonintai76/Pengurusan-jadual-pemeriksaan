export type KodStatusAset = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface StatusAsetMeta {
  kod: KodStatusAset;
  label: string;
  /** Jenis dokumen sokongan yang direkodkan Ada/Tiada (null = tiada dokumen). */
  dokumen: string | null;
  /** Bilangan status ini dikira automatik (A = baki aset). */
  auto?: boolean;
}

/** Enam status fizikal aset semasa pemeriksaan (KEW.PA-11). */
export const STATUS_ASET: StatusAsetMeta[] = [
  { kod: 'A', label: 'Sedang Digunakan', dokumen: null, auto: true },
  { kod: 'B', label: 'Tidak Digunakan', dokumen: null },
  { kod: 'C', label: 'Perlu Pembaikan', dokumen: 'Laporan kerosakan' },
  { kod: 'D', label: 'Sedang Diselenggara', dokumen: 'LPO / pesanan kerja' },
  { kod: 'E', label: 'Pinjaman', dokumen: 'Borang pinjaman' },
  { kod: 'F', label: 'Hilang', dokumen: 'Laporan polis' },
];

/** Status yang merekodkan dokumen sokongan Ada/Tiada. */
export const STATUS_BERDOKUMEN: KodStatusAset[] = ['C', 'D', 'E', 'F'];

export type PecahanStatus = Record<KodStatusAset, number>;

export interface JustifikasiStatus {
  /** Ada dokumen sokongan? */
  adaDokumen: boolean;
  /** No. rujukan dokumen (pilihan). */
  rujukan?: string;
}

export type JustifikasiMap = Partial<Record<KodStatusAset, JustifikasiStatus>>;

export const PECAHAN_KOSONG: PecahanStatus = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };

function nombor(nilai: unknown): number {
  const n = Number(nilai);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Normalisasi input pelanggan kepada 6 kod A–F. Bilangan "Sedang Digunakan" (A)
 * sentiasa dikira sebagai baki daripada jumlah aset berdaftar ruang itu.
 */
export function normalizePecahan(
  input?: Partial<PecahanStatus> | null,
  kuantiti?: number
): PecahanStatus {
  const lain = {
    B: nombor(input?.B),
    C: nombor(input?.C),
    D: nombor(input?.D),
    E: nombor(input?.E),
    F: nombor(input?.F),
  };
  const jumlahLain = lain.B + lain.C + lain.D + lain.E + lain.F;
  const jumlahAset = nombor(kuantiti);

  return {
    A: Math.max(jumlahAset - jumlahLain, 0),
    ...lain,
  };
}

export function jumlahPecahan(pecahan: PecahanStatus): number {
  return STATUS_ASET.reduce((sum, status) => sum + (pecahan[status.kod] || 0), 0);
}

/** Semakan minimum: mesti ada sekurang-kurangnya satu aset diperiksa. */
export function validatePecahanStatus(pecahan: PecahanStatus): string[] {
  const ralat: string[] = [];
  if (jumlahPecahan(pecahan) <= 0) {
    ralat.push('Jumlah aset diperiksa tidak boleh sifar.');
  }
  return ralat;
}

/**
 * Peta kepada 4 lajur warisan `inspection_reports` supaya kompilasi Pra-JKPAK kekal
 * konsisten: baik = A + E, rosak = C + D, usang = B, hilang = F.
 */
export function mapLegacyCounts(pecahan: PecahanStatus): {
  baik: number;
  rosak: number;
  usang: number;
  hilang: number;
} {
  return {
    baik: pecahan.A + pecahan.E,
    rosak: pecahan.C + pecahan.D,
    usang: pecahan.B,
    hilang: pecahan.F,
  };
}
