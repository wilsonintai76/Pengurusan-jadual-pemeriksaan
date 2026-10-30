import React from 'react';
import { X, ArrowLeftRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useCrossPairs, useDepartments } from '@/lib/useReferenceData';

interface CrossInspectionModalProps {
  onClose: () => void;
}

export default function CrossInspectionModal({ onClose }: CrossInspectionModalProps) {
  const crossPairs = useCrossPairs();
  const departments = useDepartments();

  const pairList = Object.entries(crossPairs).map(([a, b]) => ({
    a,
    b,
    nameA: departments.find((d) => d.id === a)?.name ?? a,
    nameB: departments.find((d) => d.id === b)?.name ?? b,
  }));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-teal-950 text-white flex justify-between items-center">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-teal-400" />
              <h3 className="text-base font-bold tracking-tight">
                Mod Gandingan Pemeriksaan Silang (Cross-Inspection)
              </h3>
            </div>
            <p className="text-xs text-teal-200">
              Ketetapan rasmi bagi menjamin kebebasan dan ketelusan audit fizikal 1PP AM 2.4
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm flex-1">
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl space-y-2">
            <h4 className="font-bold text-teal-950 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-700" />
              <span>Mod Aktif Semasa: Timbal Balik (⇄ Reciprocal Mode)</span>
            </h4>
            <p className="text-xs text-teal-900 leading-relaxed">
              Di bawah Mod Timbal Balik, kedua-dua jabatan dalam gandingan saling memeriksa makmal antara satu sama lain. Sebagai contoh, pegawai daripada <strong>JTMK</strong> diamanahkan memeriksa makmal <strong>JKE</strong>, dan serentak itu pegawai daripada <strong>JKE</strong> memeriksa makmal <strong>JTMK</strong>.
            </p>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
              Senarai Gandingan Rasmi JKPAK POLIKU Sesi 2026:
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pairList.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2"
                >
                  <div className="text-left">
                    <strong className="text-slate-900 block font-mono">{p.a}</strong>
                    <span className="text-[10px] text-slate-500 truncate max-w-[120px] block">
                      {p.nameA}
                    </span>
                  </div>

                  <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold shrink-0">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-teal-700" />
                  </div>

                  <div className="text-right">
                    <strong className="text-slate-900 block font-mono">{p.b}</strong>
                    <span className="text-[10px] text-slate-500 truncate max-w-[120px] block">
                      {p.nameB}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 block">Kelebihan Pematuhan:</span>
            <p>
              1. Menghalang berat sebelah (bias) penilaian fizikal peralatan.<br />
              2. Mengelakkan pegawai daripada mengesahkan kerosakan bilik jagaan sendiri.<br />
              3. Memenuhi kehendak audit Jabatan Audit Negara bagi pendaftaran borang KEW.PA-11 bertauliah.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
          >
            Faham & Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
