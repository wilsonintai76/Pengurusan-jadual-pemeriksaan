import type { InspectionSchedule } from './types';

type JadualTugasan = Pick<
  InspectionSchedule,
  'pemeriksa1' | 'pemeriksa1Email' | 'pemeriksa2' | 'pemeriksa2Email' | 'penjaga' | 'penjagaEmel' | 'penjagaSenarai'
>;

export interface PegawaiTugasan {
  name?: string;
  email?: string;
}

export interface KiraanTugasan {
  /** Jadual yang saya diperiksa sebagai Pegawai Pemeriksa. */
  pemeriksaan: number;
  /** Jadual bagi ruang yang saya selia sebagai Penyelia Lokasi. */
  penyeliaan: number;
  /** Bilangan jadual bertindih (saya pemeriksa bagi ruang sendiri). */
  kedua: number;
  jumlah: number;
}

const bersih = (nilai?: string | null) => String(nilai ?? '').trim().toLowerCase();

/**
 * Padanan e-mel diutamakan kerana nama boleh bertindih. Nama hanya digunakan apabila
 * medan e-mel pada jadual kosong (data lama tanpa lantikan berdaftar).
 */
function padanEmelAtauNama(
  emailJadual: string | undefined,
  namaJadual: string[],
  pegawai: PegawaiTugasan
): boolean {
  const emel = bersih(pegawai.email);
  const emelJadualBersih = bersih(emailJadual);
  if (emel && emelJadualBersih) return emel === emelJadualBersih;

  const nama = bersih(pegawai.name);
  if (!nama) return false;
  return namaJadual.some((calon) => bersih(calon) === nama);
}

export function isPemeriksaUntukJadual(jadual: JadualTugasan, pegawai: PegawaiTugasan): boolean {
  return (
    padanEmelAtauNama(jadual.pemeriksa1Email, [jadual.pemeriksa1], pegawai) ||
    padanEmelAtauNama(jadual.pemeriksa2Email, [jadual.pemeriksa2], pegawai)
  );
}

export function isPenyeliaUntukJadual(jadual: JadualTugasan, pegawai: PegawaiTugasan): boolean {
  const senaraiRuang = jadual.penjagaSenarai ?? [];
  const emelCalon = [jadual.penjagaEmel, ...senaraiRuang.map((pegawaiRuang) => pegawaiRuang.emel)]
    .map(bersih)
    .filter(Boolean);
  const emelPegawai = bersih(pegawai.email);
  // Mana-mana pegawai bertanggungjawab ruang dikira penyelia (bukan hanya penyelia utama).
  if (emelPegawai && emelCalon.length > 0) return emelCalon.includes(emelPegawai);

  const namaPegawai = bersih(pegawai.name);
  if (!namaPegawai) return false;
  return [jadual.penjaga, ...senaraiRuang.map((pegawaiRuang) => pegawaiRuang.nama)].some(
    (calon) => bersih(calon) === namaPegawai
  );
}

export function kiraTugasanSaya(jadual: JadualTugasan[], pegawai: PegawaiTugasan | null): KiraanTugasan {
  if (!pegawai || (!bersih(pegawai.email) && !bersih(pegawai.name))) {
    return { pemeriksaan: 0, penyeliaan: 0, kedua: 0, jumlah: 0 };
  }

  let pemeriksaan = 0;
  let penyeliaan = 0;
  let kedua = 0;

  for (const item of jadual) {
    const sebagaiPemeriksa = isPemeriksaUntukJadual(item, pegawai);
    const sebagaiPenyelia = isPenyeliaUntukJadual(item, pegawai);
    if (sebagaiPemeriksa) pemeriksaan += 1;
    if (sebagaiPenyelia) penyeliaan += 1;
    if (sebagaiPemeriksa && sebagaiPenyelia) kedua += 1;
  }

  return {
    pemeriksaan,
    penyeliaan,
    kedua,
    jumlah: pemeriksaan + penyeliaan - kedua,
  };
}

export function adaTugasan(jadual: JadualTugasan, pegawai: PegawaiTugasan | null): boolean {
  if (!pegawai) return false;
  return isPemeriksaUntukJadual(jadual, pegawai) || isPenyeliaUntukJadual(jadual, pegawai);
}
