import React, { useMemo } from 'react';
import { 
  CalendarDays, 
  FileSignature, 
  Crosshair, 
  ArrowRight, 
  ShieldAlert, 
  CheckCircle2, 
  Wrench, 
  Recycle, 
  Boxes,
  Building,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  SlidersHorizontal,
  Flame,
  Calendar,
  X,
  Bell
} from 'lucide-react';
import { InspectionSchedule } from '@/lib/types';
import { 
  D3StatusDonutChart, 
  D3DepartmentBarChart, 
  D3AssetHealthChart 
} from '@/components/charts/D3HomeCharts';
import FullMonthCalendar from '@/components/calendar/FullMonthCalendar';
import TakwimSesiCard from '@/components/TakwimSesiCard';

interface HomeSectionProps {
  schedules: InspectionSchedule[];
  onOpenEjas: () => void;
  onOpenPraJkpak: () => void;
  onOpenClaim: () => void;
  onOpenPekeliling: () => void;
  /** Tahun sesi daripada tetapan (cth. "2026"). */
  tahunSesi?: string;
}

export default function HomeSection({
  schedules,
  onOpenEjas,
  onOpenPraJkpak,
  onOpenClaim,
  onOpenPekeliling,
  tahunSesi,
}: HomeSectionProps) {
  const [showOverdueToast, setShowOverdueToast] = React.useState<boolean>(true);
  const [calendarMode, setCalendarMode] = React.useState<'fullMonth' | 'urgent7Days'>('fullMonth');
  const [deadlineFilter, setDeadlineFilter] = React.useState<'all' | 'urgent' | 'soon'>('all');
  const today = useMemo(() => new Date(), []);
  const tahunAktif = tahunSesi || String(today.getFullYear());

  // Compute 7-day deadline calendar list with color-coded urgency levels
  const deadline7DaysList = useMemo(() => {
    return schedules
      .filter((s) => s.status !== 'Selesai')
      // Jadual tanpa tarikh (menunggu Penyelia Lokasi) tidak masuk tetingkap segera.
      .filter((s) => Boolean(s.tarikhTamat))
      .map((s) => {
        const endDate = new Date(s.tarikhTamat);
        const diffTime = endDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let urgencyLevel: 'urgent' | 'soon' | 'outOfRange' = 'outOfRange';
        if (daysRemaining <= 3) {
          urgencyLevel = 'urgent'; // Red chip (Kritikal / Overdue / <= 3 days)
        } else if (daysRemaining <= 7) {
          urgencyLevel = 'soon'; // Yellow/Amber chip (Segera / 4-7 days)
        }

        return {
          ...s,
          daysRemaining,
          urgencyLevel,
        };
      })
      .filter((item) => item.daysRemaining <= 7)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [schedules, today]);

  const urgentDeadlineCount = useMemo(() => deadline7DaysList.filter((i) => i.urgencyLevel === 'urgent').length, [deadline7DaysList]);
  const soonDeadlineCount = useMemo(() => deadline7DaysList.filter((i) => i.urgencyLevel === 'soon').length, [deadline7DaysList]);

  const filteredDeadlineList = useMemo(() => {
    if (deadlineFilter === 'urgent') return deadline7DaysList.filter((i) => i.urgencyLevel === 'urgent');
    if (deadlineFilter === 'soon') return deadline7DaysList.filter((i) => i.urgencyLevel === 'soon');
    return deadline7DaysList;
  }, [deadline7DaysList, deadlineFilter]);


  // Calculate high-fidelity summary metrics
  const {
    totalRooms,
    totalAssets,
    completedRooms,
    completedAssets,
    pendingRooms,
    pendingAssets,
    overdueRooms,
    overdueList,
    peratusSelesai,
    rosakCount,
    usangCount,
  } = useMemo(() => {
    let totAssets = 0;
    let compRooms = 0;
    let compAssets = 0;
    let pendRooms = 0;
    let pendAssets = 0;
    let overRooms = 0;
    const overList: Array<InspectionSchedule & { overdueDays: number }> = [];

    let rCount = 0;
    let uCount = 0;

    schedules.forEach((s) => {
      const qty = s.kuantiti || 0;
      totAssets += qty;

      if (s.laporanPraJkpak) {
        rCount += s.laporanPraJkpak.rosak || 0;
        uCount += s.laporanPraJkpak.usang || 0;
      }

      if (s.status === 'Selesai') {
        compRooms += 1;
        compAssets += qty;
      } else if (s.status === 'Tertangguh') {
        overRooms += 1;
        overList.push({ ...s, overdueDays: 14 });
      } else {
        const endDate = new Date(s.tarikhTamat);
        const isPastDue = endDate < today;

        if (isPastDue) {
          overRooms += 1;
          const diffTime = Math.abs(today.getTime() - endDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          overList.push({ ...s, overdueDays: diffDays });
        } else {
          pendRooms += 1;
          pendAssets += qty;
        }
      }
    });

    const totalR = schedules.length;
    const pct = totalR > 0 ? Math.round((compRooms / totalR) * 100) : 0;

    return {
      totalRooms: totalR,
      totalAssets: totAssets,
      completedRooms: compRooms,
      completedAssets: compAssets,
      pendingRooms: pendRooms,
      pendingAssets: pendAssets,
      overdueRooms: overRooms,
      overdueList: overList,
      peratusSelesai: pct,
      rosakCount: rCount,
      usangCount: uCount,
    };
  }, [schedules, today]);

  return (
    <div className="space-y-6">
      
      {/* 0. Automatic Overdue Alert Toast Notification (1PP AM 2.4 Compliance System) */}
      {overdueList.length > 0 && showOverdueToast && (
        <div className="bg-slate-950 text-white rounded-2xl p-4 sm:p-5 border-2 border-rose-500 shadow-xl relative animate-in slide-in-from-top duration-300">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-500 text-slate-950 font-bold flex items-center justify-center shrink-0 shadow-md animate-pulse mt-0.5">
                <AlertTriangle className="w-5 h-5 text-slate-950" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-rose-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                    Peringatan Automatik Inspect-Able
                  </span>
                  <span className="text-xs text-rose-300 font-mono hidden sm:inline">
                    Pematuhan 1PP AM 2.4
                  </span>
                </div>
                
                <h4 className="text-sm sm:text-base font-extrabold text-white leading-snug">
                  Terdapat {overdueList.length} Jadual Pemeriksaan Melepasi Tarikh Tamat!
                </h4>
                
                <p className="text-xs text-slate-300">
                  Lokasi berikut memerlukan tindakan pemeriksaan fizikal segera oleh Pegawai Pemeriksa:
                </p>

                <div className="pt-1.5 flex flex-wrap gap-2">
                  {overdueList.slice(0, 3).map((item) => (
                    <span 
                      key={item.id} 
                      className="bg-slate-900 border border-rose-800/80 text-rose-200 text-[11px] px-2.5 py-1 rounded-xl font-mono font-medium flex items-center gap-1.5 shadow-2xs"
                    >
                      <Clock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span><strong>{item.lokasi}</strong> ({item.jabatan}) &bull; Tamat: {item.tarikhTamat} ({item.overdueDays} hari)</span>
                    </span>
                  ))}
                  {overdueList.length > 3 && (
                    <span className="text-[11px] text-slate-400 font-mono pt-1">
                      + {overdueList.length - 3} lokasi lagi...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
              <button
                onClick={onOpenEjas}
                className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-md"
              >
                <span>Urus Jadual Pemeriksaan</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowOverdueToast(false)}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition border border-slate-800"
                title="Tutup Peringatan Ini"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-open Overdue Toast Badge if dismissed but overdue items exist */}
      {overdueList.length > 0 && !showOverdueToast && (
        <div className="bg-rose-950/40 border border-rose-800/60 text-rose-200 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-rose-400 animate-bounce" />
            <span>Peringatan jadual ditutup. Terdapat <strong className="text-white font-mono">{overdueList.length} lokasi</strong> pemeriksaan melepasi tarikh.</span>
          </div>
          <button
            onClick={() => setShowOverdueToast(true)}
            className="text-amber-300 hover:text-amber-200 font-bold underline font-mono text-[11px]"
          >
            Tunjukkan Peringatan Notifikasi
          </button>
        </div>
      )}

      {/* 1. Hero Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden border border-slate-800 shadow-sm">
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-amber-300 border border-slate-700/80">
            <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
            <span>Takwim Rasmi Sesi Pemeriksaan Aset Alih {tahunAktif}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Pusat Pengurusan & Pemeriksaan Aset Alih POLIKU
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Portal bersepadu Politeknik Kuching Sarawak bagi perancangan takwim (KEW.PA-10), pelaksanaan pemeriksaan fizikal 100% secara silang (⇄), pengesahan borang KEW.PA-11 bertauliah, penguatkuasaan Pesanan Kerajaan (LO) bagi kerosakan, dan kompilasi dapatan untuk Mesyuarat Pra-JKPAK berpandukan Pekeliling Perbendaharaan Malaysia (1PP AM 2.4).
          </p>

          <div className="pt-2 flex flex-wrap gap-2.5">
            <button
              onClick={onOpenEjas}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm shadow-sm transition flex items-center gap-2"
            >
              <CalendarDays className="w-4 h-4" />
              <span>Buka Jadual Pemeriksaan</span>
            </button>

            <button
              onClick={onOpenPraJkpak}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm border border-slate-700 transition flex items-center gap-2"
            >
              <FileSignature className="w-4 h-4 text-amber-300" />
              <span>Kompilasi Pra-JKPAK</span>
            </button>

            <button
              onClick={onOpenClaim}
              className="px-4 py-2.5 rounded-xl bg-teal-900/60 hover:bg-teal-900 text-teal-200 border border-teal-700/60 font-semibold text-xs sm:text-sm transition flex items-center gap-2"
            >
              <Crosshair className="w-4 h-4" />
              <span>Tuntut Lokasi Diperiksa</span>
            </button>
          </div>
        </div>

        {/* Decorative background watermark */}
        <div className="hidden lg:block absolute -right-6 -bottom-10 opacity-10 text-white pointer-events-none">
          <Boxes className="w-72 h-72 text-slate-400" />
        </div>
      </div>

      {/* 2. Executive KPI Summary Cards: Total Assets, Pending Inspections, Overdue Tasks & Completion Rate */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* KPI 1: Total Assets */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Jumlah Aset Berdaftar
            </span>
            <span className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
            {totalAssets} <span className="text-xs font-normal text-slate-500 font-sans">unit</span>
          </h3>
          <p className="text-[11px] text-slate-500 pt-1 flex items-center gap-1">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <span>Merangkumi {totalRooms} makmal/bengkel</span>
          </p>
        </div>

        {/* KPI 2: Pending Inspections */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Pemeriksaan Menunggu
            </span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono tabular-nums">
            {pendingRooms} <span className="text-xs font-normal text-slate-500 font-sans">lokasi</span>
          </h3>
          <p className="text-[11px] text-amber-700 font-medium pt-1 flex items-center gap-1">
            <span>{pendingAssets} unit aset belum disahkan</span>
          </p>
        </div>

        {/* KPI 3: Overdue Tasks */}
        <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wider font-mono">
              Tugasan Melepasi Tempoh
            </span>
            <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-mono tabular-nums">
            {overdueRooms} <span className="text-xs font-normal text-rose-700 font-sans">lokasi</span>
          </h3>
          <p className="text-[11px] text-rose-700 font-medium pt-1 flex items-center gap-1">
            <span>Perlu tindakan segera pemeriksa</span>
          </p>
        </div>

        {/* KPI 4: Completion Rate */}
        <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider font-mono">
              Pencapaian Selesai
            </span>
            <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono tabular-nums">
            {peratusSelesai}%
          </h3>
          <p className="text-[11px] text-emerald-700 font-semibold pt-1 flex items-center gap-1">
            <span>{completedRooms} lokasi &bull; {completedAssets} unit selesai</span>
          </p>
        </div>

      </div>

      {/* 3. D3 Visual Analytics Dashboard: Donut Chart & Department Progress Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5">
          <D3StatusDonutChart schedules={schedules} />
        </div>
        <div className="lg:col-span-7">
          <D3DepartmentBarChart schedules={schedules} />
        </div>
      </div>

      {/* 4. D3 Asset Health & Physical Condition Meter */}
      <D3AssetHealthChart schedules={schedules} />

      {/* 4.4. Takwim perancangan sesi — makluman untuk semua pengguna (baca sahaja) */}
      <TakwimSesiCard tahun={tahunAktif} />

      {/* 4.5. Extended Takwim & Kalendar Pemeriksaan: Full-Month View & 7-Day Urgency Window */}
      <div className="space-y-4">
        
        {/* Calendar Mode Switcher & Resource Planning Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
                <Calendar className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Takwim & Kalendar Pemeriksaan Aset Alih {tahunAktif}
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Perancangan sumber manusia & jadual pemeriksaan fizikal 100% berpandukan 1PP AM 2.4.
            </p>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0">
            <button
              onClick={() => setCalendarMode('fullMonth')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                calendarMode === 'fullMonth'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-4 h-4 text-amber-400" />
              <span>Kalendar Bulanan Penuh (react-big-calendar)</span>
            </button>

            <button
              onClick={() => setCalendarMode('urgent7Days')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                calendarMode === 'urgent7Days'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4 text-rose-500" />
              <span>Tetingkap 7 Hari Segera</span>
              {deadline7DaysList.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-mono font-extrabold">
                  {deadline7DaysList.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* View 1: Full-Month Calendar View powered by react-big-calendar */}
        {calendarMode === 'fullMonth' && (
          <FullMonthCalendar
            schedules={schedules}
            onOpenEjas={onOpenEjas}
          />
        )}

        {/* View 2: 7-Day Urgency Window with color-coded chips */}
        {calendarMode === 'urgent7Days' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5 animate-in fade-in duration-150">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
                    <Clock className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Lokasi Pemeriksaan Tamat Dalam Tempoh 7 Hari
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Penandaan cip warna: <span className="font-bold text-rose-600">Merah = Kritikal ≤3 Hari / Lewat</span> &bull; <span className="font-bold text-amber-600">Kuning/Amber = Segera 4–7 Hari</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => setDeadlineFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    deadlineFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>Semua</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-200 font-mono">
                    {deadline7DaysList.length}
                  </span>
                </button>

                <button
                  onClick={() => setDeadlineFilter('urgent')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    deadlineFilter === 'urgent'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  <span>Kritikal (≤3 Hari)</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-200 text-rose-900 font-mono">
                    {urgentDeadlineCount}
                  </span>
                </button>

                <button
                  onClick={() => setDeadlineFilter('soon')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    deadlineFilter === 'soon'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Segera (4–7 Hari)</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200 text-amber-900 font-mono">
                    {soonDeadlineCount}
                  </span>
                </button>
              </div>
            </div>

            {/* List Grid of Deadline Calendar Cards */}
            {filteredDeadlineList.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">
                  Tiada Jadual Pemeriksaan Dalam Kategori Ini
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Semua pemeriksaan aset bagi kategori yang dipilih berada dalam tempoh selamat atau telah diselesaikan sepenuhnya.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDeadlineList.map((item) => {
                  const isUrgent = item.urgencyLevel === 'urgent';
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition hover:shadow-md flex flex-col justify-between gap-3.5 ${
                        isUrgent
                          ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                          : 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono uppercase tracking-wider">
                            {item.jabatan}
                          </span>

                          {/* Color Coded Chips: Red for Urgent (≤3 days / overdue), Yellow/Amber for Soon (4-7 days) */}
                          {isUrgent ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-500 text-white shadow-2xs font-mono">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>
                                {item.daysRemaining < 0
                                  ? `Lewat ${Math.abs(item.daysRemaining)} Hari`
                                  : item.daysRemaining === 0
                                  ? 'Tamat Hari Ini'
                                  : `Kritikal (${item.daysRemaining} Hari)`}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-400 text-slate-950 shadow-2xs font-mono">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Segera ({item.daysRemaining} Hari Lagi)</span>
                            </span>
                          )}
                        </div>

                        <h4 className="font-extrabold text-slate-900 text-base leading-snug">
                          {item.lokasi}
                        </h4>

                        <div className="text-xs text-slate-600 space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Tarikh Tamat: <strong className="text-slate-900">{item.tarikhTamat}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                            <Boxes className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Kuantiti Aset: <strong className="text-slate-900">{item.kuantiti} unit</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-xs gap-2">
                        <div className="text-[11px] text-slate-500 min-w-0">
                          <span className="block font-semibold text-slate-700">Pemeriksa:</span>
                          <span className="truncate block font-mono text-slate-600">
                            1. {item.pemeriksa1 || 'Belum dituntut'}
                          </span>
                        </div>

                        <button
                          onClick={onOpenEjas}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                            isUrgent
                              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs'
                              : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-2xs'
                          }`}
                        >
                          <span>Urus Inspect-Able</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* 5. Overdue / Attention Queue Alert Box (Actionable Governance Visibility) */}

      {overdueList.length > 0 && (
        <div className="bg-white rounded-2xl border border-rose-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-rose-50 border-b border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-bold text-rose-950 text-sm">
                  Senarai Tugasan Melepasi Tempoh Takwim ({overdueList.length} Lokasi)
                </h4>
                <p className="text-[11px] text-rose-800">
                  Makmal berikut telah melepasi tarikh tamat perancangan atau ditandakan tertangguh mengikut 1PP AM 2.4.
                </p>
              </div>
            </div>

            <button
              onClick={onOpenEjas}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition self-start sm:self-auto flex items-center gap-1.5 shadow-2xs"
            >
              <span>Urus di Inspect-Able</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-2 px-3">Jabatan & Lokasi Makmal</th>
                  <th className="py-2 px-3">Tarikh Takwim</th>
                  <th className="py-2 px-3">Pegawai Pemeriksa</th>
                  <th className="py-2 px-3 text-center">Status Kelewatan</th>
                  <th className="py-2 px-3 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3">
                      <strong className="text-slate-900 block font-semibold">{item.lokasi}</strong>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-800 rounded font-mono">
                          {item.jabatan}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.kuantiti} unit
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      <div>{item.tarikhMula}</div>
                      <div className="text-slate-400 text-[10px]">hingga {item.tarikhTamat}</div>
                    </td>

                    <td className="py-2.5 px-3 text-slate-700">
                      <div>1. {item.pemeriksa1 || <span className="text-rose-500 italic">Belum dituntut</span>}</div>
                      <div>2. {item.pemeriksa2 || <span className="text-rose-500 italic">Belum dituntut</span>}</div>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <Clock className="w-3 h-3 text-rose-600" />
                        <span>Lewat {item.overdueDays} hari</span>
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={onOpenEjas}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition inline-flex items-center gap-1"
                      >
                        <span>Kemaskini</span>
                        <ArrowUpRight className="w-3 h-3 text-amber-300" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. 3-Step Workflow Process Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-800 flex items-center justify-center font-bold text-sm font-mono border border-sky-100">
            01
          </div>
          <h3 className="font-bold text-slate-900 text-sm">
            Penyelarasan & Pendaftaran Jadual
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Penyelaras Aset Jabatan mendaftarkan makmal dan bengkel di bawah bidang kuasa masing-masing ke dalam takwim tahunan Inspect-Able lengkap dengan Pegawai Penjaga Ruang (*room custodian*).
          </p>
          <button
            onClick={onOpenEjas}
            className="text-xs text-sky-700 font-bold hover:underline inline-flex items-center gap-1 pt-1"
          >
            <span>Lihat Takwim Inspect-Able</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold text-sm font-mono border border-teal-100">
            02
          </div>
          <h3 className="font-bold text-slate-900 text-sm">
            Pemeriksaan Silang & Tuntutan Lokasi
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pegawai Pemeriksa dilantik menuntut lokasi di jabatan rakan silang mengikut ketetapan mod Timbal Balik (⇄). Polisi PBAC menghalang pegawai daripada memeriksa bilik jagaan sendiri.
          </p>
          <button
            onClick={onOpenClaim}
            className="text-xs text-teal-700 font-bold hover:underline inline-flex items-center gap-1 pt-1"
          >
            <span>Tuntut Lokasi Silang</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-sm font-mono border border-amber-100">
            03
          </div>
          <h3 className="font-bold text-slate-900 text-sm">
            KEW.PA-11 & Kompilasi Pra-JKPAK
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pemeriksa merekodkan dapatan fizikal, memuat naik salinan KEW.PA-11 bertandatangan, memasukkan No. Aduan & LO kerosakan, serta menjana kertas pembentangan mesyuarat secara automatik.
          </p>
          <button
            onClick={onOpenPraJkpak}
            className="text-xs text-amber-700 font-bold hover:underline inline-flex items-center gap-1 pt-1"
          >
            <span>Buka Kompilasi Pra-JKPAK</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* 7. Statutory Guidelines Integrity Banner */}
      <div className="bg-slate-100 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 text-sm">
              Peringatan Integriti Tatacara Aset (1PP AM 2.4 Bab C)
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pegawai Penjaga Ruang (*room custodian*) dilarang keras memeriksa makmal/bengkel sendiri. Semua pemeriksaan fizikal wajib dilaksanakan 100% dan disahkan oleh sekurang-kurangnya dua (2) orang pegawai bertauliah dari luar jabatan pemilik ruang.
            </p>
          </div>
        </div>
        <button
          onClick={onOpenPekeliling}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition shrink-0 whitespace-nowrap"
        >
          Baca Ringkasan Pekeliling
        </button>
      </div>

    </div>
  );
}
