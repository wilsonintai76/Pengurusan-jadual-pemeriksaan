import React, { useMemo } from 'react';
import { ArrowLeftRight, Info } from 'lucide-react';
import type { DepartmentInfo, UserSession } from '@/lib/types';

interface CrossPairMatrixProps {
  departments: DepartmentInfo[];
  officers: UserSession[];
}

/**
 * Matriks gandingan pemeriksaan silang (⇄) — dibaca daripada
 * `departments.crossPartnerId` di D1, bukan senarai berkod keras.
 * Dipaparkan dalam skrin Kitaran Pemeriksaan (Mod Pemeriksaan).
 */
export default function CrossPairMatrix({ departments, officers }: CrossPairMatrixProps) {
  const pairedCards = useMemo(() => {
    const byId = new Map(departments.map((dept) => [dept.id, dept]));
    const seen = new Set<string>();
    const cards: Array<{ a: string; b: string; nameA: string; nameB: string }> = [];

    departments.forEach((dept) => {
      const partnerId = dept.crossPartnerId?.trim();
      if (!partnerId) return;

      const key = [dept.id, partnerId].sort().join('|');
      if (seen.has(key)) return;
      seen.add(key);

      const partner = byId.get(partnerId);
      cards.push({
        a: dept.id,
        b: partnerId,
        nameA: dept.name,
        nameB: partner?.name ?? partnerId,
      });
    });

    return cards;
  }, [departments]);

  const countFor = (deptId: string) => officers.filter((user) => user.dept === deptId).length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-teal-100 p-1 text-teal-800">
              <ArrowLeftRight className="h-4 w-4" />
            </span>
            <h3 className="text-lg font-bold tracking-tight text-slate-900">
              Mod Pemeriksaan — Gandingan Silang (⇄) · {pairedCards.length} Gandingan
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            Di bawah ketetapan 1PP AM 2.4 Bab C, setiap jabatan digandingkan secara timbal balik (⇄) untuk
            memeriksa ruang rakan silang. Pegawai Penjaga Ruang dihalang memeriksa ruang jagaan sendiri.
          </p>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-2 text-[11px] font-medium text-indigo-900">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Gandingan ditetapkan pada <strong>Direktori Jabatan → Rakan Silang</strong>. Mod pemeriksaan
            sebenar (timbal balik/sehala, ujian beban dan agihan lokasi) dijana oleh pelan kitaran di atas.
          </span>
        </div>

        {pairedCards.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <ArrowLeftRight className="mx-auto h-6 w-6 text-slate-400" />
            <p className="mt-2 text-sm font-bold text-slate-700">Belum ada gandingan silang</p>
            <p className="mt-1 text-xs text-slate-500">
              Tetapkan <strong>Rakan Silang</strong> pada setiap jabatan di menu{' '}
              <strong>Direktori Jabatan</strong> untuk membentuk pasangan timbal balik.
            </p>
          </div>
        )}

        {pairedCards.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pairedCards.map((pair, idx) => (
              <div
                key={`${pair.a}-${pair.b}`}
                className="space-y-3 rounded-2xl border border-slate-200/90 bg-slate-50 p-4 transition hover:shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-teal-800">
                    Gandingan Silang #{idx + 1}
                  </span>
                  <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-700">
                    Timbal Balik (⇄)
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 space-y-1 rounded-xl border border-slate-200 bg-white p-3 text-center">
                    <span className="block font-mono text-sm font-extrabold text-slate-900">{pair.a}</span>
                    <span className="line-clamp-1 block text-[10px] text-slate-500">{pair.nameA}</span>
                    <span className="block pt-1 text-[10px] font-bold text-indigo-700">
                      {countFor(pair.a)} Pegawai
                    </span>
                  </div>

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 font-bold text-amber-400 shadow-2xs">
                    ⇄
                  </div>

                  <div className="flex-1 space-y-1 rounded-xl border border-slate-200 bg-white p-3 text-center">
                    <span className="block font-mono text-sm font-extrabold text-slate-900">{pair.b}</span>
                    <span className="line-clamp-1 block text-[10px] text-slate-500">{pair.nameB}</span>
                    <span className="block pt-1 text-[10px] font-bold text-indigo-700">
                      {countFor(pair.b)} Pegawai
                    </span>
                  </div>
                </div>

                <p className="pt-1 text-[11px] leading-tight text-slate-500">
                  Pegawai Pemeriksa dari <strong>{pair.a}</strong> akan dilantik mengesahkan aset di{' '}
                  <strong>{pair.b}</strong> dan sebaliknya.
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
