import React from 'react';
import { 
  BookOpen, 
  ShieldCheck, 
  Wrench, 
  Recycle, 
  ArrowLeftRight, 
  FileCheck, 
  AlertCircle,
  FileText,
  CalendarCheck
} from 'lucide-react';

export default function PekelilingSection() {
  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-2 shadow-xs">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-sky-800" />
          <span className="text-xs font-bold text-sky-800 uppercase tracking-wider font-mono">
            Rujukan Perbendaharaan Malaysia
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Tatacara Pengurusan Aset Alih Kerajaan (1PP / AM 2.4)
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
          Panduan dan ketetapan perundangan rasmi bagi perancangan, pemeriksaan fizikal, pelaporan borang KEW.PA, dan pembentangan Mesyuarat Jawatankuasa Pengurusan Aset Kerajaan (JKPAK) di Politeknik Kuching Sarawak.
        </p>
      </div>

      {/* Grid of Key Provisions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        
        {/* Rule 1 */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-800 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm">
            1. Pelantikan Pegawai Pemeriksa (AM 2.4 Bab C Para 38)
          </h4>
          <p className="text-slate-600 leading-relaxed">
            Pegawai Pengawal atau Pengarah Politeknik hendaklah melantik sekurang-kurangnya <strong>dua (2) orang Pegawai Pemeriksa</strong> yang tidak menguruskan aset tersebut secara langsung. Pegawai <strong>dilarang mutlak</strong> daripada memeriksa lokasi di mana beliau merupakan Pegawai Penjaga Ruang (*room custodian*).
          </p>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700">
            <strong>Implikasi Sistem Inspect-Able:</strong> Modul PBAC menyekat sebarang cubaan pegawai untuk menuntut slot pemeriksaan di makmal jagaan sendiri.
          </div>
        </div>

        {/* Rule 2 */}
        <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/30 space-y-3 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
            <Wrench className="w-5 h-5 text-amber-700" />
          </div>
          <h4 className="font-bold text-amber-950 text-sm">
            2. Pematuhan Aset Rosak & Pesanan Kerajaan (LO)
          </h4>
          <p className="text-amber-900 leading-relaxed">
            Setiap kerosakan aset yang dikesan semasa semakan fizikal <strong>wajib disertakan No. Rujukan Laporan Aduan Kerosakan Rasmi</strong>. Sebarang kerja pembaikan yang melibatkan pembayaran kerajaan mestilah disahkan dengan <strong>No. Pesanan Kerajaan (Local Order - LO)</strong>.
          </p>
          <div className="p-3 bg-amber-100/70 border border-amber-200 rounded-xl text-[11px] text-amber-950">
            <strong>Ketetapan Audit:</strong> Jika kuantiti rosak &gt; 0 di borang KEW.PA-11, borang tidak boleh dihantar tanpa rekod aduan dan status LO yang sah.
          </div>
        </div>

        {/* Rule 3 */}
        <div className="p-5 rounded-2xl border border-orange-200 bg-orange-50/30 space-y-3 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-900 flex items-center justify-center font-bold">
            <Recycle className="w-5 h-5 text-orange-700" />
          </div>
          <h4 className="font-bold text-orange-950 text-sm">
            3. Aset Tidak Digunakan / Usang (Idle Asset)
          </h4>
          <p className="text-orange-900 leading-relaxed">
            Aset yang tidak digunakan, luput teknologi, atau tidak ekonomik dibaiki tidak boleh dibiarkan terbiar di dalam makmal. Pegawai Pemeriksa wajib menyatakan sebab piawai pekeliling dan ulasan justifikasi bertulis bagi syor pelupusan segera (KEW.PA-19) atau pindahan (KEW.PA-9).
          </p>
          <div className="p-3 bg-orange-100/70 border border-orange-200 rounded-xl text-[11px] text-orange-950">
            <strong>Sebab Piawai Pekeliling:</strong> Perubahan silibus PdP, teknologi lapuk tanpa sokongan perisian, alat ganti tiada di pasaran, atau kos baiki melebihi 50% nilai asal.
          </div>
        </div>

        {/* Rule 4 */}
        <div className="p-5 rounded-2xl border border-teal-200 bg-teal-50/30 space-y-3 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-900 flex items-center justify-center font-bold">
            <ArrowLeftRight className="w-5 h-5 text-teal-700" />
          </div>
          <h4 className="font-bold text-teal-950 text-sm">
            4. Integriti Pemeriksaan Silang (Cross-Inspection)
          </h4>
          <p className="text-teal-900 leading-relaxed">
            Bagi memastikan audit fizikal bebas, telus, dan berintegriti, pemeriksaan makmal/bengkel mestilah dilakukan oleh pegawai daripada rakan silang yang berasingan (contoh: JTMK ⇄ JKE) dan bukan diperiksa sesama rakan sepejabat satu jabatan.
          </p>
          <div className="p-3 bg-teal-100/70 border border-teal-200 rounded-xl text-[11px] text-teal-950">
            <strong>Gandingan Rasmi:</strong> POLIKU menetapkan 6 pasang gandingan rasmi bagi memastikan 100% ruang diperiksa secara objektif.
          </div>
        </div>

      </div>

      {/* Summary Table of Inspection Cycles */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm">
          Kitaran Takwim JKPAK & Tanggungjawab Pegawai
        </h3>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
              <tr>
                <th className="py-2.5 px-4">Fasa / Suku Tahun</th>
                <th className="py-2.5 px-4">Aktiviti Pemeriksaan Fizikal</th>
                <th className="py-2.5 px-4">Tindakan Susulan JKPAK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 px-4 font-bold text-slate-800">Suku 1 (Jan - Mac)</td>
                <td className="py-3 px-4">Penyediaan takwim KEW.PA-10 & pelantikan rasmi pemeriksa</td>
                <td className="py-3 px-4 text-slate-600">Mesyuarat JKPAK Bil. 1/2026</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-800">Suku 2 (Apr - Jun)</td>
                <td className="py-3 px-4">Pemeriksaan fizikal fasa awal & aduan kerosakan LO</td>
                <td className="py-3 px-4 text-slate-600">Mesyuarat JKPAK Bil. 2/2026</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-800">Suku 3 (Jul - Sep)</td>
                <td className="py-3 px-4">Pemeriksaan silang lanjutan & semakan aset usang</td>
                <td className="py-3 px-4 text-slate-600">Mesyuarat JKPAK Bil. 3/2026</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-800">Suku 4 (Okt - Dis)</td>
                <td className="py-3 px-4">Kompilasi muktamad 100% KEW.PA-11 & pelupusan KEW.PA-19</td>
                <td className="py-3 px-4 text-slate-600">Mesyuarat JKPAK Bil. 4/2026 & Kertas Pembentangan Tahunan</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
