import type { JustifikasiMap, PecahanStatus } from './types';

export type { JustifikasiMap, PecahanStatus };

export interface StatusAsetMeta {
  kod: keyof PecahanStatus;
  label: string;
  /** Dokumen sokongan wajib bagi status ini (null = tiada). */
  dokumen: string | null;
  /** Cadangan justifikasi pantas. */
  cadangan?: string[];
}

/** Enam status fizikal aset (KEW.PA-11) — selaras `backend/src/lib/kewpa11Status.ts`. */
export const STATUS_ASET: StatusAsetMeta[] = [
  { kod: 'A', label: 'Sedang Digunakan', dokumen: null },
  {
    kod: 'B',
    label: 'Tidak Digunakan',
    dokumen: 'Justifikasi sebab tidak digunakan',
    cadangan: [
      'Tiada dalam silibus / tidak lagi digunakan',
      'Aset lapuk (teknologi usang)',
      'Melebihi keperluan unit',
      'Ralat perolehan / tidak sesuai dengan keperluan',
      'Rosak tidak ekonomik untuk dibaiki',
    ],
  },
  { kod: 'C', label: 'Perlu Pembaikan', dokumen: 'No. laporan kerosakan' },
  { kod: 'D', label: 'Sedang Diselenggara', dokumen: 'No. LPO / pesanan kerja' },
  { kod: 'E', label: 'Pinjaman', dokumen: 'No. borang pinjaman' },
  { kod: 'F', label: 'Hilang', dokumen: 'No. laporan polis (jika ada)' },
];

export const STATUS_WAJIB_JUSTIFIKASI: Array<keyof PecahanStatus> = ['B', 'C', 'D', 'E', 'F'];

export const PECAHAN_KOSONG: PecahanStatus = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };

export function jumlahPecahan(pecahan: PecahanStatus): number {
  return STATUS_ASET.reduce((sum, status) => sum + (Number(pecahan[status.kod]) || 0), 0);
}

/** Semakan sisi pelanggan — peraturan muktamad tetap pada Worker. */
export function validatePecahanStatus(
  pecahan: PecahanStatus,
  justifikasi: JustifikasiMap = {}
): string[] {
  const ralat: string[] = [];

  if (jumlahPecahan(pecahan) <= 0) {
    ralat.push('Jumlah aset diperiksa tidak boleh sifar.');
  }

  for (const kod of STATUS_WAJIB_JUSTIFIKASI) {
    if ((pecahan[kod] || 0) <= 0) continue;

    const meta = STATUS_ASET.find((status) => status.kod === kod);
    const sebab = String(justifikasi[kod]?.sebab ?? '').trim();
    const rujukan = String(justifikasi[kod]?.rujukan ?? '').trim();

    if (!sebab) {
      ralat.push(
        `Status ${kod} (${meta?.label ?? kod}): ${pecahan[kod]} aset — justifikasi wajib diisi.`
      );
    }
    if (kod === 'C' && !rujukan) {
      ralat.push('Status C (Perlu Pembaikan): no. laporan kerosakan wajib diisi.');
    }
    if (kod === 'D' && !rujukan) {
      ralat.push('Status D (Sedang Diselenggara): no. LPO / pesanan kerja wajib diisi.');
    }
    if (kod === 'E' && !rujukan) {
      ralat.push('Status E (Pinjaman): no. borang pinjaman wajib diisi.');
    }
  }

  return ralat;
}
