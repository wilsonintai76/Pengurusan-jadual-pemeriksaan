import type { D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types';

export interface Bindings {
  DB: D1Database;
  KV: KVNamespace;
  R2_BUCKET: R2Bucket;
  AI: any; // Cloudflare Workers AI binding
  ENVIRONMENT?: string;
  JWT_SECRET?: string;
  /** Bilangan iterasi PBKDF2 (string daripada vars/dev vars). */
  AUTH_ITERATIONS?: string;
}

export type InspectionStatus = 'Belum Mula' | 'Sedang Dijalankan' | 'Selesai' | 'Tertangguh';

export interface PegawaiBertanggungjawab {
  id: string;
  nama: string;
  jawatan?: string;
  emel?: string;
  tel?: string;
}

export interface LocationRecord {
  id: string;
  kodRuang: string;
  nama: string;
  jabatan: string;
  kategoriRuang: string;
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
  latitude: number;
  longitude: number;
}

export interface ScheduleRecord {
  id: string;
  kod: string;
  siri?: number;
  kodRuang?: string;
  locationId?: string;
  latitude?: number;
  longitude?: number;
  jabatan: string;
  lokasi: string;
  kategori: string;
  kuantiti: number;
  /** Bilangan aset yang sudah ditanda status A–F (sasaran 100%). */
  asetSelesai?: number;
  tarikhMula: string;
  tarikhTamat: string;
  pemeriksa1: string;
  pemeriksa1Email?: string;
  pemeriksa2: string;
  pemeriksa2Email?: string;
  penjaga: string;
  penjagaTel?: string;
  penjagaEmel?: string;
  penjagaSenarai?: Array<{ nama: string; telefon: string; emel?: string }>;
  status: InspectionStatus;
  catatan?: string;
  kewpa11DocKey?: string;
  laporanPraJkpak?: any;
  createdBy?: string;
  createdAt?: string;
}

export interface SystemSettingsRecord {
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
}
