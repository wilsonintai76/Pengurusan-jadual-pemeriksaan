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
  FileSpreadsheet,
  Upload,
  RefreshCw,
  Table as TableIcon,
  Map as MapIcon,
  Compass
} from 'lucide-react';
import { LocationInfo, PegawaiBertanggungjawab, RoleAssignment, UserSession } from '@/lib/types';
import { useDepartments, useOfficers } from '@/lib/useReferenceData';
import { deriveManageScope, canManageLocation } from '@/lib/manageScope';
import { deriveKategoriRuang, parseKodLokasi } from '@/lib/kodLokasi';
import { assetCsvFileName, buildAssetCsv, downloadCsv } from '@/lib/assetCsv';
import { formatTarikhMY } from '@/lib/tarikh';
import { dataApi } from '@/lib/dataApi';
import type { AssetPayload } from '@/lib/dataApi';
import { KEWPA7_EXTRACT_URL } from '@/lib/apiConfig';
import { authHeaders } from '@/lib/authClient';
import GpsMapPicker from './GpsMapPicker';
import DirektoriLokasiMapView from './DirektoriLokasiMapView';

interface DirektoriLokasiSectionProps {
  locations: LocationInfo[];
  currentUser: UserSession | null;
  myAssignments?: RoleAssignment[];
  onAddLocation: (newLocation: LocationInfo, assets?: AssetPayload[]) => void;
  onUpdateLocation: (updatedLocation: LocationInfo, assets?: AssetPayload[]) => void;
  onDeleteLocation: (id: string) => void;
  onNavigateToSchedule?: (jadualId?: string) => void;
  onOpenKewpa7Modal?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  initialDeptFilter?: string;
  /** Lompat ke halaman Aset Belum Diperiksa (pilihan: tapis kepada satu ruang). */
  onNavigateToBelumPeriksa?: (locationId?: string) => void;
  /** Bilangan aset belum ditanda status A–F, mengikut locationId. */
  belumPeriksaPerLokasi?: Record<string, number>;
}

export default function DirektoriLokasiSection({
  locations,
  currentUser,
  myAssignments = [],
  onAddLocation,
  onUpdateLocation,
  onDeleteLocation,
  onNavigateToSchedule,
  onOpenKewpa7Modal,
  onShowToast,
  initialDeptFilter = '',
  onNavigateToBelumPeriksa,
  belumPeriksaPerLokasi = {},
}: DirektoriLokasiSectionProps) {
  const departments = useDepartments();
  const officers = useOfficers();
  const manageScope = useMemo(() => deriveManageScope(myAssignments), [myAssignments]);
  // Skop jabatan (bukan semestinya jabatan sendiri) membenarkan pendaftaran ruang baharu;
  // jabatan sasaran tetap disemak oleh Worker.
  const canRegisterLocation = manageScope.isAdmin || manageScope.departmentIds.length > 0;
  const canEditLocation = (loc: LocationInfo) => canManageLocation(manageScope, loc);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState(initialDeptFilter);
  const [selectedKategori, setSelectedKategori] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [highlightMapLocationId, setHighlightMapLocationId] = useState<string | undefined>(undefined);

  // Modal states
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationInfo | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [downloadingCsvId, setDownloadingCsvId] = useState<string | null>(null);
  /** Bilangan aset belum diperiksa per lokasi (aset tanpa status A–F). */
  const belumPeriksaCount = belumPeriksaPerLokasi;
  const [previewGpsLocation, setPreviewGpsLocation] = useState<LocationInfo | null>(null);

  // KEW.PA-7 Extraction state inside modal
  const [isExtractingKewpa7, setIsExtractingKewpa7] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [extractSuccessMsg, setExtractSuccessMsg] = useState<string | null>(null);
  const [extractDiagnostic, setExtractDiagnostic] = useState<{
    missing: string[];
    preview: string;
  } | null>(null);
  const [extractedAssets, setExtractedAssets] = useState<
    Array<{ noSiriPendaftaran: string; keteranganAset: string; statusFizikal: string }>
  >([]);
  const [dragActive, setDragActive] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<LocationInfo>>({
    kodRuang: '',
    nama: '',
    jabatan: 'JTMK',
    bangunan: '',
    aras: '',
    pegawaiBertanggungjawabList: [],
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

      const res = await fetch(KEWPA7_EXTRACT_URL, {
        method: 'POST',
        headers: { ...authHeaders() },
        body,
      });

      clearInterval(interval);
      setExtractProgress(100);

      if (res.status === 401) {
        throw new Error('Sesi tamat. Sila log masuk semula sebelum memuat naik KEW.PA-7.');
      }

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
                         currentUser?.dept || '';

        const segments = parseKodLokasi(d.kodLokasi || '');
        const extractedOfficers: PegawaiBertanggungjawab[] = Array.isArray(d.pegawaiBertanggungjawabList)
          ? d.pegawaiBertanggungjawabList
          : [];
        const matchedOfficers = extractedOfficers
          .map((extracted) =>
            officers.find(
              (dir) => dir.name.trim().toLowerCase() === String(extracted.nama ?? '').trim().toLowerCase()
            )
          )
          .filter((officer): officer is UserSession => Boolean(officer));

        setFormData((prev) => ({
          ...prev,
          nama: d.lokasi || '',
          kodRuang: d.kodLokasi || segments.kodRuang,
          bangunan: segments.bangunan || prev.bangunan || '',
          aras: segments.aras || prev.aras || '',
          jabatan: mappedDept,
          kategoriRuang: deriveKategoriRuang(d.lokasi || '') as LocationInfo['kategoriRuang'],
          pegawaiBertanggungjawabList: matchedOfficers.map((officer) => ({
            id: officer.id || officer.email,
            nama: officer.name,
            jawatan: officer.role,
            emel: officer.email,
            tel: officer.phone,
          })),
          penjaga: matchedOfficers[0]?.name || '',
          penjagaJawatan: matchedOfficers[0]?.role || '',
          penjagaEmel: matchedOfficers[0]?.email || '',
          penjagaTel: matchedOfficers[0]?.phone || '',
        }));

        setExtractSuccessMsg(
          `Data borang KEW.PA-7 bagi "${d.lokasi || 'lokasi ini'}" berjaya diekstrak${
            matchedOfficers.length
              ? '!'
              : '. Pegawai Bertanggungjawab perlu dipilih daripada Direktori Pegawai.'
          }`
        );

        setExtractDiagnostic(
          Array.isArray(json.missingFields) && json.missingFields.length && json.textPreview
            ? { missing: json.missingFields, preview: json.textPreview }
            : null
        );

        // Aset diekstrak disimpan bersama lokasi supaya muat naik semula menimpa senarai lama.
        setExtractedAssets(
          (Array.isArray(d.senaraiAset) ? d.senaraiAset : []).map(
            (asset: { noSiriPendaftaran?: string; keteranganAset?: string; statusFizikal?: string }) => ({
              noSiriPendaftaran: String(asset.noSiriPendaftaran ?? ''),
              keteranganAset: String(asset.keteranganAset ?? ''),
              statusFizikal: String(asset.statusFizikal ?? 'Baik'),
            })
          )
        );
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

  const getDeptDefaultCoords = (dept: string) => {
    switch (dept) {
      case 'JTMK': return { lat: 1.621810, lng: 110.324100 };
      case 'JKM': return { lat: 1.621425, lng: 110.323580 };
      case 'JKE': return { lat: 1.621050, lng: 110.322900 };
      case 'JKA': return { lat: 1.620800, lng: 110.324500 };
      case 'JP': return { lat: 1.622100, lng: 110.323800 };
      case 'JMSK': return { lat: 1.621650, lng: 110.322300 };
      case 'PENTADBIRAN': return { lat: 1.622500, lng: 110.323000 };
      case 'PSA': return { lat: 1.622350, lng: 110.324400 };
      case 'CISEC': return { lat: 1.622700, lng: 110.323900 };
      case 'ULPL': return { lat: 1.622600, lng: 110.322600 };
      case 'HAL EHWAL PELAJAR': return { lat: 1.621200, lng: 110.324800 };
      default: return { lat: 1.621425, lng: 110.323580 };
    }
  };

  const handleOpenAdd = () => {
    if (!canRegisterLocation) {
      onShowToast?.(
        'Akses ditolak: hanya pentadbir sistem atau pegawai dengan skop jabatan/unit boleh mendaftar lokasi baharu.',
        'error'
      );
      return;
    }
    setEditingLocation(null);
    const defaultCoords = getDeptDefaultCoords(currentUser?.dept || 'JTMK');
    setFormData({
      kodRuang: '',
      nama: '',
      jabatan: currentUser?.dept || 'JTMK',
      bangunan: '',
      aras: '',
      pegawaiBertanggungjawabList: [],
      latitude: defaultCoords.lat,
      longitude: defaultCoords.lng,
    });
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (loc: LocationInfo) => {
    if (!canEditLocation(loc)) {
      onShowToast?.(
        `Akses ditolak: anda bukan Penyelia Lokasi bagi ${loc.nama} dan tiada skop jabatan ${loc.jabatan}.`,
        'error'
      );
      return;
    }
    setEditingLocation(loc);
    setFormData({ ...loc });
    setShowAddEditModal(true);
  };

  const handleViewOnMap = (loc: LocationInfo) => {
    setHighlightMapLocationId(loc.id);
    setViewMode('map');
  };

  /**
   * KEW.PA-7 pada jadual lokasi = muat turun CSV senarai aset (no. siri pendaftaran).
   * Pemeriksa menggunakan fail ini untuk Daftar Pemeriksaan dalam Sistem Pengurusan Aset Alih.
   */
  const handleDownloadKewpa7Csv = async (loc: LocationInfo) => {
    if (downloadingCsvId) return;
    setDownloadingCsvId(loc.id);

    try {
      const { data } = await dataApi.locations.assets(loc.id);

      if (!data.length) {
        onShowToast?.(
          `Tiada aset berdaftar bagi ${loc.nama}. Muat naik KEW.PA-7 dahulu untuk mengisi senarai aset.`,
          'info'
        );
        return;
      }

      const csv = buildAssetCsv(
        data.map((asset, index) => ({
          bil: index + 1,
          noSiriPendaftaran: asset.noSiriPendaftaran,
          keterangan: asset.keterangan,
        }))
      );

      downloadCsv(assetCsvFileName(loc.nama, loc.kodRuang), csv);
      onShowToast?.(`CSV KEW.PA-7 bagi ${loc.nama} dimuat turun (${data.length} aset).`, 'success');
    } catch (error) {
      onShowToast?.(`Gagal memuat turun CSV: ${(error as Error).message}`, 'error');
    } finally {
      setDownloadingCsvId(null);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kodRuang || !formData.nama || !formData.bangunan || !formData.aras) {
      alert('Sila lengkapkan Kod Ruang, Nama Lokasi, Bangunan/Blok dan Aras/Tingkat.');
      return;
    }

    const custodian = formData.pegawaiBertanggungjawabList?.[0];
    // Pegawai penjaga sentiasa diterbitkan daripada Direktori Pegawai, bukan teks bebas.
    const officerFields = {
      penjaga: custodian?.nama || '',
      penjagaJawatan: custodian?.jawatan || '',
      penjagaEmel: custodian?.emel || '',
      penjagaTel: custodian?.tel || '',
      pegawaiBertanggungjawabList: custodian ? [custodian] : [],
    };

    if (editingLocation) {
      const updated: LocationInfo = {
        ...editingLocation,
        ...(formData as LocationInfo),
        ...officerFields,
        kategoriRuang: deriveKategoriRuang(formData.nama) as LocationInfo['kategoriRuang'],
        latitude: formData.latitude || editingLocation.latitude || 1.621425,
        longitude: formData.longitude || editingLocation.longitude || 110.323580,
      };
      onUpdateLocation(updated, extractedAssets);
    } else {
      const newLoc: LocationInfo = {
        id: `LOK-${(locations.length + 1).toString().padStart(3, '0')}`,
        kodRuang: formData.kodRuang,
        nama: formData.nama,
        jabatan: formData.jabatan || 'JTMK',
        kategoriRuang: deriveKategoriRuang(formData.nama) as LocationInfo['kategoriRuang'],
        bangunan: formData.bangunan,
        aras: formData.aras,
        ...officerFields,
        // Bilangan aset diambil daripada KEW.PA-7 (jadual assets), bukan daripada borang ini.
        anggaranAset: 0,
        statusPemeriksaan: 'Belum Mula',
        latitude: formData.latitude || 1.621425,
        longitude: formData.longitude || 110.323580,
      };
      onAddLocation(newLoc, extractedAssets);
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

        {/* Action Buttons & View Mode Toggle */}
        <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenKewpa7Modal || handleOpenAdd}
              disabled={!canRegisterLocation}
              title={
                canRegisterLocation
                  ? 'Daftar lokasi baharu daripada KEW.PA-7'
                  : 'Hanya pentadbir sistem atau pegawai dengan skop jabatan/unit boleh mendaftar lokasi baharu'
              }
              className="px-4.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow-xs border border-amber-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amber-400"
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

          {/* Toggle between List View and Map View */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-700/80 shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>Paparan Senarai</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                viewMode === 'map'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span>Paparan Peta Visual</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-teal-600 text-white rounded font-mono font-extrabold uppercase">
                OSM
              </span>
            </button>
          </div>
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
              <option value="">Semua Jabatan ({departments.length})</option>
              {departments.map((dept) => (
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

      {/* View Mode Switcher Sub-bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-slate-700">Pilihan Paparan:</span>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 text-slate-600" />
              <span>Senarai Jadual ({filteredLocations.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'map'
                  ? 'bg-amber-400 text-slate-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5 text-amber-800" />
              <span>Peta Visual Interaktif</span>
              <span className="text-[10px] bg-slate-900 text-amber-300 font-mono px-1.5 py-0.2 rounded font-bold">
                {filteredLocations.length} Pin
              </span>
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
          {viewMode === 'map' ? (
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Peta OpenStreetMap Aktif &bull; Klik pin atau gunakan &apos;Papar Lokasi Saya&apos;</span>
            </span>
          ) : (
            <span className="text-slate-400">
              Pematuhan 1PP AM 2.4 Para 24 (Senarai Inventori Fizikal)
            </span>
          )}
        </div>
      </div>

      {/* Conditional: Interactive Map View vs Table List View */}
      {viewMode === 'map' ? (
        <DirektoriLokasiMapView
          locations={filteredLocations}
          onEditLocation={handleOpenEdit}
          onNavigateToSchedule={onNavigateToSchedule}
          highlightLocationId={highlightMapLocationId}
        />
      ) : (
        /* Main Table: Desktop UI Priority, SQUARE CORNERS */
        <div className="w-full bg-white rounded-none border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-mono uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 w-12 text-center border-b border-slate-800">#</th>
                  <th className="py-3 px-3 min-w-[130px] border-b border-slate-800">Kod Lokasi</th>
                  <th className="py-3 px-4 min-w-[240px] border-b border-slate-800">Nama Lokasi & Bangunan</th>
                  <th className="py-3 px-3 min-w-[100px] border-b border-slate-800">Jabatan</th>
                  <th className="py-3 px-4 min-w-[220px] border-b border-slate-800">Penyelia Lokasi</th>
                  <th className="py-3 px-3 min-w-[100px] text-center border-b border-slate-800">Bil. Aset</th>
                  <th className="py-3 px-3 min-w-[110px] text-center border-b border-slate-800">Belum Periksa</th>
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

                        {/* 2. Kod Lokasi KEW.PA-7 with quick copy */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-[11px] leading-snug transition">
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

                        {/* 3. Name & Building — klik untuk lihat lokasi pada peta */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleViewOnMap(loc)}
                            title="Lihat lokasi pada peta"
                            className="group text-left cursor-pointer"
                          >
                            <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 group-hover:text-amber-700 group-hover:underline">
                              <span>{loc.nama}</span>
                              <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                              <Building className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="group-hover:text-slate-700">{loc.bangunan}</span>
                              <span className="text-slate-300">&bull;</span>
                              <span className="font-medium text-slate-600">{loc.aras}</span>
                            </div>
                          </button>
                        </td>

                        {/* 4. Department */}
                        <td className="py-3.5 px-3">
                          <span className="font-mono font-bold text-xs bg-slate-900 text-amber-300 px-2 py-0.5 rounded">
                            {loc.jabatan}
                          </span>
                        </td>

                        {/* 5. Pegawai Bertanggungjawab */}
                        <td className="py-3.5 px-4">
                          {loc.pegawaiBertanggungjawabList && loc.pegawaiBertanggungjawabList.length > 0 ? (
                            <div className="space-y-1.5">
                              {loc.pegawaiBertanggungjawabList.map((off, oidx) => (
                                <div key={oidx} className="leading-tight">
                                  <div className="flex items-center gap-1.5 text-xs text-slate-900 font-semibold">
                                    <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>{off.nama}</span>
                                  </div>
                                  {off.tel && (
                                    <div className="ml-[18px] text-[10px] text-slate-500 font-mono">
                                      {off.tel}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div>
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5 text-xs">
                                <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{loc.penjaga}</span>
                              </div>
                              {loc.penjagaTel && (
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  {loc.penjagaTel}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 7. Assets Count + muat turun KEW.PA-7 (ikon sahaja) */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="font-mono font-extrabold text-sm text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                            {loc.anggaranAset}
                          </span>
                          <span className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mt-0.5">
                            <span>unit aset</span>
                            <button
                              onClick={() => void handleDownloadKewpa7Csv(loc)}
                              disabled={downloadingCsvId === loc.id}
                              title="Muat turun senarai aset & no. siri pendaftaran KEW.PA-7 (CSV) untuk Daftar Pemeriksaan"
                              className="p-1 rounded-md text-teal-700 hover:bg-teal-50 transition border border-transparent hover:border-teal-200 disabled:opacity-50"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                            </button>
                          </span>
                        </td>

                        {/* 8. Belum Diperiksa (daripada eksport SPA) */}
                        <td className="py-3.5 px-3 text-center">
                          {(() => {
                            const bilangan = belumPeriksaCount[loc.id] ?? 0;
                            if (!bilangan) {
                              return <span className="font-mono text-xs text-slate-300">—</span>;
                            }
                            return (
                              <button
                                type="button"
                                onClick={() => onNavigateToBelumPeriksa?.(loc.id)}
                                title={`${bilangan} aset belum diperiksa — buka senarai`}
                                className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-xs font-extrabold text-amber-900 transition hover:bg-amber-100"
                              >
                                {bilangan}
                              </button>
                            );
                          })()}
                        </td>

                        {/* 9. Inspection Status */}
                        <td className="py-3.5 px-3">
                          {isSelesai ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Selesai</span>
                              </span>
                              {loc.tarikhTerakhirDiperiksa && (
                                <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                                  {formatTarikhMY(loc.tarikhTerakhirDiperiksa)}
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
                            {loc.jadualId && onNavigateToSchedule && (
                              <button
                                onClick={() => onNavigateToSchedule(loc.jadualId)}
                                title="Buka Rekod Jadual Pemeriksaan"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-sky-50 transition border border-transparent hover:border-sky-200"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            )}

                            {canEditLocation(loc) && (
                              <button
                                onClick={() => handleOpenEdit(loc)}
                                title="Kemaskini Maklumat Lokasi"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition border border-transparent hover:border-amber-200"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}

                            {manageScope.isAdmin && (
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
                            )}
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
      )}

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

                {extractDiagnostic && (
                  <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-600/60 text-rose-200 text-[11px] space-y-1.5">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>
                        Medan tidak dapat dihurai: <strong>{extractDiagnostic.missing.join(', ')}</strong>.
                        Sila isi secara manual.
                      </span>
                    </div>
                    <details className="bg-slate-950/60 rounded border border-rose-700/50">
                      <summary className="px-2 py-1 cursor-pointer font-semibold text-rose-200">
                        Teks PDF dikesan
                      </summary>
                      <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words px-2 py-1 font-mono text-[10px] text-slate-300">
                        {extractDiagnostic.preview}
                      </pre>
                    </details>
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
                  <label className="block font-semibold text-slate-700 mb-1">Kod Lokasi KEW.PA-7 *</label>
                  <input
                    type="text"
                    required
                    value={formData.kodRuang || ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const segments = parseKodLokasi(raw);
                      setFormData((prev) =>
                        raw.includes('/')
                          ? {
                              ...prev,
                              kodRuang: raw,
                              bangunan: segments.bangunan || prev.bangunan,
                              aras: segments.aras || prev.aras,
                            }
                          : { ...prev, kodRuang: raw }
                      );
                    }}
                    placeholder="130101 / BGN / JKM1 / 01 / B09"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Segmen: kod ruang / kategori / bangunan / aras / bilik. Bangunan &amp; Aras diisi automatik.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jabatan Pemilik *</label>
                  <select
                    value={formData.jabatan || 'JTMK'}
                    onChange={(e) => {
                      const newDept = e.target.value;
                      const newCoords = getDeptDefaultCoords(newDept);
                      setFormData((prev) => ({
                        ...prev,
                        jabatan: newDept,
                        latitude: editingLocation ? prev.latitude : newCoords.lat,
                        longitude: editingLocation ? prev.longitude : newCoords.lng,
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none font-medium"
                  >
                    {departments.map((dept) => (
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bangunan / Blok *</label>
                  <input
                    type="text"
                    required
                    value={formData.bangunan || ''}
                    onChange={(e) => setFormData({ ...formData, bangunan: e.target.value })}
                    placeholder="cth: JKM1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Aras / Tingkat *</label>
                  <input
                    type="text"
                    required
                    value={formData.aras || ''}
                    onChange={(e) => setFormData({ ...formData, aras: e.target.value })}
                    placeholder="cth: Aras 1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Kategori ruang dijajarkan automatik daripada nama ruang.
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 mb-2">Maklumat Pegawai Penjaga Ruang</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pegawai Penjaga</label>
                    <select
                      value={
                        officers.find(
                          (item) =>
                            (item.id && item.id === formData.pegawaiBertanggungjawabList?.[0]?.id) ||
                            item.name === formData.pegawaiBertanggungjawabList?.[0]?.nama
                        )?.id || ''
                      }
                      onChange={(e) => {
                        const officer = officers.find((item) => item.id === e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          pegawaiBertanggungjawabList: officer
                            ? [
                                {
                                  id: officer.id || officer.email,
                                  nama: officer.name,
                                  jawatan: officer.role,
                                  emel: officer.email,
                                  tel: officer.phone,
                                },
                              ]
                            : [],
                        }));
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none bg-white font-medium"
                    >
                      <option value="">— Belum Dilantik (boleh kosong) —</option>
                      {officers.map((officer) => (
                        <option key={officer.id || officer.email} value={officer.id || ''}>
                          {officer.name}
                          {officer.role ? ` — ${officer.role}` : ''}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Diambil daripada Direktori Pegawai (jabatan &amp; peranan diselaraskan di sana).
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jawatan</label>
                    <input
                      type="text"
                      readOnly
                      value={formData.pegawaiBertanggungjawabList?.[0]?.jawatan || ''}
                      placeholder="Diisi automatik daripada direktori"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Emel Rasmi Pegawai</label>
                    <input
                      type="text"
                      readOnly
                      value={formData.pegawaiBertanggungjawabList?.[0]?.emel || ''}
                      placeholder="Diisi automatik daripada direktori"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">No. Telefon</label>
                    <input
                      type="text"
                      readOnly
                      value={formData.pegawaiBertanggungjawabList?.[0]?.tel || ''}
                      placeholder="Diisi automatik daripada direktori"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                  <Layers className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Bilangan aset:</strong> {editingLocation?.anggaranAset ?? 0} unit — diambil terus
                    daripada senarai aset KEW.PA-7. <strong>Status pemeriksaan</strong> ditetapkan oleh jadual
                    pemeriksaan, bukan di sini.
                  </span>
                </div>
              </div>

              {/* Pemetaan GPS & OpenStreetMap (Interactive Leaflet Map) */}
              <div className="pt-3 border-t border-slate-200 space-y-2.5">
                <div className="bg-slate-900 text-white p-3 rounded-xl flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <h4 className="font-bold text-xs text-white">Penetapan Lokasi GPS (OpenStreetMap)</h4>
                      <p className="text-[10px] text-slate-300">
                        Klik pada peta, tarik pin, atau gunakan GPS peranti untuk tetapkan koordinat tepat ruang ini.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded font-mono">
                    Wajib &bull; GPS
                  </span>
                </div>

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
                  height="230px"
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
