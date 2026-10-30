import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Save, Sparkles } from 'lucide-react';
import { dataApi } from '@/lib/dataApi';
import { STATUS_ASET } from '@/lib/statusAset';import type { AssetStatusAset, ProgresAsetJadual } from '@/lib/types';

interface StatusPerAsetPanelProps {
  scheduleId: string;
  kuantiti: number;
  readOnly?: boolean;
  onProgres: (progres: ProgresAsetJadual | null) => void;
}

type StatusNilai = AssetStatusAset['status'];

/**
 * Status A–F bagi setiap aset ruang (KEW.PA-7). Jumlah pecahan KEW.PA-11 dikira
 * daripada tanda ini, jadi tiada aset boleh terlepas.
 */
export default function StatusPerAsetPanel({
  scheduleId,
  kuantiti,
  readOnly = false,
  onProgres,
}: StatusPerAsetPanelProps) {
  const [progres, setProgres] = useState<ProgresAsetJadual | null>(null);
  const [draf, setDraf] = useState<Record<string, StatusNilai>>({});
  const [carian, setCarian] = useState('');
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [ralat, setRalat] = useState<string | null>(null);
  const [berjaya, setBerjaya] = useState<string | null>(null);

  const muat = React.useCallback(async () => {
    setMemuat(true);
    setRalat(null);
    try {
      const data = await dataApi.schedules.assets(scheduleId);
      setProgres(data);
      setDraf(Object.fromEntries((data.aset ?? []).map((item) => [item.id, item.status])));
      onProgres(data);
    } catch (error) {
      setRalat((error as Error).message);
      onProgres(null);
    } finally {
      setMemuat(false);
    }
  }, [scheduleId, onProgres]);

  useEffect(() => {
    void muat();
  }, [muat]);

  const aset = useMemo(() => progres?.aset ?? [], [progres]);

  const ditapis = useMemo(() => {
    const q = carian.trim().toLowerCase();
    if (!q) return aset;
    return aset.filter((item) =>
      [item.label, item.keterangan].join(' ').toLowerCase().includes(q)
    );
  }, [aset, carian]);

  const jumlahDitanda = aset.filter((item) => draf[item.id]).length;
  const jumlahAset = progres?.jumlahAset ?? kuantiti;
  const peratus = jumlahAset > 0 ? Math.round((jumlahDitanda / jumlahAset) * 100) : 0;

  const perubahan = useMemo(
    () =>
      aset
        .filter((item) => (draf[item.id] ?? null) !== (item.status ?? null))
        .map((item) => ({ assetId: item.id, status: draf[item.id] ?? null })),
    [aset, draf]
  );

  const setStatus = (assetId: string, status: StatusNilai) => {
    setBerjaya(null);
    setDraf((prev) => ({ ...prev, [assetId]: prev[assetId] === status ? null : status }));
  };

  const setSemuaBakiA = () => {
    setBerjaya(null);
    setDraf((prev) => {
      const baharu = { ...prev };
      for (const item of aset) {
        if (!baharu[item.id]) baharu[item.id] = 'A';
      }
      return baharu;
    });
  };

  const simpan = async () => {
    if (!perubahan.length) return;
    setMenyimpan(true);
    setRalat(null);
    setBerjaya(null);
    try {
      await dataApi.schedules.saveAssetStatus(scheduleId, perubahan);
      await muat();
      setBerjaya(`${perubahan.length} status aset disimpan.`);
    } catch (error) {
      setRalat((error as Error).message);
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Status per Aset (KEW.PA-7)
          </h4>
          <p className="text-[11px] text-slate-500">
            Tanda status A–F bagi setiap aset ruang. Jumlah dalam KEW.PA-11 dikira automatik
            daripada tanda ini.
          </p>
        </div>
        <span className="font-mono text-[11px] font-bold text-slate-700">
          {jumlahDitanda}/{jumlahAset} aset ({peratus}%)
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${peratus === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${peratus}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={carian}
          onChange={(event) => setCarian(event.target.value)}
          placeholder="Cari label atau keterangan aset…"
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        {!readOnly && (
          <>
            <button
              type="button"
              onClick={setSemuaBakiA}
              className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 transition hover:bg-emerald-100"
              title="Tanda semua aset yang belum ditanda sebagai A (Sedang Digunakan)"
            >
              <Sparkles className="h-3 w-3" /> Baki → A
            </button>
            <button
              type="button"
              onClick={simpan}
              disabled={!perubahan.length || menyimpan}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {menyimpan ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3 text-amber-400" />
              )}
              Simpan Status ({perubahan.length})
            </button>
          </>
        )}
      </div>

      {ralat && (
        <p className="mt-2 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-800">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {ralat}
        </p>
      )}
      {berjaya && (
        <p className="mt-2 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" /> {berjaya}
        </p>
      )}

      <div className="mt-2 max-h-72 overflow-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-[11px]">
          <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-2 py-1.5">Label</th>
              <th className="px-2 py-1.5">Keterangan</th>
              <th className="px-2 py-1.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {memuat && (
              <tr>
                <td colSpan={3} className="px-2 py-6 text-center text-slate-500">
                  <Loader2 className="mx-auto mb-1 h-4 w-4 animate-spin" /> Memuatkan senarai aset…
                </td>
              </tr>
            )}
            {!memuat && aset.length === 0 && (
              <tr>
                <td colSpan={3} className="px-2 py-6 text-center text-slate-500">
                  Tiada aset berdaftar bagi ruang ini. Muat naik KEW.PA-7 di Direktori Lokasi dahulu.
                </td>
              </tr>
            )}
            {ditapis.map((item) => {
              const nilai = draf[item.id] ?? null;
              return (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-2 py-1 font-mono font-semibold text-slate-800">{item.label}</td>
                  <td className="max-w-[240px] truncate px-2 py-1 text-slate-600" title={item.keterangan}>
                    {item.keterangan}
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex flex-wrap items-center justify-center gap-1">
                      {readOnly ? (
                        <span className="font-mono text-[11px] font-bold text-slate-700">
                          {nilai ?? '—'}
                        </span>
                      ) : (
                        STATUS_ASET.map((meta) => (
                          <button
                            key={meta.kod}
                            type="button"
                            onClick={() => setStatus(item.id, meta.kod)}
                            title={meta.label}
                            className={`h-5 w-5 rounded border text-[10px] font-bold transition ${
                              nilai === meta.kod
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {meta.kod}
                          </button>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
