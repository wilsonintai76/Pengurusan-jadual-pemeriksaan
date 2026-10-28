'use client';

import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  Save, 
  RotateCcw, 
  Download, 
  Upload, 
  ShieldCheck, 
  Calendar, 
  Building2, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  Lock,
  Layers,
  FileText,
  Clock
} from 'lucide-react';
import { SystemSettings, UserSession } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/initialData';

interface TetapanSectionProps {
  settings: SystemSettings;
  onSaveSettings: (newSettings: SystemSettings) => void;
  onResetDefaultData: () => void;
  onExportFullBackupJSON: () => void;
  onImportBackupJSON: (file: File) => void;
  currentUser: UserSession | null;
}

export default function TetapanSection({
  settings,
  onSaveSettings,
  onResetDefaultData,
  onExportFullBackupJSON,
  onImportBackupJSON,
  currentUser,
}: TetapanSectionProps) {
  const [formData, setFormData] = useState<SystemSettings>({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const isAdmin = currentUser?.role.includes('Pentadbir') || currentUser?.role.includes('Ketua Jabatan');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (confirm(`Adakah anda pasti ingin memulihkan pangkalan data daripada fail "${file.name}"? Data sedia ada akan digantikan.`)) {
        onImportBackupJSON(file);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400 text-slate-950 mb-3">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-950" />
            <span>Konfigurasi Parameter Tadbir Urus & Pekeliling</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Tetapan Sistem Pengurusan Aset
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Pusat konfigurasi takwim pemeriksaan sesi, parameter pematuhan 1PP Tatacara Pengurusan Aset Alih Kerajaan (AM 2.4), togol dasar keselamatan PBAC, maklumat institusi POLIKU, serta utiliti sandaran data.
          </p>
        </div>

        {saveSuccess && (
          <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-200 px-4 py-2 rounded-xl text-xs flex items-center gap-2 animate-fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Tetapan berjaya disimpan!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Takwim & Sesi Pemeriksaan */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-800 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                1. Konfigurasi Sesi & Takwim Pemeriksaan
              </h3>
              <p className="text-xs text-slate-500">
                Menetapkan tahun sesi aktif, jendela pelaksanaan, dan tarikh sasaran JKPAK.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tahun Sesi Aktif</label>
              <input
                type="text"
                value={formData.sesiTahun}
                onChange={(e) => setFormData({ ...formData, sesiTahun: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">cth: 2026</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tarikh Mula Sesi</label>
              <input
                type="date"
                value={formData.tarikhMulaSesi}
                onChange={(e) => setFormData({ ...formData, tarikhMulaSesi: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tarikh Tamat Sesi</label>
              <input
                type="date"
                value={formData.tarikhTamatSesi}
                onChange={(e) => setFormData({ ...formData, tarikhTamatSesi: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ambang Amaran Luput (Hari)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={formData.ambangAmaranHari}
                onChange={(e) => setFormData({ ...formData, ambangAmaranHari: parseInt(e.target.value) || 7 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Peringatan cip kuning/merah</span>
            </div>
          </div>

          <div className="pt-2">
            <label className="block font-semibold text-slate-700 text-xs mb-1">
              Tarikh Sasaran Mesyuarat Pra-JKPAK Bil. 1/{formData.sesiTahun}
            </label>
            <input
              type="date"
              value={formData.tarikhPraJkpak}
              onChange={(e) => setFormData({ ...formData, tarikhPraJkpak: e.target.value })}
              className="w-full sm:w-1/2 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none font-mono"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Semua dapatan pemeriksaan makmal dan bengkel perlu dimuktamadkan sebelum tarikh ini.
            </span>
          </div>
        </div>

        {/* Section 2: Pematuhan 1PP AM 2.4 & Polisi Keselamatan PBAC */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                2. Parameter Pematuhan 1PP AM 2.4 & Polisi Integriti PBAC
              </h3>
              <p className="text-xs text-slate-500">
                Penguatkuasaan undang-undang tatacara aset alih dan sekatan konflik kepentingan.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1">
              <span className="font-semibold text-slate-800 block">Sasaran Liputan Pemeriksaan</span>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  disabled
                  value={formData.sasaranLiputanPeratus}
                  className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg bg-slate-200 font-mono font-bold text-slate-800"
                />
                <span className="font-bold text-slate-900">% (Mandatori Pekeliling)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Pekeliling 1PP AM 2.4 Bab C menetapkan kewajipan pemeriksaan fizikal ke atas 100% aset alih kerajaan setiap tahun.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1">
              <span className="font-semibold text-slate-800 block">Bilangan Minimum Pegawai Pemeriksa</span>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  min="2"
                  max="4"
                  value={formData.minimumPegawaiPemeriksa}
                  onChange={(e) => setFormData({ ...formData, minimumPegawaiPemeriksa: parseInt(e.target.value) || 2 })}
                  className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-800 focus:border-amber-500 focus:outline-none"
                />
                <span className="font-bold text-slate-900">Orang Pegawai</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Setiap lokasi wajib diperiksa dan ditandatangani oleh sekurang-kurangnya dua (2) orang pegawai bertauliah.
              </p>
            </div>
          </div>

          {/* Policy Toggles */}
          <div className="space-y-3 pt-2 text-xs">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={formData.enforceCrossInspection}
                onChange={(e) => setFormData({ ...formData, enforceCrossInspection: e.target.checked })}
                className="mt-0.5 rounded text-amber-500 focus:ring-amber-400 w-4 h-4"
              />
              <div>
                <strong className="text-slate-900 block">
                  Kuatkuasakan Gandingan Silang Timbal Balik (⇄ 1PP AM 2.4)
                </strong>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Menghalang tuntutan pemeriksaan melainkan pegawai berasal daripada jabatan rakan silang yang ditetapkan dalam matriks.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={formData.enforceCustodianGuard}
                onChange={(e) => setFormData({ ...formData, enforceCustodianGuard: e.target.checked })}
                className="mt-0.5 rounded text-amber-500 focus:ring-amber-400 w-4 h-4"
              />
              <div>
                <strong className="text-slate-900 block">
                  Kuatkuasakan Sekatan Penjaga Ruang (Anti-Conflict of Interest Guard)
                </strong>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pegawai Penjaga Ruang dihalang keras daripada memeriksa bilik atau makmal di bawah jagaan sendiri.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={formData.enforceMaintenanceJustification}
                onChange={(e) => setFormData({ ...formData, enforceMaintenanceJustification: e.target.checked })}
                className="mt-0.5 rounded text-amber-500 focus:ring-amber-400 w-4 h-4"
              />
              <div>
                <strong className="text-slate-900 block">
                  Mandatori Pesanan Kerajaan (LO) bagi Dapatan Aset Rosak
                </strong>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Laporan KEW.PA-11 tidak boleh dihantar jika aset rosak tidak disertakan nombor aduan dan rujukan LO pembaikan.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Section 3: Maklumat Institusi & Profil UAP */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                3. Profil Institusi & Unit Pengurusan Aset (UAP)
              </h3>
              <p className="text-xs text-slate-500">
                Maklumat kepala surat borang rasmi dan pengenalan pusat pentadbiran.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Institusi Kerajaan</label>
              <input
                type="text"
                value={formData.namaInstitusi}
                onChange={(e) => setFormData({ ...formData, namaInstitusi: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kod Agensi / Premis</label>
              <input
                type="text"
                value={formData.kodInstitusi}
                onChange={(e) => setFormData({ ...formData, kodInstitusi: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit Pengurusan Aset Bertanggungjawab</label>
              <input
                type="text"
                value={formData.namaUnitAset}
                onChange={(e) => setFormData({ ...formData, namaUnitAset: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pegawai Aset Utama (UAP)</label>
              <input
                type="text"
                value={formData.pegawaiAsetUtama}
                onChange={(e) => setFormData({ ...formData, pegawaiAsetUtama: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Emel Rasmi Unit Aset</label>
              <input
                type="email"
                value={formData.emelUnitAset}
                onChange={(e) => setFormData({ ...formData, emelUnitAset: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">No. Telefon Rasmi / Sambungan</label>
              <input
                type="text"
                value={formData.telefonUnitAset}
                onChange={(e) => setFormData({ ...formData, telefonUnitAset: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save button bar */}
        <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl shadow-sm">
          <div className="text-xs text-slate-300">
            Perubahan akan disimpan serta-merta ke dalam pangkalan data sesi {formData.sesiTahun}.
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4 text-slate-950" />
            <span>Simpan Semua Tetapan</span>
          </button>
        </div>

      </form>

      {/* Section 4: Pengurusan Data & Sandaran */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-800 flex items-center justify-center font-bold">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              4. Pengurusan Sandaran & Pangkalan Data (Cloudflare D1 & Local)
            </h3>
            <p className="text-xs text-slate-500">
              Eksport sandaran lengkap, import semula data, atau tetapkan semula kepada set data contoh piawai POLIKU.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          
          {/* Export JSON */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                <Download className="w-4 h-4 text-amber-600" />
                <span>Eksport Sandaran JSON</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Muat turun fail JSON yang mengandungi semua jadual pemeriksaan, maklumat pegawai, direktori lokasi, dan log audit PBAC.
              </p>
            </div>
            <button
              onClick={onExportFullBackupJSON}
              className="mt-4 w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Muat Turun JSON</span>
            </button>
          </div>

          {/* Import JSON */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                <Upload className="w-4 h-4 text-sky-600" />
                <span>Pulihkan dari JSON</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Pilih fail sandaran JSON yang telah dimuat turun sebelum ini untuk menggantikan pangkalan data semasa.
              </p>
            </div>
            <label className="mt-4 w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer text-center">
              <Upload className="w-3.5 h-3.5 text-sky-600" />
              <span>Pilih Fail JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Reset to Default */}
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 font-bold text-rose-900 mb-1">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span>Set Semula Data Piawai</span>
              </div>
              <p className="text-[11px] text-rose-700">
                Kembalikan semua data jadual pemeriksaan, lokasi, dan pengguna kepada data contoh rasmi Politeknik Kuching Sarawak.
              </p>
            </div>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="mt-4 w-full py-2 px-3 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs transition flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Set Semula Data</span>
            </button>
          </div>

        </div>

      </div>

      {/* Confirmation Modal for Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-base">
                Sahkan Set Semula Pangkalan Data?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tindakan ini akan mengembalikan pangkalan data kepada konfigurasi asal Politeknik Kuching Sarawak (Sesi 2026). Semua rekod baharu yang belum dieksport akan dipadam.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onResetDefaultData();
                  setShowResetConfirm(false);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
              >
                Ya, Set Semula Data Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
