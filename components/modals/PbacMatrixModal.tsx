'use client';

import React from 'react';
import { X, ShieldCheck, CheckCircle2, Lock, ShieldAlert } from 'lucide-react';

interface PbacMatrixModalProps {
  onClose: () => void;
}

export default function PbacMatrixModal({ onClose }: PbacMatrixModalProps) {
  const policies = [
    {
      id: 'POL_CONFLICT_CUSTODIAN_GUARD',
      name: 'Halangan Pegawai Penjaga Ruang (Room Custodian Conflict Guard)',
      pekeliling: '1PP AM 2.4 Bab C (Para 38b)',
      enforcement: 'DENY secara mutlak jika nama pegawai pemeriksa sepadan dengan pegawai penjaga bilik/makmal.',
      rationale: 'Mengelakkan pegawai daripada memeriksa atau menyembunyikan kerosakan aset dalam ruang jagaan sendiri.',
      level: 'Mandatori / Halangan Keras',
    },
    {
      id: 'POL_CROSS_INSPECTION_MANDATE',
      name: 'Mandat Gandingan Silang (Cross-Inspection Pairing Mandate)',
      pekeliling: '1PP AM 2.4 Bab C (Para 39)',
      enforcement: 'Hanya membenarkan tuntutan slot pemeriksaan bagi makmal di bawah jabatan rakan silang yang sah.',
      rationale: 'Memastikan audit fizikal dilaksanakan oleh pihak berkecuali dari luar jabatan pemilik aset.',
      level: 'Mandatori',
    },
    {
      id: 'POL_LO_COMPLIANCE_ENFORCED',
      name: 'Penguatkuasaan Pesanan Kerajaan / LO bagi Kerosakan',
      pekeliling: '1PP AM 2.4 Bab C & AM 2.5',
      enforcement: 'Borang KEW.PA-11 tidak boleh dihantar jika ada unit rosak tanpa No. Aduan & No. Pesanan Kerajaan (LO).',
      rationale: 'Mencegah pembiaran aset rosak tanpa tindakan pembaikan rasmi daripada unit senggaraan.',
      level: 'Mandatori Statutori',
    },
    {
      id: 'POL_IDLE_JUSTIFICATION_REQUIRED',
      name: 'Justifikasi Bertulis Aset Tidak Digunakan (Usang / Terbiar)',
      pekeliling: '1PP AM 2.4 Bab C & AM 2.7',
      enforcement: 'Wajib memilih Sebab Piawai Pekeliling dan ulasan teknikal terperinci sebelum meluluskan syor pelupusan.',
      rationale: 'Menjamin aset lapuk atau terbiar dilupuskan secara teratur melalui borang KEW.PA-19.',
      level: 'Mandatori Statutori',
    },
    {
      id: 'POL_MIN_TWO_INSPECTORS',
      name: 'Syarat Minimum Dua (2) Orang Pemeriksa',
      pekeliling: '1PP AM 2.4 Bab C (Para 38a)',
      enforcement: 'Kedua-dua slot Pemeriksa 1 dan Pemeriksa 2 wajib dituntut dan ditandatangani untuk perakuan muktamad.',
      rationale: 'Menepati kehendak tatacara perbendaharaan bahawa pemeriksaan aset memerlukan pengesahan dua saksi.',
      level: 'Mandatori Statutori',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-purple-950 text-white flex justify-between items-center">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold tracking-tight">
                Matriks Polisi PBAC (Policy-Based Access Control)
              </h3>
            </div>
            <p className="text-xs text-purple-200">
              Spesifikasi dasar keselamatan dan penguatkuasaan integriti AM 2.4 sistem e-JAS
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
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-950 text-xs">
            Enjin PBAC POLIKU menyelia setiap operasi transaksi di pelayan (Cloudflare Edge D1) bagi memastikan tiada pelanggaran tatacara pekeliling boleh berlaku secara tidak sengaja.
          </div>

          <div className="space-y-3">
            {policies.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 hover:border-purple-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded font-mono">
                      {p.id}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {p.pekeliling}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 self-start sm:self-auto">
                    {p.level}
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                  {p.name}
                </h4>

                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong>Penguatkuasaan:</strong> {p.enforcement}
                </p>

                <p className="text-[11px] text-slate-500 italic">
                  Rasional: {p.rationale}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
