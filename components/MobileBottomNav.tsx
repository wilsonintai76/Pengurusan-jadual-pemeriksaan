import React, { useState } from 'react';
import { 
  Home, 
  CalendarCheck, 
  FileSignature, 
  Menu, 
  X, 
  BookOpen, 
  Users, 
  ShieldCheck, 
  RefreshCw, 
  LogOut,
  Crosshair,
  Boxes,
  UserCheck,
  MapPin,
  Building2,
  SlidersHorizontal,
  BadgeCheck,
  ArrowLeftRight
} from 'lucide-react';
import { UserSession } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/systemRoles';

interface MobileBottomNavProps {
  currentUser: UserSession | null;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onLogout: () => void;
  onSync: () => void;
  praJkpakCount: number;
  /** Pentadbir Sistem sahaja — Tetapan disembunyikan daripada peranan lain. */
  isAdmin?: boolean;
  onOpenClaimModal?: () => void;
  onOpenPbacModal?: () => void;
  onOpenLogin?: () => void;
  onOpenUserProfile?: () => void;
}

export default function MobileBottomNav({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
  onSync,
  praJkpakCount,
  isAdmin = false,
  onOpenClaimModal,
  onOpenPbacModal,
  onOpenLogin,
  onOpenUserProfile,
}: MobileBottomNavProps) {
  const [showDrawer, setShowDrawer] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncClick = () => {
    setIsSyncing(true);
    setTimeout(() => {
      onSync();
      setIsSyncing(false);
    }, 600);
  };

  const handleTabSelect = (tab: string) => {
    setActiveTab(tab);
    setShowDrawer(false);
  };

  return (
    <>
      {/* Slide-up Menu Drawer for Secondary Links & Profile */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            onClick={() => setShowDrawer(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Sheet */}
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            
            {/* Sheet Handle & Close */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Menu Tambahan & Profil</h4>
                  <p className="text-[10px] text-slate-500">Portal Pengurusan Aset POLIKU</p>
                </div>
              </div>

              <button
                onClick={() => setShowDrawer(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Officer Profile Card in Drawer */}
            {currentUser ? (
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
                <div 
                  onClick={() => {
                    setShowDrawer(false);
                    if (onOpenUserProfile) onOpenUserProfile();
                  }}
                  className="flex items-center gap-3 cursor-pointer group flex-1"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-300 flex items-center justify-center font-bold text-sm font-mono shrink-0 group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="leading-tight">
                    <strong className="text-xs font-bold text-slate-900 block truncate max-w-[170px] group-hover:text-amber-600 transition-colors">
                      {currentUser.name}
                    </strong>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-1.5 py-0.2 rounded font-mono">
                        {currentUser.dept}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Profil Saya &rarr;
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowDrawer(false);
                    onLogout();
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Log Keluar"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowDrawer(false);
                  if (onOpenLogin) onOpenLogin();
                }}
                className="w-full p-3 rounded-2xl bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-xs"
              >
                <UserCheck className="w-4 h-4" />
                <span>Log Masuk Pegawai (Penyelaras / Admin)</span>
              </button>
            )}

            {/* Secondary Navigation Options — kumpulan sama seperti sidebar */}
            <div className="space-y-2">
              <span className="block px-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Pemeriksaan
              </span>

              <button
                onClick={() => handleTabSelect('kitaran')}
                className={`w-full p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                  activeTab === 'kitaran' ? 'bg-slate-900 text-white' : 'text-slate-700 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ArrowLeftRight className="w-4 h-4 text-sky-600" />
                  <span>Kitaran Pemeriksaan</span>
                </div>
                <span className="text-[10px] text-sky-700 font-mono">Kolam</span>
              </button>

              <span className="block px-1 pt-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Direktori
              </span>

              <button
                onClick={() => handleTabSelect('lokasi')}
                className={`w-full p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                  activeTab === 'lokasi' ? 'bg-slate-900 text-white' : 'text-slate-700 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <span>Direktori Lokasi & Makmal</span>
                </div>
                <span className="text-[10px] text-slate-400">Ruang Aset</span>
              </button>

              <button
                onClick={() => handleTabSelect('jabatan')}
                className={`w-full p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                  activeTab === 'jabatan' ? 'bg-slate-900 text-white' : 'text-slate-700 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>Direktori 12 Jabatan</span>
                </div>
                <span className="text-[10px] text-slate-400">1PP AM 2.4</span>
              </button>

              <button
                onClick={() => handleTabSelect('direktori')}
                className={`w-full p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                  activeTab === 'direktori' ? 'bg-slate-900 text-white' : 'text-slate-700 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Direktori Pegawai</span>
                </div>
                <span className="text-[10px] text-indigo-700 font-mono font-bold">{ROLE_LABELS.length} Peranan</span>
              </button>

              <span className="block px-1 pt-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Rujukan
              </span>

              <button
                onClick={() => handleTabSelect('pekeliling')}
                className={`w-full p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                  activeTab === 'pekeliling' ? 'bg-slate-900 text-white' : 'text-slate-700 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-sky-600" />
                  <span>Pekeliling TPA (1PP AM 2.4)</span>
                </div>
                <span className="text-[10px] text-slate-400">Garis Panduan</span>
              </button>

              {isAdmin && (
                <>
                  <span className="block px-1 pt-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Pentadbiran
                  </span>

                  <button
                    onClick={() => handleTabSelect('audit')}
                    className={`w-full p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                      activeTab === 'audit' ? 'bg-slate-900 text-white' : 'text-slate-700 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      <span>Jejak Audit & Polisi PBAC</span>
                    </div>
                    <span className="text-[10px] text-purple-700 font-mono">Enjin Dasar</span>
                  </button>

                  <button
                    onClick={() => handleTabSelect('tetapan')}
                    className={`w-full p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                      activeTab === 'tetapan' ? 'bg-slate-900 text-white' : 'text-slate-700 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <SlidersHorizontal className="w-4 h-4 text-slate-700" />
                      <span>Tetapan Sistem & Sandaran</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Konfigurasi</span>
                  </button>
                </>
              )}
            </div>

            {/* Quick Actions in Mobile Drawer */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setShowDrawer(false);
                  setActiveTab('ejas');
                  if (onOpenClaimModal) onOpenClaimModal();
                }}
                className="py-2.5 px-3 rounded-xl bg-teal-50 text-teal-900 border border-teal-200 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Crosshair className="w-3.5 h-3.5 text-teal-600" />
                <span>Tuntut Lokasi</span>
              </button>

              <button
                onClick={handleSyncClick}
                disabled={isSyncing}
                className="py-2.5 px-3 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-600' : 'text-slate-600'}`} />
                <span>Segerak D1</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Menu Bar for Mobile */}
      <nav 
        aria-label="Navigasi Mudah Alih"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] lg:hidden no-print"
      >
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1 items-center">
          
          {/* 1. Utama */}
          <button
            onClick={() => handleTabSelect('home')}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition min-h-[44px] ${
              activeTab === 'home'
                ? 'text-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg transition ${activeTab === 'home' ? 'bg-amber-400 text-slate-950' : ''}`}>
              <Home className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Utama</span>
          </button>

          {/* 2. Jadual Pemeriksaan */}
          <button
            onClick={() => handleTabSelect('ejas')}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition min-h-[44px] ${
              activeTab === 'ejas'
                ? 'text-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg transition ${activeTab === 'ejas' ? 'bg-amber-400 text-slate-950' : ''}`}>
              <CalendarCheck className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Jadual</span>
          </button>

          {/* 3. Pra-JKPAK (with badge) */}
          <button
            onClick={() => handleTabSelect('praJkpak')}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition min-h-[44px] relative ${
              activeTab === 'praJkpak'
                ? 'text-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg transition relative ${activeTab === 'praJkpak' ? 'bg-amber-400 text-slate-950' : ''}`}>
              <FileSignature className="w-4 h-4" />
              {praJkpakCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-slate-950 rounded-full text-[8px] font-mono font-bold flex items-center justify-center border border-white">
                  {praJkpakCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[55px]">Pra-JKPAK</span>
          </button>

          {/* 4. Menu Drawer */}
          <button
            onClick={() => setShowDrawer(!showDrawer)}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition min-h-[44px] ${
              showDrawer || ['pekeliling', 'direktori', 'kitaran', 'audit'].includes(activeTab)
                ? 'text-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg transition ${showDrawer || ['pekeliling', 'direktori', 'kitaran', 'audit'].includes(activeTab) ? 'bg-amber-400 text-slate-950' : ''}`}>
              <Menu className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Lagi</span>
          </button>

        </div>
      </nav>
    </>
  );
}
