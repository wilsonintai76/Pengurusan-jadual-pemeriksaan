'use client';

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

  let totLokasi = selesaiData.length;
  let totBaik = 0;
  let totRosak = 0;
  let totUsang = 0;
  let totHilang = 0;

  // Group by department
  interface DeptGroup {
    lokasiList: InspectionSchedule[];
    baik: number;
    rosak: number;
    usang: number;
    hilang: number;
    loList: Array<{
      lokasi: string;
      bil: number;
      aduan: string;
      lo: string;
      status: string;
    }>;
    usangList: Array<{
      lokasi: string;
      bil: number;
      sebab: string;
      justifikasi: string;
      syor: string;
    }>;
  }

  const deptGroups: Record<string, DeptGroup> = {};

  selesaiData.forEach((item) => {
    const d = item.jabatan;
    if (!deptGroups[d]) {
      deptGroups[d] = {
        lokasiList: [],
        baik: 0,
        rosak: 0,
        usang: 0,
        hilang: 0,
        loList: [],
        usangList: [],
      };
    }

    const rep = item.laporanPraJkpak!;
    deptGroups[d].lokasiList.push(item);
    deptGroups[d].baik += rep.baik || 0;
    deptGroups[d].rosak += rep.rosak || 0;
    deptGroups[d].usang += rep.usang || 0;
    deptGroups[d].hilang += rep.hilang || 0;

    totBaik += rep.baik || 0;
    totRosak += rep.rosak || 0;
    totUsang += rep.usang || 0;
    totHilang += rep.hilang || 0;

    if (rep.rosak > 0) {
      deptGroups[d].loList.push({
        lokasi: item.lokasi,
        bil: rep.rosak,
        aduan: rep.noLaporanKerosakan || '-',
        lo: rep.noPesananKerajaan || '-',
        status: rep.statusPenyelenggaraan || 'Pesanan Kerajaan Dikeluarkan',
      });
    }

    if (rep.usang > 0) {
      deptGroups[d].usangList.push({
        lokasi: item.lokasi,
        bil: rep.usang,
        sebab: rep.sebabTidakDigunakan || '-',
        justifikasi: rep.justifikasiTidakDigunakan || '-',
        syor: rep.syorTindakanUsang || 'Pelupusan Segera (KEW.PA-19)',
      });
    }
  });

  const deptKeys = Object.keys(deptGroups);

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

      {/* Aggregate Numbers Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Lokasi Selesai
          </span>
          <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1 block">
            {totLokasi}
          </span>
          <span className="text-[10px] text-slate-400">Diperiksa 100%</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 text-center shadow-xs">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
            Aset Baik
          </span>
          <span className="text-2xl font-extrabold text-emerald-600 font-mono tabular-nums mt-1 block">
            {totBaik}
          </span>
          <span className="text-[10px] text-emerald-700 font-medium">Boleh digunakan</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 text-center shadow-xs">
          <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
            Perlu Baiki (LO)
          </span>
          <span className="text-2xl font-extrabold text-amber-600 font-mono tabular-nums mt-1 block">
            {totRosak}
          </span>
          <span className="text-[10px] text-amber-700 font-medium">Ada Aduan & LO</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-orange-200 text-center shadow-xs">
          <span className="text-[10px] font-bold text-orange-900 uppercase tracking-wider block">
            Syor Pelupusan
          </span>
          <span className="text-2xl font-extrabold text-orange-600 font-mono tabular-nums mt-1 block">
            {totUsang}
          </span>
          <span className="text-[10px] text-orange-700 font-medium">Usang / Luput</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 text-center shadow-xs">
          <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wider block">
            Tidak Dijumpai
          </span>
          <span className="text-2xl font-extrabold text-rose-600 font-mono tabular-nums mt-1 block">
            {totHilang}
          </span>
          <span className="text-[10px] text-rose-700 font-medium">Kehilangan fizikal</span>
        </div>

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
              Pegawai Pemeriksa perlu mengemukakan perakuan pemeriksaan di menu e-JAS terlebih dahulu.
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
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                      Baik: <strong>{grp.baik}</strong>
                    </span>
                    <span className="px-2 py-1 bg-amber-50 text-amber-800 rounded border border-amber-200">
                      Rosak (LO): <strong>{grp.rosak}</strong>
                    </span>
                    <span className="px-2 py-1 bg-orange-50 text-orange-800 rounded border border-orange-200">
                      Usang: <strong>{grp.usang}</strong>
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  
                  {/* Table 1: Rekod Aduan Kerosakan & Pesanan Kerajaan (LO) */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                      <Wrench className="w-3.5 h-3.5 text-amber-600" />
                      <span>1. Rekod Aduan Kerosakan & Pesanan Kerajaan (Local Order - LO)</span>
                    </h5>

                    {grp.loList.length > 0 ? (
                      <div className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50/20">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-amber-100/70 border-b border-amber-200 text-amber-950 font-semibold">
                            <tr>
                              <th className="py-2 px-3">Lokasi Ruang</th>
                              <th className="py-2 px-3 text-center w-16">Unit</th>
                              <th className="py-2 px-3">No. Rujukan Laporan Aduan</th>
                              <th className="py-2 px-3">No. Pesanan Kerajaan (LO)</th>
                              <th className="py-2 px-3">Status Pembaikan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-200/50">
                            {grp.loList.map((l, i) => (
                              <tr key={i} className="hover:bg-amber-50/40">
                                <td className="py-2 px-3 font-semibold text-slate-800">
                                  {l.lokasi}
                                </td>
                                <td className="py-2 px-3 text-center font-mono font-bold text-amber-700">
                                  {l.bil}
                                </td>
                                <td className="py-2 px-3 font-mono text-amber-900 font-medium">
                                  {l.aduan}
                                </td>
                                <td className="py-2 px-3 font-mono text-slate-900 font-bold">
                                  {l.lo}
                                </td>
                                <td className="py-2 px-3 text-slate-600 text-[11px]">
                                  {l.status}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        Tiada aset rosak dikesan yang memerlukan Pesanan Kerajaan (LO).
                      </p>
                    )}
                  </div>

                  {/* Table 2: Justifikasi Aset Tidak Digunakan (Usang / Terbiar) */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-orange-950 flex items-center gap-1.5 text-xs">
                      <Recycle className="w-3.5 h-3.5 text-orange-600" />
                      <span>2. Justifikasi Aset Tidak Digunakan (Syor Pelupusan / Pindahan)</span>
                    </h5>

                    {grp.usangList.length > 0 ? (
                      <div className="border border-orange-200 rounded-xl overflow-hidden bg-orange-50/20">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-orange-100/70 border-b border-orange-200 text-orange-950 font-semibold">
                            <tr>
                              <th className="py-2 px-3">Lokasi Ruang</th>
                              <th className="py-2 px-3 text-center w-16">Unit</th>
                              <th className="py-2 px-3">Sebab Piawai Pekeliling</th>
                              <th className="py-2 px-3">Ulasan Justifikasi Teknikal & Syor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-orange-200/50">
                            {grp.usangList.map((u, i) => (
                              <tr key={i} className="hover:bg-orange-50/40">
                                <td className="py-2 px-3 font-semibold text-slate-800">
                                  {u.lokasi}
                                </td>
                                <td className="py-2 px-3 text-center font-mono font-bold text-orange-700">
                                  {u.bil}
                                </td>
                                <td className="py-2 px-3 text-orange-900 font-medium">
                                  {u.sebab}
                                </td>
                                <td className="py-2 px-3 text-slate-700">
                                  <span className="italic">&ldquo;{u.justifikasi}&rdquo;</span> &bull;{' '}
                                  <strong className="text-slate-900 not-italic">
                                    {u.syor}
                                  </strong>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        Tiada aset usang atau tidak digunakan yang disyorkan pelupusan.
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
