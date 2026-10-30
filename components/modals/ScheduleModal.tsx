import React, { useState } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { InspectionSchedule, AssetCategory, InspectionStatus } from '@/lib/types';
import { useCrossPairs, useLocations } from '@/lib/useReferenceData';

interface ScheduleModalProps {
  schedule: InspectionSchedule | null;
  defaultDept?: string;
  onClose: () => void;
  onSave: (scheduleData: Partial<InspectionSchedule>) => void;
}

export default function ScheduleModal({
  schedule,
  defaultDept = '',
  onClose,
  onSave,
}: ScheduleModalProps) {
  const crossPairs = useCrossPairs();
  const locations = useLocations();
  const [jabatan, setJabatan] = useState(schedule ? schedule.jabatan : defaultDept);
  const [kod, setKod] = useState(schedule?.kod || '');
  const [lokasi, setLokasi] = useState(schedule ? schedule.lokasi : '');
  const [lokasiId, setLokasiId] = useState('');
  const [kategori, setKategori] = useState<AssetCategory>(
    schedule ? schedule.kategori : 'Semua (Harta Modal & Aset Bernilai Rendah)'
  );
  const [kuantiti, setKuantiti] = useState(schedule ? (schedule.kuantiti || 0) : 0);
  const [tarikhMula, setTarikhMula] = useState(schedule ? schedule.tarikhMula : '');
  const [tarikhTamat, setTarikhTamat] = useState(schedule ? schedule.tarikhTamat : '');
  const [penjaga, setPenjaga] = useState(schedule ? (schedule.penjaga || '') : '');
  const [pemeriksa1, setPemeriksa1] = useState(schedule ? (schedule.pemeriksa1 || '') : '');
  const [pemeriksa2, setPemeriksa2] = useState(schedule ? (schedule.pemeriksa2 || '') : '');
  const [status, setStatus] = useState<InspectionStatus>(schedule ? schedule.status : 'Belum Mula');
  const [catatan, setCatatan] = useState(schedule ? (schedule.catatan || '') : '');
  const [errorMsg, setErrorMsg] = useState('');

  /** Lokasi berdaftar bagi jabatan yang dipilih — satu sumber kebenaran untuk penjaga & aset. */
  const departmentLocations = locations.filter(
    (item) => !jabatan || item.jabatan === jabatan
  );
  const selectedLocation = locations.find((item) => item.id === lokasiId);

  const handleSelectLocation = (id: string) => {
    setLokasiId(id);
    const found = locations.find((item) => item.id === id);
    if (!found) return;
    setLokasi(found.nama);
    setPenjaga(found.penjaga && found.penjaga !== 'Belum Dilantik' ? found.penjaga : '');
    setKuantiti(found.anggaranAset || 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!lokasi.trim()) {
      setErrorMsg('Sila masukkan nama makmal atau ruang.');
      return;
    }

    if (!tarikhMula || !tarikhTamat) {
      setErrorMsg('Sila lengkapkan tarikh mula dan tamat.');
      return;
    }

    onSave({
      jabatan,
      kod: kod.trim(),
      lokasi: lokasi.trim(),
      kategori,
      kuantiti: Number(kuantiti) || 1,
      tarikhMula,
      tarikhTamat,
      penjaga: penjaga.trim(),
      pemeriksa1: pemeriksa1.trim(),
      pemeriksa2: pemeriksa2.trim(),
      status,
      catatan: catatan.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {schedule ? 'Kemaskini Jadual Pemeriksaan' : 'Daftar Jadual Pemeriksaan Aset'}
            </h3>
            <p className="text-xs text-slate-500">
              Pendaftaran takwim ruang makmal/bengkel tahunan berpandukan 1PP AM 2.4
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Jabatan Pemilik Ruang <span className="text-rose-500">*</span>
              </label>
              <select
                value={jabatan}
                onChange={(e) => setJabatan(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {Object.keys(crossPairs).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                No. Rujukan Jadual (Kod)
              </label>
              <input
                type="text"
                value={kod}
                onChange={(e) => setKod(e.target.value)}
                placeholder="cth: JAD/JTMK/2026/01"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Ruang Berdaftar (Direktori Lokasi) <span className="text-rose-500">*</span>
              </label>
              <select
                value={lokasiId}
                onChange={(e) => handleSelectLocation(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">— Pilih Ruang —</option>
                {departmentLocations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.kodRuang} — {item.nama}
                  </option>
                ))}
              </select>
              {departmentLocations.length === 0 && (
                <p className="mt-1 text-[10px] font-semibold text-rose-600">
                  Tiada ruang berdaftar bagi jabatan ini. Daftar di Direktori Lokasi (muat naik KEW.PA-7) dahulu.
                </p>
              )}
              {lokasi && (
                <p className="mt-1 text-[10px] text-slate-500">
                  Nama ruang: <strong>{lokasi}</strong>
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Kategori Aset <span className="text-rose-500">*</span>
              </label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value as AssetCategory)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="Semua (Harta Modal & Aset Bernilai Rendah)">
                  Semua (Harta Modal & Aset Bernilai Rendah)
                </option>
                <option value="Harta Modal Sahaja">Harta Modal Sahaja</option>
                <option value="Aset Alih Bernilai Rendah Sahaja">
                  Aset Alih Bernilai Rendah Sahaja
                </option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Tarikh Mula <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={tarikhMula}
                onChange={(e) => setTarikhMula(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Tarikh Tamat <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={tarikhTamat}
                onChange={(e) => setTarikhTamat(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="text-[11px] text-slate-600">
              <strong>Penyelia Lokasi:</strong>{' '}
              {selectedLocation?.penjaga && selectedLocation.penjaga !== 'Belum Dilantik'
                ? selectedLocation.penjaga
                : 'Belum Dilantik'}
              {selectedLocation?.penjagaTel ? ` · ${selectedLocation.penjagaTel}` : ''}
            </div>
            <div className="text-[11px] text-slate-600">
              <strong>Bilangan aset (KEW.PA-7):</strong> {selectedLocation?.anggaranAset ?? 0} unit
            </div>
            <p className="text-[10px] text-slate-500 italic">
              Diambil terus daripada Direktori Lokasi. Mengikut 1PP AM 2.4, penyelia lokasi TIDAK DIBENARKAN
              memeriksa bilik ini bagi menjamin integriti audit.
            </p>
          </div>

          <div className="p-3.5 bg-sky-50/50 border border-sky-200 rounded-xl space-y-2">
            <label className="block font-bold text-sky-950 text-xs">
              Pegawai Pemeriksa Dilantik (Sekurang-kurangnya 2 orang - AM 2.4):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5 font-medium">Slot Pemeriksa 1:</span>
                <input
                  type="text"
                  value={pemeriksa1}
                  onChange={(e) => setPemeriksa1(e.target.value)}
                  placeholder="Nama & Gred (cth: Ts. Mohd Fadzli - DH44)"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5 font-medium">Slot Pemeriksa 2:</span>
                <input
                  type="text"
                  value={pemeriksa2}
                  onChange={(e) => setPemeriksa2(e.target.value)}
                  placeholder="Nama & Gred (cth: Pn. Azlina - DH41)"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Status Semasa <span className="text-rose-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as InspectionStatus)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="Belum Mula">Belum Mula</option>
                <option value="Sedang Dijalankan">Sedang Dijalankan</option>
                <option value="Selesai">Selesai</option>
                <option value="Tertangguh">Tertangguh</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Catatan Tambahan
              </label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="cth: Lawatan fizikal dijadualkan bersama Penjaga Ruang."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Save className="w-3.5 h-3.5 text-amber-300" />
              <span>Simpan Jadual</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
