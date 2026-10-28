'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Database, 
  Building, 
  UserCheck, 
  Calendar, 
  Layers,
  ArrowRight,
  RefreshCw,
  Copy,
  Users
} from 'lucide-react';
import { UserSession, Kewpa7Record, Kewpa7AssetItem, LocationInfo, PegawaiBertanggungjawab } from '@/lib/types';
import { DEPARTMENTS } from '@/lib/initialData';

interface Kewpa7UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession | null;
  onSaveKewpa7Record: (record: Kewpa7Record, createdLocation?: LocationInfo) => void;
  initialRecord?: Kewpa7Record | null;
}

export default function Kewpa7UploadModal({
  isOpen,
  onClose,
  currentUser,
  onSaveKewpa7Record,
  initialRecord,
}: Kewpa7UploadModalProps) {
  const [step, setStep] = useState<'upload' | 'extracting' | 'review'>(
    initialRecord ? 'review' : 'upload'
  );
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractProgress, setExtractProgress] = useState(0);
  const [selectedDeptCode, setSelectedDeptCode] = useState<string>('JKM');

  // Extracted Data State
  const [formData, setFormData] = useState<Partial<Kewpa7Record>>(
    initialRecord || {
      bahagian: 'JABATAN KEJURUTERAAN MEKANIKAL',
      lokasi: 'BENGKEL HI-TECH',
      kodLokasi: '130101 / BGN / JKM1 / 01 / B09',
      pegawaiBertanggungjawabList: [
        { id: 'OFF-1', nama: 'Wilson Bin Intai', jawatan: 'PPPT' },
        { id: 'OFF-2', nama: 'HO YOONG CHOW', jawatan: 'PPPT' },
        { id: 'OFF-3', nama: 'MOHD SHAFIQ BIN MOHAMAD RADZUAN', jawatan: 'PPPT' },
      ],
      senaraiAset: [],
    }
  );

  if (!isOpen) return null;

  const handleStartManualMode = () => {
    setFormData({
      bahagian: 'JABATAN KEJURUTERAAN MEKANIKAL',
      lokasi: 'BENGKEL & MAKMAL BARU',
      kodLokasi: '130101 / BGN / JKM / 01 / B10',
      pegawaiBertanggungjawabList: [
        { id: 'OFF-1', nama: currentUser?.name || 'En. Pegawai Penjaga', jawatan: currentUser?.grade || 'Penolong Pegawai Aset' }
      ],
      senaraiAset: [
        {
          id: 'AST-001',
          bil: 1,
          noSiriPendaftaran: 'KKM/POLIKU/JKM/H/26/001',
          keteranganAset: 'Mesin Pemotongan CNC High-Speed Laser',
          tarikhPenempatan: new Date().toISOString().slice(0, 10),
          statusFizikal: 'Baik'
        }
      ]
    });
    setStep('review');
  };

  // Process File Upload via API
  const handleProcessFile = async (file: File) => {
    setSelectedFile(file);
    setStep('extracting');
    setExtractProgress(20);

    const interval = setInterval(() => {
      setExtractProgress((prev) => (prev < 85 ? prev + 15 : prev));
    }, 300);

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
        setFormData({
          bahagian: d.bahagian || 'JABATAN KEJURUTERAAN MEKANIKAL',
          lokasi: d.lokasi || 'BENGKEL HI-TECH',
          kodLokasi: d.kodLokasi || '130101 / BGN / JKM1 / 01 / B09',
          pegawaiBertanggungjawabList: d.pegawaiBertanggungjawabList || [
            { id: 'OFF-1', nama: 'Wilson Bin Intai', jawatan: 'PPPT' },
            { id: 'OFF-2', nama: 'HO YOONG CHOW', jawatan: 'PPPT' },
            { id: 'OFF-3', nama: 'MOHD SHAFIQ BIN MOHAMAD RADZUAN', jawatan: 'PPPT' },
          ],
          senaraiAset: d.senaraiAset || [],
        });
        setTimeout(() => setStep('review'), 400);
      } else {
        alert('Ralat semasa mengekstrak fail. Format tidak disokong.');
        setStep('upload');
      }
    } catch (err) {
      clearInterval(interval);
      console.error(err);
      alert('Gagal mengekstrak data daripada borang KEW.PA-7.');
      setStep('upload');
    }
  };

  const handleUseSamplePdf = async () => {
    const dummyFile = new File(['sample'], 'kewpa7-hitech_ebf7f58f.pdf', { type: 'application/pdf' });
    handleProcessFile(dummyFile);
  };

  // Manage Responsible Officers
  const handleAddOfficer = () => {
    const currentList = formData.pegawaiBertanggungjawabList || [];
    const newOfficer: PegawaiBertanggungjawab = {
      id: `OFF-${Date.now().toString().slice(-4)}`,
      nama: 'Nama Pegawai Bertanggungjawab Baru',
      jawatan: 'Penolong Pegawai Aset (PPPT)',
    };
    setFormData({
      ...formData,
      pegawaiBertanggungjawabList: [...currentList, newOfficer],
    });
  };

  const handleUpdateOfficer = (index: number, field: keyof PegawaiBertanggungjawab, value: string) => {
    const list = [...(formData.pegawaiBertanggungjawabList || [])];
    list[index] = { ...list[index], [field]: value };
    setFormData({ ...formData, pegawaiBertanggungjawabList: list });
  };

  const handleDeleteOfficer = (index: number) => {
    const list = (formData.pegawaiBertanggungjawabList || []).filter((_, i) => i !== index);
    setFormData({ ...formData, pegawaiBertanggungjawabList: list });
  };

  // Manage Asset Rows
  const handleAddAssetRow = () => {
    const currentList = formData.senaraiAset || [];
    const newRow: Kewpa7AssetItem = {
      id: `AST-${Date.now().toString().slice(-4)}`,
      bil: currentList.length + 1,
      noSiriPendaftaran: `KPT/PKS/I/90/${(currentList.length + 60).toString()}`,
      keteranganAset: 'MEJA / KERUSI / PERALATAN MAKMAL BARU',
      tarikhPenempatan: new Date().toLocaleDateString('en-GB'),
      statusFizikal: 'Baik',
      kategori: 'Aset Bernilai Rendah',
    };
    setFormData({
      ...formData,
      senaraiAset: [...currentList, newRow],
    });
  };

  const handleUpdateAssetRow = (index: number, field: keyof Kewpa7AssetItem, value: any) => {
    const list = [...(formData.senaraiAset || [])];
    list[index] = { ...list[index], [field]: value };
    setFormData({ ...formData, senaraiAset: list });
  };

  const handleDeleteAssetRow = (index: number) => {
    const list = formData.senaraiAset?.filter((_, i) => i !== index) || [];
    const renumbered = list.map((item, idx) => ({ ...item, bil: idx + 1 }));
    setFormData({ ...formData, senaraiAset: renumbered });
  };

  // Final Save to Edge D1
  const handleSaveToD1 = () => {
    if (!formData.lokasi || !formData.kodLokasi) {
      alert('Sila pastikan Nama Lokasi dan Kod Lokasi lengkap.');
      return;
    }

    const officerList = formData.pegawaiBertanggungjawabList || [];
    const primaryOfficerName = officerList.map((o) => o.nama).join(', ') || 'Pegawai Penjaga';

    const recordId = initialRecord?.id || `KW7-${Date.now().toString().slice(-6)}`;
    const newRecord: Kewpa7Record = {
      id: recordId,
      kodLokasi: formData.kodLokasi!,
      lokasi: formData.lokasi!,
      bahagian: formData.bahagian || 'JABATAN KEJURUTERAAN MEKANIKAL',
      pegawaiBertanggungjawabList: officerList,
      senaraiAset: (formData.senaraiAset as Kewpa7AssetItem[]) || [],
      tarikhMuatNaik: initialRecord?.tarikhMuatNaik || new Date().toISOString().slice(0, 10),
      tarikhKemaskini: new Date().toISOString().slice(0, 10),
      uploadedByEmail: currentUser?.email || 'penyelaras@poliku.edu.my',
      statusD1: 'Tersimpan D1',
      versi: (initialRecord?.versi || 1) + (initialRecord ? 1 : 0),
    };

    // Auto-generate or update location object
    const newLocation: LocationInfo = {
      id: `LOK-${Date.now().toString().slice(-4)}`,
      kodRuang: formData.kodLokasi!.split('/')[0]?.trim() || `RNG-${formData.lokasi!.slice(0, 5).toUpperCase()}`,
      nama: formData.lokasi!,
      jabatan: selectedDeptCode || (formData.bahagian?.includes('MEKANIKAL') ? 'JKM' : 'JTMK'),
      kategoriRuang: formData.lokasi!.toUpperCase().includes('BENGKEL') ? 'Bengkel Teknikal' : 'Makmal Komputer',
      bangunan: 'Kompleks Bengkel Utama',
      aras: 'Aras Bawah',
      penjaga: primaryOfficerName,
      penjagaJawatan: officerList[0]?.jawatan || 'PPAJ/PPAU',
      penjagaEmel: currentUser?.email || 'penjaga@poliku.edu.my',
      penjagaTel: '082-845510',
      pegawaiBertanggungjawabList: officerList,
      anggaranAset: newRecord.senaraiAset.length,
      statusPemeriksaan: 'Belum Mula',
      kewpa7TerkiniId: recordId,
      tarikhKemaskiniKewpa7: new Date().toLocaleDateString('en-GB'),
    };

    onSaveKewpa7Record(newRecord, newLocation);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">
                  {initialRecord ? 'Kemaskini Borang KEW.PA-7 (Edge D1)' : 'Muat Naik & Ekstrak Borang KEW.PA-7'}
                </h3>
                <span className="text-[10px] bg-emerald-400 text-slate-950 font-extrabold px-2 py-0.5 rounded font-mono">
                  Ekstrak Auto AI & D1
                </span>
              </div>
              <p className="text-xs text-slate-300">
                PPAJ / PPAU menguruskan senarai Pegawai Bertanggungjawab dan senarai Aset KEW.PA-7 terkini.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content according to steps */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-5">
          
          {/* STEP 1: Upload File or Manual Mode Choice */}
          {step === 'upload' && (
            <div className="space-y-5">
              
              {/* Registration Mode Guidance */}
              <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Pilih Kaedah Pendaftaran Lokasi Baru</span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Gunakan Auto-Ekstrak AI dari Borang KEW.PA-7 (pdf/imej) atau masukkan butiran lokasi secara manual.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleStartManualMode}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold text-xs transition shrink-0 flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pendaftaran Manual (Tanpa PDF)</span>
                </button>
              </div>

              <div 
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files?.[0]) {
                    handleProcessFile(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition flex flex-col items-center justify-center gap-3 ${
                  dragActive ? 'border-amber-400 bg-amber-50/50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100/80'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                  <Upload className="w-8 h-8 text-amber-700" />
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                    Pilih atau Hentakkan Fail Borang KEW.PA-7 (PDF / Gambar)
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Sistem akan mengekstrak Bahagian, Lokasi, Kod Lokasi, Senarai Pegawai Bertanggungjawab, dan Senarai Aset secara automatik.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2">
                  <label className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-xs transition flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Muat Naik Fail KEW.PA-7 PDF</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleProcessFile(e.target.files[0]);
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleStartManualMode}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-300 transition flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4 text-slate-600" />
                    <span>Daftar Manual Sahaja</span>
                  </button>
                </div>
              </div>

              {/* Sample Document Shortcut */}
              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-900 text-sky-200 flex items-center justify-center shrink-0 font-bold font-mono">
                    PDF
                  </div>
                  <div>
                    <h5 className="font-bold text-sky-950 text-xs sm:text-sm">
                      Fail Contoh Ujian: <code className="text-sky-800 font-mono">kewpa7-hitech.pdf</code>
                    </h5>
                    <p className="text-[11px] text-sky-700">
                      5 Halaman &bull; Jabatan Kejuruteraan Mekanikal (Bengkel Hi-Tech) &bull; 22+ Aset Alih
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleUseSamplePdf}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition shrink-0 flex items-center gap-1.5 shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Uji Ekstrak Auto Fail Ini</span>
                </button>
              </div>

            </div>
          )}

          {/* STEP 2: Extraction Loading Indicator */}
          {step === 'extracting' && (
            <div className="py-12 text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center mx-auto shadow-md animate-pulse">
                <RefreshCw className="w-8 h-8 text-slate-950 animate-spin" />
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-base">
                  Model AI Sedang Mengekstrak Data Borang KEW.PA-7...
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  Menganalisis Bahagian, Kod Lokasi, Pegawai Bertanggungjawab, dan No. Siri Aset ({extractProgress}%)
                </p>
              </div>

              <div className="max-w-md mx-auto h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${extractProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* STEP 3: Prefilled Data & Inline Edit Form */}
          {step === 'review' && (
            <div className="space-y-5">
              
              {/* Alert Status */}
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-emerald-900 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Pengekstrakkan KEW.PA-7 Terkini!</strong> PPAJ/PPAU boleh menyunting senarai Pegawai Bertanggungjawab dan senarai Aset. Perubahan akan dikemaskini secara automatik pada lokasi D1.
                  </span>
                </div>
              </div>

              {/* Header Meta Prefilled Form */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                    <Building className="w-4 h-4 text-slate-700" />
                    <span>Maklumat Lokasi, Kod Ruang & Jabatan Pemilik</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">1PP AM 2.4 &bull; KEW.PA-7</span>
                </div>

                <div className="bg-amber-50/70 border border-amber-200/80 p-2.5 rounded-lg text-[11px] text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Padanan Carta Organisasi:</strong> Teks Bahagian/Jabatan dalam borang fizikal KEW.PA-7 mungkin sedikit berbeza (cth: <em>JABATAN KEJURUTERAN MEKANIKAL</em> vs <em>JKM</em>). Pilih Kod Jabatan Rasmi di bawah untuk memastikan integriti matriks pemeriksaan.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jabatan Carta Organisasi *</label>
                    <select
                      value={selectedDeptCode}
                      onChange={(e) => setSelectedDeptCode(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:border-amber-500 focus:outline-none font-bold text-slate-900 bg-white"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.id} - {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Teks Bahagian Dalam KEW.PA-7</label>
                    <input
                      type="text"
                      value={formData.bahagian || ''}
                      onChange={(e) => setFormData({ ...formData, bahagian: e.target.value })}
                      placeholder="cth: JABATAN KEJURUTERAAN MEKANIKAL"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:border-amber-500 focus:outline-none font-medium bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Lokasi / Bengkel *</label>
                    <input
                      type="text"
                      value={formData.lokasi || ''}
                      onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                      placeholder="cth: BENGKEL HI-TECH"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:border-amber-500 focus:outline-none font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kod Lokasi KEW.PA-7 *</label>
                    <input
                      type="text"
                      value={formData.kodLokasi || ''}
                      onChange={(e) => setFormData({ ...formData, kodLokasi: e.target.value })}
                      placeholder="130101 / BGN / JKM1 / 01 / B09"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:border-amber-500 focus:outline-none font-mono text-amber-900 font-bold bg-amber-50/50"
                    />
                  </div>
                </div>

                {/* Senarai Pegawai Bertanggungjawab (Multiple Responsible Officers) */}
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-amber-600" />
                      <span>Senarai Pegawai Bertanggungjawab (Pengesah KEW.PA-7)</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleAddOfficer}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] transition flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 text-amber-400" />
                      <span>Tambah Pegawai Bertanggungjawab</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Satu lokasi boleh mempunyai pelbagai Pegawai Bertanggungjawab (Pegawai Pengesah KEW.PA-7 / Penjaga Premis).
                  </p>

                  <div className="space-y-2 pt-1">
                    {(formData.pegawaiBertanggungjawabList || []).map((officer, idx) => (
                      <div key={officer.id || idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        <input
                          type="text"
                          value={officer.nama}
                          onChange={(e) => handleUpdateOfficer(idx, 'nama', e.target.value)}
                          placeholder="Nama Pegawai Bertanggungjawab"
                          className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded focus:border-amber-500 focus:outline-none font-semibold text-slate-800"
                        />

                        <input
                          type="text"
                          value={officer.jawatan || ''}
                          onChange={(e) => handleUpdateOfficer(idx, 'jawatan', e.target.value)}
                          placeholder="Jawatan (cth: PPPT / Pegawai Bengkel)"
                          className="w-48 px-2.5 py-1 text-xs border border-slate-200 rounded focus:border-amber-500 focus:outline-none font-mono text-slate-600"
                        />

                        {(formData.pegawaiBertanggungjawabList || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteOfficer(idx)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Padam pegawai ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Extracted Asset Table (Editable) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <span>Senarai Aset KEW.PA-7 ({formData.senaraiAset?.length || 0} Item)</span>
                  </h4>

                  <button
                    type="button"
                    onClick={handleAddAssetRow}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tambah Baris Aset</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-none shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto max-h-[320px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white font-mono uppercase tracking-wider text-[11px] sticky top-0 z-10">
                          <th className="py-2.5 px-3 w-10 text-center border-b border-slate-800">Bil</th>
                          <th className="py-2.5 px-3 min-w-[160px] border-b border-slate-800">No. Siri Pendaftaran</th>
                          <th className="py-2.5 px-3 min-w-[280px] border-b border-slate-800">Keterangan Aset</th>
                          <th className="py-2.5 px-3 min-w-[110px] border-b border-slate-800">Tarikh Penempatan</th>
                          <th className="py-2.5 px-3 min-w-[110px] border-b border-slate-800">Status Fizikal</th>
                          <th className="py-2.5 px-2 w-12 text-center border-b border-slate-800">Padam</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {formData.senaraiAset?.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              Tiada aset diekstrak. Sila klik &ldquo;Tambah Baris Aset&rdquo;.
                            </td>
                          </tr>
                        ) : (
                          formData.senaraiAset?.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-slate-50 transition">
                              <td className="py-2 px-3 text-center text-slate-400 font-mono text-xs">
                                {idx + 1}
                              </td>

                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={item.noSiriPendaftaran}
                                  onChange={(e) => handleUpdateAssetRow(idx, 'noSiriPendaftaran', e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-none bg-slate-50/50"
                                />
                              </td>

                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={item.keteranganAset}
                                  onChange={(e) => handleUpdateAssetRow(idx, 'keteranganAset', e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-slate-800 focus:border-amber-500 focus:outline-none"
                                />
                              </td>

                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={item.tarikhPenempatan}
                                  onChange={(e) => handleUpdateAssetRow(idx, 'tarikhPenempatan', e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono text-slate-700 focus:border-amber-500 focus:outline-none text-center"
                                />
                              </td>

                              <td className="py-2 px-3">
                                <select
                                  value={item.statusFizikal || 'Baik'}
                                  onChange={(e) => handleUpdateAssetRow(idx, 'statusFizikal', e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-semibold focus:border-amber-500 focus:outline-none"
                                >
                                  <option value="Baik">Baik</option>
                                  <option value="Rosak">Rosak</option>
                                  <option value="Usang">Usang</option>
                                  <option value="Hilang">Hilang</option>
                                </select>
                              </td>

                              <td className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAssetRow(idx)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                  title="Padam baris"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-t border-slate-800 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Penyimpanan Automatik Pangkalan Data Cloudflare D1</span>
          </div>

          <div className="flex items-center gap-2">
            {step === 'review' && (
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs font-semibold transition"
              >
                Muat Naik Fail Lain
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition"
            >
              Batal
            </button>

            {step === 'review' && (
              <button
                type="button"
                onClick={handleSaveToD1}
                className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
              >
                <Database className="w-4 h-4 text-slate-950" />
                <span>Simpan Kemaskini Aset ke D1</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
