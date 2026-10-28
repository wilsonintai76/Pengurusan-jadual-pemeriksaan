export type InspectionStatus = 'Belum Mula' | 'Sedang Dijalankan' | 'Selesai' | 'Tertangguh';

export type AssetCategory = 
  | 'Semua (Harta Modal & Aset Bernilai Rendah)'
  | 'Harta Modal Sahaja'
  | 'Aset Alih Bernilai Rendah Sahaja';

export interface Kewpa11Doc {
  name: string;
  url: string;
}

export interface LaporanPraJkpak {
  baik: number;
  rosak: number;
  usang: number;
  hilang: number;
  noLaporanKerosakan?: string;
  tarikhAduan?: string;
  noPesananKerajaan?: string;
  statusPenyelenggaraan?: string;
  sebabTidakDigunakan?: string;
  justifikasiTidakDigunakan?: string;
  syorTindakanUsang?: string;
  cadangan?: string;
  tarikhHantar?: string;
  disahkanOleh?: string;
}

export interface InspectionSchedule {
  id: string;
  kod: string;
  jabatan: string;
  lokasi: string;
  kategori: AssetCategory;
  kuantiti: number;
  tarikhMula: string;
  tarikhTamat: string;
  pemeriksa1: string;
  pemeriksa1Email?: string;
  pemeriksa2: string;
  pemeriksa2Email?: string;
  penjaga: string;
  status: InspectionStatus;
  catatan?: string;
  kewpa11Doc?: Kewpa11Doc;
  laporanPraJkpak?: LaporanPraJkpak;
  createdBy?: string;
  createdAt?: string;
}

export type SystemRole = 
  | 'Ketua Jabatan'
  | 'Ketua Program'
  | 'Penolong Pegawai Aset Jabatan/Unit'
  | 'Penyelia Lokasi'
  | 'Pentadbir Sistem'
  | 'Pegawai Pemeriksa';

export interface UserSession {
  id?: string;
  email: string;
  name: string;
  dept: string;
  role: SystemRole | string;
  grade?: string;
  phone?: string;
  ext?: string;
  roomAssigned?: string;
  programmeAssigned?: string;
  status?: 'Aktif' | 'Cuti' | 'Tidak Aktif';
}

export interface DepartmentInfo {
  id: string;
  name: string;
  crossPartnerId: string;
  ketuaJabatan?: string;
  ketuaPemeriksa?: string;
  penyelaras?: string;
  penolongPegawaiAset?: string;
  totalLokasi?: number;
  totalAset?: number;
  blokBangunan?: string;
  statusPemeriksaan?: string;
}

export interface PegawaiBertanggungjawab {
  id: string;
  nama: string;
  jawatan?: string;
  emel?: string;
  tel?: string;
}

export interface LocationInfo {
  id: string;
  kodRuang: string;
  nama: string;
  jabatan: string;
  kategoriRuang: 'Makmal Komputer' | 'Bengkel Teknikal' | 'Bilik Kuliah' | 'Bilik Pelayan' | 'Stor & Arkib' | 'Pejabat Pentadbiran' | 'Studio' | 'Pusat Sumber';
  bangunan: string;
  aras: string;
  penjaga: string;
  penjagaJawatan?: string;
  penjagaEmel?: string;
  penjagaTel?: string;
  pegawaiBertanggungjawabList?: PegawaiBertanggungjawab[];
  anggaranAset: number;
  statusPemeriksaan: InspectionStatus;
  tarikhTerakhirDiperiksa?: string;
  jadualId?: string;
  kewpa7TerkiniId?: string;
  tarikhKemaskiniKewpa7?: string;
  latitude?: number;
  longitude?: number;
}

export interface SystemSettings {
  sesiTahun: string;
  tarikhMulaSesi: string;
  tarikhTamatSesi: string;
  tarikhPraJkpak: string;
  ambangAmaranHari: number;
  sasaranLiputanPeratus: number;
  minimumPegawaiPemeriksa: number;
  enforceCrossInspection: boolean;
  enforceCustodianGuard: boolean;
  enforceMaintenanceJustification: boolean;
  namaInstitusi: string;
  kodInstitusi: string;
  namaUnitAset: string;
  pegawaiAsetUtama: string;
  emelUnitAset: string;
  telefonUnitAset: string;
}

export interface PbacAuditLog {
  id: string;
  userEmail: string;
  action: string;
  resourceId?: string;
  decision: 'PERMIT' | 'DENY';
  policyId: string;
  notes: string;
  timestamp: string;
}

export interface BorangKewpaInfo {
  code: string;
  title: string;
  pekelilingBab: string;
  description: string;
  purpose: string;
  status: string;
}

export interface Kewpa7AssetItem {
  id: string;
  bil: number;
  noSiriPendaftaran: string;
  keteranganAset: string;
  tarikhPenempatan: string;
  statusFizikal?: 'Baik' | 'Rosak' | 'Usang' | 'Hilang';
  catatan?: string;
  kategori?: 'Harta Modal' | 'Aset Bernilai Rendah';
}

export interface Kewpa7Record {
  id: string;
  kodLokasi: string;
  lokasi: string;
  bahagian: string;
  pegawaiBertanggungjawabList: PegawaiBertanggungjawab[];
  senaraiAset: Kewpa7AssetItem[];
  tarikhMuatNaik: string;
  tarikhKemaskini?: string;
  uploadedByEmail: string;
  statusD1: 'Tersimpan D1' | 'Draf' | 'Disahkan';
  versi?: number;
}
