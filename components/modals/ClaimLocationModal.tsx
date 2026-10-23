'use client';

import React, { useState } from 'react';
import { X, Crosshair, ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { InspectionSchedule, UserSession } from '@/lib/types';
import { CROSS_PAIRS } from '@/lib/initialData';

interface ClaimLocationModalProps {
  schedules: InspectionSchedule[];
  currentUser: UserSession | null;
  onClose: () => void;
  onClaimSlot: (scheduleId: string, slot: 1 | 2) => void;
}

export default function ClaimLocationModal({
  schedules,
  currentUser,
  onClose,
  onClaimSlot,
}: ClaimLocationModalProps) {
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('');

  const myDept = currentUser?.dept || 'JTMK';
  const defaultTargetDept = CROSS_PAIRS[myDept] || 'JKE';
  const targetDept = selectedDeptFilter || defaultTargetDept;

  const targetList = schedules.filter((s) => s.jabatan === targetDept);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold tracking-tight">
                Tuntut Slot Pemeriksaan Silang (Cross-Inspection)
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              Pilih makmal atau bengkel rakan silang yang ingin anda periksa berpandukan ketetapan 1PP AM 2.4
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm flex-1">
          
          {/* Target Dept Banner */}
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-teal-800">Jabatan Sasaran Rakan Silang:</span>
                <span className="text-xs font-extrabold text-teal-950 bg-teal-200/80 px-2.5 py-0.5 rounded font-mono">
                  {targetDept}
                </span>
                <span className="text-[10px] text-teal-700 font-bold">(Timbal Balik ⇄)</span>
              </div>
              <p className="text-[11px] text-teal-800">
                Pegawai Menuntut: <strong>{currentUser?.name || 'Pegawai'}</strong> ({myDept})
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Tukar Sasaran:</label>
              <select
                value={targetDept}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="text-xs py-1.5 px-2.5 rounded-lg border border-teal-300 bg-white font-bold text-teal-950 focus:outline-none"
              >
                {Object.keys(CROSS_PAIRS).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* PBAC Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <span>
              <strong>Kawalan Keselamatan PBAC:</strong> Sekiranya nama anda tercatat sebagai Pegawai Penjaga Ruang (*room custodian*), sistem akan secara automatik menolak permohonan demi mematuhi 1PP AM 2.4 Bab C.
            </span>
          </div>

          {/* Table of Available Target Rooms */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-2.5 px-3">Kod & Nama Makmal</th>
                  <th className="py-2.5 px-3">Pegawai Penjaga Ruang</th>
                  <th className="py-2.5 px-3 text-center">Kuantiti</th>
                  <th className="py-2.5 px-3 text-center">Slot Pemeriksa 1</th>
                  <th className="py-2.5 px-3 text-center">Slot Pemeriksa 2</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {targetList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Tiada lokasi didaftarkan di bawah jabatan {targetDept} buat masa ini.
                    </td>
                  </tr>
                ) : (
                  targetList.map((item) => {
                    const isMyDeptRoom = item.jabatan === currentUser?.dept;
                    const isMePenjaga = currentUser && item.penjaga.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0]);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3">
                          <strong className="text-slate-900 block font-semibold">{item.lokasi}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">{item.kod || '-'}</span>
                        </td>

                        <td className="py-3 px-3 text-slate-700">
                          <span className="font-medium">{item.penjaga || 'Belum dinamakan'}</span>
                          {isMePenjaga && (
                            <span className="block text-[10px] font-bold text-rose-600 mt-0.5">
                              (Ruang Jagaan Anda!)
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center font-mono text-slate-600">
                          {item.kuantiti} unit
                        </td>

                        {/* Slot 1 */}
                        <td className="py-3 px-3 text-center">
                          {item.pemeriksa1 ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                              {item.pemeriksa1.split(' ')[0]}
                            </span>
                          ) : (
                            <button
                              onClick={() => onClaimSlot(item.id, 1)}
                              className="px-3 py-1 bg-teal-800 hover:bg-teal-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition"
                            >
                              Tuntut P1
                            </button>
                          )}
                        </td>

                        {/* Slot 2 */}
                        <td className="py-3 px-3 text-center">
                          {item.pemeriksa2 ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                              {item.pemeriksa2.split(' ')[0]}
                            </span>
                          ) : (
                            <button
                              onClick={() => onClaimSlot(item.id, 2)}
                              className="px-3 py-1 bg-teal-800 hover:bg-teal-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition"
                            >
                              Tuntut P2
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Modal Footer */}
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
