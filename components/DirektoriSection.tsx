'use client';

import React, { useState } from 'react';
import { 
  Users, 
  ArrowLeftRight, 
  Building2, 
  ShieldCheck, 
  UserCheck, 
  Search,
  CheckCircle2,
  Phone,
  Mail
} from 'lucide-react';
import { DEPARTMENTS, CROSS_PAIRS } from '@/lib/initialData';

export default function DirektoriSection() {
  const [searchTerm, setSearchTerm] = useState('');

  // Pair list deduplicated
  const pairedCards = [
    { a: 'JTMK', b: 'JKE', nameA: 'Jabatan Teknologi Maklumat & Komunikasi', nameB: 'Jabatan Kejuruteraan Elektrik' },
    { a: 'JKM', b: 'JKA', nameA: 'Jabatan Kejuruteraan Mekanikal', nameB: 'Jabatan Kejuruteraan Awam' },
    { a: 'JP', b: 'JPA', nameA: 'Jabatan Perdagangan', nameB: 'Jabatan Pengajian Am' },
    { a: 'JMSK', b: 'PENTADBIRAN', nameA: 'Jabatan Matematik, Sains & Komputer', nameB: 'Pentadbiran & Unit Pengurusan Aset' },
    { a: 'HAL EHWAL PELAJAR', b: 'PSA', nameA: 'Jabatan Hal Ehwal Pelajar (JHEP)', nameB: 'Perpustakaan Tan Sri Hamdan' },
    { a: 'CISEC', b: 'ULPL', nameA: 'CISEC', nameB: 'Unit Latihan & Pendidikan Lanjutan' },
  ];

  const filteredDepts = DEPARTMENTS.filter((dept) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      dept.id.toLowerCase().includes(q) ||
      dept.name.toLowerCase().includes(q) ||
      dept.ketuaPemeriksa?.toLowerCase().includes(q) ||
      dept.penyelaras?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-2 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Direktori Pegawai & Gandingan Pemeriksaan Silang (Sesi 2026)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Gandingan rasmi Jawatankuasa Pengurusan Aset Kerajaan (JKPAK) POLIKU bagi memastikan ketelusan semakan fizikal 100% bebas daripada konflik kepentingan.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-xl whitespace-nowrap self-start sm:self-auto font-mono">
            Mod Aktif: Timbal Balik (⇄)
          </span>
        </div>
      </div>

      {/* Cross Pairs Grid */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-teal-700" />
          <span>Struktur Gandingan Pemeriksaan Silang Rasmi (AM 2.4)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pairedCards.map((pair, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl border border-teal-200 bg-teal-50/30 space-y-3 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-teal-900 flex items-center gap-1.5">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-teal-700" />
                  <span>Gandingan {idx + 1}</span>
                </span>
                <span className="text-[10px] bg-teal-100 text-teal-900 px-2 py-0.5 rounded font-mono font-bold">
                  Sesi 2026
                </span>
              </div>

              <div className="flex items-center justify-center gap-3 py-2">
                <div className="px-3.5 py-2 bg-white border border-teal-200 rounded-xl font-bold text-xs sm:text-sm text-slate-900 shadow-2xs text-center flex-1">
                  <div>{pair.a}</div>
                  <div className="text-[9px] text-slate-400 font-normal truncate mt-0.5">{pair.nameA}</div>
                </div>

                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold shrink-0">
                  <ArrowLeftRight className="w-4 h-4 text-teal-700" />
                </div>

                <div className="px-3.5 py-2 bg-white border border-teal-200 rounded-xl font-bold text-xs sm:text-sm text-slate-900 shadow-2xs text-center flex-1">
                  <div>{pair.b}</div>
                  <div className="text-[9px] text-slate-400 font-normal truncate mt-0.5">{pair.nameB}</div>
                </div>
              </div>

              <p className="text-[11px] text-teal-950 text-center leading-relaxed">
                Pegawai {pair.a} memeriksa makmal {pair.b}, dan sebaliknya pegawai {pair.b} memeriksa makmal {pair.a}.
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Directory of Department Officers */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Direktori Penyelaras & Ketua Pegawai Pemeriksa Jabatan
            </h3>
            <p className="text-xs text-slate-500">
              Senarai pegawai bertauliah yang dilantik untuk penyelarasan aset alih
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama pegawai atau jabatan..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepts.map((d) => (
            <div
              key={d.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2 text-xs hover:border-slate-300 transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{d.id}</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                  Rakan: {d.crossPartnerId}
                </span>
              </div>

              <p className="text-[11px] text-slate-600 line-clamp-1">
                {d.name}
              </p>

              <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-[11px]">
                <div className="flex items-start gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 block text-[10px]">Ketua Pemeriksa Dilantik:</span>
                    <strong className="text-slate-800">{d.ketuaPemeriksa || '-'}</strong>
                  </div>
                </div>

                <div className="flex items-start gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 block text-[10px]">Penyelaras Aset Jabatan:</span>
                    <strong className="text-slate-800">{d.penyelaras || '-'}</strong>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
