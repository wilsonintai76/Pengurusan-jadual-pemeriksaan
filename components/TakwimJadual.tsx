import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import type { InspectionSchedule } from '@/lib/types';
import { dataApi, type CalendarItem } from '@/lib/dataApi';
import { useDepartments } from '@/lib/useReferenceData';

interface TakwimJadualProps {
  schedules: InspectionSchedule[];
  tahun: string;
  tarikhMulaSesi?: string;
  tarikhTamatSesi?: string;
  onOpenEjas: () => void;
}

type Jenis = 'SESI' | 'MESYUARAT' | 'PEMERIKSAAN' | 'LAIN';

interface Baris {
  key: string;
  mula: string;
  tamat?: string;
  perkara: string;
  jenis: Jenis;
  jabatan?: string;
  butiran: string;
  status?: string;
}

const JENIS_LABEL: Record<Jenis, string> = {
  SESI: 'Sesi',
  MESYUARAT: 'Mesyuarat',
  PEMERIKSAAN: 'Pemeriksaan',
  LAIN: 'Lain-lain',
};

const JENIS_STYLE: Record<Jenis, string> = {
  SESI: 'bg-slate-900 text-white',
  MESYUARAT: 'bg-indigo-50 text-indigo-800 border border-indigo-200',
  PEMERIKSAAN: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  LAIN: 'bg-slate-100 text-slate-700 border border-slate-200',
};

const STATUS_CLASS: Record<string, string> = {
  Selesai: 'bg-emerald-100 text-emerald-800',
  'Sedang Dijalankan': 'bg-amber-100 text-amber-800',
  Tertangguh: 'bg-rose-100 text-rose-800',
  'Belum Mula': 'bg-blue-100 text-blue-800',
};

const fmt = (iso: string) => iso.split('-').reverse().join('/');

const jenisKalendar = (kategori: string): Jenis =>
  kategori.startsWith('MESYUARAT') ? 'MESYUARAT' : kategori === 'PEMERIKSAAN' ? 'PEMERIKSAAN' : 'LAIN';

/**
 * Takwim ringkas dalam satu jadual. Sumbernya sama dengan Tetapan: tarikh sesi,
 * takwim tahunan (mesyuarat/tempoh) dan jadual pemeriksaan setiap lokasi.
 */
export default function TakwimJadual({
  schedules,
  tahun,
  tarikhMulaSesi,
  tarikhTamatSesi,
  onOpenEjas,
}: TakwimJadualProps) {
  const departments = useDepartments();
  const tahunNum = Number(tahun) || new Date().getFullYear();
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jenis, setJenis] = useState<'SEMUA' | Jenis>('SEMUA');
  const [dept, setDept] = useState('SEMUA');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    dataApi.calendar
      .list(tahunNum)
      .then((rows) => active && setItems(rows))
      .catch((e: Error) => active && setError(e.message || 'Gagal memuatkan takwim.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [tahunNum]);

  const sesiAda = Boolean(tarikhMulaSesi && tarikhTamatSesi);

  const semua = useMemo<Baris[]>(() => {
    const rows: Baris[] = [];
    if (sesiAda) {
      rows.push({
        key: 'sesi',
        mula: tarikhMulaSesi!,
        tamat: tarikhTamatSesi,
        perkara: `Sesi pemeriksaan aset alih ${tahunNum}`,
        jenis: 'SESI',
        butiran: 'Tempoh sesi (Tetapan)',
      });
    }
    items.forEach((i) =>
      rows.push({
        key: `k-${i.id}`,
        mula: i.tarikh,
        perkara: i.tajuk,
        jenis: jenisKalendar(i.kategori),
        butiran: i.catatan || '',
      })
    );
    schedules.forEach((s) => {
      const luarSesi = sesiAda && (s.tarikhMula < tarikhMulaSesi! || s.tarikhTamat > tarikhTamatSesi!);
      const pemeriksa = [s.pemeriksa1, s.pemeriksa2].filter(Boolean).join(', ');
      rows.push({
        key: `j-${s.id}`,
        mula: s.tarikhMula,
        tamat: s.tarikhTamat,
        perkara: `${s.lokasi} · ${s.kuantiti ?? '-'} aset`,
        jenis: 'PEMERIKSAAN',
        jabatan: s.jabatan,
        butiran: `${pemeriksa || 'Pemeriksa belum dituntut'}${luarSesi ? ' · di luar tempoh sesi' : ''}`,
        status: s.status,
      });
    });
    return rows.sort((a, b) => a.mula.localeCompare(b.mula) || a.perkara.localeCompare(b.perkara));
  }, [items, schedules, sesiAda, tarikhMulaSesi, tarikhTamatSesi, tahunNum]);

  const rows = semua.filter(
    (r) => (jenis === 'SEMUA' || r.jenis === jenis) && (dept === 'SEMUA' || !r.jabatan || r.jabatan === dept)
  );

  const selectClass =
    'text-xs bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-900';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <select value={jenis} onChange={(e) => setJenis(e.target.value as 'SEMUA' | Jenis)} className={selectClass} aria-label="Tapis jenis">
            <option value="SEMUA">Semua jenis</option>
            {(Object.keys(JENIS_LABEL) as Jenis[]).map((j) => (
              <option key={j} value={j}>
                {JENIS_LABEL[j]}
              </option>
            ))}
          </select>
          <select value={dept} onChange={(e) => setDept(e.target.value)} className={selectClass} aria-label="Tapis jabatan">
            <option value="SEMUA">Semua jabatan ({departments.length})</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} - {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-600">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span>{rows.length} entri</span>
          <button
            onClick={onOpenEjas}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-white font-sans font-bold hover:bg-slate-800"
          >
            <span>Urus</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {error && <p className="px-4 py-2 text-[11px] font-semibold text-rose-700 bg-rose-50">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
              <th className="px-3 py-2 font-bold">Tarikh</th>
              <th className="px-3 py-2 font-bold">Perkara</th>
              <th className="px-3 py-2 font-bold">Jenis</th>
              <th className="px-3 py-2 font-bold">Butiran</th>
              <th className="px-3 py-2 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  Belum ada takwim bagi sesi {tahunNum}. Pentadbir Sistem menetapkannya di Tetapan.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-3 py-2 font-mono whitespace-nowrap text-slate-700">
                  {fmt(r.mula)}
                  {r.tamat && r.tamat !== r.mula ? ` – ${fmt(r.tamat)}` : ''}
                </td>
                <td className="px-3 py-2 font-semibold text-slate-800">
                  {r.jabatan && <span className="mr-1.5 font-mono font-bold text-slate-500">{r.jabatan}</span>}
                  {r.perkara}
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${JENIS_STYLE[r.jenis]}`}>
                    {JENIS_LABEL[r.jenis]}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-500">{r.butiran || '—'}</td>
                <td className="px-3 py-2">
                  {r.status ? (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CLASS[r.status] ?? STATUS_CLASS['Belum Mula']}`}>
                      {r.status}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
