'use client';

import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  Eye, 
  CheckCircle, 
  Printer, 
  ExternalLink,
  X
} from 'lucide-react';
import { BORANG_KEWPA_LIST } from '@/lib/initialData';
import { BorangKewpaInfo } from '@/lib/types';

interface BorangSectionProps {
  onPrintKewpa10: () => void;
}

export default function BorangSection({ onPrintKewpa10 }: BorangSectionProps) {
  const [selectedBorang, setSelectedBorang] = useState<BorangKewpaInfo | null>(null);

  const handleDownloadSample = (borang: BorangKewpaInfo) => {
    let content = `KERAJAAN MALAYSIA\nPOLITEKNIK KUCHING SARAWAK\nBORANG ${borang.code} - ${borang.title}\n`;
    content += `Rujukan: ${borang.pekelilingBab}\n`;
    content += `Keterangan: ${borang.description}\n`;
    content += `Tarikh Cetakan: ${new Date().toLocaleDateString('ms-MY')}\n\n`;
    
    if (borang.code === 'KEW.PA-7') {
      content += `No. Bil,Kategori,Keterangan Aset,No Siri Pendaftaran,Kuantiti,Pegawai Bertanggungjawab\n`;
      content += `1,Harta Modal,Komputer Riba Dell Latitude,KPT/PKU/H/26/001,1,Ts. Mohd Fadzli\n`;
      content += `2,ABR,Projektor Epson EB-X06,KPT/PKU/R/26/014,1,Pn. Siti Rohana\n`;
    } else if (borang.code === 'KEW.PA-9') {
      content += `No. Bil,No Siri Pendaftaran,Keterangan Aset,Jabatan Asal,Jabatan Penerima,Sebab Pindahan\n`;
      content += `1,KPT/PKU/H/24/110,Mesin Pencetak Laser HP,JTMK,JKE,Pertukaran fungsi makmal\n`;
    } else if (borang.code === 'KEW.PA-10') {
      content += `No. Bil,No Rujukan Jadual,Lokasi Makmal,Kategori,Tarikh Pemeriksaan,Pegawai Pemeriksa 1,Pegawai Pemeriksa 2,Status\n`;
      content += `1,JAD/JTMK/2026/01,Makmal Multimedia 1,Semua,2026-02-10,Pn. Rosnah (DH44),En. Kevin Lim (DH41),Selesai\n`;
    } else if (borang.code === 'KEW.PA-11') {
      content += `No. Bil,Keterangan Aset,No Siri,Lokasi Fizikal,Keadaan (Baik/Rosak/Usang),No Aduan Kerosakan,No Pesanan Kerajaan (LO),Syor Pemeriksa\n`;
      content += `1,Server Rack 42U,KPT/PKU/H/23/004,Bilik Server,Baik,-,-,Kekalkan dan selenggara berkala\n`;
      content += `2,Monitor LED 24 inci,KPT/PKU/R/22/089,Makmal 1,Rosak,ADU/JTMK/2026/008,LO/PKU/2026/P1044,Ganti panel paparan\n`;
    } else {
      content += `No. Bil,Keterangan Aset,No Siri,Tarikh Perolehan,Harga Asal (RM),Nilai Semasa,Keadaan,Sebab Pelupusan,Kaedah Syor\n`;
      content += `1,Bekalan Kuasa DC Bench,KPT/PKU/H/15/012,2015-04-10,3500.00,0.00,Usang,Teknologi lapuk tanpa ganti,Jualan Sisa\n`;
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Format_${borang.code}_POLIKU.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-2 shadow-xs">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Pusat Muat Turun & Templat Borang Rasmi KEW.PA
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
          Format rasmi tatacara pengurusan aset alih kerajaan (1PP AM 2.4 & AM 2.7) untuk kegunaan Penyelaras Aset Jabatan, Pegawai Penjaga Ruang, dan Pegawai Pemeriksa di Politeknik Kuching Sarawak.
        </p>
      </div>

      {/* Grid of Borang Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {BORANG_KEWPA_LIST.map((borang) => (
          <div
            key={borang.code}
            className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition"
          >
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded border border-sky-100 font-mono">
                  {borang.code}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {borang.status}
                </span>
              </div>

              <h4 className="font-bold text-slate-900 text-sm">
                {borang.title}
              </h4>

              <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                {borang.description}
              </p>

              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                <div className="font-semibold text-slate-700">Tujuan Penggunaan:</div>
                <div>{borang.purpose}</div>
              </div>
            </div>

            <div className="pt-2 flex gap-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedBorang(borang)}
                className="flex-1 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-slate-600" />
                <span>Lihat Format</span>
              </button>

              <button
                onClick={() => handleDownloadSample(borang)}
                className="flex-1 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                <span>Muat Turun CSV</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Preview Borang */}
      {selectedBorang && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto text-xs sm:text-sm">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded font-mono">
                  {selectedBorang.code}
                </span>
                <h3 className="font-bold text-base text-slate-900 mt-1">
                  {selectedBorang.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBorang(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="text-xs text-slate-600">
                  <strong>Rujukan Perbendaharaan:</strong> {selectedBorang.pekelilingBab}
                </p>
                <p className="text-xs text-slate-600">
                  <strong>Pematuhan:</strong> {selectedBorang.status}
                </p>
              </div>

              <div>
                <h5 className="font-bold text-slate-800 mb-1">Penerangan:</h5>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {selectedBorang.description}
                </p>
              </div>

              <div>
                <h5 className="font-bold text-slate-800 mb-1">Tujuan & Prosedur:</h5>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {selectedBorang.purpose}
                </p>
              </div>

              {selectedBorang.code === 'KEW.PA-10' && (
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs text-sky-900 font-medium">
                    Jadual Takwim KEW.PA-10 dijana secara langsung melalui data e-JAS Politeknik.
                  </span>
                  <button
                    onClick={() => {
                      setSelectedBorang(null);
                      onPrintKewpa10();
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-800 hover:bg-sky-900 text-white transition flex items-center gap-1.5 shrink-0"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Sekarang</span>
                  </button>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setSelectedBorang(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  handleDownloadSample(selectedBorang);
                  setSelectedBorang(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                <span>Muat Turun Format CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
