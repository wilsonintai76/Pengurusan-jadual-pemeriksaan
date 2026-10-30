import React, { useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ms, enUS } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Boxes, 
  Users, 
  ArrowRight, 
  X,
  Sparkles,
  CalendarDays
} from 'lucide-react';
import { InspectionSchedule } from '@/lib/types';
import { useDepartments } from '@/lib/useReferenceData';

const locales = {
  'ms-MY': ms,
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

interface FullMonthCalendarProps {
  schedules: InspectionSchedule[];
  onOpenEjas: () => void;
  onSelectSchedule?: (schedule: InspectionSchedule) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: InspectionSchedule;
}

const MONTH_NAMES_MS = [
  'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
  'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
];

export default function FullMonthCalendar({
  schedules,
  onOpenEjas,
  onSelectSchedule,
}: FullMonthCalendarProps) {
  const departments = useDepartments();
  // Current view date anchor (defaulting to Sesi 2026 - e.g. March 2026 or current active period)
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 2, 1)); // March 2026
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);
  const [selectedDept, setSelectedDept] = useState<string>('SEMUA');
  const [selectedStatus, setSelectedStatus] = useState<string>('SEMUA');
  const [activeModalEvent, setActiveModalEvent] = useState<InspectionSchedule | null>(null);

  // Filtered schedules for calendar
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const matchDept = selectedDept === 'SEMUA' || s.jabatan === selectedDept;
      const matchStatus = selectedStatus === 'SEMUA' || s.status === selectedStatus;
      return matchDept && matchStatus;
    });
  }, [schedules, selectedDept, selectedStatus]);

  // Transform schedules into CalendarEvent
  const events: CalendarEvent[] = useMemo(() => {
    return filteredSchedules.map((s) => {
      const [startYear, startMonth, startDay] = s.tarikhMula.split('-').map(Number);
      const [endYear, endMonth, endDay] = s.tarikhTamat.split('-').map(Number);

      const startDate = new Date(startYear, startMonth - 1, startDay, 8, 30, 0);
      const endDate = new Date(endYear, endMonth - 1, endDay, 17, 0, 0);

      return {
        id: s.id,
        title: `[${s.jabatan}] ${s.lokasi}`,
        start: startDate,
        end: endDate,
        allDay: true,
        resource: s,
      };
    });
  }, [filteredSchedules]);

  // Workload statistics for resource planning
  const stats = useMemo(() => {
    let selesai = 0;
    let sedang = 0;
    let belum = 0;
    let tertangguh = 0;
    let totalAset = 0;

    filteredSchedules.forEach((s) => {
      totalAset += s.kuantiti || 0;
      if (s.status === 'Selesai') selesai++;
      else if (s.status === 'Sedang Dijalankan') sedang++;
      else if (s.status === 'Tertangguh') tertangguh++;
      else belum++;
    });

    const total = filteredSchedules.length;
    const pct = total > 0 ? Math.round((selesai / total) * 100) : 0;

    return { total, selesai, sedang, belum, tertangguh, totalAset, pct };
  }, [filteredSchedules]);

  // Event style customization
  const eventPropGetter = (event: CalendarEvent) => {
    const s = event.resource;
    let backgroundColor = '#0284c7'; // default sky
    let borderColor = '#0369a1';
    const color = '#ffffff';

    if (s.status === 'Selesai') {
      backgroundColor = '#059669'; // Emerald
      borderColor = '#047857';
    } else if (s.status === 'Sedang Dijalankan') {
      backgroundColor = '#d97706'; // Amber
      borderColor = '#b45309';
    } else if (s.status === 'Tertangguh') {
      backgroundColor = '#e11d48'; // Rose
      borderColor = '#be123c';
    } else {
      backgroundColor = '#2563eb'; // Blue for Belum Mula
      borderColor = '#1d4ed8';
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color,
        borderRadius: '6px',
        padding: '2px 6px',
        fontSize: '11px',
        fontWeight: 600,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
      },
    };
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleJumpToMonth = (monthIndex: number) => {
    setCurrentDate(new Date(2026, monthIndex, 1));
  };

  const currentYear = currentDate.getFullYear();
  const currentMonthName = MONTH_NAMES_MS[currentDate.getMonth()];

  return (
    <div className="space-y-4">
      
      {/* 1. Resource Planning Dashboard Header & Filters */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-amber-300 border border-slate-700/80">
              <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
              <span>Perancangan Sumber & Takwim Penuh (Sesi {currentYear})</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>Paparan Kalendar Bulanan Inspect-Able:</span>
              <span className="text-amber-400 underline decoration-amber-500/50">
                {currentMonthName} {currentYear}
              </span>
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Memaparkan keseluruhan jadual pemeriksaan fizikal merentas 12 jabatan sepanjang tahun 2026 bagi menyokong agihan beban tugas Pegawai Pemeriksa dan pematuhan jadual 1PP AM 2.4.
            </p>
          </div>

          {/* Month Stepper & View Switcher */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center bg-slate-800/90 rounded-2xl p-1 border border-slate-700">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 text-xs font-bold font-mono text-white min-w-[110px] text-center">
                {currentMonthName.slice(0, 3)} {currentYear}
              </span>

              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="Bulan Seterusnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setCurrentDate(new Date(2026, 2, 1))}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-semibold transition"
            >
              Mac 2026 (Sesi Utama)
            </button>

            <button
              onClick={onOpenEjas}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
            >
              <span>Urus di Inspect-Able</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2. Month Selector Pills for Year 2026 */}
        <div className="pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
            <span className="font-mono uppercase font-bold text-slate-400">Pilih Bulan Takwim 2026:</span>
            <span>{events.length} Jadual Aktif Dipaparkan</span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
            {MONTH_NAMES_MS.map((mName, mIdx) => {
              const isSelected = currentDate.getMonth() === mIdx && currentDate.getFullYear() === 2026;
              return (
                <button
                  key={mName}
                  onClick={() => handleJumpToMonth(mIdx)}
                  className={`py-1.5 px-2 rounded-xl text-center text-xs font-mono font-bold transition ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {mName.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Resource Planning KPI Bar */}
        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-400 font-mono block">JUMLAH JADUAL</span>
            <div className="text-base font-extrabold font-mono text-white">
              {stats.total} <span className="text-[10px] text-slate-400 font-sans font-normal">lokasi</span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-emerald-400 font-mono block">SELESAI AUDIT</span>
            <div className="text-base font-extrabold font-mono text-emerald-400">
              {stats.selesai} <span className="text-[10px] text-slate-400 font-sans font-normal">({stats.pct}%)</span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-amber-400 font-mono block">SEDANG JALAN</span>
            <div className="text-base font-extrabold font-mono text-amber-400">
              {stats.sedang} <span className="text-[10px] text-slate-400 font-sans font-normal">lokasi</span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-sky-400 font-mono block">BELUM MULA</span>
            <div className="text-base font-extrabold font-mono text-sky-400">
              {stats.belum} <span className="text-[10px] text-slate-400 font-sans font-normal">lokasi</span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-rose-400 font-mono block">TERTANGGUH</span>
            <div className="text-base font-extrabold font-mono text-rose-400">
              {stats.tertangguh} <span className="text-[10px] text-slate-400 font-sans font-normal">lokasi</span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Filter Toolbar for Calendar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Tapis Kalendar:</span>
          </span>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
          >
            <option value="SEMUA">Semua Jabatan / Unit ({departments.length})</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.id} - {d.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
          >
            <option value="SEMUA">Semua Status Pemeriksaan</option>
            <option value="Selesai">Selesai (Hijau)</option>
            <option value="Sedang Dijalankan">Sedang Dijalankan (Kuning)</option>
            <option value="Belum Mula">Belum Mula (Biru)</option>
            <option value="Tertangguh">Tertangguh (Merah)</option>
          </select>

          {(selectedDept !== 'SEMUA' || selectedStatus !== 'SEMUA') && (
            <button
              onClick={() => {
                setSelectedDept('SEMUA');
                setSelectedStatus('SEMUA');
              }}
              className="text-xs text-rose-600 font-semibold underline hover:text-rose-700 ml-1"
            >
              Set Semula
            </button>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span>Selesai</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Sedang Jalan</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span>Belum Mula</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
            <span>Tertangguh</span>
          </span>
        </div>
      </div>

      {/* 5. React Big Calendar Render Container */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
        <div className="min-h-[620px] h-[640px]">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            views={[Views.MONTH, Views.AGENDA]}
            view={currentView}
            onView={(view) => setCurrentView(view)}
            date={currentDate}
            onNavigate={(newDate) => setCurrentDate(newDate)}
            eventPropGetter={eventPropGetter}
            onSelectEvent={(event: CalendarEvent) => {
              setActiveModalEvent(event.resource);
              if (onSelectSchedule) onSelectSchedule(event.resource);
            }}
            popup
            messages={{
              today: 'Bulan Ini',
              previous: 'Sebelum',
              next: 'Seterusnya',
              month: 'Paparan Bulan',
              agenda: 'Senarai Agenda',
              noEventsInRange: 'Tiada jadual pemeriksaan aset direkodkan bagi tempoh ini.',
            }}
          />
        </div>
      </div>

      {/* 6. Event Detail Modal when user clicks an event on the calendar */}
      {activeModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-slate-900 text-amber-400">
                  <CalendarIcon className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Butiran Jadual Takwim 2026
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-base leading-tight">
                    {activeModalEvent.kod}
                  </h4>
                </div>
              </div>

              <button
                onClick={() => setActiveModalEvent(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                  {activeModalEvent.lokasi}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono text-[10px] font-bold">
                    {activeModalEvent.jabatan}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {activeModalEvent.kategori}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Tempoh Takwim:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {activeModalEvent.tarikhMula} &rarr; {activeModalEvent.tarikhTamat}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Kuantiti Aset:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {activeModalEvent.kuantiti} Unit
                  </span>
                </div>

                <div className="pb-2 border-b border-slate-200 space-y-1">
                  <span className="text-slate-500 font-medium block">Pegawai Pemeriksa Dilantik:</span>
                  <div className="text-slate-800 font-semibold pl-2 space-y-0.5">
                    <div>1. {activeModalEvent.pemeriksa1 || <span className="text-rose-500 italic">Belum dituntut</span>}</div>
                    <div>2. {activeModalEvent.pemeriksa2 || <span className="text-rose-500 italic">Belum dituntut</span>}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Pegawai Penjaga Ruang:</span>
                  <span className="font-semibold text-slate-800">{activeModalEvent.penjaga || '-'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Status Semasa:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                    activeModalEvent.status === 'Selesai'
                      ? 'bg-emerald-100 text-emerald-800'
                      : activeModalEvent.status === 'Sedang Dijalankan'
                      ? 'bg-amber-100 text-amber-800'
                      : activeModalEvent.status === 'Tertangguh'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {activeModalEvent.status}
                  </span>
                </div>
              </div>

              {activeModalEvent.catatan && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-xs text-amber-900">
                  <span className="font-bold block text-[11px] mb-0.5">Catatan Pemeriksaan:</span>
                  <p>{activeModalEvent.catatan}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setActiveModalEvent(null);
                  onOpenEjas();
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
              >
                <span>Buka & Kemaskini di Inspect-Able</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>

              <button
                onClick={() => setActiveModalEvent(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
