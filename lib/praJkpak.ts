import type { JustifikasiMap, LaporanPraJkpak, PecahanStatus } from './types';

/** Status yang merekodkan dokumen sokongan (selaras KEW.PA-11). */
export type KodDokumen = 'C' | 'D' | 'E' | 'F';

export interface DokumenSokongan {
  kod: KodDokumen;
  /** Label status, cth. "Perlu Pembaikan". */
  label: string;
  /** Jenis dokumen yang diwajibkan, cth. "Laporan kerosakan". */
  jenisDokumen: string;
  bilangan: number;
  /** `null` = pemeriksa tidak merekod Ada/Tiada (rekod lama). */
  adaDokumen: boolean | null;
  rujukan: string;
}

export interface RingkasanPraJkpak {
  /** Jumlah aset diperiksa (A+B+C+D+E+F). */
  jumlahDiperiksa: number;
  pecahan: PecahanStatus;
  /** Dokumen sokongan bagi status yang bilangannya > 0 sahaja. */
  dokumen: DokumenSokongan[];
  /** Sebab piawai bagi status B (Tidak Digunakan). */
  sebabTidakDigunakan: string;
  cadangan: string;
  tarikhHantar?: string;
  /** `true` apabila laporan masih menggunakan 4 kategori warisan (tiada pecahan A–F). */
  warisan: boolean;
}

export const LABEL_STATUS: Record<keyof PecahanStatus, string> = {
  A: 'Sedang Digunakan',
  B: 'Tidak Digunakan',
  C: 'Perlu Pembaikan',
  D: 'Sedang Diselenggara',
  E: 'Pinjaman',
  F: 'Hilang',
};

export const JENIS_DOKUMEN: Record<KodDokumen, string> = {
  C: 'Laporan kerosakan',
  D: 'LPO / pesanan kerja',
  E: 'Borang pinjaman',
  F: 'Laporan polis',
};

const PECAHAN_SIFAR: PecahanStatus = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };

function angka(nilai: unknown): number {
  const n = Number(nilai);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Pecahan A–F daripada laporan. Rekod lama (sebelum KEW.PA-11 A–F) hanya mempunyai
 * 4 kategori, dipetakan `baik → A`, `usang → B`, `rosak → C`, `hilang → F`.
 */
export function pecahanDaripadaLaporan(laporan?: LaporanPraJkpak | null): {
  pecahan: PecahanStatus;
  warisan: boolean;
} {
  if (!laporan) return { pecahan: { ...PECAHAN_SIFAR }, warisan: false };

  const adaPecahan =
    Boolean(laporan.pecahan) &&
    Object.values(laporan.pecahan ?? {}).some((nilai) => angka(nilai) > 0);

  if (adaPecahan) {
    return {
      pecahan: {
        A: angka(laporan.pecahan?.A),
        B: angka(laporan.pecahan?.B),
        C: angka(laporan.pecahan?.C),
        D: angka(laporan.pecahan?.D),
        E: angka(laporan.pecahan?.E),
        F: angka(laporan.pecahan?.F),
      },
      warisan: false,
    };
  }

  return {
    pecahan: {
      A: angka(laporan.baik),
      B: angka(laporan.usang),
      C: angka(laporan.rosak),
      D: 0,
      E: 0,
      F: angka(laporan.hilang),
    },
    warisan: true,
  };
}

export function jumlahPecahanAset(pecahan: PecahanStatus): number {
  return (['A', 'B', 'C', 'D', 'E', 'F'] as const).reduce(
    (jumlah, kod) => jumlah + angka(pecahan[kod]),
    0
  );
}

export function ringkasLaporan(laporan?: LaporanPraJkpak | null): RingkasanPraJkpak {
  const { pecahan, warisan } = pecahanDaripadaLaporan(laporan);
  const justifikasi = (laporan?.justifikasi ?? {}) as JustifikasiMap;

  const dokumen: DokumenSokongan[] = (['C', 'D', 'E', 'F'] as const)
    .map((kod) => {
      const rekod = justifikasi[kod];
      return {
        kod,
        label: LABEL_STATUS[kod],
        jenisDokumen: JENIS_DOKUMEN[kod],
        bilangan: angka(pecahan[kod]),
        adaDokumen:
          rekod && typeof rekod.adaDokumen === 'boolean' ? rekod.adaDokumen : null,
        rujukan: String(rekod?.rujukan ?? '').trim(),
      };
    })
    .filter((item) => item.bilangan > 0);

  return {
    jumlahDiperiksa: jumlahPecahanAset(pecahan),
    pecahan,
    dokumen,
    sebabTidakDigunakan: String(justifikasi.B?.sebab ?? '').trim(),
    cadangan: String(laporan?.cadangan ?? '').trim(),
    tarikhHantar: laporan?.tarikhHantar,
    warisan,
  };
}

/** Ringkasan dokumen untuk paparan: "Ada · ADU/2026/001" / "Tiada" / "Tidak direkod". */
export function teksDokumen(item: DokumenSokongan): string {
  if (item.adaDokumen === null) {
    return item.rujukan ? `Tidak direkod · ${item.rujukan}` : 'Tidak direkod';
  }
  if (!item.adaDokumen) return 'Tiada';
  return item.rujukan ? `Ada · ${item.rujukan}` : 'Ada';
}
