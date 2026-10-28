'use client';

import React, { useState, useMemo } from 'react';
import { 
  MapPin, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Building, 
  Layers, 
  Edit3, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ExternalLink,
  X,
  Copy,
  Check,
  UserCheck,
  Sparkles,
  FileText,
  Users,
  Upload,
  RefreshCw
} from 'lucide-react';
import { LocationInfo, InspectionStatus, UserSession } from '@/lib/types';
import { DEPARTMENTS } from '@/lib/initialData';
import GpsMapPicker from './GpsMapPicker';

interface DirektoriLokasiSectionProps {
  locations: LocationInfo[];
  currentUser: UserSession | null;
  onAddLocation: (newLocation: LocationInfo) => void;
  onUpdateLocation: (updatedLocation: LocationInfo) => void;
  onDeleteLocation: (id: string) => void;
  onNavigateToSchedule?: (jadualId?: string) => void;
  onOpenKewpa7Modal?: () => void;
  initialDeptFilter?: string;
}

export default function DirektoriLokasiSection({
  locations,
  currentUser,
  onAddLocation,
  onUpdateLocation,
  onDeleteLocation,
  onNavigateToSchedule,
  onOpenKewpa7Modal,
  initialDeptFilter = '',
}: DirektoriLokasiSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState(initialDeptFilter);
  const [selectedKategori, setSelectedKategori] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Modal states
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationInfo | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [previewGpsLocation, setPreviewGpsLocation] = useState<LocationInfo | null>(null);

  // KEW.PA-7 Extraction state inside modal
  const [isExtractingKewpa7, setIsExtractingKewpa7] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [extractSuccessMsg, setExtractSuccessMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<LocationInfo>>({
    kodRuang: '',
    nama: '',
    jabatan: 'JTMK',
    kategoriRuang: 'Makmal Komputer',
    bangunan: 'Blok E (ICT)',
    aras: 'Aras 2',
    penjaga: '',
    penjagaJawatan: '',
    penjagaEmel: '',
    penjagaTel: '',
    anggaranAset: 30,
    statusPemeriksaan: 'Belum Mula',
  });

  const handleProcessKewpa7File = async (file: File) => {
    setIsExtractingKewpa7(true);
    setExtractProgress(25);
    setExtractSuccessMsg(null);

    const interval = setInterval(() => {
      setExtractProgress((prev) => (prev < 85 ? prev + 15 : prev));
    }, 250);

    try {
      const body = new FormData();
      body.append('file', file);

      const res = await fetch('/api/kewpa7/extract', {
        method: 'POST',
        body,
      });

      clearInterval(interval);
      setExtractProgress(100);

      if (!res.ok) {
        throw new Error(`Ralat pelayan (${res.status})`);
      }

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Respons daripada pelayan bukan format JSON');
      }

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const mappedDept = d.bahagian?.includes('MEKANIKAL') ? 'JKM' : 
                         d.bahagian?.includes('ELEKTRIK') ? 'JKE' : 
                         d.bahagian?.includes('AWAM') ? 'JKA' : 
                         d.bahagian?.includes('ICT') || d.bahagian?.includes('MAKLUMAT') ? 'JTMK' : 
                         d.bahagian?.includes('PERDAGANGAN') ? 'JP' : 
                         d.bahagian?.includes('SAINS') || d.bahagian?.includes('MATEMATIK') ? 'JMSK' : 
                         currentUser?.dept || 'JKM';

        const officerList = d.pegawaiBertanggungjawabList || [];
        const officerNames = officerList.map((o: any) => o.nama).join(', ') || 'Wilson Bin Intai';

        setFormData((prev) => ({
          ...prev,
          nama: d.lokasi || 'BENGKEL HI-TECH',
          kodRuang: d.kodLokasi ? d.kodLokasi.split('/')[0]?.trim() || '130101' : '130101',
          jabatan: mappedDept,
          kategoriRuang: d.lokasi?.toUpperCase().includes('BENGKEL') ? 'Bengkel Teknikal' : 'Makmal Komputer',
          penjaga: officerNames,
          penjagaJawatan: officerList[0]?.jawatan || 'PPPT / Penolong Pegawai Aset',
          anggaranAset: d.senaraiAset ? d.senaraiAset.length : 22,
          pegawaiBertanggungjawabList: officerList,
        }));

        setExtractSuccessMsg(`Data borang KEW.PA-7 bagi "${d.lokasi || 'BENGKEL HI-TECH'}" berjaya diekstrak secara automatik ke dalam ruangan input!`);
      } else {
        alert('Ralat semasa mengekstrak borang KEW.PA-7.');
      }
    } catch (err) {
      clearInterval(interval);
      console.error(err);
      alert('Gagal mengekstrak data KEW.PA-7.');
    } finally {
      setIsExtractingKewpa7(false);
    }
  };

  const handleUseSampleKewpa7Pdf = () => {
    const dummyFile = new File(['sample'], 'kewpa7-hitech_ebf7f58f.pdf', { type: 'application/pdf' });
    handleProcessKewpa7File(dummyFile);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenAdd = () => {
    setEditingLocation(null);
    setFormData({
      kodRuang: `MAK-${currentUser?.dept || 'JTMK'}-${(locations.length + 1).toString().padStart(2, '0')}`,
      nama: '',
      jabatan: currentUser?.dept || 'JTMK',
      kategoriRuang: 'Makmal Komputer',
      bangunan: 'Blok E (ICT)',
      aras: 'Aras 2',
      penjaga: currentUser?.name || '',
      penjagaJawatan: currentUser?.grade || 'Penolong Pegawai',
      penjagaEmel: currentUser?.email || '',
      penjagaTel: '082-845510',
      anggaranAset: 25,
      statusPemeriksaan: 'Belum Mula',
    });
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (loc: LocationInfo) => {
    setEditingLocation(loc);
    setFormData({ ...loc });
    setShowAddEditModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kodRuang || !formData.nama || !formData.penjaga) {
      alert('Sila lengkapkan Kod Ruang, Nama Lokasi, dan Pegawai Penjaga Ruang.');
      return;
    }

    if (editingLocation) {
      const updated: LocationInfo = {
        ...editingLocation,
        ...(formData as LocationInfo),
        latitude: formData.latitude || editingLocation.latitude || 1.621425,
        longitude: formData.longitude || editingLocation.longitude || 110.323580,
      };
      onUpdateLocation(updated);
    } else {
      const newLoc: LocationInfo = {
        id: `LOK-${(locations.length + 1).toString().padStart(3, '0')}`,
        kodRuang: formData.kodRuang!,
        nama: formData.nama!,
        jabatan: formData.jabatan || 'JTMK',
        kategoriRuang: (formData.kategoriRuang as any) || 'Makmal Komputer',
        bangunan: formData.bangunan || 'Blok Utama',
        aras: formData.aras || 'Aras 1',
        penjaga: formData.penjaga!,
        penjagaJawatan: formData.penjagaJawatan || '',
        penjagaEmel: formData.penjagaEmel || '',
        penjagaTel: formData.penjagaTel || '',
        anggaranAset: Number(formData.anggaranAset) || 0,
        statusPemeriksaan: (formData.statusPemeriksaan as InspectionStatus) || 'Belum Mula',
        latitude: formData.latitude || 1.621425,
        longitude: formData.longitude || 110.323580,
      };
      onAddLocation(newLoc);
    }

    setShowAddEditModal(false);
  };

  // Filtered Locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchSearch = 
        loc.kodRuang.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.penjaga.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.bangunan.toLowerCase().includes(searchTerm.toLowerCase());

      const matchDept = selectedDept ? loc.jabatan === selectedDept : true;
      const matchKategori = selectedKategori ? loc.kategoriRuang === selectedKategori : true;
      const matchStatus = selectedStatus ? loc.statusPemeriksaan === selectedStatus : true;

      return matchSearch && matchDept && matchKategori && matchStatus;
    });
  }, [locations, searchTerm, selectedDept, selectedKategori, selectedStatus]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = locations.length;
    const selesai = locations.filter((l) => l.statusPemeriksaan === 'Selesai').length;
    const sedang = locations.filter((l) => l.statusPemeriksaan === 'Sedang Dijalankan').length;
    const belum = locations.filter((l) => l.statusPemeriksaan === 'Belum Mula').length;
    const makmal = locations.filter((l) => l.kategoriRuang === 'Makmal Komputer').length;
    const bengkel = locations.filter((l) => l.kategoriRuang === 'Bengkel Teknikal').length;
    const totalAset = locations.reduce((acc, curr) => acc + (curr.anggaranAset || 0), 0);

    return { total, selesai, sedang, belum, makmal, bengkel, totalAset };
  }, [locations]);

  // Export CSV
  const handleExportCSV = () => {
    let csv = 'Bil,Kod Ruang,Nama Lokasi,Jabatan,Kategori,Bangunan,Aras,Pegawai Penjaga,Jawatan Penjaga,Emel,Telefon,Anggaran Aset,Status Pemeriksaan\n';
    filteredLocations.forEach((loc, idx) => {
      csv += `${idx + 1},"${loc.kodRuang}","${loc.nama}","${loc.jabatan}","${loc.kategoriRuang}","${loc.bangunan}","${loc.aras}","${loc.penjaga}","${loc.penjagaJawatan || ''}","${loc.penjagaEmel || ''}","${loc.penjagaTel || ''}",${loc.anggaranAset},"${loc.statusPemeriksaan}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Direktori_Lokasi_POLIKU_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Overview */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-sm space-y-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400 text-slate-950">
            <MapPin className="w-3.5 h-3.5 text-slate-950" />
            <span>Pendaftaran Lokasi & Makmal Berpemberitahuan Rasmi</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Direktori Lokasi & Bilik Aset POLIKU
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-5xl leading-relaxed">
            Daftar lengkap makmal komputer, bengkel kejuruteraan, bilik kuliah, pusat data pelayan, stor arkib, dan studio di Politeknik Kuching Sarawak. Memastikan setiap ruang mempunyai Pegawai Penjaga Ruang yang sah untuk pematuhan jadual pemeriksaan fizikal 100% (1PP AM 2.4).
          </p>
        </div>

        {/* Action Buttons at the Bottom for Optimal Compact Layout */}
        <div className="pt-1 flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenKewpa7Modal || handleOpenAdd}
            className="px-4.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow-xs border border-amber-300 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            <span>Daftar Lokasi Baru (KEW.PA-7 / AI)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold text-xs transition flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Muat Turun CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Jumlah Lokasi</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">{stats.total}</span>
            <span className="text-xs text-slate-500">ruang</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">12 Jabatan / Unit</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider block">Makmal Digital</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-sky-700 font-mono">{stats.makmal}</span>
            <span className="text-xs text-sky-600">makmal</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Komputer & Rangkaian</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Bengkel Teknikal</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-indigo-700 font-mono">{stats.bengkel}</span>
            <span className="text-xs text-indigo-600">bengkel</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Mekanikal, Awam & Kuasa</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Selesai Audit</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-emerald-700 font-mono">{stats.selesai}</span>
            <span className="text-xs text-emerald-600">ruang</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">
            {stats.total > 0 ? Math.round((stats.selesai / stats.total) * 100) : 0}% daripada sasaran
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Sedang Dijalankan</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-amber-700 font-mono">{stats.sedang}</span>
            <span className="text-xs text-amber-600">ruang</span>
          </div>
          <span className="text-[10px] text-amber-600 mt-1 block">Proses Fizikal Aktif</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">Jumlah Aset Di ruang</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-purple-700 font-mono">{stats.totalAset}</span>
            <span className="text-xs text-purple-600">unit</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Semua Kategori</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Search Keyword */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari kod ruang, nama makmal, penjaga, atau blok..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
            />
          </div>

          {/* Department Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-amber-400 focus:outline-none font-medium"
            >
              <option value="">Semua Jabatan ({DEPARTMENTS.length})</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.id} - {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Room Category Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedKategori}
              onChange={(e) => setSelectedKategori(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-amber-400 focus:outline-none font-medium"
            >
              <option value="">Semua Kategori Ruang</option>
              <option value="Makmal Komputer">Makmal Komputer</option>
              <option value="Bengkel Teknikal">Bengkel Teknikal</option>
              <option value="Bilik Kuliah">Bilik Kuliah</option>
              <option value="Bilik Pelayan">Bilik Pelayan / Server</option>
              <option value="Stor & Arkib">Stor & Arkib</option>
              <option value="Studio">Studio Multimedia</option>
              <option value="Pusat Sumber">Pusat Sumber / Arkib</option>
              <option value="Pejabat Pentadbiran">Pejabat Pentadbiran</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-amber-400 focus:outline-none font-medium"
            >
              <option value="">Semua Status</option>
              <option value="Selesai">Selesai</option>
              <option value="Sedang Dijalankan">Sedang Dijalankan</option>
              <option value="Belum Mula">Belum Mula</option>
            </select>
          </div>

        </div>

        {/* Active Filter Tags */}
        {(searchTerm || selectedDept || selectedKategori || selectedStatus) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] font-semibold text-slate-500">Penapis Aktif:</span>
            {selectedDept && (
              <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-mono text-[11px] flex items-center gap-1">
                Jabatan: {selectedDept}
                <button onClick={() => setSelectedDept('')} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedKategori && (
              <span className="bg-sky-50 text-sky-800 px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1 border border-sky-200">
                Kategori: {selectedKategori}
                <button onClick={() => setSelectedKategori('')} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedStatus && (
              <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1 border border-amber-200">
                Status: {selectedStatus}
                <button onClick={() => setSelectedStatus('')} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
              </span>
            )}
            {searchTerm && (
              <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1">
                Carian: &ldquo;{searchTerm}&rdquo;
                <button onClick={() => setSearchTerm('')} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDept('');
                setSelectedKategori('');
                setSelectedStatus('');
              }}
              className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold ml-2 underline"
            >
              Kosongkan Semua
            </button>
            <span className="text-[11px] text-slate-400 ml-auto font-mono">
              Memaparkan {filteredLocations.length} daripada {locations.length} rekod
            </span>
          </div>
        )}
      </div>

      {/* Main Table: Desktop UI Priority, SQUARE CORNERS (rounded-none border border-slate-200) */}
      <div className="w-full bg-white rounded-none border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-mono uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-12 text-center border-b border-slate-800">#</th>
                <th className="py-3 px-3 min-w-[130px] border-b border-slate-800">Kod Ruang</th>
                <th className="py-3 px-4 min-w-[240px] border-b border-slate-800">Nama Lokasi & Bangunan</th>
                <th className="py-3 px-3 min-w-[100px] border-b border-slate-800">Jabatan</th>
                <th className="py-3 px-3 min-w-[140px] border-b border-slate-800">Kategori Ruang</th>
                <th className="py-3 px-4 min-w-[220px] border-b border-slate-800">Pegawai Penjaga Ruang</th>
                <th className="py-3 px-3 min-w-[100px] text-center border-b border-slate-800">Bil. Aset</th>
                <th className="py-3 px-3 min-w-[150px] border-b border-slate-800">Status Pemeriksaan</th>
                <th className="py-3 px-4 min-w-[150px] text-center border-b border-slate-800">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredLocations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <MapPin className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600 text-sm">Tiada lokasi dijumpai.</p>
                    <p className="text-xs text-slate-400 mt-0.5">Sila semak semula kata kunci atau ubah penapis di atas.</p>
                  </td>
                </tr>
              ) : (
                filteredLocations.map((loc, idx) => {
                  const isSelesai = loc.statusPemeriksaan === 'Selesai';
                  const isSedang = loc.statusPemeriksaan === 'Sedang Dijalankan';

                  return (
                    <tr 
                      key={loc.id} 
                      className={`hover:bg-slate-50/80 transition group ${
                        idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                      }`}
                    >
                      {/* 1. Index */}
                      <td className="py-3.5 px-3 text-center text-slate-400 font-mono text-xs">
                        {idx + 1}
                      </td>

                      {/* 2. Room Code with quick copy */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-xs transition">
                            {loc.kodRuang}
                          </span>
                          <button
                            onClick={() => handleCopyCode(loc.kodRuang)}
                            title="Salin Kod Ruang"
                            className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition opacity-0 group-hover:opacity-100"
                          >
                            {copiedCode === loc.kodRuang ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 3. Name & Building */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {loc.nama}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <Building className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{loc.bangunan}</span>
                          <span className="text-slate-300">&bull;</span>
                          <span className="font-medium text-slate-600">{loc.aras}</span>
                          <button
                            type="button"
                            onClick={() => setPreviewGpsLocation(loc)}
                            className="ml-1 px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-mono font-bold flex items-center gap-1 transition cursor-pointer"
                            title="Lihat Peta GPS OpenStreetMap"
                          >
                            <MapPin className="w-3 h-3 text-amber-700" />
                            <span>GPS: {loc.latitude ? `${loc.latitude.toFixed(4)}, ${loc.longitude?.toFixed(4)}` : '1.6214, 110.3235'}</span>
                          </button>
                        </div>
                      </td>

                      {/* 4. Department */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono font-bold text-xs bg-slate-900 text-amber-300 px-2 py-0.5 rounded">
                          {loc.jabatan}
                        </span>
                      </td>

                      {/* 5. Room Category */}
                      <td className="py-3.5 px-3">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                          loc.kategoriRuang === 'Makmal Komputer'
                            ? 'bg-sky-50 text-sky-800 border border-sky-200'
                            : loc.kategoriRuang === 'Bengkel Teknikal'
                            ? 'bg-amber-50 text-amber-900 border border-amber-200'
                            : loc.kategoriRuang === 'Bilik Pelayan'
                            ? 'bg-purple-50 text-purple-900 border border-purple-200'
                            : loc.kategoriRuang === 'Studio'
                            ? 'bg-rose-50 text-rose-900 border border-rose-200'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          {loc.kategoriRuang}
                        </span>
                      </td>

                      {/* 6. Pegawai Bertanggungjawab */}
                      <td className="py-3.5 px-4">
                        {loc.pegawaiBertanggungjawabList && loc.pegawaiBertanggungjawabList.length > 0 ? (
                          <div className="space-y-1">
                            <div className="text-[10px] font-bold text-amber-800 uppercase font-mono flex items-center gap-1">
                              <Users className="w-3 h-3 text-amber-600" />
                              <span>{loc.pegawaiBertanggungjawabList.length} Pegawai Bertanggungjawab:</span>
                            </div>
                            {loc.pegawaiBertanggungjawabList.map((off, oidx) => (
                              <div key={oidx} className="flex items-center gap-1.5 text-xs text-slate-900 font-semibold">
                                <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{off.nama}</span>
                                {off.jawatan && <span className="text-[10px] text-slate-500 font-mono">({off.jawatan})</span>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5 text-xs">
                              <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{loc.penjaga}</span>
                            </div>
                            {loc.penjagaJawatan && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {loc.penjagaJawatan}
                              </div>
                            )}
                            {loc.penjagaEmel && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {loc.penjagaEmel}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 7. Assets Count */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono font-extrabold text-sm text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {loc.anggaranAset}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">unit aset</span>
                      </td>

                      {/* 8. Inspection Status */}
                      <td className="py-3.5 px-3">
                        {isSelesai ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Selesai</span>
                            </span>
                            {loc.tarikhTerakhirDiperiksa && (
                              <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                                {loc.tarikhTerakhirDiperiksa}
                              </span>
                            )}
                          </div>
                        ) : isSedang ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                            <span>Sedang Berjalan</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                            <span>Belum Mula</span>
                          </span>
                        )}
                      </td>

                      {/* 9. Action Buttons */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {onOpenKewpa7Modal && (
                            <button
                              onClick={onOpenKewpa7Modal}
                              title="Kemaskini KEW.PA-7 / Senarai Pegawai Bertanggungjawab"
                              className="p-1.5 rounded-lg text-teal-700 hover:bg-teal-50 transition border border-transparent hover:border-teal-200 flex items-center gap-1 text-[11px] font-semibold"
                            >
                              <FileText className="w-3.5 h-3.5 text-teal-600" />
                              <span className="hidden xl:inline">KEW.PA-7</span>
                            </button>
                          )}

                          {loc.jadualId && onNavigateToSchedule && (
                            <button
                              onClick={() => onNavigateToSchedule(loc.jadualId)}
                              title="Buka Rekod Jadual Pemeriksaan"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-sky-50 transition border border-transparent hover:border-sky-200"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenEdit(loc)}
                            title="Kemaskini Maklumat Lokasi"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition border border-transparent hover:border-amber-200"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Adakah anda pasti ingin memadam rekod lokasi "${loc.nama}" (${loc.kodRuang})?`)) {
                                onDeleteLocation(loc.id);
                              }
                            }}
                            title="Padam Rekod Lokasi"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="bg-slate-50 p-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 font-mono">
          <span>Pematuhan 1PP AM 2.4 Para 24 &bull; Borang KEW.PA-7 Wajib Dipamerkan di Pintu Masuk Setiap Ruang</span>
          <span>Jumlah Aset Berdaftar: <strong className="text-slate-800">{stats.totalAset} Unit</strong></span>
        </div>
      </div>

      {/* Add / Edit Location Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    {editingLocation ? 'Kemaskini Maklumat Lokasi' : 'Daftar Lokasi Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-300">Pendaftaran Makmal, Bengkel atau Ruang Aset POLIKU</p>
                </div>
              </div>

              <button
                onClick={() => setShowAddEditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              
              {/* Integrated KEW.PA-7 Upload & Auto-Extract Component */}
              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-xs">Muat Naik Borang KEW.PA-7 (Auto-Extract AI)</span>
                  </div>
                  <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-bold font-mono">
                    1PP AM 2.4
                  </span>
                </div>

                {extractSuccessMsg && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-600/60 text-emerald-200 text-[11px] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{extractSuccessMsg}</span>
                  </div>
                )}

                {isExtractingKewpa7 ? (
                  <div className="py-4 text-center space-y-2">
                    <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
                    <p className="text-xs text-slate-300 font-mono">
                      Mengekstrak data KEW.PA-7 ({extractProgress}%)...
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <label className="flex-1 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs cursor-pointer transition flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span>Pilih Fail PDF KEW.PA-7</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleProcessKewpa7File(e.target.files[0]);
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleUseSampleKewpa7Pdf}
                      className="px-3 py-2 rounded-lg bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Uji Fail Contoh</span>
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 leading-tight">
                  Memuat naik fail KEW.PA-7 akan mengisi nama lokasi, kod ruang, pegawai bertanggungjawab, dan jumlah aset secara automatik ke dalam ruangan input di bawah.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kod Ruang Rasmi *</label>
                  <input
                    type="text"
                    required
                    value={formData.kodRuang || ''}
                    onChange={(e) => setFormData({ ...formData, kodRuang: e.target.value })}
                    placeholder="cth: MAK-JTMK-03, BKG-JKM-05"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Format: KATEGORI-JABATAN-NO</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jabatan Pemilik *</label>
                  <select
                    value={formData.jabatan || 'JTMK'}
                    onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none font-medium"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.id} - {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lokasi / Makmal / Ruang *</label>
                <input
                  type="text"
                  required
                  value={formData.nama || ''}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="cth: Makmal Kecerdasan Buatan & Pengkomputeran Awan"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori Ruang</label>
                  <select
                    value={formData.kategoriRuang || 'Makmal Komputer'}
                    onChange={(e) => setFormData({ ...formData, kategoriRuang: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Makmal Komputer">Makmal Komputer</option>
                    <option value="Bengkel Teknikal">Bengkel Teknikal</option>
                    <option value="Bilik Kuliah">Bilik Kuliah</option>
                    <option value="Bilik Pelayan">Bilik Pelayan</option>
                    <option value="Stor & Arkib">Stor & Arkib</option>
                    <option value="Studio">Studio</option>
                    <option value="Pusat Sumber">Pusat Sumber</option>
                    <option value="Pejabat Pentadbiran">Pejabat Pentadbiran</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bangunan / Blok</label>
                  <input
                    type="text"
                    value={formData.bangunan || ''}
                    onChange={(e) => setFormData({ ...formData, bangunan: e.target.value })}
                    placeholder="cth: Blok E (ICT), Blok C"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Aras / Tingkat</label>
                  <input
                    type="text"
                    value={formData.aras || ''}
                    onChange={(e) => setFormData({ ...formData, aras: e.target.value })}
                    placeholder="cth: Aras 2, Aras Bawah"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 mb-2">Maklumat Pegawai Penjaga Ruang</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Pegawai Penjaga *</label>
                    <input
                      type="text"
                      required
                      value={formData.penjaga || ''}
                      onChange={(e) => setFormData({ ...formData, penjaga: e.target.value })}
                      placeholder="cth: En. Mohd Faiz Bin Azmi"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jawatan & Gred</label>
                    <input
                      type="text"
                      value={formData.penjagaJawatan || ''}
                      onChange={(e) => setFormData({ ...formData, penjagaJawatan: e.target.value })}
                      placeholder="cth: Penolong Pegawai TM (FA29)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Emel Rasmi Pegawai</label>
                    <input
                      type="email"
                      value={formData.penjagaEmel || ''}
                      onChange={(e) => setFormData({ ...formData, penjagaEmel: e.target.value })}
                      placeholder="faiz@poliku.edu.my"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">No. Telefon / Sambungan</label>
                    <input
                      type="text"
                      value={formData.penjagaTel || ''}
                      onChange={(e) => setFormData({ ...formData, penjagaTel: e.target.value })}
                      placeholder="082-845510 Ext 124"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Anggaran Bilangan Aset</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.anggaranAset || 30}
                    onChange={(e) => setFormData({ ...formData, anggaranAset: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status Pemeriksaan Fizikal</label>
                  <select
                    value={formData.statusPemeriksaan || 'Belum Mula'}
                    onChange={(e) => setFormData({ ...formData, statusPemeriksaan: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Belum Mula">Belum Mula</option>
                    <option value="Sedang Dijalankan">Sedang Dijalankan</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>

              {/* Pemetaan GPS & OpenStreetMap (Interactive Leaflet Map) */}
              <div className="pt-3 border-t border-slate-200">
                <GpsMapPicker
                  lat={formData.latitude || 1.621425}
                  lng={formData.longitude || 110.323580}
                  locationName={formData.nama || 'Lokasi Makmal / Bengkel POLIKU'}
                  onChangeGps={(newLat, newLng) => {
                    setFormData((prev) => ({
                      ...prev,
                      latitude: newLat,
                      longitude: newLng,
                    }));
                  }}
                  readOnly={false}
                  height="220px"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold transition shadow-xs"
                >
                  {editingLocation ? 'Simpan Perubahan' : 'Daftar Lokasi'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* GPS Location Map Preview Modal */}
      {previewGpsLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">{previewGpsLocation.nama}</h3>
                  <p className="text-[11px] text-slate-300 font-mono">
                    Kod Ruang: {previewGpsLocation.kodRuang} &bull; {previewGpsLocation.bangunan} ({previewGpsLocation.aras})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewGpsLocation(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <GpsMapPicker
                lat={previewGpsLocation.latitude || 1.621425}
                lng={previewGpsLocation.longitude || 110.323580}
                locationName={previewGpsLocation.nama}
                readOnly={true}
                height="340px"
              />

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <span className="text-slate-500 font-mono">
                  Pegawai Penjaga: <strong className="text-slate-800">{previewGpsLocation.penjaga}</strong>
                </span>
                <button
                  onClick={() => setPreviewGpsLocation(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
                >
                  Tutup Peta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
