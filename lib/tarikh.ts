/** Format tarikh paparan Malaysia: `YYYY-MM-DD` → `DD/MM/YYYY`. */
export function formatTarikhMY(iso?: string | null): string {
  const nilai = String(iso ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nilai)) return nilai;
  const [tahun, bulan, hari] = nilai.split('-');
  return `${hari}/${bulan}/${tahun}`;
}

/** Julat tarikh paparan: `DD/MM/YYYY – DD/MM/YYYY` (kosong jika tiada). */
export function formatJulatTarikhMY(mula?: string | null, tamat?: string | null): string {
  const a = formatTarikhMY(mula);
  const b = formatTarikhMY(tamat);
  if (!a && !b) return '';
  if (!a) return b;
  if (!b) return a;
  return `${a} – ${b}`;
}
