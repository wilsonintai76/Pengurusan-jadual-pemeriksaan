export type KodStatusAset = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface StatusAsetMeta {
  kod: KodStatusAset;
  label: string;
  /** Dokumen sokongan wajib bagi status ini (null = tiada). */
  dokumen: string | null;
  /** Cadangan justifikasi pantas untuk dipilih pengguna. */
  cadangan?: string[];
}

/** Enam status fizikal aset semasa pemeriksaan (KEW.PA-11). */
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

/** Status yang WAJIB ada justifikasi apabila bilangannya > 0. */
export const STATUS_WAJIB_JUSTIFIKASI: KodStatusAset[] = ['B', 'C', 'D', 'E', 'F'];

export type PecahanStatus = Record<KodStatusAset, number>;

export interface JustifikasiStatus {
  sebab: string;
  rujukan?: string;
}

export type JustifikasiMap = Partial<Record<KodStatusAset, JustifikasiStatus>>;

export const PECAHAN_KOSONG: PecahanStatus = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };

function nombor(nilai: unknown): number {
  const n = Number(nilai);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Normalisasi input pelanggan kepada 6 kod A–F. */
export function normalizePecahan(input?: Partial<PecahanStatus> | null): PecahanStatus {
  return {
    A: nombor(input?.A),
    B: nombor(input?.B),
    C: nombor(input?.C),
    D: nombor(input?.D),
    E: nombor(input?.E),
    F: nombor(input?.F),
  };
}

export function jumlahPecahan(pecahan: PecahanStatus): number {
  return STATUS_ASET.reduce((sum, status) => sum + (pecahan[status.kod] || 0), 0);
}

/**
 * Semak peraturan KEW.PA-11: setiap status B–F yang ada aset mesti mempunyai
 * justifikasi, dan dokumen sokongan mengikut jenis status.
 */
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
