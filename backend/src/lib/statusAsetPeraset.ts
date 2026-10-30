/**
 * Status fizikal A–F per aset (KEW.PA-11). Jumlah pecahan laporan dikira daripada
 * status setiap aset, jadi tiada aset yang boleh "terlepas" tanpa disedari.
 */
export const STATUS_ASET = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

export type StatusAset = (typeof STATUS_ASET)[number];

export type PecahanAset = Record<StatusAset, number>;

export const PECAHAN_KOSONG: PecahanAset = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };

export function normalisasiStatusAset(nilai: unknown): StatusAset | null {
  const teks = String(nilai ?? '').trim().toUpperCase();
  return (STATUS_ASET as readonly string[]).includes(teks) ? (teks as StatusAset) : null;
}

export function kiraPecahanAset(statuses: Array<string | null | undefined>): PecahanAset {
  const kiraan: PecahanAset = { ...PECAHAN_KOSONG };

  for (const nilai of statuses) {
    const status = normalisasiStatusAset(nilai);
    if (status) kiraan[status] += 1;
  }

  return kiraan;
}

/** Aset yang belum ditanda status (tiada dalam senarai status). */
export function kiraBelumDitanda(jumlahAset: number, pecahan: PecahanAset): number {
  const ditanda = STATUS_ASET.reduce((jumlah, status) => jumlah + pecahan[status], 0);
  return Math.max(jumlahAset - ditanda, 0);
}

export function pecahanLengkap(jumlahAset: number, pecahan: PecahanAset): boolean {
  return jumlahAset > 0 && kiraBelumDitanda(jumlahAset, pecahan) === 0;
}

export function jumlahPecahanAset(pecahan: PecahanAset): number {
  return STATUS_ASET.reduce((jumlah, status) => jumlah + pecahan[status], 0);
}
