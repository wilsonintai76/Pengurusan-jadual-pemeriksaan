'use client';

import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Table as TableIcon, 
  Kanban as KanbanIcon, 
  Plus, 
  Crosshair, 
  FileSpreadsheet, 
  Printer, 
  ShieldCheck, 
  ArrowLeftRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  FileCheck,
  Building2,
  CalendarCheck2
} from 'lucide-react';
import { InspectionSchedule, UserSession, InspectionStatus } from '@/lib/types';
import { CROSS_PAIRS } from '@/lib/initialData';

interface EjasSectionProps {
  schedules: InspectionSchedule[];
  currentUser: UserSession | null;
  onOpenAddSchedule: () => void;
  onOpenEditSchedule: (schedule: InspectionSchedule) => void;
  onDeleteSchedule: (id: string) => void;
  onOpenClaimModal: () => void;
  onOpenKewpa11Modal: (schedule: InspectionSchedule) => void;
  onOpenCrossModal: () => void;
  onOpenPbacModal: () => void;
  onExportCSV: () => void;
  onPrintKewpa10: () => void;
}

export default function EjasSection({
  schedules,
  currentUser,
  onOpenAddSchedule,
  onOpenEditSchedule,
  onDeleteSchedule,
  onOpenClaimModal,
  onOpenKewpa11Modal,
  onOpenCrossModal,
  onOpenPbacModal,
  onExportCSV,
  onPrintKewpa10,
}: EjasSectionProps) {
  const [currentView, setCurrentView] = useState<'table' | 'kanban'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('SEMUA');
  const [filterStatus, setFilterStatus] = useState('SEMUA');
  const [filterQuarter, setFilterQuarter] = useState('SEMUA');
  const [filterMyTasksOnly, setFilterMyTasksOnly] = useState(false);

  const myDept = currentUser?.dept || 'JTMK';
  const crossPartner = CROSS_PAIRS[myDept] || 'JKE';

  // Calculate my inspection count
  const myTasksCount = schedules.filter((s) => {
    if (!currentUser) return false;
    const name = currentUser.name.toLowerCase();
    const p1 = (s.pemeriksa1 || '').toLowerCase();
    const p2 = (s.pemeriksa2 || '').toLowerCase();
    return p1.includes(name) || p2.includes(name);
  }).length;

  // Filtered schedules
  const filtered = schedules.filter((item) => {
    // My tasks filter
    if (filterMyTasksOnly && currentUser) {
      const name = currentUser.name.toLowerCase();
      const p1 = (item.pemeriksa1 || '').toLowerCase();
      const p2 = (item.pemeriksa2 || '').toLowerCase();
      if (!p1.includes(name) && !p2.includes(name)) return false;
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchLoc = item.lokasi.toLowerCase().includes(q);
      const matchKod = item.kod?.toLowerCase().includes(q);
      const matchP1 = item.pemeriksa1.toLowerCase().includes(q);
      const matchP2 = item.pemeriksa2.toLowerCase().includes(q);
      const matchPenjaga = item.penjaga.toLowerCase().includes(q);
      if (!matchLoc && !matchKod && !matchP1 && !matchP2 && !matchPenjaga) return false;
    }

    // Dept filter
    if (filterDept !== 'SEMUA' && item.jabatan !== filterDept) return false;

    // Status filter
    if (filterStatus !== 'SEMUA' && item.status !== filterStatus) return false;

    // Quarter filter based on tarikhMula
    if (filterQuarter !== 'SEMUA') {
      const month = new Date(item.tarikhMula).getMonth() + 1;
      if (filterQuarter === 'Q1' && !(month >= 1 && month <= 3)) return false;
      if (filterQuarter === 'Q2' && !(month >= 4 && month <= 6)) return false;
      if (filterQuarter === 'Q3' && !(month >= 7 && month <= 9)) return false;
      if (filterQuarter === 'Q4' && !(month >= 10 && month <= 12)) return false;
    }

    return true;
  });

  const getStatusBadge = (status: InspectionStatus) => {
    switch (status) {
      case 'Selesai':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Selesai</span>
          </span>
        );
      case 'Sedang Dijalankan':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Sedang Dijalankan</span>
          </span>
        );
      case 'Tertangguh':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>Tertangguh</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <span>Belum Mula</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Coordinator & Cross-Inspection Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Building2 className="w-5 h-5 text-amber-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-slate-900 text-sm">
                Jabatan: <span className="text-sky-800">{myDept}</span>
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                Pemeriksa Dilantik
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
                <ArrowLeftRight className="w-3 h-3 text-teal-600" />
                <span>Rakan Silang: {crossPartner} (Timbal Balik ⇄)</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Rancang takwim makmal jabatan anda dan laksanakan pemeriksaan fizikal bagi lokasi yang diamanahkan kepada anda.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap">
          <button
            onClick={() => setFilterMyTasksOnly(!filterMyTasksOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
              filterMyTasksOnly
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
            }`}
          >
            <CalendarCheck2 className="w-3.5 h-3.5" />
            <span>Tugasan Saya ({myTasksCount})</span>
          </button>

          <button
            onClick={onOpenClaimModal}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-800 hover:bg-teal-700 text-white transition flex items-center gap-1.5 shadow-xs"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Pilih Lokasi</span>
          </button>

          <button
            onClick={onOpenAddSchedule}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Daftar Jadual</span>
          </button>
        </div>
      </div>

      {/* Filter and View Controls Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama makmal, bengkel, kod jadual, atau pegawai..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-slate-50/50"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="SEMUA">Semua Jabatan</option>
              {Object.keys(CROSS_PAIRS).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="SEMUA">Semua Status</option>
              <option value="Belum Mula">Belum Mula</option>
              <option value="Sedang Dijalankan">Sedang Dijalankan</option>
              <option value="Selesai">Selesai</option>
              <option value="Tertangguh">Tertangguh</option>
            </select>

            <select
              value={filterQuarter}
              onChange={(e) => setFilterQuarter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="SEMUA">Semua Suku/Fasa</option>
              <option value="Q1">Suku 1 (Jan - Mac)</option>
              <option value="Q2">Suku 2 (Apr - Jun)</option>
              <option value="Q3">Suku 3 (Jul - Sep)</option>
              <option value="Q4">Suku 4 (Okt - Dis)</option>
            </select>
          </div>

        </div>

        {/* View Switcher and Action Bar */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 gap-2">
          
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setCurrentView('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                currentView === 'table'
                  ? 'bg-white shadow-xs text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Senarai Jadual</span>
            </button>
            <button
              onClick={() => setCurrentView('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                currentView === 'kanban'
                  ? 'bg-white shadow-xs text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KanbanIcon className="w-3.5 h-3.5" />
              <span>Papan Status</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenCrossModal}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100 transition flex items-center gap-1.5"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-teal-700" />
              <span>Mod Silang</span>
            </button>

            <button
              onClick={onOpenPbacModal}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-purple-200 bg-purple-50 text-purple-900 hover:bg-purple-100 transition flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
              <span>Polisi PBAC</span>
            </button>

            <button
              onClick={onExportCSV}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>

            <button
              onClick={onPrintKewpa10}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak KEW.PA-10</span>
            </button>
          </div>

        </div>
      </div>

      {/* VIEW 1: TABLE */}
      {currentView === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">Bil</th>
                  <th className="py-3.5 px-4">Jabatan & Lokasi Ruang</th>
                  <th className="py-3.5 px-4">Kategori & Kuantiti</th>
                  <th className="py-3.5 px-4">Tarikh Rancangan</th>
                  <th className="py-3.5 px-4">Pegawai Pemeriksa Dilantik</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      Tiada rekod jadual pemeriksaan yang sepadan dengan tapisan anda.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-xs font-medium">
                        {idx + 1}
                      </td>

                      <td className="py-3.5 px-4">
                        <strong className="text-slate-900 block text-xs sm:text-sm font-semibold">
                          {item.lokasi}
                        </strong>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-800 rounded border border-slate-200">
                            {item.jabatan}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.kod || '-'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Penjaga: <span className="font-medium text-slate-700">{item.penjaga || 'Belum diisi'}</span>
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-xs text-slate-700 block line-clamp-1">
                          {item.kategori}
                        </span>
                        <div className="text-[11px] text-slate-500 font-semibold font-mono tabular-nums mt-0.5">
                          {item.kuantiti} unit aset
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-mono">
                        <div className="text-slate-800 font-medium">{item.tarikhMula}</div>
                        <div className="text-slate-400 text-[11px]">hingga {item.tarikhTamat}</div>
                      </td>

                      <td className="py-3.5 px-4 text-xs space-y-1">
                        <div>
                          <span className="font-semibold text-slate-800">1. </span>
                          {item.pemeriksa1 ? (
                            <span className="text-slate-700">{item.pemeriksa1}</span>
                          ) : (
                            <span className="text-rose-500 italic text-[11px]">Belum dituntut</span>
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-800">2. </span>
                          {item.pemeriksa2 ? (
                            <span className="text-slate-700">{item.pemeriksa2}</span>
                          ) : (
                            <span className="text-rose-500 italic text-[11px]">Belum dituntut</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(item.status)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onOpenKewpa11Modal(item)}
                            title="Isi Perakuan KEW.PA-11 & Pra-JKPAK"
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition flex items-center gap-1 shadow-2xs"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>KEW.PA-11</span>
                          </button>

                          <button
                            onClick={() => onOpenEditSchedule(item)}
                            title="Kemaskini Jadual"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDeleteSchedule(item.id)}
                            title="Padam Jadual"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: KANBAN BOARD */}
      {currentView === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          
          {/* Column 1: Belum Mula */}
          <div className="bg-slate-100 p-3.5 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Belum Mula
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-mono">
                {filtered.filter((s) => s.status === 'Belum Mula').length}
              </span>
            </div>

            <div className="space-y-3 min-h-[220px]">
              {filtered
                .filter((s) => s.status === 'Belum Mula')
                .map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2 hover:border-slate-300 transition"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-800 rounded">
                        {item.jabatan}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.kuantiti} unit
                      </span>
                    </div>

                    <h5 className="font-bold text-xs text-slate-900 leading-snug">
                      {item.lokasi}
                    </h5>

                    <p className="text-[11px] text-slate-500 font-mono">
                      {item.tarikhMula} - {item.tarikhTamat}
                    </p>

                    <div className="pt-1 flex items-center justify-between border-t border-slate-100 text-[11px]">
                      <span className="text-slate-500 truncate max-w-[120px]">
                        {item.pemeriksa1 ? item.pemeriksa1.split(' ')[0] : 'Tiada P1'}
                      </span>
                      <button
                        onClick={() => onOpenKewpa11Modal(item)}
                        className="text-amber-700 font-bold hover:underline"
                      >
                        KEW.PA-11 &rarr;
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Column 2: Sedang Dijalankan */}
          <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200 mb-3">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                Sedang Dijalankan
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-mono">
                {filtered.filter((s) => s.status === 'Sedang Dijalankan').length}
              </span>
            </div>

            <div className="space-y-3 min-h-[220px]">
              {filtered
                .filter((s) => s.status === 'Sedang Dijalankan')
                .map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs space-y-2 hover:border-amber-300 transition"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded">
                        {item.jabatan}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.kuantiti} unit
                      </span>
                    </div>

                    <h5 className="font-bold text-xs text-slate-900 leading-snug">
                      {item.lokasi}
                    </h5>

                    <p className="text-[11px] text-slate-500 font-mono">
                      {item.tarikhMula} - {item.tarikhTamat}
                    </p>

                    <div className="pt-1 flex items-center justify-between border-t border-slate-100 text-[11px]">
                      <span className="text-slate-500 truncate max-w-[120px]">
                        P1: {item.pemeriksa1?.split(' ')[0] || 'Dituntut'}
                      </span>
                      <button
                        onClick={() => onOpenKewpa11Modal(item)}
                        className="text-amber-700 font-bold hover:underline"
                      >
                        Sahkan &rarr;
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Column 3: Selesai Diperiksa */}
          <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-200 mb-3">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                Selesai Diperiksa
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-mono">
                {filtered.filter((s) => s.status === 'Selesai').length}
              </span>
            </div>

            <div className="space-y-3 min-h-[220px]">
              {filtered
                .filter((s) => s.status === 'Selesai')
                .map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs space-y-2 hover:border-emerald-300 transition"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-900 rounded">
                        {item.jabatan}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 font-mono">
                        100% Selesai
                      </span>
                    </div>

                    <h5 className="font-bold text-xs text-slate-900 leading-snug">
                      {item.lokasi}
                    </h5>

                    {item.laporanPraJkpak && (
                      <div className="text-[11px] grid grid-cols-3 gap-1 font-mono text-center pt-1 border-t border-slate-100">
                        <span className="bg-emerald-50 text-emerald-800 rounded py-0.5">
                          B: {item.laporanPraJkpak.baik}
                        </span>
                        <span className="bg-amber-50 text-amber-800 rounded py-0.5">
                          R: {item.laporanPraJkpak.rosak}
                        </span>
                        <span className="bg-orange-50 text-orange-800 rounded py-0.5">
                          U: {item.laporanPraJkpak.usang}
                        </span>
                      </div>
                    )}

                    <div className="pt-1 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 text-[10px]">KEW.PA-11 Disahkan</span>
                      <button
                        onClick={() => onOpenKewpa11Modal(item)}
                        className="text-emerald-700 font-bold hover:underline"
                      >
                        Semak &rarr;
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Column 4: Tertangguh */}
          <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200">
            <div className="flex items-center justify-between pb-3 border-b border-rose-200 mb-3">
              <span className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                Tertangguh
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 font-mono">
                {filtered.filter((s) => s.status === 'Tertangguh').length}
              </span>
            </div>

            <div className="space-y-3 min-h-[220px]">
              {filtered
                .filter((s) => s.status === 'Tertangguh')
                .map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs space-y-2 hover:border-rose-300 transition"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-rose-100 text-rose-900 rounded">
                        {item.jabatan}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.kuantiti} unit
                      </span>
                    </div>

                    <h5 className="font-bold text-xs text-slate-900 leading-snug">
                      {item.lokasi}
                    </h5>

                    <p className="text-[11px] text-rose-700">
                      {item.catatan || 'Jadual ditangguhkan'}
                    </p>

                    <div className="pt-1 flex items-center justify-end text-[11px]">
                      <button
                        onClick={() => onOpenEditSchedule(item)}
                        className="text-rose-700 font-bold hover:underline"
                      >
                        Jadualkan Semula &rarr;
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
