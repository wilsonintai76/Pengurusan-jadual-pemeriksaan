import React from 'react';
import { UserSession } from '@/lib/types';
import { 
  Boxes, 
  Home, 
  CalendarCheck, 
  FileSignature, 
  BookOpen, 
  Download, 
  Users, 
  ShieldCheck, 
  RefreshCw, 
  LogOut,
  Building2,
  Database
} from 'lucide-react';

interface HeaderProps {
  currentUser: UserSession | null;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onLogout: () => void;
  onSync: () => void;
  praJkpakCount: number;
}

export default function Header({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
  onSync,
  praJkpakCount,
}: HeaderProps) {
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSyncClick = () => {
    setIsSyncing(true);
    setTimeout(() => {
      onSync();
      setIsSyncing(false);
    }, 600);
  };

  return (
    <>
      {/* Top Government Strip */}
      <div className="bg-slate-950 text-white text-xs px-4 py-2 border-b border-slate-800 no-print">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-semibold tracking-wide text-slate-200">
              Kementerian Pendidikan Tinggi Malaysia &bull; Politeknik Kuching Sarawak
            </span>
            <span className="text-slate-400 hidden md:inline">|</span>
            <span className="text-slate-300 hidden md:inline">
              Tatacara Pengurusan Aset Alih Kerajaan (1PP AM 2.4)
            </span>
          </div>
          <div className="flex items-center space-x-3 text-slate-300">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800/80 text-emerald-300 border border-slate-700/60 font-mono">
              <Database className="w-3 h-3 text-emerald-400" />
              <span>D1 Cloudflare Sync</span>
            </span>
            <span className="text-[11px]">
              Sesi: <strong className="text-white font-mono">2026</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Brand Zone */}
            <div 
              onClick={() => setActiveTab('home')}
              className="flex items-center space-x-3 cursor-pointer group select-none"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm border border-slate-800 transition-transform group-hover:scale-105">
                <Boxes className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                    Portal Pemeriksaan Aset POLIKU
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded border border-slate-200 uppercase font-mono">
                    Inspect-Able
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate max-w-[240px] sm:max-w-none">
                  Unit Pengurusan Aset (UAP) Politeknik Kuching Sarawak
                </p>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden lg:flex items-center space-x-1">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'home'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Utama</span>
              </button>

              <button
                onClick={() => setActiveTab('ejas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'ejas'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Sistem Inspect-Able</span>
              </button>

              <button
                onClick={() => setActiveTab('praJkpak')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'praJkpak'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileSignature className="w-3.5 h-3.5" />
                <span>Kompilasi Pra-JKPAK</span>
                <span className="bg-amber-100 text-amber-900 font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {praJkpakCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('pekeliling')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'pekeliling'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Pekeliling TPA</span>
              </button>

              <button
                onClick={() => setActiveTab('borang')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'borang'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Borang KEW.PA</span>
              </button>

              <button
                onClick={() => setActiveTab('direktori')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'direktori'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Direktori Silang</span>
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'audit'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>Jejak PBAC</span>
              </button>
            </nav>

            {/* Right Side: Profile & Utilities */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSyncClick}
                disabled={isSyncing}
                title="Segerak Pangkalan Data"
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isSyncing ? 'animate-spin text-sky-600' : ''}`} />
                <span className="hidden xl:inline">Segerak</span>
              </button>

              {currentUser && (
                <div className="flex items-center pl-2 border-l border-slate-200 gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs font-mono">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left text-xs leading-tight">
                    <span className="font-semibold text-slate-800 block truncate max-w-[140px]">
                      {currentUser.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-100">
                        {currentUser.dept}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[110px]">
                        {currentUser.grade || 'DH41'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={onLogout}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Log Keluar"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Mobile Tab Scroll Menu */}
          <div className="flex lg:hidden overflow-x-auto py-2 border-t border-slate-100 gap-1 text-xs">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition ${
                activeTab === 'home' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Utama
            </button>
            <button
              onClick={() => setActiveTab('ejas')}
              className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition ${
                activeTab === 'ejas' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Inspect-Able
            </button>
            <button
              onClick={() => setActiveTab('praJkpak')}
              className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition ${
                activeTab === 'praJkpak' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Pra-JKPAK ({praJkpakCount})
            </button>
            <button
              onClick={() => setActiveTab('pekeliling')}
              className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition ${
                activeTab === 'pekeliling' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Pekeliling
            </button>
            <button
              onClick={() => setActiveTab('borang')}
              className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition ${
                activeTab === 'borang' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Borang
            </button>
            <button
              onClick={() => setActiveTab('direktori')}
              className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition ${
                activeTab === 'direktori' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Direktori
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition ${
                activeTab === 'audit' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              PBAC
            </button>
          </div>

        </div>
      </header>
    </>
  );
}
