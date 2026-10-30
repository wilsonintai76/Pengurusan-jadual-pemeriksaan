/** Tiga lajur sahaja — cukup untuk Daftar Pemeriksaan Aset Alih. */
export interface AssetCsvRow {
  bil: number;
  noSiriPendaftaran: string;
  keterangan: string;
}

export const ASSET_CSV_HEADERS = ['Bil', 'No. Siri Pendaftaran', 'Keterangan Aset'] as const;

/** Escape satu sel CSV: petikan berganda jika mengandungi koma, petikan atau baris baharu. */
export function escapeCsvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Bina kandungan CSV (tanpa BOM) daripada baris aset. */
export function buildAssetCsv(rows: AssetCsvRow[]): string {
  const lines = rows.map((row) =>
    [row.bil, row.noSiriPendaftaran, row.keterangan].map(escapeCsvCell).join(',')
  );

  return [ASSET_CSV_HEADERS.join(','), ...lines].join('\r\n');
}

/** Nama fail selamat: kod lokasi tanpa `/` dan ruang. */
export function assetCsvFileName(namaLokasi: string, kodLokasi: string): string {
  const slug = `${namaLokasi} ${kodLokasi}`
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `KEWPA7-${slug || 'ASET'}.csv`;
}

/** Muat turun CSV dalam pelayar (BOM supaya Excel membaca UTF-8 dengan betul). */
export function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
