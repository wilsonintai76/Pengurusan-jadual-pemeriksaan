'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileCheck, 
  Wrench, 
  Recycle, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { InspectionSchedule, LaporanPraJkpak } from '@/lib/types';

interface Kewpa11ModalProps {
  schedule: InspectionSchedule;
  onClose: () => void;
  onSubmit: (scheduleId: string, report: LaporanPraJkpak, driveUrl: string) => void;
}

export default function Kewpa11Modal({
  schedule,
  onClose,
  onSubmit,
}: Kewpa11ModalProps) {
  const existing = schedule.laporanPraJkpak;
  const initialQty = schedule.kuantiti || 10;

  const [baik, setBaik] = useState<number>(existing?.baik ?? initialQty);
  const [rosak, setRosak] = useState<number>(existing?.rosak ?? 0);
  const [usang, setUsang] = useState<number>(existing?.usang ?? 0);
  const [hilang, setHilang] = useState<number>(existing?.hilang ?? 0);

  const [driveUrl, setDriveUrl] = useState(
    schedule.kewpa11Doc?.url || 'https://drive.google.com/file/d/sample-kewpa11-signed/view'
  );

  // Kerosakan fields
  const [noLaporanKerosakan, setNoLaporanKerosakan] = useState(
    existing?.noLaporanKerosakan || ''
  );
  const [noPesananKerajaan, setNoPesananKerajaan] = useState(
    existing?.noPesananKerajaan || ''
  );
  const [tarikhAduan, setTarikhAduan] = useState(
    existing?.tarikhAduan || new Date().toISOString().slice(0, 10)
  );
  const [statusPenyelenggaraan, setStatusPenyelenggaraan] = useState(
    existing?.statusPenyelenggaraan || 'Pesanan Kerajaan Dikeluarkan (Sedang Dibaiki)'
  );

  // Usang fields
  const [sebabTidakDigunakan, setSebabTidakDigunakan] = useState(
    existing?.sebabTidakDigunakan || ''
  );
  const [justifikasiTidakDigunakan, setJustifikasiTidakDigunakan] = useState(
    existing?.justifikasiTidakDigunakan || ''
  );
  const [syorTindakanUsang, setSyorTindakanUsang] = useState(
    existing?.syorTindakanUsang || 'Syor Pelupusan Segera (Borang KEW.PA-19)'
  );

  const [cadangan, setCadangan] = useState(
    existing?.cadangan || 'Pemeriksaan fizikal 100% selesai berpandukan KEW.PA-7.'
  );
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Total check
    const totalCount = baik + rosak + usang + hilang;
    if (totalCount === 0) {
      setErrorMessage('Jumlah aset fizikal tidak boleh sifar.');
      return;
    }

    // Pekeliling validation for damaged assets
    if (rosak > 0) {
      if (!noLaporanKerosakan.trim() || !noPesananKerajaan.trim()) {
        setErrorMessage(
          'Pematuhan 1PP AM 2.4: Terdapat aset rosak. No. Rujukan Laporan Aduan Kerosakan dan No. Pesanan Kerajaan (LO) wajib diisi!'
        );
        return;
      }
    }

    // Pekeliling validation for idle/obsolete assets
    if (usang > 0) {
      if (!sebabTidakDigunakan.trim() || !justifikasiTidakDigunakan.trim()) {
        setErrorMessage(
          'Pematuhan 1PP AM 2.4: Terdapat aset usang. Sila pilih Sebab Piawai Pekeliling dan sertakan ulasan justifikasi teknikal!'
        );
        return;
      }
    }

    if (!cadangan.trim()) {
      setErrorMessage('Sila masukkan ulasan/cadangan tindakan pegawai pemeriksa.');
      return;
    }

    const report: LaporanPraJkpak = {
      baik: Number(baik) || 0,
      rosak: Number(rosak) || 0,
      usang: Number(usang) || 0,
      hilang: Number(hilang) || 0,
      noLaporanKerosakan: rosak > 0 ? noLaporanKerosakan.trim() : undefined,
      noPesananKerajaan: rosak > 0 ? noPesananKerajaan.trim() : undefined,
      tarikhAduan: rosak > 0 ? tarikhAduan : undefined,
      statusPenyelenggaraan: rosak > 0 ? statusPenyelenggaraan : undefined,
      sebabTidakDigunakan: usang > 0 ? sebabTidakDigunakan : undefined,
      justifikasiTidakDigunakan: usang > 0 ? justifikasiTidakDigunakan.trim() : undefined,
      syorTindakanUsang: usang > 0 ? syorTindakanUsang : undefined,
      cadangan: cadangan.trim(),
      tarikhHantar: new Date().toISOString().slice(0, 10),
      disahkanOleh: `${schedule.pemeriksa1 || 'Pemeriksa 1'} & ${schedule.pemeriksa2 || 'Pemeriksa 2'}`,
    };

    onSubmit(schedule.id, report, driveUrl.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-amber-200 bg-slate-900 text-white flex justify-between items-center">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold tracking-tight">
                Perakuan Pemeriksaan Fizikal & Pra-JKPAK (KEW.PA-11)
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              Pematuhan statutori 1PP AM 2.4: Aduan Kerosakan, Pesanan Kerajaan (LO) & Justifikasi Pelupusan
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm flex-1">
          
          {/* Target Room Info */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-100 font-mono">
                {schedule.jabatan} &bull; {schedule.kod || 'JADWAL'}
              </span>
              <h4 className="font-bold text-slate-900 text-sm mt-1">
                {schedule.lokasi}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pemeriksa Dilantik: 1. <strong>{schedule.pemeriksa1 || '-'}</strong> &bull; 2. <strong>{schedule.pemeriksa2 || '-'}</strong>
              </p>
            </div>
            <div className="text-right sm:self-center">
              <span className="text-[11px] text-slate-500 block">Kuantiti Ditaksir:</span>
              <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                {schedule.kuantiti} unit
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Salinan Imbasan KEW.PA-11 */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-2">
            <label className="block font-bold text-slate-800 text-xs">
              Pautan Salinan Borang KEW.PA-11 Bertandatangan (Google Drive / Cloudflare R2) <span className="text-rose-500">*</span>
            </label>
            <input
              type="url"
              required
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <p className="text-[10px] text-slate-400">
              * Pastikan dokumen telah ditandatangani oleh kedua-dua orang Pegawai Pemeriksa sebelum dimuat naik.
            </p>
          </div>

          {/* Pecahan Status Keadaan Fizikal Aset */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                Pecahan Keadaan Fizikal Aset Diperiksa:
              </h4>
              <span className="text-xs font-mono text-slate-500">
                Jumlah: <strong className="text-slate-900">{baik + rosak + usang + hilang}</strong> unit
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40">
                <label className="block font-bold text-emerald-900 text-xs mb-1">
                  1. Baik (Elok)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={baik}
                  onChange={(e) => setBaik(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 font-mono font-bold text-sm bg-white"
                />
              </div>

              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/40">
                <label className="block font-bold text-amber-900 text-xs mb-1">
                  2. Perlu Pembaikan
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={rosak}
                  onChange={(e) => setRosak(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 font-mono font-bold text-sm bg-white"
                />
              </div>

              <div className="p-3 rounded-xl border border-orange-200 bg-orange-50/40">
                <label className="block font-bold text-orange-900 text-xs mb-1">
                  3. Usang / Lapuk
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={usang}
                  onChange={(e) => setUsang(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-orange-300 font-mono font-bold text-sm bg-white"
                />
              </div>

              <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/40">
                <label className="block font-bold text-rose-900 text-xs mb-1">
                  4. Hilang / Tiada
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={hilang}
                  onChange={(e) => setHilang(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-rose-300 font-mono font-bold text-sm bg-white"
                />
              </div>
            </div>
          </div>

          {/* Pematuhan Aset Rosak & LO */}
          {rosak > 0 && (
            <div className="border border-amber-300 bg-amber-50/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-700" />
                <h4 className="font-bold text-amber-950 text-xs uppercase tracking-wide">
                  Pematuhan Wajib: Rekod Aduan Kerosakan & Pesanan Kerajaan (LO)
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 text-xs mb-1">
                    No. Rujukan Laporan Aduan Kerosakan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={noLaporanKerosakan}
                    onChange={(e) => setNoLaporanKerosakan(e.target.value)}
                    placeholder="cth: ADU/JTMK/2026/012"
                    className="w-full px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 text-xs mb-1">
                    No. Pesanan Kerajaan (LO) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={noPesananKerajaan}
                    onChange={(e) => setNoPesananKerajaan(e.target.value)}
                    placeholder="cth: LO/PKU/2026/P1088"
                    className="w-full px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-mono bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 text-xs mb-1">
                    Tarikh Aduan Dibuat
                  </label>
                  <input
                    type="date"
                    value={tarikhAduan}
                    onChange={(e) => setTarikhAduan(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-amber-300 text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 text-xs mb-1">
                    Status Tindakan Penyelenggaraan
                  </label>
                  <select
                    value={statusPenyelenggaraan}
                    onChange={(e) => setStatusPenyelenggaraan(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-amber-300 text-xs bg-white"
                  >
                    <option value="Pesanan Kerajaan Dikeluarkan (Sedang Dibaiki)">
                      Pesanan Kerajaan Dikeluarkan (Sedang Dibaiki)
                    </option>
                    <option value="Menunggu Kelulusan Waran Peruntukan">
                      Menunggu Kelulusan Waran Peruntukan
                    </option>
                    <option value="Selesai Dibaiki Melalui LO">
                      Selesai Dibaiki Melalui LO
                    </option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Pematuhan Aset Usang / Tidak Digunakan */}
          {usang > 0 && (
            <div className="border border-orange-300 bg-orange-50/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Recycle className="w-4 h-4 text-orange-700" />
                <h4 className="font-bold text-orange-950 text-xs uppercase tracking-wide">
                  Pematuhan Wajib: Justifikasi Aset Tidak Digunakan (Syor Pelupusan / Pindahan)
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 text-xs mb-1">
                    Sebab Piawai Pekeliling 1PP AM 2.4 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={sebabTidakDigunakan}
                    onChange={(e) => setSebabTidakDigunakan(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 rounded-lg border border-orange-300 text-xs bg-white"
                  >
                    <option value="">-- Sila Pilih Sebab Piawai --</option>
                    <option value="Perubahan silibus pengajaran dan pembelajaran (PdP)">
                      Perubahan silibus pengajaran (PdP)
                    </option>
                    <option value="Teknologi lapuk / Usang / Tiada sokongan perisian">
                      Teknologi lapuk / Usang / Tiada sokongan perisian
                    </option>
                    <option value="Alat ganti tiada dalam pasaran">
                      Alat ganti tiada dalam pasaran
                    </option>
                    <option value="Tidak ekonomik dibaiki (Kos > 50% nilai asal)">
                      Tidak ekonomik dibaiki (Kos &gt; 50% nilai asal)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 text-xs mb-1">
                    Syor Tindakan Susulan
                  </label>
                  <select
                    value={syorTindakanUsang}
                    onChange={(e) => setSyorTindakanUsang(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-orange-300 text-xs bg-white"
                  >
                    <option value="Syor Pelupusan Segera (Borang KEW.PA-19)">
                      Syor Pelupusan Segera (Borang KEW.PA-19)
                    </option>
                    <option value="Syor Pindahan ke Jabatan Lain (KEW.PA-9)">
                      Syor Pindahan ke Jabatan Lain (KEW.PA-9)
                    </option>
                    <option value="Syor Tukar Ganti Komponen (Kanibalisasi)">
                      Syor Tukar Ganti Komponen (Kanibalisasi)
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 text-xs mb-1">
                  Ulasan Justifikasi Teknikal Terperinci <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={justifikasiTidakDigunakan}
                  onChange={(e) => setJustifikasiTidakDigunakan(e.target.value)}
                  placeholder="Nyatakan sebab teknikal mengapa peralatan tidak lagi digunakan di makmal ini..."
                  className="w-full px-3 py-1.5 rounded-lg border border-orange-300 text-xs bg-white"
                />
              </div>
            </div>
          )}

          {/* Cadangan Tindakan Pra-JKPAK */}
          <div>
            <label className="block font-semibold text-slate-800 text-xs mb-1">
              Cadangan / Syor Pegawai Pemeriksa untuk Mesyuarat Pra-JKPAK <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={cadangan}
              onChange={(e) => setCadangan(e.target.value)}
              placeholder="Cadangan tindakan kepada Pengerusi Jawatankuasa Pengurusan Aset Kerajaan..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Footer Submit Actions */}
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
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
            >
              <FileCheck className="w-4 h-4" />
              <span>Hantar Perakuan & Sahkan Selesai</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
