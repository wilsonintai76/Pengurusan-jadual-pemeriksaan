import React from 'react';
import { 
  Boxes, 
  Home, 
  CalendarCheck, 
  FileSignature, 
  BookOpen, 
  Users, 
  ShieldCheck, 
  RefreshCw, 
  LogOut,
  Building2,
  Database,
  SlidersHorizontal,
  MapPin,
  ArrowLeftRight
} from 'lucide-react';
import { UserSession } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/systemRoles';

interface SidebarNavProps {
  currentUser: UserSession | null;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onLogout: () => void;
  onSync: () => void;
  praJkpakCount: number;
  /** Tahun sesi aktif daripada tetapan. */
  tahunSesi?: string;
  /** Pentadbir Sistem sahaja — Tetapan disembunyikan daripada peranan lain. */
  isAdmin?: boolean;
  onOpenPbacModal?: () => void;
  onOpenLogin?: () => void;
  onOpenUserProfile?: () => void;
}

export default function SidebarNav({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
  onSync,
  praJkpakCount,
  tahunSesi,
  isAdmin = false,
  onOpenPbacModal,
  onOpenLogin,
  onOpenUserProfile,
}: SidebarNavProps) {
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSyncClick = () => {
    setIsSyncing(true);
    setTimeout(() => {
      onSync();
      setIsSyncing(false);
    }, 600);
  };

  type NavItem = {
    id: string;
    label: string;
    icon: typeof Home;
    badge: string | number | null;
    badgeColor?: string;
    description: string;
    adminOnly?: boolean;
  };

  /** Kumpulan menu mengikut aliran kerja; kumpulan pentadbir hanya untuk Pentadbir Sistem. */
  const navGroups: Array<{ label: string; adminOnly?: boolean; items: NavItem[] }> = [
    {
      label: 'Utama',
      items: [
        { id: 'home', label: 'Utama', icon: Home, badge: null, description: 'Ringkasan & Takwim' },
      ],
    },
    {
      label: 'Pemeriksaan',
      items: [
        {
          id: 'ejas',
          label: 'Jadual Pemeriksaan',
          icon: CalendarCheck,
          badge: null,
          description: 'Pemeriksaan 100%',
        },
        {
          id: 'praJkpak',
          label: 'Kompilasi Pra-JKPAK',
          icon: FileSignature,
          badge: praJkpakCount > 0 ? praJkpakCount : null,
          badgeColor: 'bg-amber-400 text-slate-950',
          description: 'Kertas Mesyuarat',
        },
      ],
    },
    {
      label: 'Direktori',
      items: [
        {
          id: 'lokasi',
          label: 'Direktori Lokasi',
          icon: MapPin,
          badge: null,
          description: 'Makmal & Ruang Aset',
        },
        {
          id: 'jabatan',
          label: 'Direktori Jabatan',
          icon: Building2,
          badge: null,
          description: '12 Jabatan & UAP',
        },
        {
          id: 'direktori',
          label: 'Direktori Pegawai',
          icon: Users,
          badge: `${ROLE_LABELS.length} Peranan`,
          badgeColor: 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/30',
          description: 'Pengguna, Peranan & Lantikan',
        },
      ],
    },
    {
      label: 'Rujukan',
      items: [
        {
          id: 'pekeliling',
          label: 'Pekeliling TPA',
          icon: BookOpen,
          badge: null,
          description: 'Panduan 1PP AM 2.4',
        },
      ],
    },
    {
      label: 'Pentadbiran',
      adminOnly: true,
      items: [
        {
          id: 'kitaran',
          label: 'Kitaran Pemeriksaan',
          icon: ArrowLeftRight,
          badge: null,
          description: 'Kolam & Timbal Balik',
          adminOnly: true,
        },
        {
          id: 'audit',
          label: 'Jejak Audit PBAC',
          icon: ShieldCheck,
          badge: null,
          description: 'Log Polisi Keselamatan',
          adminOnly: true,
        },
        {
          id: 'tetapan',
          label: 'Tetapan',
          icon: SlidersHorizontal,
          badge: null,
          description: 'Konfigurasi Sistem',
          adminOnly: true,
        },
      ],
    },
  ];

  const kumpulanDipapar = navGroups
    .filter((kumpulan) => !kumpulan.adminOnly || isAdmin)
    .map((kumpulan) => ({
      ...kumpulan,
      items: kumpulan.items.filter((item) => !item.adminOnly || isAdmin),
    }))
    .filter((kumpulan) => kumpulan.items.length > 0);

  return (
    <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 h-screen sticky top-0 bg-slate-950 text-slate-200 flex-col justify-between border-r border-slate-800 shadow-sm z-30 select-none no-print">
      
      {/* Top Brand Section */}
      <div className="p-5 border-b border-slate-800/80">
        <div 
          onClick={() => setActiveTab('home')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-amber-400 shadow-inner transition-transform group-hover:scale-105">
            <Boxes className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-sm text-white tracking-tight leading-tight">
                Portal Pemeriksaan Aset
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] bg-amber-400 text-slate-950 font-bold px-1.5 py-0.2 rounded font-mono">
                Inspect-Able
              </span>
              <p className="text-[10px] text-slate-400 leading-tight">
                Politeknik Kuching Sarawak
              </p>
            </div>
          </div>
        </div>

        {/* Government Badge & Session */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1 text-emerald-400 font-mono">
            <Database className="w-3 h-3 text-emerald-400" />
            <span>Edge D1</span>
          </span>
          <span>Sesi: <strong className="text-white font-mono">{tahunSesi || new Date().getFullYear()}</strong></span>
        </div>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5">
        <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 font-mono">
          Menu Navigasi
        </p>

        {kumpulanDipapar.map((kumpulan) => (
          <div key={kumpulan.label} className="space-y-1">
            <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              {kumpulan.label}
            </p>
            {kumpulan.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={item.description}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-medium transition flex items-center justify-between group ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-amber-400 transition-colors'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge !== null && (
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${isActive ? 'bg-slate-950 text-amber-300' : item.badgeColor ?? 'bg-slate-800 text-amber-300 border border-slate-700'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Sidebar Footer User Area */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/90 space-y-3">
        {currentUser ? (
          <div className="flex items-center justify-between gap-2 bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800">
            <div 
              onClick={onOpenUserProfile}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-90 transition"
              title="Lihat & Kemaskini Profil Pegawai"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs shadow-xs font-mono shrink-0">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left leading-tight truncate">
                <span className="font-semibold text-white block text-xs truncate">
                  {currentUser.name}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-bold text-sky-300 bg-sky-950/80 px-1.5 py-0.2 rounded border border-sky-800/60 font-mono">
                    {currentUser.dept}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">
                    {currentUser.role.includes('Pentadbir') ? 'Admin' : currentUser.grade || 'DH41'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition shrink-0"
              title="Log Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="w-full p-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs"
          >
            <span>Log Masuk Pegawai</span>
          </button>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>1PP AM 2.4 &bull; UAP</span>
          <button
            onClick={handleSyncClick}
            disabled={isSyncing}
            className="text-slate-400 hover:text-amber-400 flex items-center gap-1 transition"
            title="Segerak Data"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
            <span>Segerak</span>
          </button>
        </div>
      </div>

    </aside>
  );
}
