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
  /** Siri pemeriksaan 1/2/3 (sukuan) — satu ruang hanya dijadualkan sekali per sesi. */
  siri?: number;
  /** Kod ruang direktori lokasi (untuk padanan jadual ↔ ruang). */
  kodRuang?: string;
  /** ID lokasi yang dipilih semasa pendaftaran jadual. */
  lokasiId?: string;
  jabatan: string;
  lokasi: string;
  kategori: AssetCategory;
  kuantiti: number;
  /** Kosong ('') = belum ditetapkan oleh Penyelia Lokasi. */
  tarikhMula: string;
  tarikhTamat: string;
  /** Kosong ('') = slot belum dituntut (self-assign pemeriksa). */
  pemeriksa1: string;
  pemeriksa1Email?: string;
  pemeriksa2: string;
  pemeriksa2Email?: string;
  penjaga: string;
  /** No. telefon Penyelia Lokasi (daripada direktori pegawai). */
  penjagaTel?: string;
  penjagaEmel?: string;
  status: InspectionStatus;
  catatan?: string;
  kewpa11Doc?: Kewpa11Doc;
  /** R2 object key returned by the Cloudflare Worker API. */
  kewpa11DocKey?: string;
  laporanPraJkpak?: LaporanPraJkpak;
  createdBy?: string;
  createdAt?: string;
}

export type SystemRole = 
  | 'Ketua Jabatan / Unit (KJ/KU)'
  | 'Ketua Program (KP)'
  | 'Pegawai Aset (PA)'
  | 'Penolong Pegawai Aset Jabatan/Unit (PPAJ/PPAU)'
  | 'Penyelia Lokasi (PL)'
  | 'Pensyarah / Pegawai Akademik'
  | 'Pegawai Pemeriksa (PP)'
  | 'Pentadbir Sistem';

/** Ringkasan peranan aktif pegawai (jawatan + lantikan). */
export interface OfficerRoleSummary {
  roleId: string;
  roleName: string;
  kategori: 'JAWATAN' | 'LANTIKAN' | string;
  scopeType: string;
  scopeId: string | null;
  validTo: string | null;
}

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
  /** Semua peranan aktif — seorang pegawai boleh memegang lebih daripada satu. */
  roles?: OfficerRoleSummary[];
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
  /** 0 = unit sistem/pentadbiran (bukan unit operasi pemeriksaan). */
  isOperational?: number;
}

export type RoleScopeType = 'GLOBAL' | 'DEPARTMENT' | 'LOCATION';
export type RoleAssignmentStatus = 'AKTIF' | 'DITAMATKAN';

export interface RoleDefinition {
  id: string;
  nama: string;
  scopeType: RoleScopeType;
  defaultTenureMonths?: number | null;
  keterangan?: string;
  /** JAWATAN = jawatan hakiki (1 pegawai); LANTIKAN = kuasa bertempoh. */
  kategori?: 'JAWATAN' | 'LANTIKAN';
}

export interface RoleAssignment {
  id: string;
  officerId: string;
  roleId: string;
  roleName: string;
  scopeType: RoleScopeType;
  scopeId?: string | null;
  validFrom: string;
  validTo?: string | null;
  status: RoleAssignmentStatus;
  notes?: string | null;
  createdAt?: string;
}

export interface RoleAssignmentInput {
  officerId?: string;
  officerEmail?: string;
  role?: string;
  scopeType?: RoleScopeType;
  scopeId?: string | null;
  validFrom?: string;
  validTo?: string;
  notes?: string;
}

/** Ringkasan lantikan Pegawai Pemeriksa bagi sesi semasa (tarikh luput). */
export interface AppointmentSummary {
  assignmentId: string;
  validFrom: string;
  validTo?: string | null;
  activeToday: boolean;
  daysRemaining?: number | null;
}

export type CycleMode = 'SEHALA' | 'TIMBAL_BALIK';
export type CycleStatus = 'DRAF' | 'AKTIF' | 'SELESAI';

export interface InspectionCycle {
  id: string;
  sessionId: string;
  kod: string;
  mode: CycleMode;
  tarikhMula: string;
  tarikhTamat: string;
  status: CycleStatus;
  snapshotAt?: string | null;
  createdAt?: string;
  totalLocations?: number;
  claimedSlots?: number;
  openSlots?: number;
  flaggedCount?: number;
}

export interface CycleAssignment {
  id: string;
  cycleId: string;
  scheduleId?: string | null;
  locationId: string;
  kodRuang?: string | null;
  locationName?: string | null;
  departmentId?: string | null;
  slot?: number | null;
  inspectorId?: string | null;
  inspectorName?: string | null;
  inspectorEmail?: string | null;
  status: string;
  claimedAt?: string | null;
}

export interface CycleFlag {
  assignmentId: string;
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface CycleDetail {
  cycle: InspectionCycle;
  assignments: CycleAssignment[];
  flags: CycleFlag[];
}

export interface EligibleInspector {
  officerId: string;
  nama: string;
  emel: string;
  dept: string;
}

export type TenureNoticeType = 'LUPUT_60_HARI' | 'TAMAT';

export interface TenureNotice {
  id: string;
  assignmentId: string;
  officerId: string;
  officerName?: string | null;
  officerEmail?: string | null;
  roleId: string;
  roleName?: string | null;
  jenis: TenureNoticeType;
  tarikhLuput?: string | null;
  mesej: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'BARU' | 'DIBACA';
  createdAt: string;
}

export type PairMode = 'TIMBAL_BALIK' | 'SEHALA';
export type OddUnitPolicy = 'SIMPANAN' | 'TIGA';

export interface CycleParams {
  cycleId: string;
  quota: number;
  tolerance: number;
  overload: number;
  split: number;
  oddPolicy: OddUnitPolicy;
  planVersion: number;
  lockedAt?: string | null;
}

export interface PlanUnitRow {
  unitId: string;
  assetCount: number;
  inspectorCount: number;
  groupCount: number;
  reserveCount: number;
}

export interface PlanGroupRow {
  id: string;
  unitId: string;
  memberIds: string[];
  reserveMemberIds: string[];
}

export interface PlanDecision {
  unitA: string;
  unitB?: string | null;
  mode: PairMode;
  weightAB?: number | null;
  weightBA?: number | null;
  reason: string;
}

export interface PlanAssignment {
  groupId: string;
  unitId: string;
  locationId: string;
  targetUnitId: string;
  assetCount: number;
  direction: PairMode;
  splitIndex: number;
}

export interface CyclePlan {
  cycle: { id: string; kod: string; tarikhMula: string; tarikhTamat: string };
  params: Omit<CycleParams, 'cycleId' | 'planVersion' | 'lockedAt'>;
  units: PlanUnitRow[];
  groups: PlanGroupRow[];
  decisions: PlanDecision[];
  allocation: {
    assignments: PlanAssignment[];
    unassigned: { locationId: string; unitId: string; assetCount: number }[];
    groupLoad: Record<string, number>;
    assignedAssets: number;
    totalAssets: number;
    coverage: number;
  };
  suggestedQuota: number;
  planVersion: number;
  activeInspectors: number;
}

export interface LockPlanResult {
  planVersion: number;
  groups: number;
  pairings: number;
  targets: number;
  schedulesCreated: number;
  assignmentsCreated: number;
  preservedTargets: number;
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
  /** Peranan yang digunakan semasa tindakan diambil (acted_as_role). */
  actedAsRole?: string;
  /** Kod sebab penolakan, cth. APPOINTMENT_EXPIRED. */
  reason?: string;
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
  /** Kunci R2 dokumen sumber — digunakan untuk pautan sejarah KEW.PA-7 pada lokasi. */
  r2Key?: string;
}
