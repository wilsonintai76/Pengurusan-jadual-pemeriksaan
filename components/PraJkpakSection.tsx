import React from 'react';
import { 
  FileSignature, 
  FileSpreadsheet, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Recycle, 
  HelpCircle,
  FileText,
  Building,
  Wrench,
  FolderOpen
} from 'lucide-react';
import { InspectionSchedule } from '@/lib/types';
import {
  JENIS_DOKUMEN,
  LABEL_STATUS,
  ringkasLaporan,
  teksDokumen,
  type RingkasanPraJkpak,
} from '@/lib/praJkpak';

interface PraJkpakSectionProps {
  schedules: InspectionSchedule[];
  onExportCSV: () => void;
  onPrintWorkingPaper: () => void;
}

export default function PraJkpakSection({
  schedules,
  onExportCSV,
  onPrintWorkingPaper,
}: PraJkpakSectionProps) {
  const selesaiData = schedules.filter(
    (s) => s.status === 'Selesai' && s.laporanPraJkpak
  );

  const totLokasi = selesaiData.length;
  /** Jumlah setiap status A–F — terus daripada KEW.PA-11 (bukan 4 kategori warisan). */
  const totPecahan = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
  let totAset = 0;

  // Group by department
  interface DeptGroup {
    lokasiList: InspectionSchedule[];
    ringkasan: RingkasanPraJkpak[];
    pecahan: typeof totPecahan;
    jumlahAset: number;
  }

  const deptGroups: Record<string, DeptGroup> = {};

  selesaiData.forEach((item) => {
    const d = item.jabatan;
    if (!deptGroups[d]) {
      deptGroups[d] = {
        lokasiList: [],
        ringkasan: [],
        pecahan: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
        jumlahAset: 0,
      };
    }

    const ringkasan = ringkasLaporan(item.laporanPraJkpak);
    deptGroups[d].lokasiList.push(item);
    deptGroups[d].ringkasan.push(ringkasan);
    deptGroups[d].jumlahAset += ringkasan.jumlahDiperiksa;
    totAset += ringkasan.jumlahDiperiksa;

    (['A', 'B', 'C', 'D', 'E', 'F'] as const).forEach((kod) => {
      deptGroups[d].pecahan[kod] += ringkasan.pecahan[kod];
      totPecahan[kod] += ringkasan.pecahan[kod];
    });
  });

  const deptKeys = Object.keys(deptGroups);

  /** Baris dokumen sokongan (C/D/E/F) merentas semua lokasi jabatan. */
  const barisDokumen = (grp: DeptGroup) =>
    grp.ringkasan.flatMap((ringkasan, idx) =>
      ringkasan.dokumen.map((dokumen) => ({
        lokasi: grp.lokasiList[idx].lokasi,
        ...dokumen,
      }))
    );

  /** Baris status B (Tidak Digunakan) dengan sebab piawai. */
  const barisTidakDigunakan = (grp: DeptGroup) =>
    grp.ringkasan
      .map((ringkasan, idx) => ({
        lokasi: grp.lokasiList[idx].lokasi,
        bilangan: ringkasan.pecahan.B,
        sebab: ringkasan.sebabTidakDigunakan,
      }))
      .filter((baris) => baris.bilangan > 0);

  const WARNA_KPI: Record<keyof typeof totPecahan, string> = {
    A: 'border-emerald-200 text-emerald-700',
    B: 'border-slate-300 text-slate-700',
    C: 'border-amber-200 text-amber-700',
    D: 'border-sky-200 text-sky-700',
    E: 'border-indigo-200 text-indigo-700',
    F: 'border-rose-200 text-rose-700',
  };

  return (
    <div className="space-y-6">
      
      {/* Executive Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
            <FileSignature className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Kompilasi Dapatan Pemeriksaan Mesyuarat Pra-JKPAK
              </h3>
              <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded font-mono">
                Sesi 2026
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              Laporan agregat ini menyatukan semua penemuan makmal fizikal bagi membolehkan Ketua Pemeriksa Aset membentangkan laporan keseluruhan jabatan kepada Pengerusi Jawatankuasa Pengurusan Aset Kerajaan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onExportCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Eksport CSV Pra-JKPAK</span>
          </button>

          <button
            onClick={onPrintWorkingPaper}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-xs transition flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Kertas Pembentangan</span>
          </button>
        </div>
      </div>

      {/* Aggregate Numbers Bar — selaras KEW.PA-11 (A–F) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5">
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Lokasi Selesai
          </span>
          <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1 block">
            {totLokasi}
          </span>
          <span className="text-[10px] text-slate-400">{totAset} aset diperiksa</span>
        </div>

        {(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((kod) => (
          <div
            key={kod}
            className={`bg-white p-4 rounded-xl border text-center shadow-xs ${WARNA_KPI[kod]}`}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wider">
              {kod}. {LABEL_STATUS[kod]}
            </span>
            <span className="mt-1 block font-mono text-2xl font-extrabold tabular-nums">
              {totPecahan[kod]}
            </span>
            <span className="text-[10px] font-medium opacity-80">
              {kod === 'C' || kod === 'D' || kod === 'E' || kod === 'F'
                ? JENIS_DOKUMEN[kod]
                : kod === 'B'
                  ? 'Perlu justifikasi'
                  : 'Baki KEW.PA-7'}
            </span>
          </div>
        ))}

      </div>

      {/* Compiled Department Cards Container */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h4 className="font-bold text-slate-800 text-sm">
            Rumusan Eksekutif Mengikut Jabatan / Unit
          </h4>
          <span className="text-xs text-slate-500 font-medium">
            Kompilasi automatik daripada borang perakuan KEW.PA-11
          </span>
        </div>

        {deptKeys.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">
              Belum ada laporan KEW.PA-11 yang disahkan selesai.
            </p>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              Pegawai Pemeriksa perlu mengemukakan perakuan pemeriksaan di menu Inspect-Able terlebih dahulu.
            </p>
          </div>
        ) : (
          deptKeys.map((dept) => {
            const grp = deptGroups[dept];
            return (
              <div
                key={dept}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-0"
              >
                {/* Department Header */}
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                        {dept}
                      </h4>
                      <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded font-mono">
                        {grp.lokasiList.length} Lokasi Disahkan
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Ringkasan penemuan pemeriksaan fizikal bagi lokasi di bawah jabatan ini
                    </p>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
                    {(['A', 'B', 'C', 'D', 'E', 'F'] as const)
                      .filter((kod) => grp.pecahan[kod] > 0)
                      .map((kod) => (
                        <span
                          key={kod}
                          className={`px-2 py-1 rounded border ${WARNA_KPI[kod]} bg-white`}
                        >
                          {kod}: <strong>{grp.pecahan[kod]}</strong>
                        </span>
                      ))}
                  </div>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  
                  {/* Table 1: Dokumen sokongan C–F (laporan kerosakan, LPO, pinjaman, polis) */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                      <Wrench className="w-3.5 h-3.5 text-amber-600" />
                      <span>1. Dokumen Sokongan Status C–F (KEW.PA-11)</span>
                    </h5>

                    {barisDokumen(grp).length > 0 ? (
                      <div className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50/20">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-amber-100/70 border-b border-amber-200 text-amber-950 font-semibold">
                            <tr>
                              <th className="py-2 px-3">Lokasi Ruang</th>
                              <th className="py-2 px-3 text-center w-16">Unit</th>
                              <th className="py-2 px-3">Status</th>
                              <th className="py-2 px-3">Dokumen Diperlukan</th>
                              <th className="py-2 px-3">Rekod Pemeriksa</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-200/50">
                            {barisDokumen(grp).map((l, i) => (
                              <tr key={`${l.lokasi}-${l.kod}-${i}`} className="hover:bg-amber-50/40">
                                <td className="py-2 px-3 font-semibold text-slate-800">
                                  {l.lokasi}
                                </td>
                                <td className="py-2 px-3 text-center font-mono font-bold text-amber-700">
                                  {l.bilangan}
                                </td>
                                <td className="py-2 px-3 font-semibold text-slate-700">
                                  {l.kod}. {l.label}
                                </td>
                                <td className="py-2 px-3 text-slate-600 text-[11px]">
                                  {l.jenisDokumen}
                                </td>
                                <td
                                  className={`py-2 px-3 font-mono text-[11px] ${
                                    l.adaDokumen === true
                                      ? 'font-semibold text-emerald-800'
                                      : l.adaDokumen === false
                                        ? 'font-semibold text-rose-700'
                                        : 'text-slate-500'
                                  }`}
                                >
                                  {teksDokumen(l)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        Tiada aset dalam status C–F bagi jabatan ini.
                      </p>
                    )}
                  </div>

                  {/* Table 2: Justifikasi status B (Tidak Digunakan) */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-orange-950 flex items-center gap-1.5 text-xs">
                      <Recycle className="w-3.5 h-3.5 text-orange-600" />
                      <span>2. Justifikasi Aset Tidak Digunakan (Status B — Syor Pelupusan / Pindahan)</span>
                    </h5>

                    {barisTidakDigunakan(grp).length > 0 ? (
                      <div className="border border-orange-200 rounded-xl overflow-hidden bg-orange-50/20">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-orange-100/70 border-b border-orange-200 text-orange-950 font-semibold">
                            <tr>
                              <th className="py-2 px-3">Lokasi Ruang</th>
                              <th className="py-2 px-3 text-center w-16">Unit</th>
                              <th className="py-2 px-3">Sebab Piawai Pekeliling</th>
                              <th className="py-2 px-3">Cadangan Pemeriksa</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-orange-200/50">
                            {barisTidakDigunakan(grp).map((u, i) => (
                              <tr key={`${u.lokasi}-${i}`} className="hover:bg-orange-50/40">
                                <td className="py-2 px-3 font-semibold text-slate-800">
                                  {u.lokasi}
                                </td>
                                <td className="py-2 px-3 text-center font-mono font-bold text-orange-700">
                                  {u.bilangan}
                                </td>
                                <td className="py-2 px-3 text-orange-900 font-medium">
                                  {u.sebab || 'Tidak direkod'}
                                </td>
                                <td className="py-2 px-3 text-slate-700">
                                  {grp.lokasiList[i]?.laporanPraJkpak?.cadangan || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        Tiada aset tidak digunakan yang disyorkan pelupusan.
                      </p>
                    )}
                  </div>

                  {/* Summary of Inspector Recommendations */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                      Catatan & Syor Pemeriksa untuk Mesyuarat Pra-JKPAK:
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                      {grp.lokasiList.map((item) => (
                        <li key={item.id}>
                          <strong>{item.lokasi}:</strong>{' '}
                          {item.laporanPraJkpak?.cadangan || 'Pemeriksaan fizikal selesai tanpa isu signifikan.'}
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
