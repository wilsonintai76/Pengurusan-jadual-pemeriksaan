export interface KumpulanAras {
  /** Kunci kumpulan tanpa jarak, cth. `130101/BGN/ALA/01`. */
  kunci: string;
  /** Nama paparan, cth. `Asrama Lelaki Blok A Aras 1`. */
  nama: string;
}

const ASRAMA_RE = /\b(asrama|kamsis)\b/i;

/**
 * Bilik asrama/kamsis dikumpulkan mengikut blok + aras. Kod lokasi KEW.PA-7 berformat
 * `130101 / BGN / ALA / 01 / B01` (bangunan / BGN / blok / aras / bilik): lima segmen,
 * dan kumpulan = empat segmen pertama. Ruang bukan asrama tidak dikumpulkan.
 */
export function kumpulanArasDaripadaKod(kodRuang: string, nama: string): KumpulanAras | null {
  if (!ASRAMA_RE.test(String(nama ?? ''))) return null;

  const parts = String(kodRuang ?? '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length !== 5) return null;

  const kunci = parts.slice(0, 4).join('/').toUpperCase();
  const label = String(nama)
    .replace(/\s+/g, ' ')
    .replace(/\s*\bbilik\b\s*\S*\s*$/i, '')
    .trim();

  return { kunci, nama: label || kunci };
}
