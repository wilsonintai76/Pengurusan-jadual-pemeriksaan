import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Download, 
  ArrowRight, 
  Layers, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  UserCheck, 
  ExternalLink,
  Table as TableIcon,
  LayoutGrid,
  MapPin,
  TrendingUp,
  RefreshCw,
  Plus,
  Pencil,
  Trash2
} from 'lucide-react';
import { DepartmentInfo, InspectionSchedule } from '@/lib/types';
import { dataApi } from '@/lib/dataApi';
import DepartmentModal from '@/components/modals/DepartmentModal';

interface DirektoriJabatanSectionProps {
  departments: DepartmentInfo[];
  schedules: InspectionSchedule[];
  onSelectDepartmentForLocations: (deptId: string) => void;
  onOpenEjas: () => void;
  canManage?: boolean;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onRefresh?: () => void | Promise<void>;
}

export default function DirektoriJabatanSection({
  departments,
  schedules,
  onSelectDepartmentForLocations,
  onOpenEjas,
  canManage = false,
  onShowToast,
  onRefresh,
}: DirektoriJabatanSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; initial?: DepartmentInfo } | null>(
    null
  );

  // Filtered departments
  const filteredDepartments = useMemo(() => {
    return departments.filter((dept) => {
      const q = searchTerm.toLowerCase();
      return (
        dept.id.toLowerCase().includes(q) ||
        dept.name.toLowerCase().includes(q) ||
        (dept.ketuaJabatan && dept.ketuaJabatan.toLowerCase().includes(q)) ||
        (dept.penyelaras && dept.penyelaras.toLowerCase().includes(q)) ||
        (dept.crossPartnerId && dept.crossPartnerId.toLowerCase().includes(q))
      );
    });
  }, [departments, searchTerm]);

  // Compute live inspection stats per department from schedules
  const departmentStats = useMemo(() => {
    const map: Record<string, { totalSchedules: number; completed: number; inProgress: number; percent: number }> = {};

    departments.forEach((dept) => {
      const deptSchedules = schedules.filter((s) => s.jabatan === dept.id);
      const total = deptSchedules.length;
      const completed = deptSchedules.filter((s) => s.status === 'Selesai').length;
      const inProgress = deptSchedules.filter((s) => s.status === 'Sedang Dijalankan').length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      map[dept.id] = { totalSchedules: total, completed, inProgress, percent };
    });

    return map;
  }, [departments, schedules]);

  // Aggregate overall POLIKU stats
  const totalLokasiAll = useMemo(() => {
    return departments.reduce((acc, d) => acc + (d.totalLokasi || 0), 0);
  }, [departments]);

  const totalAsetAll = useMemo(() => {
    return departments.reduce((acc, d) => acc + (d.totalAset || 0), 0);
  }, [departments]);

  const pairedCount = useMemo(
    () => departments.filter((d) => !!d.crossPartnerId).length,
    [departments]
  );
  const pairingPercent = departments.length
    ? Math.round((pairedCount / departments.length) * 100)
    : 0;

  // Export CSV
  const handleExportCSV = () => {
    let csv = 'Bil,Kod Jabatan,Nama Penuh Jabatan,Rakan Silang (1PP AM 2.4),Ketua Jabatan,Pegawai Penyelaras Aset,Penolong Pegawai Aset,Blok Bangunan,Jumlah Lokasi,Jumlah Anggaran Aset,Kemajuan Pemeriksaan\n';
    filteredDepartments.forEach((d, idx) => {
      const stats = departmentStats[d.id] || { percent: 0 };
      csv += `${idx + 1},"${d.id}","${d.name}","${d.crossPartnerId}","${d.ketuaJabatan || ''}","${d.penyelaras || ''}","${d.penolongPegawaiAset || ''}","${d.blokBangunan || ''}",${d.totalLokasi || 0},${d.totalAset || 0},"${stats.percent}%"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Direktori_Jabatan_POLIKU_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveDepartment = async (payload: {
    id?: string;
    nama: string;
    crossPartnerId?: string;
    ketuaJabatan?: string;
    penolongPegawaiAset?: string;
  }) => {
    if (modal?.mode === 'edit' && modal.initial) {
      await dataApi.departments.update(modal.initial.id, {
        nama: payload.nama,
        crossPartnerId: payload.crossPartnerId ?? '',
      });
      onShowToast?.(`Profil jabatan ${modal.initial.id} dikemas kini.`, 'success');
    } else {
      await dataApi.departments.create({
        id: payload.id ?? '',
        nama: payload.nama,
        crossPartnerId: payload.crossPartnerId,
        ketuaJabatan: payload.ketuaJabatan,
        penolongPegawaiAset: payload.penolongPegawaiAset,
      });
      onShowToast?.(`Jabatan ${payload.id} berjaya ditambah.`, 'success');
    }
    await onRefresh?.();
  };

  const handleDeleteDepartment = async (dept: DepartmentInfo) => {
    // Semak rujukan dahulu supaya amaran menyatakan rekod sebenar yang menghalang.
    let usage: Awaited<ReturnType<typeof dataApi.departments.usage>> | null = null;
    try {
      usage = await dataApi.departments.usage(dept.id);
    } catch {
      usage = null;
    }

    if (usage && !usage.canDelete) {
      const rujukan = [
        usage.pegawai > 0 ? `${usage.pegawai} pegawai` : null,
        usage.lokasi > 0 ? `${usage.lokasi} lokasi ruang (${usage.aset} aset)` : null,
        usage.jadual > 0 ? `${usage.jadual} jadual pemeriksaan` : null,
        usage.statistikKitaran > 0 ? `${usage.statistikKitaran} statistik kitaran` : null,
        usage.rekodAudit > 0 ? `${usage.rekodAudit} rekod audit` : null,
      ].filter(Boolean);

      window.alert(
        `Jabatan ${dept.id} (${dept.name}) TIDAK boleh dipadam.\n\n` +
          `Masih dirujuk oleh:\n• ${rujukan.join('\n• ')}\n\n` +
          'Kesan jika dipadam secara paksa: pegawai kehilangan jabatan, lokasi ruang menjadi yatim ' +
          '(aset KEW.PA-7 tidak lagi terikat pada jabatan), dan jadual pemeriksaan kehilangan unit ' +
          'pemilik — sebahagiannya akan gagal (FK) dan sebahagian lagi menjadi data tergantung.\n\n' +
          'Langkah selamat: pindahkan pegawai, lokasi dan jadual ke jabatan lain dahulu, ' +
          'atau sekadar tukar nama jabatan melalui Edit (kod jabatan tidak berubah, jadi ' +
          'pegawai/lokasi/jadual kekal terikat).'
      );
      return;
    }

    if (
      !window.confirm(
        `Padam jabatan ${dept.id} (${dept.name})?\n\nTiada pegawai, lokasi, aset atau jadual yang merujuk jabatan ini. Tindakan ini tidak boleh dibatalkan.`
      )
    ) {
      return;
    }

    try {
      await dataApi.departments.remove(dept.id);
      onShowToast?.(`Jabatan ${dept.id} dipadam.`, 'info');
      await onRefresh?.();
    } catch (error) {
      onShowToast?.((error as Error).message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400 text-slate-950 mb-3">
            <Building2 className="w-3.5 h-3.5 text-slate-950" />
            <span>Struktur Organisasi & Matriks Penyelaras Aset</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Direktori {departments.length} Jabatan &amp; Unit POLIKU
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
            Profil komprehensif bagi semua jabatan akademik dan pentadbiran di Politeknik Kuching Sarawak. Mengandungi maklumat Ketua Jabatan (KJ), Penyelaras Aset (KP), Penolong Pegawai Aset, serta pasangan timbal balik pemeriksaan silang (⇄) mengikut Tatacara Pengurusan Aset Alih Kerajaan (1PP AM 2.4).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Switch View */}
          <div className="bg-slate-800 p-1 rounded-xl flex items-center border border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Paparan Kad Grid"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Kad</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Paparan Jadual CRUD"
            >
              <TableIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Jadual</span>
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold text-xs transition flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Muat Turun CSV</span>
          </button>

          {canManage && (
            <button
              onClick={() => setModal({ mode: 'create' })}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jabatan</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Entiti Jabatan</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">{departments.length}</span>
            <span className="text-xs text-slate-500">jabatan &amp; unit</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Akademik & Sokongan</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider block">Gandingan Silang</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-sky-700 font-mono">{pairingPercent}%</span>
            <span className="text-xs text-sky-600">
              {pairedCount} daripada {departments.length} berganding
            </span>
          </div>
          <span className="text-[10px] text-sky-600 mt-1 block">Pematuhan 1PP AM 2.4</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Jumlah Ruang/Makmal</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-emerald-700 font-mono">{totalLokasiAll}</span>
            <span className="text-xs text-emerald-600">lokasi fizikal</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Berdaftar di Kampus</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">Anggaran Aset Keseluruhan</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-purple-700 font-mono">{totalAsetAll}</span>
            <span className="text-xs text-purple-600">unit aset</span>
          </div>
          <span className="text-[10px] text-purple-600 mt-1 block">Daftar Kad KEW.PA-2 / 3</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari kod jabatan, nama jabatan, Ketua Jabatan, atau penyelaras..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
          />
        </div>
        <div className="text-xs text-slate-500 font-mono hidden sm:block">
          {filteredDepartments.length} daripada {departments.length} jabatan
        </div>
      </div>

      {/* View 1: Card Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredDepartments.map((dept) => {
            const stats = departmentStats[dept.id] || { totalSchedules: 0, completed: 0, inProgress: 0, percent: 0 };
            const partner = departments.find((d) => d.id === dept.crossPartnerId);

            return (
              <div 
                key={dept.id} 
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                
                {/* Department Header */}
                <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-slate-50/50 to-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-300 font-mono font-bold text-base flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                        {dept.id.slice(0, 4)}
                      </div>
                      <div>
                        <span className="font-mono text-[11px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          {dept.id}
                        </span>
                        {dept.isOperational === 0 && (
                          <span className="ml-1.5 rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-slate-700">
                            Bukan Operasi
                          </span>
                        )}
                        <h3 className="font-bold text-slate-900 text-sm mt-1 leading-snug line-clamp-1">
                          {dept.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {dept.blokBangunan && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{dept.blokBangunan}</span>
                    </div>
                  )}
                </div>

                {/* Key Officers & Cross Partner */}
                <div className="p-5 space-y-3.5 text-xs flex-1">
                  
                  {/* Ketua Jabatan */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Ketua Jabatan (KJ)
                    </span>
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>{dept.ketuaJabatan || 'Belum Ditetapkan'}</span>
                    </div>
                  </div>

                  {/* Penyelaras Aset / Penolong Pegawai Aset */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Penyelaras / Penolong Pegawai Aset
                    </span>
                    <div className="font-medium text-slate-700 flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>{dept.penyelaras || dept.penolongPegawaiAset || 'Belum dilantik'}</span>
                    </div>
                  </div>

                  {/* Cross-Inspection Partner */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                        <span>Rakan Silang (1PP AM 2.4):</span>
                      </span>
                      <span className="font-mono font-bold text-teal-900 bg-teal-100 px-2 py-0.5 rounded border border-teal-200">
                        {dept.crossPartnerId}
                      </span>
                    </div>
                    {partner && (
                      <p className="text-[10px] text-slate-500 mt-1 truncate">
                        {partner.name}
                      </p>
                    )}
                  </div>

                  {/* Inspection Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-600">Kemajuan Pemeriksaan:</span>
                      <span className="font-mono font-bold text-slate-900">{stats.percent}% Selesai</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          stats.percent >= 80
                            ? 'bg-emerald-500'
                            : stats.percent >= 40
                            ? 'bg-amber-400'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.max(stats.percent, 5)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{dept.totalLokasi || 0} Lokasi Ruang</span>
                      <span>{dept.totalAset || 0} Unit Aset</span>
                    </div>
                  </div>

                </div>

                {/* Footer Actions */}
                <div className={`p-3.5 bg-slate-50 border-t border-slate-100 grid gap-2 ${canManage ? 'grid-cols-2' : 'grid-cols-2'}`}>
                  <button
                    onClick={() => onSelectDepartmentForLocations(dept.id)}
                    className="py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-600" />
                    <span>Lihat Lokasi</span>
                  </button>

                  {canManage ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setModal({ mode: 'edit', initial: dept })}
                        className="py-2 px-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1"
                        title="Kemas kini profil jabatan"
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteDepartment(dept)}
                        className="py-2 px-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold transition flex items-center justify-center gap-1"
                        title="Padam jabatan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Padam</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={onOpenEjas}
                      className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <span>Jadual AM 2.4</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  )}
                </div>

                {canManage && (
                  <div className="px-3.5 pb-3">
                    <button
                      onClick={onOpenEjas}
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <span>Jadual AM 2.4</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      ) : (
        /* View 2: Desktop Table View with SQUARE CORNERS (rounded-none border border-slate-200) */
        <div className="w-full bg-white rounded-none border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-mono uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 w-12 text-center border-b border-slate-800">#</th>
                  <th className="py-3 px-3 min-w-[90px] border-b border-slate-800">Kod</th>
                  <th className="py-3 px-4 min-w-[240px] border-b border-slate-800">Nama Jabatan & Blok</th>
                  <th className="py-3 px-4 min-w-[200px] border-b border-slate-800">Ketua Jabatan (KJ)</th>
                  <th className="py-3 px-4 min-w-[200px] border-b border-slate-800">Penyelaras Aset</th>
                  <th className="py-3 px-3 min-w-[140px] text-center border-b border-slate-800">Rakan Silang (⇄)</th>
                  <th className="py-3 px-3 min-w-[120px] text-center border-b border-slate-800">Lokasi / Aset</th>
                  <th className="py-3 px-4 min-w-[150px] border-b border-slate-800">Kemajuan Pemeriksaan</th>
                  <th className="py-3 px-4 min-w-[140px] text-center border-b border-slate-800">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredDepartments.map((dept, idx) => {
                  const stats = departmentStats[dept.id] || { totalSchedules: 0, completed: 0, inProgress: 0, percent: 0 };

                  return (
                    <tr 
                      key={dept.id} 
                      className={`hover:bg-slate-50/80 transition ${
                        idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                      }`}
                    >
                      <td className="py-3.5 px-3 text-center text-slate-400 font-mono text-xs">
                        {idx + 1}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-mono font-bold text-xs bg-slate-900 text-amber-300 px-2 py-0.5 rounded">
                          {dept.id}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {dept.name}
                        </div>
                        {dept.blokBangunan && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {dept.blokBangunan}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 text-xs">
                          {dept.ketuaJabatan || 'Belum Ditetapkan'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-slate-700 text-xs">
                          {dept.penyelaras || dept.penolongPegawaiAset || 'Belum dilantik'}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-teal-800 bg-teal-50 px-2 py-1 rounded border border-teal-200">
                          <span>⇄</span>
                          <span>{dept.crossPartnerId}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono">
                        <span className="font-bold text-slate-800">{dept.totalLokasi || 0}</span> ruang
                        <span className="block text-[10px] text-slate-400">{dept.totalAset || 0} unit aset</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-bold text-slate-800">{stats.percent}% Selesai</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${
                                stats.percent >= 80 ? 'bg-emerald-500' : stats.percent >= 40 ? 'bg-amber-400' : 'bg-rose-500'
                              }`} 
                              style={{ width: `${stats.percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onSelectDepartmentForLocations(dept.id)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition inline-flex items-center gap-1"
                          >
                            <Layers className="w-3.5 h-3.5 text-amber-600" />
                            <span>Lokasi ({dept.totalLokasi || 0})</span>
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => setModal({ mode: 'edit', initial: dept })}
                                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
                                title="Kemas kini profil jabatan"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteDepartment(dept)}
                                className="rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                                title="Padam jabatan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <DepartmentModal
          mode={modal.mode}
          initial={modal.initial ?? null}
          departments={departments}
          onClose={() => setModal(null)}
          onSubmit={handleSaveDepartment}
          onShowToast={onShowToast ?? (() => undefined)}
        />
      )}

    </div>
  );
}
