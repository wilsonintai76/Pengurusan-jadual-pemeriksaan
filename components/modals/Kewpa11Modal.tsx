import React, { useState } from 'react';
import {
  X,
  FileCheck,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Info,
  Upload,
} from 'lucide-react';
import { InspectionSchedule, JustifikasiMap, LaporanPraJkpak, PecahanStatus } from '@/lib/types';
import { dataApi } from '@/lib/dataApi';
import {
  PECAHAN_KOSONG,
  STATUS_ASET,
  STATUS_BERDOKUMEN,
  hitungSedangDigunakan,
  jumlahPecahan,
  validatePecahanStatus,
} from '@/lib/statusAset';

interface Kewpa11ModalProps {
  schedule: InspectionSchedule;
  onClose: () => void;
  onSubmit: (scheduleId: string, report: LaporanPraJkpak, kewpa11DocKey: string) => void;
}

const WARNA_KAD: Record<string, string> = {
  A: 'border-emerald-200 bg-emerald-50/40 text-emerald-900',
  B: 'border-slate-200 bg-slate-50 text-slate-900',
  C: 'border-amber-200 bg-amber-50/40 text-amber-900',
  D: 'border-sky-200 bg-sky-50/40 text-sky-900',
  E: 'border-indigo-200 bg-indigo-50/40 text-indigo-900',
  F: 'border-rose-200 bg-rose-50/40 text-rose-900',
};

export default function Kewpa11Modal({ schedule, onClose, onSubmit }: Kewpa11ModalProps) {
  const existing = schedule.laporanPraJkpak;
  const kuantiti = schedule.kuantiti || 0;

  const [pecahan, setPecahan] = useState<PecahanStatus>(() => ({
    ...PECAHAN_KOSONG,
    ...(existing?.pecahan ?? {}),
  }));
  const [justifikasi, setJustifikasi] = useState<JustifikasiMap>(existing?.justifikasi ?? {});
  const [cadangan, setCadangan] = useState(
    existing?.cadangan || 'Pemeriksaan fizikal 100% selesai berpandukan KEW.PA-7.'
  );
  const [docKey, setDocKey] = useState(schedule.kewpa11DocKey || '');
  const [uploadName, setUploadName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // "Sedang Digunakan" dikira automatik sebagai baki aset.
  const sedangDigunakan = hitungSedangDigunakan(kuantiti, pecahan);
  const pecahanPenuh: PecahanStatus = { ...pecahan, A: sedangDigunakan };
  const jumlah = jumlahPecahan(pecahanPenuh);

  const setBilangan = (kod: keyof PecahanStatus, nilai: string) => {
    const angka = Math.max(0, parseInt(nilai, 10) || 0);
    setPecahan((prev) => ({ ...prev, [kod]: angka }));
  };

  const setDokumen = (kod: keyof PecahanStatus, patch: { adaDokumen?: boolean; rujukan?: string }) => {
    setJustifikasi((prev) => ({
      ...prev,
      [kod]: {
        adaDokumen: patch.adaDokumen ?? prev[kod]?.adaDokumen ?? true,
        rujukan: patch.rujukan ?? prev[kod]?.rujukan ?? '',
      },
    }));
  };

  /** Muat naik KEW.PA-11 bertandatangan terus ke Cloudflare R2 (bukan Google Drive). */
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrors([]);
    setIsUploading(true);
    try {
      const uploaded = await dataApi.storage.upload(file, 'kewpa11');
      setDocKey(uploaded.key);
      setUploadName(uploaded.fileName);
    } catch (error) {
      setErrors([`Muat naik KEW.PA-11 gagal: ${(error as Error).message}`]);
      event.target.value = '';
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const ralat: string[] = [...validatePecahanStatus(pecahanPenuh)];

    if (!docKey) {
      ralat.push('Sila muat naik borang KEW.PA-11 yang telah ditandatangani (PDF) ke Cloudflare R2.');
    }
    if (!cadangan.trim()) {
      ralat.push('Sila masukkan cadangan / syor pegawai pemeriksa untuk Mesyuarat Pra-JKPAK.');
    }

    if (ralat.length > 0) {
      setErrors(ralat);
      return;
    }

    const report: LaporanPraJkpak = {
      baik: pecahanPenuh.A + pecahanPenuh.E,
      rosak: pecahanPenuh.C + pecahanPenuh.D,
      usang: pecahanPenuh.B,
      hilang: pecahanPenuh.F,
      pecahan: pecahanPenuh,
      justifikasi,
      cadangan: cadangan.trim(),
      tarikhHantar: new Date().toISOString().slice(0, 10),
      disahkanOleh: `${schedule.pemeriksa1 || 'Pemeriksa 1'} & ${schedule.pemeriksa2 || 'Pemeriksa 2'}`,
    };

    onSubmit(schedule.id, report, docKey.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        <div className="px-6 py-4 border-b border-amber-200 bg-slate-900 text-white flex justify-between items-center">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold tracking-tight">
                Perakuan Pemeriksaan Fizikal & Pra-JKPAK (KEW.PA-11)
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              Status aset A–F, dokumen sokongan wajib & justifikasi mengikut 1PP AM 2.4
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm flex-1">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-100 font-mono">
                {schedule.jabatan} &bull; {schedule.kod || 'JADUAL'}
              </span>
              <h4 className="font-bold text-slate-900 text-sm mt-1">{schedule.lokasi}</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pemeriksa: 1. <strong>{schedule.pemeriksa1 || '-'}</strong> &bull; 2.{' '}
                <strong>{schedule.pemeriksa2 || '-'}</strong>
              </p>
            </div>
            <div className="text-right sm:self-center">
              <span className="text-[11px] text-slate-500 block">Bilangan aset (KEW.PA-7):</span>
              <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                {kuantiti} unit
              </span>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold space-y-1">
              <p className="flex items-center gap-2 font-bold">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" /> Sila lengkapkan:
              </p>
              <ul className="list-disc pl-6 space-y-0.5 font-medium">
                {errors.map((satu) => (
                  <li key={satu}>{satu}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 1. Pecahan status fizikal A–F */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                Status Fizikal Aset Diperiksa (A–F)
              </h4>
              <span className="text-xs font-mono text-slate-500">
                Jumlah:{' '}
                <strong className={jumlah === kuantiti ? 'text-emerald-700' : 'text-amber-700'}>
                  {jumlah}
                </strong>{' '}
                / {kuantiti} unit
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {STATUS_ASET.map((status) => {
                const auto = Boolean(status.auto);
                const nilai = auto ? sedangDigunakan : pecahan[status.kod];
                return (
                  <div
                    key={status.kod}
                    className={`p-3 rounded-xl border ${WARNA_KAD[status.kod]}`}
                  >
                    <label className="block font-bold text-xs mb-1">
                      {status.kod}. {status.label}
                    </label>
                    <input
                      type="number"
                      min="0"
                      readOnly={auto}
                      value={nilai}
                      onChange={(e) => setBilangan(status.kod, e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg border font-mono font-bold text-sm ${
                        auto
                          ? 'border-emerald-300 bg-emerald-100/70 text-emerald-900 cursor-not-allowed'
                          : 'border-slate-300 bg-white text-slate-900'
                      }`}
                    />
                    {auto ? (
                      <span className="mt-1 block text-[9px] font-semibold leading-tight opacity-80">
                        Dikira automatik: {kuantiti} − status lain
                      </span>
                    ) : (
                      status.dokumen && (
                        <span className="mt-1 block text-[9px] font-semibold leading-tight opacity-80">
                          {status.dokumen}: Ada / Tiada
                        </span>
                      )
                    )}
                  </div>
                );
              })}
            </div>

            {jumlah < kuantiti && (
              <p className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-900">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                Jumlah status lain melebihi bilangan aset berdaftar ({kuantiti} unit) — nilai Sedang
                Digunakan ditetapkan 0.
              </p>
            )}
          </div>

          {/* 2. Dokumen sokongan Ada/Tiada bagi C–F */}
          {STATUS_BERDOKUMEN.filter((kod) => pecahan[kod] > 0).map((kod) => {
            const meta = STATUS_ASET.find((status) => status.kod === kod)!;
            const ada = justifikasi[kod]?.adaDokumen ?? true;
            const rujukan = justifikasi[kod]?.rujukan ?? '';

            return (
              <div key={kod} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 space-y-2">
                <h4 className="font-bold text-slate-800 text-xs">
                  {kod}. {meta.label} — {pecahan[kod]} aset{' '}
                  <span className="font-normal text-slate-500">({meta.dokumen})</span>
                </h4>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-600">Dokumen:</span>
                  <div className="inline-flex overflow-hidden rounded-lg border border-slate-300">
                    {[
                      { label: `Ada ${meta.dokumen}`, value: true },
                      { label: `Tiada ${meta.dokumen}`, value: false },
                    ].map((pilihan) => (
                      <button
                        key={String(pilihan.value)}
                        type="button"
                        onClick={() => setDokumen(kod, { adaDokumen: pilihan.value })}
                        className={`px-2.5 py-1 text-[10px] font-bold transition ${
                          ada === pilihan.value
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {pilihan.label}
                      </button>
                    ))}
                  </div>
                </div>

                {ada && (
                  <input
                    type="text"
                    value={rujukan}
                    onChange={(e) => setDokumen(kod, { rujukan: e.target.value })}
                    placeholder={
                      kod === 'C'
                        ? 'No. laporan: cth ADU/JKM/2026/012'
                        : kod === 'D'
                          ? 'No. LPO: cth LPO/PKU/2026/P1088'
                          : kod === 'E'
                            ? 'No. borang pinjaman: cth PINJAM/JTMK/2026/07'
                            : 'No. laporan polis: cth LP/PKU/2026/0031'
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono bg-white"
                  />
                )}
              </div>
            );
          })}

          {/* 3. Muat naik imbasan KEW.PA-11 ke Cloudflare R2 */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-2">
            <label className="block font-bold text-slate-800 text-xs">
              Borang KEW.PA-11 Bertandatangan (PDF) — Cloudflare R2{' '}
              <span className="text-rose-500">*</span>
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:border-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                {isUploading ? 'Memuat naik ke R2…' : 'Pilih fail PDF untuk dimuat naik'}
              </span>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>

            {docKey && !isUploading && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-[11px] font-semibold text-emerald-900">
                  {uploadName || 'KEW.PA-11'} disimpan ke R2
                </span>
                <a
                  href={dataApi.storage.fileUrl(docKey)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 underline"
                >
                  Lihat fail <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            <p className="text-[10px] text-slate-400">
              * Dokumen ditandatangani oleh kedua-dua Pegawai Pemeriksa. Fail disimpan dalam bucket R2
              POLIKU (bukan Google Drive); status jadual bertukar kepada <strong>Selesai</strong> selepas
              berjaya disimpan.
            </p>
          </div>

          {/* 4. Cadangan Pra-JKPAK */}
          <div>
            <label className="block font-semibold text-slate-800 text-xs mb-1">
              Cadangan / Syor Pegawai Pemeriksa untuk Mesyuarat Pra-JKPAK{' '}
              <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={cadangan}
              onChange={(e) => setCadangan(e.target.value)}
              placeholder="Cadangan tindakan kepada Pengerusi Jawatankuasa Pengurusan Aset Kerajaan…"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
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
