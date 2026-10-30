import React from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Lock, 
  FileCheck,
  Building
} from 'lucide-react';
import { PbacAuditLog } from '@/lib/types';

interface AuditLogSectionProps {
  logs: PbacAuditLog[];
}

export default function AuditLogSection({ logs }: AuditLogSectionProps) {
  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-2 shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-purple-700" />
          <span className="text-xs font-bold text-purple-800 uppercase tracking-wider font-mono">
            Enjin PBAC (Policy-Based Access Control) & Integriti AM 2.4
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Jejak Audit & Penilaian Polisi Keselamatan
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
          Setiap tindakan kritikal (tuntutan lokasi makmal, perakuan KEW.PA-11, penguatkuasaan No. Aduan & LO, serta justifikasi pelupusan) dinilai oleh enjin dasar PBAC secara masa nyata untuk memelihara integriti tatacara kerajaan.
        </p>
      </div>

      {/* PBAC Policy Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-2xs">
          <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded font-mono">
            POL_CONFLICT_CUSTODIAN_GUARD
          </span>
          <h4 className="font-bold text-xs text-slate-900">
            Halangan Penjaga Ruang
          </h4>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Menolak (DENY) cubaan pegawai memeriksa makmal jagaan sendiri berpandukan 1PP AM 2.4 Bab C.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-2xs">
          <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded font-mono">
            POL_CROSS_INSPECTION_MANDATE
          </span>
          <h4 className="font-bold text-xs text-slate-900">
            Mandat Pemeriksaan Silang
          </h4>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Memastikan hanya pegawai daripada jabatan rakan silang dibenarkan menuntut slot pemeriksaan.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-mono">
            POL_LO_COMPLIANCE_ENFORCED
          </span>
          <h4 className="font-bold text-xs text-slate-900">
            Wajib Aduan & LO Kerosakan
          </h4>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Menyekat perakuan KEW.PA-11 jika ada aset rosak yang tidak mempunyai No. Aduan & No. Pesanan Kerajaan.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-2xs">
          <span className="text-[10px] font-bold text-orange-800 bg-orange-50 px-2 py-0.5 rounded font-mono">
            POL_IDLE_JUSTIFICATION_REQUIRED
          </span>
          <h4 className="font-bold text-xs text-slate-900">
            Justifikasi Bertulis Aset Usang
          </h4>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Mewajibkan pemilihan sebab piawai dan ulasan teknikal sebelum syor pelupusan KEW.PA-19 diluluskan.
          </p>
        </div>

      </div>

      {/* Audit Log Table - Flat square corners for maximized desktop UI */}
      <div className="bg-white rounded-none border border-slate-200 shadow-2xs">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h4 className="font-bold text-slate-800 text-xs sm:text-sm">
            Log Penilaian Keputusan PBAC (Audit Trail)
          </h4>
          <span className="text-xs text-slate-500 font-mono">
            {logs.length} Rekod Tersimpan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4 w-12 text-center">ID</th>
                <th className="py-2.5 px-4">Pegawai / Emel</th>
                <th className="py-2.5 px-4">Peranan Digunakan</th>
                <th className="py-2.5 px-4">Tindakan / Sasaran</th>
                <th className="py-2.5 px-4 text-center">Keputusan</th>
                <th className="py-2.5 px-4">Kod Dasar (Policy ID)</th>
                <th className="py-2.5 px-4">Sebab / Catatan Integriti</th>
                <th className="py-2.5 px-4">Masa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-4 text-center font-mono text-slate-400">
                    {log.id}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-800">
                    {log.userEmail}
                  </td>
                  <td className="py-2.5 px-4">
                    {log.actedAsRole ? (
                      <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-800 border border-indigo-200">
                        {log.actedAsRole}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">
                    <span className="font-semibold text-slate-900">{log.action}</span>
                    {log.resourceId && <span className="text-slate-400 block text-[10px]">{log.resourceId}</span>}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {log.decision === 'PERMIT' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 font-mono">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>PERMIT</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 font-mono">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        <span>DENY</span>
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-purple-900 font-semibold">
                    {log.policyId}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 leading-snug">
                    {log.reason && (
                      <span className="mb-1 inline-flex rounded bg-amber-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-800 border border-amber-200">
                        {log.reason}
                      </span>
                    )}
                    <span className="block">{log.notes}</span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                    {log.timestamp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
