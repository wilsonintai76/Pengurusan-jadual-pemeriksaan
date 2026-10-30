import React from 'react';
import { formatJulatTarikhMY } from '@/lib/tarikh';
import { ringkasLaporan, teksDokumen } from '@/lib/praJkpak';
import { InspectionSchedule } from '@/lib/types';

interface PrintAreaProps {
  mode: 'kewpa10' | 'praJkpak';
  schedules: InspectionSchedule[];
  /** Tahun sesi aktif (lalai tahun semasa). */
  tahun?: string;
}

export default function PrintArea({ mode, schedules, tahun }: PrintAreaProps) {
  const currentYear = Number(tahun) || new Date().getFullYear();

  if (mode === 'kewpa10') {
    return (
      <div id="printArea" className="font-sans text-black leading-relaxed p-6 bg-white">
        <div className="text-center border-b-2 border-black pb-3 mb-4">
          <h2 className="text-lg font-bold uppercase tracking-wider m-0">
            POLITEKNIK KUCHING SARAWAK
          </h2>
          <h3 className="text-base font-bold m-1">
            JADUAL PEMERIKSAAN ASET ALIH KERAJAAN TAHUNAN (KEW.PA-10)
          </h3>
          <p className="text-xs text-gray-700 m-0">
            TAKWIM PEMERIKSAAN FIZIKAL 100% BERPANDUKAN 1PP AM 2.4 BAB C (SESI {currentYear})
          </p>
        </div>

        <table className="w-full border-collapse text-xs border border-black mb-6">
          <thead>
            <tr className="bg-gray-100 font-bold uppercase text-[10px]">
              <th className="border border-black p-2 text-center w-10">Bil</th>
              <th className="border border-black p-2 text-left">No. Rujukan Jadual</th>
              <th className="border border-black p-2 text-left">Jabatan & Lokasi Ruang</th>
              <th className="border border-black p-2 text-center w-12">Siri</th>
              <th className="border border-black p-2 text-left">Kategori & Unit</th>
              <th className="border border-black p-2 text-center">Tarikh Rancangan</th>
              <th className="border border-black p-2 text-left">Pegawai Pemeriksa Dilantik</th>
              <th className="border border-black p-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s, idx) => (
              <tr key={s.id}>
                <td className="border border-black p-2 text-center font-mono">{idx + 1}</td>
                <td className="border border-black p-2 font-mono">{s.kod || '-'}</td>
                <td className="border border-black p-2">
                  <strong>{s.jabatan}</strong> - {s.lokasi}
                </td>
                <td className="border border-black p-2 text-center font-mono font-bold">
                  {s.siri ?? '-'}
                </td>
                <td className="border border-black p-2">
                  {s.kategori} ({s.kuantiti} unit)
                </td>
                <td className="border border-black p-2 text-center font-mono text-[11px]">
                  {formatJulatTarikhMY(s.tarikhMula, s.tarikhTamat)}
                </td>
                <td className="border border-black p-2 text-[11px]">
                  1. {s.pemeriksa1 || 'Belum dituntut'}<br />
                  2. {s.pemeriksa2 || 'Belum dituntut'}
                </td>
                <td className="border border-black p-2 text-center font-semibold">
                  {s.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signature Section */}
        <div className="mt-8 flex justify-between text-xs pt-4">
          <div>
            <p>Disediakan Oleh:</p>
            <div className="h-14"></div>
            <p className="border-t border-black w-56 font-bold pt-1">
              Pegawai Aset (UAP)<br />
              Politeknik Kuching Sarawak
            </p>
          </div>

          <div>
            <p>Diluluskan Oleh:</p>
            <div className="h-14"></div>
            <p className="border-t border-black w-56 font-bold pt-1">
              Pengarah<br />
              Politeknik Kuching Sarawak
            </p>
          </div>
        </div>
      </div>
    );
  }

  // mode === 'praJkpak'
  const selesai = schedules.filter((s) => s.status === 'Selesai' && s.laporanPraJkpak);

  return (
    <div id="printArea" className="font-sans text-black leading-relaxed p-6 bg-white">
      <div className="text-center border-b-2 border-black pb-3 mb-4">
        <h2 className="text-lg font-bold uppercase tracking-wider m-0">
          POLITEKNIK KUCHING SARAWAK
        </h2>
        <h3 className="text-base font-bold m-1 uppercase">
          KERTAS PEMBENTANGAN MESYUARAT PRA-JKPAK (SESI {currentYear})
        </h3>
        <p className="text-xs text-gray-700 m-0">
          KOMPILASI DAPATAN PEMERIKSAAN FIZIKAL ASET ALIH KERAJAAN (KEW.PA-11) & PEMATUHAN 1PP AM 2.4
        </p>
      </div>

      <table className="w-full border-collapse text-[11px] border border-black mb-6">
        <thead>
          <tr className="bg-gray-100 font-bold uppercase text-[9px]">
            <th className="border border-black p-1.5 text-center w-8">Bil</th>
            <th className="border border-black p-1.5 text-left">Lokasi / Jabatan</th>
            <th className="border border-black p-1.5 text-left">Pegawai Pemeriksa</th>
            <th className="border border-black p-1.5 text-center w-9">A</th>
            <th className="border border-black p-1.5 text-center w-9">B</th>
            <th className="border border-black p-1.5 text-center w-9">C</th>
            <th className="border border-black p-1.5 text-center w-9">D</th>
            <th className="border border-black p-1.5 text-center w-9">E</th>
            <th className="border border-black p-1.5 text-center w-9">F</th>
            <th className="border border-black p-1.5 text-left">Dokumen Sokongan (C–F) & Justifikasi B</th>
            <th className="border border-black p-1.5 text-left">Syor Pemeriksa Pra-JKPAK</th>
          </tr>
        </thead>
        <tbody>
          {selesai.length === 0 ? (
            <tr>
              <td colSpan={11} className="border border-black p-6 text-center text-xs">
                Tiada rekod pemeriksaan selesai untuk dibentangkan.
              </td>
            </tr>
          ) : (
            selesai.map((item, idx) => {
              const ringkasan = ringkasLaporan(item.laporanPraJkpak);
              const { pecahan } = ringkasan;
              return (
                <tr key={item.id}>
                  <td className="border border-black p-1.5 text-center font-mono">{idx + 1}</td>
                  <td className="border border-black p-1.5">
                    <strong>{item.jabatan}</strong><br />
                    <span>{item.lokasi}</span>
                  </td>
                  <td className="border border-black p-1.5 text-[10px]">
                    1. {item.pemeriksa1}<br />
                    2. {item.pemeriksa2}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono font-bold">
                    {pecahan.A}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono font-bold">
                    {pecahan.B}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono font-bold">
                    {pecahan.C}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono font-bold">
                    {pecahan.D}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono font-bold">
                    {pecahan.E}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono font-bold text-red-700">
                    {pecahan.F}
                  </td>
                  <td className="border border-black p-1.5 text-[9px]">
                    {ringkasan.dokumen.length === 0 && !ringkasan.sebabTidakDigunakan ? (
                      <span className="text-gray-500">Tiada dokumen diperlukan</span>
                    ) : (
                      <div className="space-y-0.5">
                        {ringkasan.dokumen.map((dokumen) => (
                          <div key={dokumen.kod}>
                            <strong>{dokumen.kod}</strong> ({dokumen.bilangan}) {dokumen.jenisDokumen}:{' '}
                            <span>{teksDokumen(dokumen)}</span>
                          </div>
                        ))}
                        {ringkasan.sebabTidakDigunakan && (
                          <div>
                            <strong>B</strong> sebab: <span>{ringkasan.sebabTidakDigunakan}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="border border-black p-1.5 text-[10px]">
                    {ringkasan.cadangan || 'Tiada syor khas.'}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Signature Section */}
      <div className="mt-8 flex justify-between text-xs pt-4">
        <div>
          <p>Disediakan Oleh:</p>
          <div className="h-14"></div>
          <p className="border-t border-black w-64 font-bold pt-1">
            Ketua Pegawai Pemeriksa Aset<br />
            Politeknik Kuching Sarawak
          </p>
        </div>

        <div>
          <p>Disahkan & Dipengerusikan Oleh:</p>
          <div className="h-14"></div>
          <p className="border-t border-black w-64 font-bold pt-1">
            Pengerusi Mesyuarat Pra-JKPAK<br />
            Timbalan Pengarah / Pegawai Pengawal
          </p>
        </div>
      </div>
    </div>
  );
}
