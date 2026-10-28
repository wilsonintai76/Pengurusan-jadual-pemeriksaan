'use client';

import React, { useState } from 'react';
import { 
  Boxes, 
  RefreshCw, 
  ChevronRight, 
  CalendarCheck, 
  Crosshair, 
  Plus, 
  ShieldCheck, 
  Database,
  Building2,
  Calendar
} from 'lucide-react';
import { UserSession } from '@/lib/types';

interface TopHeaderProps {
  currentUser: UserSession | null;
  activeTab: string;
  onSync: () => void;
  onOpenClaimModal?: () => void;
  onOpenAddSchedule?: () => void;
  onOpenLogin?: () => void;
  onOpenUserProfile?: () => void;
}

const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  home: {
    title: 'Laman Utama',
    subtitle: 'Pusat Pengurusan & Pemeriksaan Aset Alih Kerajaan',
  },
  ejas: {
    title: 'Jadual Pemeriksaan',
    subtitle: 'Jadual Pemeriksaan 100% Makmal & Bengkel (1PP AM 2.4)',
  },
  lokasi: {
    title: 'Direktori Lokasi',
    subtitle: 'Senarai Makmal, Bengkel, Bilik Kuliah & Ruang Aset POLIKU',
  },
  jabatan: {
    title: 'Direktori Jabatan',
    subtitle: 'Profil 12 Jabatan & Matriks Pegawai Penyelaras Aset',
  },
  praJkpak: {
    title: 'Kompilasi Pra-JKPAK',
    subtitle: 'Kertas Pembentangan Dapatan & Pematuhan 1PP AM 2.4',
  },
  pekeliling: {
    title: 'Pekeliling TPA (AM 2.4)',
    subtitle: 'Tatacara Pengurusan Aset Alih & Integriti Pemeriksaan',
  },
  direktori: {
    title: 'Direktori Pegawai & 6 Peranan Rasmi',
    subtitle: 'Ketua Jabatan, KP, Penolong Pegawai Aset, Penyelia Lokasi, Admin & Pemeriksa',
  },
  audit: {
    title: 'Jejak Audit PBAC',
    subtitle: 'Penguatkuasaan Dasar & Integriti Penjaga Ruang',
  },
  tetapan: {
    title: 'Tetapan Sistem',
    subtitle: 'Konfigurasi Pekeliling 1PP AM 2.4 & Parameter Tadbir Urus',
  },
};

export default function TopHeader({
  currentUser,
  activeTab,
  onSync,
  onOpenClaimModal,
  onOpenAddSchedule,
  onOpenLogin,
  onOpenUserProfile,
}: TopHeaderProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncClick = () => {
    setIsSyncing(true);
    setTimeout(() => {
      onSync();
      setIsSyncing(false);
    }, 600);
  };

  const currentInfo = TAB_TITLES[activeTab] || TAB_TITLES.home;

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs no-print">
      
      {/* 1. Mobile Top Strip (< lg) */}
      <div className="flex lg:hidden items-center justify-between h-14 px-4 bg-slate-950 text-white border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
            <Boxes className="w-4 h-4" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight">Portal Aset</span>
              <span className="text-[9px] bg-amber-400 text-slate-950 font-bold px-1.5 py-0.2 rounded font-mono">
                e-JAS
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Politeknik Kuching Sarawak</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <button
              onClick={onOpenUserProfile}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 rounded-xl transition"
              title="Buka Profil Pegawai"
            >
              <span className="text-[10px] font-bold text-amber-300 font-mono">
                {currentUser.dept}
              </span>
              <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold flex items-center justify-center font-mono">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
            </button>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-400 text-slate-950 transition"
            >
              Log Masuk
            </button>
          )}

          <button
            onClick={handleSyncClick}
            disabled={isSyncing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Segerak Data"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Desktop Header Bar (>= lg) */}
      <div className="hidden lg:flex items-center justify-between h-16 px-6 lg:px-8 xl:px-10 max-w-[1720px] mx-auto w-full">
        
        {/* Breadcrumb & Section Name */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="font-semibold text-slate-400">Portal Aset POLIKU</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="font-bold text-slate-900 text-sm">
            {currentInfo.title}
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 text-xs hidden xl:inline">
            {currentInfo.subtitle}
          </span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-3">
          
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Sesi: <strong className="text-slate-900 font-mono">2026</strong></span>
          </div>

          {activeTab === 'ejas' && onOpenAddSchedule && (
            <button
              onClick={onOpenAddSchedule}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Daftar Jadual</span>
            </button>
          )}

          {activeTab === 'ejas' && onOpenClaimModal && (
            <button
              onClick={onOpenClaimModal}
              className="px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs"
            >
              <Crosshair className="w-3.5 h-3.5 text-teal-200" />
              <span>Tuntut Lokasi</span>
            </button>
          )}

          {!currentUser && (
            <button
              onClick={onOpenLogin}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition flex items-center gap-1.5 shadow-2xs"
            >
              <span>Log Masuk Pegawai</span>
            </button>
          )}

          <button
            onClick={handleSyncClick}
            disabled={isSyncing}
            title="Segerak Pangkalan Data Cloudflare D1"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isSyncing ? 'animate-spin text-amber-600' : ''}`} />
            <span>Segerak</span>
          </button>

        </div>

      </div>

    </header>
  );
}
