import type { JustifikasiMap, PecahanStatus } from './types';

export type { JustifikasiMap, PecahanStatus };

export interface StatusAsetMeta {
  kod: keyof PecahanStatus;
  label: string;
  /** Jenis dokumen sokongan yang direkodkan Ada/Tiada (null = tiada dokumen). */
  dokumen: string | null;
  /** Bilangan dikira automatik (A = baki aset). */
  auto?: boolean;
}

/** Enam status fizikal aset (KEW.PA-11) — selaras `backend/src/lib/kewpa11Status.ts`. */
export const STATUS_ASET: StatusAsetMeta[] = [
  { kod: 'A', label: 'Sedang Digunakan', dokumen: null, auto: true },
  { kod: 'B', label: 'Tidak Digunakan', dokumen: null },
  { kod: 'C', label: 'Perlu Pembaikan', dokumen: 'Laporan kerosakan' },
  { kod: 'D', label: 'Sedang Diselenggara', dokumen: 'LPO / pesanan kerja' },
  { kod: 'E', label: 'Pinjaman', dokumen: 'Borang pinjaman' },
  { kod: 'F', label: 'Hilang', dokumen: 'Laporan polis' },
];

/** Status yang merekodkan dokumen sokongan Ada/Tiada. */
export const STATUS_BERDOKUMEN: Array<keyof PecahanStatus> = ['C', 'D', 'E', 'F'];

export const PECAHAN_KOSONG: PecahanStatus = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };

export function jumlahPecahan(pecahan: PecahanStatus): number {
  return STATUS_ASET.reduce((sum, status) => sum + (Number(pecahan[status.kod]) || 0), 0);
}

/**
 * "Sedang Digunakan" (A) sentiasa baki daripada jumlah aset berdaftar ruang itu,
 * iaitu `kuantiti − (B + C + D + E + F)`.
 */
export function hitungSedangDigunakan(kuantiti: number, pecahan: PecahanStatus): number {
  const lain =
    (Number(pecahan.B) || 0) +
    (Number(pecahan.C) || 0) +
    (Number(pecahan.D) || 0) +
    (Number(pecahan.E) || 0) +
    (Number(pecahan.F) || 0);
  return Math.max((Number(kuantiti) || 0) - lain, 0);
}

/** Semakan sisi pelanggan — peraturan muktamad tetap pada Worker. */
export function validatePecahanStatus(pecahan: PecahanStatus): string[] {
  return jumlahPecahan(pecahan) <= 0 ? ['Jumlah aset diperiksa tidak boleh sifar.'] : [];
}
