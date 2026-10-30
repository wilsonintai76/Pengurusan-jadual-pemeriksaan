export interface KodLokasiSegments {
  kodRuang: string;
  kategoriKod: string;
  bangunan: string;
  aras: string;
  bilik: string;
}

/** `01` → `Aras 1`; `B`/`Bawah` → `Aras Bawah`; teks lain dikekalkan. */
export function formatAras(raw: string): string {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  if (/^\d+$/.test(value)) return `Aras ${Number(value)}`;
  if (/^b(awah)?$/i.test(value)) return 'Aras Bawah';
  return value;
}

/**
 * Pecahkan kod lokasi KEW.PA-7 kepada komponennya.
 * Contoh: `130101 / BGN / JKM1 / 01 / B09`
 * → kodRuang `130101`, kategori `BGN`, bangunan `JKM1`, aras `Aras 1`, bilik `B09`.
 */
export function parseKodLokasi(code: string): KodLokasiSegments {
  const parts = String(code ?? '')
    .split('/')
    .map((part) => part.trim());

  return {
    kodRuang: parts[0] ?? '',
    kategoriKod: parts[1] ?? '',
    bangunan: parts[2] ?? '',
    aras: formatAras(parts[3] ?? ''),
    bilik: parts[4] ?? '',
  };
}

/** Kategori ruang dijajarkan daripada nama ruang kerana kod KEW.PA-7 tidak menamakannya. */
export function deriveKategoriRuang(nama: string): string {
  const upper = String(nama ?? '').toUpperCase();
  if (upper.includes('BENGKEL')) return 'Bengkel Teknikal';
  if (upper.includes('MAKMAL') || upper.includes('LAB')) return 'Makmal Komputer';
  if (upper.includes('KULIAH')) return 'Bilik Kuliah';
  if (upper.includes('PELAYAN') || upper.includes('SERVER')) return 'Bilik Pelayan';
  if (upper.includes('STOR') || upper.includes('ARKIB')) return 'Stor & Arkib';
  if (upper.includes('STUDIO')) return 'Studio';
  if (upper.includes('SUMBER') || upper.includes('PERPUSTAKAAN')) return 'Pusat Sumber';
  return 'Pejabat Pentadbiran';
}
