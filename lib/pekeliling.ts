/**
 * Nilai mandatori pekeliling 1PP AM 2.4 — **tidak boleh diubah** melalui skrin Tetapan.
 *
 * - Sasaran liputan pemeriksaan fizikal ialah 100% aset alih kerajaan setiap tahun
 *   (1PP AM 2.4 Bab C).
 * - Setiap lokasi wajib diperiksa dan ditandatangani oleh sekurang-kurangnya dua (2)
 *   orang pegawai bertauliah; sistem menguatkuasakannya secara struktur melalui dua
 *   slot pemeriksa pada setiap jadual (`pemeriksa1_id` / `pemeriksa2_id`).
 *
 * Nilai ini dipaparkan sebagai rujukan sahaja dan sentiasa dihantar semula bersama
 * tetapan supaya rekod dalam KV tidak boleh menyimpang.
 */
export const SASARAN_LIPUTAN_PERATUS = 100;

export const MINIMUM_PEGAWAI_PEMERIKSA = 2;
