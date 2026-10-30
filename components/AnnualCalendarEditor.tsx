import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { dataApi, type CalendarItem } from '@/lib/dataApi';
import { BULAN_MALAY, SUKUAN_BULAN_LALAI, binaEntriSukuan } from '@/lib/takwimSukuan';

interface AnnualCalendarEditorProps {
  /** Tahun sesi aktif daripada tetapan (cth. "2026"). */
  tahun: string;
  isAdmin: boolean;
  /** Label peranan pengguna semasa — untuk nota apabila butang daftar disembunyikan. */
  currentRole?: string;
  /** Tarikh sasaran lama (satu tarikh) — dicadangkan sebagai item pertama jika takwim kosong. */
  defaultPraJkpak?: string;
}

const KATEGORI_OPTIONS = [
  { value: 'MESYUARAT_PRA_JKPAK', label: 'Mesyuarat Pra-JKPAK' },
  { value: 'MESYUARAT_JKPAK', label: 'Mesyuarat JKPAK' },
  { value: 'PEMERIKSAAN', label: 'Tempoh Pemeriksaan' },
  { value: 'LAIN', label: 'Lain-lain' },
];

/** Kedua-dua mesyuarat digunakan untuk lencana "Seterusnya" dan cadangan tajuk. */
const MEETING_CATEGORIES = ['MESYUARAT_PRA_JKPAK', 'MESYUARAT_JKPAK'];

const kategoriStyles: Record<string, string> = {
  MESYUARAT_PRA_JKPAK: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  MESYUARAT_JKPAK: 'bg-amber-100 text-amber-900 border-amber-200',
  PEMERIKSAAN: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  LAIN: 'bg-slate-100 text-slate-700 border-slate-200',
};

const formatTarikh = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * Takwim perancangan setahun: banyak tarikh bagi satu sesi
 * (Mesyuarat Pra-JKPAK Bil. 1..n, tempoh pemeriksaan, lain-lain).
 */
export default function AnnualCalendarEditor({
  tahun,
  isAdmin,
  currentRole,
  defaultPraJkpak,
}: AnnualCalendarEditorProps) {
  const tahunNum = Number(tahun) || new Date().getFullYear();

  const [items, setItems] = useState<CalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    tarikh: '',
    tajuk: '',
    kategori: 'MESYUARAT_PRA_JKPAK',
    catatan: '',
  });
  /** Bulan bagi setiap sukuan pemeriksaan (lalai Mac, Jun, September). */
  const [sukuanBulan, setSukuanBulan] = useState<number[]>([...SUKUAN_BULAN_LALAI]);
  /** Perkara yang sedang disunting — `null` bermaksud mod tambah baharu. */
  const [editing, setEditing] = useState<CalendarItem | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const rows = await dataApi.calendar.list(tahunNum);
      setItems(rows);
    } catch (err) {
      setError((err as Error).message || 'Gagal memuatkan takwim.');
    } finally {
      setIsLoading(false);
    }
  }, [tahunNum]);

  useEffect(() => {
    load();
  }, [load]);

  const nextMeeting = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (
      items
        .filter((item) => MEETING_CATEGORIES.includes(item.kategori) && item.tarikh >= today)
        .sort((a, b) => a.tarikh.localeCompare(b.tarikh))[0] ?? null
    );
  }, [items]);

  const suggestTajuk = () => {
    const label =
      form.kategori === 'MESYUARAT_JKPAK' ? 'Mesyuarat JKPAK' : 'Mesyuarat Pra-JKPAK';
    const count = items.filter((item) => item.kategori === form.kategori).length + 1;
    return `${label} Bil. ${count}/${tahunNum}`;
  };

  const resetForm = () => {
    setForm({ tarikh: '', tajuk: '', kategori: 'MESYUARAT_PRA_JKPAK', catatan: '' });
    setEditing(null);
  };

  const handleEdit = (item: CalendarItem) => {
    if (!isAdmin || isSaving) return;
    setEditing(item);
    setForm({
      tarikh: item.tarikh,
      tajuk: item.tajuk,
      kategori: item.kategori,
      catatan: item.catatan ?? '',
    });
    setError('');
  };

  const handleAdd = async () => {
    if (isSaving || !isAdmin) return;

    if (!form.tarikh) {
      setError('Sila pilih tarikh.');
      return;
    }
    const tajuk = form.tajuk.trim() || suggestTajuk();

    setIsSaving(true);
    setError('');
    try {
      const payload = {
        tahun: tahunNum,
        tarikh: form.tarikh,
        tajuk,
        kategori: form.kategori,
        catatan: form.catatan.trim() || null,
      };

      if (editing) {
        const saved = await dataApi.calendar.update(editing.id, payload);
        setItems((prev) =>
          prev
            .map((row) => (row.id === saved.id ? saved : row))
            .sort((a, b) => a.tarikh.localeCompare(b.tarikh))
        );
      } else {
        const saved = await dataApi.calendar.create(payload);
        setItems((prev) => [...prev, saved].sort((a, b) => a.tarikh.localeCompare(b.tarikh)));
      }
      resetForm();
    } catch (err) {
      setError(
        (err as Error).message ||
          (editing ? 'Gagal mengemas kini perkara takwim.' : 'Gagal menambah perkara takwim.')
      );
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Tempoh pemeriksaan lazimnya 3 sukuan setahun, setiap satu dalam tempoh sebulan.
   * Satu entri takwim dijana bagi setiap sukuan (tarikh = hari pertama bulan itu).
   */
  const handleAddSukuan = async () => {
    if (isSaving || !isAdmin) return;

    setIsSaving(true);
    setError('');
    try {
      const created: CalendarItem[] = [];
      for (const entri of binaEntriSukuan(tahunNum, sukuanBulan)) {
        created.push(
          await dataApi.calendar.create({
            tahun: tahunNum,
            tarikh: entri.tarikh,
            tajuk: entri.tajuk,
            kategori: 'PEMERIKSAAN',
            catatan: entri.catatan,
          })
        );
      }
      setItems((prev) =>
        [...prev, ...created].sort((a, b) => a.tarikh.localeCompare(b.tarikh))
      );
    } catch (err) {
      setError((err as Error).message || 'Gagal menambah tempoh pemeriksaan sukuan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (item: CalendarItem) => {
    if (!isAdmin || isSaving) return;
    if (!window.confirm(`Padam "${item.tajuk}" (${formatTarikh(item.tarikh)}) daripada takwim?`)) {
      return;
    }
    setIsSaving(true);
    try {
      await dataApi.calendar.remove(item.id);
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      if (editing?.id === item.id) resetForm();
    } catch (err) {
      setError((err as Error).message || 'Gagal memadam perkara takwim.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <CalendarDays className="h-3.5 w-3.5 text-sky-700" />
            Takwim Perancangan {tahunNum} (setahun)
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Senaraikan semua tarikh penting sesi ini. Semua dapatan pemeriksaan makmal dan bengkel perlu
            dimuktamadkan sebelum mesyuarat Pra-JKPAK berkaitan.
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
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center">
          <p className="text-[11px] font-semibold text-slate-600">Belum ada tarikh dalam takwim</p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            Tambah Mesyuarat Pra-JKPAK / JKPAK Bil. 1/{tahunNum}, tempoh pemeriksaan, dan tarikh lain di
            bawah.
          </p>
          {defaultPraJkpak && !defaultPraJkpak.startsWith('') && (
            <p className="mt-1 font-mono text-[10px] text-slate-400">
              Cadangan daripada tetapan lama: {formatTarikh(defaultPraJkpak)}
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-100 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2">Tarikh</th>
                <th className="px-3 py-2">Perkara</th>
                <th className="px-3 py-2">Kategori</th>
                <th className="px-3 py-2">Catatan</th>
                {isAdmin && <th className="px-3 py-2 text-right">Tindakan</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2 font-mono font-bold text-slate-900">
                    {formatTarikh(item.tarikh)}
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{item.tajuk}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${
                        kategoriStyles[item.kategori] ?? kategoriStyles.LAIN
                      }`}
                    >
                      {KATEGORI_OPTIONS.find((opt) => opt.value === item.kategori)?.label ??
                        item.kategori}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-500">{item.catatan || '—'}</td>
                  {isAdmin && (
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          disabled={isSaving}
                          className={`rounded-lg p-1.5 transition disabled:opacity-50 ${
                            editing?.id === item.id
                              ? 'bg-amber-100 text-amber-700'
                              : 'text-slate-500 hover:bg-amber-50 hover:text-amber-700'
                          }`}
                          title="Kemaskini perkara takwim"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(item)}
                          disabled={isSaving}
                          className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                          title="Padam"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin ? (
        <div className="space-y-2">
          {editing && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5">
              <span className="text-[10px] font-bold text-amber-900">
                Menyunting: {editing.tajuk} ({formatTarikh(editing.tarikh)})
              </span>
              <button
                type="button"
                onClick={resetForm}
                disabled={isSaving}
                className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2 py-1 text-[10px] font-bold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
              >
                <X className="h-3 w-3" /> Batal suntingan
              </button>
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-12">
            <div className="sm:col-span-3">
            <label className="mb-0.5 block text-[10px] font-bold text-slate-600">Tarikh</label>
            <input
              type="date"
              value={form.tarikh}
              onChange={(event) => setForm({ ...form, tarikh: event.target.value })}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-[11px] focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-4">
            <label className="mb-0.5 block text-[10px] font-bold text-slate-600">Perkara</label>
            <input
              type="text"
              value={form.tajuk}
              onChange={(event) => setForm({ ...form, tajuk: event.target.value })}
              placeholder={suggestTajuk()}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="mb-0.5 block text-[10px] font-bold text-slate-600">Kategori</label>
            <select
              value={form.kategori}
              onChange={(event) => setForm({ ...form, kategori: event.target.value })}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] focus:border-amber-500 focus:outline-none"
            >
              {KATEGORI_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 sm:self-end">
            <button
              type="button"
              onClick={handleAdd}
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-1 rounded-lg bg-slate-900 px-2 py-1.5 text-[11px] font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : editing ? (
                <>
                  <Pencil className="h-3.5 w-3.5 text-amber-400" /> Simpan
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 text-amber-400" /> Tambah
                </>
              )}
            </button>
          </div>
          <div className="sm:col-span-12">
            <input
              type="text"
              value={form.catatan}
              onChange={(event) => setForm({ ...form, catatan: event.target.value })}
              placeholder="Catatan (pilihan) — cth. dokumen dapatan perlu siap 2 minggu sebelum"
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] focus:border-amber-500 focus:outline-none"
            />
          </div>
          </div>

          {form.kategori === 'PEMERIKSAAN' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 space-y-2">
              <p className="text-[11px] font-bold text-emerald-900">
                Tempoh pemeriksaan lazimnya 3 sukuan setahun — sebulan bagi setiap sukuan
              </p>
              <div className="grid gap-2 sm:grid-cols-4">
                {sukuanBulan.map((bulan, index) => (
                  <div key={index}>
                    <label className="mb-0.5 block text-[10px] font-bold text-emerald-900">
                      Sukuan {index + 1}
                    </label>
                    <select
                      value={bulan}
                      onChange={(event) => {
                        const next = [...sukuanBulan];
                        next[index] = Number(event.target.value);
                        setSukuanBulan(next);
                      }}
                      className="w-full rounded-lg border border-emerald-300 bg-white px-2 py-1.5 text-[11px] focus:border-emerald-600 focus:outline-none"
                    >
                      {BULAN_MALAY.map((nama, idx) => (
                        <option key={nama} value={idx + 1}>
                          {nama}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                <div className="sm:self-end">
                  <button
                    type="button"
                    onClick={handleAddSukuan}
                    disabled={isSaving}
                    className="flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-700 px-2 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" /> Jana 3 Sukuan
                      </>
                    )}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-emerald-800">
                Setiap sukuan didaftarkan pada hari pertama bulannya dengan catatan “Sepanjang
                &lt;bulan&gt; {tahunNum}”.
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-medium text-amber-900">
          <strong>Butang daftar disembunyikan.</strong> Hanya pegawai dengan lantikan{' '}
          <span className="font-mono">PENTADBIR_SISTEM</span> boleh mendaftar atau memadam perkara takwim
          {currentRole ? ` — sesi anda: ${currentRole}.` : '.'} Hubungi Pentadbir Sistem untuk
          mengemas kini takwim sesi ini.
        </p>
      )}

      {error && (
        <p className="flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10px] font-semibold text-rose-700">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
