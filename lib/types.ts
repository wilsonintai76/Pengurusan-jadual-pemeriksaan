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

export interface UserSession {
  email: string;
  name: string;
  dept: string;
  role: string;
  grade?: string;
  phone?: string;
  ext?: string;
}

export interface DepartmentInfo {
  id: string;
  name: string;
  crossPartnerId: string;
  ketuaPemeriksa?: string;
  penyelaras?: string;
  totalLokasi?: number;
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
