import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Loader2 } from 'lucide-react';
import { dataApi, type CalendarItem } from '@/lib/dataApi';

interface TakwimSesiCardProps {
  /** Tahun sesi daripada tetapan (cth. "2026"). */
  tahun: string;
}

const KATEGORI_LABEL: Record<string, string> = {
  MESYUARAT_PRA_JKPAK: 'Mesyuarat Pra-JKPAK',
  MESYUARAT_JKPAK: 'Mesyuarat JKPAK',
  PEMERIKSAAN: 'Tempoh Pemeriksaan',
  LAIN: 'Lain-lain',
};

const KATEGORI_STYLE: Record<string, string> = {
  MESYUARAT_PRA_JKPAK: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  MESYUARAT_JKPAK: 'bg-amber-50 text-amber-900 border-amber-200',
  PEMERIKSAAN: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  LAIN: 'bg-slate-100 text-slate-700 border-slate-200',
};

const MEETING_CATEGORIES = ['MESYUARAT_PRA_JKPAK', 'MESYUARAT_JKPAK'];

const formatTarikh = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/** Paparan baca-sahaja takwim perancangan sesi — untuk makluman semua pengguna. */
export default function TakwimSesiCard({ tahun }: TakwimSesiCardProps) {
  const tahunNum = Number(tahun) || new Date().getFullYear();
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');

    dataApi.calendar
      .list(tahunNum)
      .then((rows) => {
        if (active) setItems(rows);
      })
      .catch((err: Error) => {
        if (active) setError(err.message || 'Gagal memuatkan takwim.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tahunNum]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.tarikh.localeCompare(b.tarikh)),
    [items]
  );

  const nextMeeting = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (
      sorted.find((item) => MEETING_CATEGORIES.includes(item.kategori) && item.tarikh >= today) ??
      null
    );
  }, [sorted]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
              <CalendarDays className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Takwim Perancangan Sesi {tahunNum}
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Makluman tarikh penting sesi untuk semua pengguna: mesyuarat Pra-JKPAK/JKPAK dan tempoh
            pemeriksaan aset alih.
          </p>
        </div>

        {nextMeeting && (
          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 font-mono text-[10px] font-bold text-indigo-800">
            Seterusnya: {formatTarikh(nextMeeting.tarikh)}
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="flex items-center gap-2 text-[11px] text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuatkan takwim…
        </p>
      ) : error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10px] font-semibold text-rose-700">
          {error}
        </p>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4 text-center">
          <p className="text-[11px] font-semibold text-slate-600">
            Belum ada tarikh dalam takwim sesi {tahunNum}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            Pentadbir Sistem akan mengumumkan tarikh mesyuarat dan tempoh pemeriksaan di sini.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-100 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2 w-24">Tarikh</th>
                <th className="px-3 py-2">Perkara</th>
                <th className="px-3 py-2 w-40">Kategori</th>
                <th className="px-3 py-2">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2 font-mono font-bold text-slate-900">
                    {formatTarikh(item.tarikh)}
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{item.tajuk}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${
                        KATEGORI_STYLE[item.kategori] ?? KATEGORI_STYLE.LAIN
                      }`}
                    >
                      {KATEGORI_LABEL[item.kategori] ?? item.kategori}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-500">{item.catatan || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
