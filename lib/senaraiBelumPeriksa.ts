/**
 * Eksport SPA "Senarai Aset Belum Diperiksa" — satu fail bagi setiap folder/jabatan.
 * Lajur: Label | Jenis Aset | Pegawai Penempatan | Bahagian | Lokasi Terkini | Status Aset.
 */
export interface BarisBelumPeriksa {
  label: string;
  jenisAset: string;
  pegawaiPenempatan: string;
  bahagian: string;
  lokasiSpa: string;
  statusAset: string;
}

export interface KeputusanParse {
  namaFail: string;
  baris: BarisBelumPeriksa[];
  /** Baris tanpa Label (tajuk nota, baris kosong, jumlah). */
  ditolak: number;
  /** Label berulang dalam fail yang sama. */
  gandaan: number;
}

type KunciLajur = keyof Omit<BarisBelumPeriksa, never>;

const LAJUR_DIKENALI: Record<KunciLajur, string[]> = {
  label: ['label', 'no. siri pendaftaran', 'no siri pendaftaran'],
  jenisAset: ['jenis aset', 'jenis'],
  pegawaiPenempatan: ['pegawai penempatan', 'pegawai'],
  bahagian: ['bahagian', 'unit'],
  lokasiSpa: ['lokasi terkini', 'lokasi'],
  statusAset: ['status aset', 'status'],
};

export function normalisasiTeks(nilai: unknown): string {
  return String(nilai ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Label aset tidak sensitif huruf besar/kecil dan ruang berganda. */
export function normalisasiLabel(nilai: unknown): string {
  return normalisasiTeks(nilai).toUpperCase();
}

/** Nama ruang SPA dibandingkan tanpa huruf besar/kecil dan ruang berganda. */
export function normalisasiNamaRuang(nilai: unknown): string {
  return normalisasiTeks(nilai).toUpperCase();
}

function cariIndeksLajur(sel: string[]): Partial<Record<KunciLajur, number>> | null {
  const indeks: Partial<Record<KunciLajur, number>> = {};
  const rendah = sel.map((nilai) => normalisasiTeks(nilai).toLowerCase());

  for (const [kunci, alias] of Object.entries(LAJUR_DIKENALI) as [KunciLajur, string[]][]) {
    const posisi = rendah.findIndex((nilai) => alias.includes(nilai));
    if (posisi >= 0) indeks[kunci] = posisi;
  }

  return indeks.label === undefined ? null : indeks;
}

function bacaSel(sel: unknown[], posisi?: number): string {
  if (posisi === undefined) return '';
  return normalisasiTeks(sel[posisi]);
}

/**
 * Cari baris tajuk (mengandungi "Label"), kemudian petakan setiap baris data.
 * Toleran terhadap baris tajuk yang tidak bermula pada baris pertama.
 */
export function parseSenaraiBelumPeriksa(rows: unknown[][], namaFail = ''): KeputusanParse {
  const baris: BarisBelumPeriksa[] = [];
  const dilihat = new Set<string>();
  let ditolak = 0;
  let gandaan = 0;

  let indeksTajuk = -1;
  let lajur: Partial<Record<KunciLajur, number>> | null = null;

  for (let i = 0; i < rows.length; i += 1) {
    const calon = cariIndeksLajur((rows[i] ?? []).map((sel) => normalisasiTeks(sel)));
    if (calon) {
      indeksTajuk = i;
      lajur = calon;
      break;
    }
  }

  if (!lajur) {
    return { namaFail, baris, ditolak: rows.length, gandaan };
  }

  for (let i = indeksTajuk + 1; i < rows.length; i += 1) {
    const sel = rows[i] ?? [];
    const label = normalisasiLabel(bacaSel(sel, lajur.label));

    if (!label) {
      if (sel.some((nilai) => normalisasiTeks(nilai).length > 0)) ditolak += 1;
      continue;
    }

    if (dilihat.has(label)) {
      gandaan += 1;
      continue;
    }
    dilihat.add(label);

    baris.push({
      label,
      jenisAset: bacaSel(sel, lajur.jenisAset),
      pegawaiPenempatan: bacaSel(sel, lajur.pegawaiPenempatan),
      bahagian: bacaSel(sel, lajur.bahagian),
      lokasiSpa: bacaSel(sel, lajur.lokasiSpa),
      statusAset: bacaSel(sel, lajur.statusAset),
    });
  }

  return { namaFail, baris, ditolak, gandaan };
}

/** Gabungkan beberapa fail (multi-folder); label yang sama hanya dikira sekali. */
export function gabungKeputusan(keputusan: KeputusanParse[]): KeputusanParse[] {
  const dilihat = new Set<string>();
  return keputusan.map((satu) => {
    const baris = satu.baris.filter((item) => {
      if (dilihat.has(item.label)) return false;
      dilihat.add(item.label);
      return true;
    });
    return { ...satu, baris, gandaan: satu.gandaan + (satu.baris.length - baris.length) };
  });
}

export interface RingkasanRuangSpa {
  lokasiSpa: string;
  bahagian: string;
  bilangan: number;
}

/** Kumpulan mengikut nama ruang SPA — asas untuk "Padankan ke ruang…" berulang. */
export function kumpulIkutRuangSpa(baris: BarisBelumPeriksa[]): RingkasanRuangSpa[] {
  const peta = new Map<string, RingkasanRuangSpa>();

  for (const item of baris) {
    const kunci = normalisasiNamaRuang(item.lokasiSpa) || '(tiada ruang)';
    const sedia = peta.get(kunci);
    if (sedia) {
      sedia.bilangan += 1;
      continue;
    }
    peta.set(kunci, {
      lokasiSpa: item.lokasiSpa || '(tiada ruang)',
      bahagian: item.bahagian,
      bilangan: 1,
    });
  }

  return Array.from(peta.values()).sort((a, b) => b.bilangan - a.bilangan);
}
