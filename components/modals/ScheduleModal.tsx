import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, Info, Save, Target, X } from 'lucide-react';
import { InspectionSchedule } from '@/lib/types';
import { deriveKategoriRuang } from '@/lib/kodLokasi';
import { useDepartments, useLocations } from '@/lib/useReferenceData';
import { dataApi, type CalendarItem } from '@/lib/dataApi';
import { bulanSiri, kiraRuangSiri, kiraSasaranSiri, SIRI_LABEL } from '@/lib/siriPemeriksaan';

interface ScheduleModalProps {
  schedule: InspectionSchedule | null;
  schedules?: InspectionSchedule[];
  defaultDept?: string;
  tahunSesi?: string;
  /** Pentadbir Sistem boleh memilih mana-mana jabatan; PPAJ terikat pada jabatannya. */
  canChooseDept?: boolean;
  onClose: () => void;
  onSave: (scheduleData: Partial<InspectionSchedule>) => void;
}

/**
 * Daftar jadual = PPAJ pilih RUANG (jabatan sendiri) + SIRI sahaja.
 * Tarikh ditetapkan kemudian oleh Penyelia Lokasi; pemeriksa menuntut slot sendiri.
 */
export default function ScheduleModal({
  schedule,
  schedules = [],
  defaultDept = '',
  tahunSesi,
  canChooseDept = false,
  onClose,
  onSave,
}: ScheduleModalProps) {
  const locations = useLocations();
  const departments = useDepartments();

  const isEdit = Boolean(schedule);
  const tahun = tahunSesi || String(new Date().getFullYear());

  const [jabatan, setJabatan] = useState(schedule?.jabatan || defaultDept);
  const [lokasiId, setLokasiId] = useState('');
  const [siri, setSiri] = useState<number>(Number(schedule?.siri) || 1);
  const [catatan, setCatatan] = useState(schedule?.catatan || '');
  const [tarikhMula, setTarikhMula] = useState(schedule?.tarikhMula || '');
  const [tarikhTamat, setTarikhTamat] = useState(schedule?.tarikhTamat || '');
  const [takwim, setTakwim] = useState<CalendarItem[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let active = true;
    dataApi.calendar
      .list(Number(tahun))
      .then((rows) => {
        if (active) setTakwim(rows);
      })
      .catch(() => {
        if (active) setTakwim([]);
      });
    return () => {
      active = false;
    };
  }, [tahun]);

  const departmentLocations = useMemo(
    () => locations.filter((item) => !jabatan || item.jabatan === jabatan),
    [locations, jabatan]
  );

  /** Ruang yang belum mempunyai jadual dalam sesi semasa (satu ruang = satu jadual). */
  const availableLocations = useMemo(() => {
    const terjadual = new Set(
      schedules
        .map((row) => (row.kodRuang || row.lokasi || '').trim().toUpperCase())
        .filter(Boolean)
    );
    return departmentLocations.filter((item) => {
      const key = (item.kodRuang || item.nama || '').trim().toUpperCase();
      return !terjadual.has(key);
    });
  }, [departmentLocations, schedules]);

  const sasaran = useMemo(
    () => kiraSasaranSiri(schedules, departmentLocations.length || 0, jabatan),
    [schedules, departmentLocations.length, jabatan]
  );

  useEffect(() => {
    if (!isEdit) setSiri(sasaran.siriDicadangkan);
  }, [isEdit, sasaran.siriDicadangkan]);

  const selectedLocation = locations.find((item) => item.id === lokasiId);
  const ruangSiri = kiraRuangSiri(schedules, siri, jabatan);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isEdit) {
      if (!tarikhMula || !tarikhTamat) {
        setErrorMsg('Sila lengkapkan tarikh mula dan tarikh tamat pemeriksaan.');
        return;
      }
      if (tarikhTamat < tarikhMula) {
        setErrorMsg('Tarikh tamat tidak boleh lebih awal daripada tarikh mula.');
        return;
      }
      onSave({ tarikhMula, tarikhTamat, catatan: catatan.trim() });
      return;
    }

    if (!jabatan) {
      setErrorMsg('Sila pilih jabatan / unit.');
      return;
    }
    if (!lokasiId) {
      setErrorMsg('Sila pilih ruang yang akan diperiksa.');
      return;
    }

    onSave({
      jabatan,
      lokasiId: selectedLocation?.id,
      lokasi: selectedLocation?.nama || '',
      kodRuang: selectedLocation?.kodRuang,
      siri,
      catatan: catatan.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isEdit ? 'Tetapkan Tarikh Pemeriksaan' : 'Daftar Jadual Pemeriksaan'}
            </h3>
            <p className="text-xs text-slate-500">
              {isEdit
                ? 'Tarikh ditetapkan oleh Penyelia Lokasi bagi ruang yang diselia.'
                : 'Pilih ruang jabatan anda + siri pemeriksaan. Tarikh & pemeriksa diurus kemudian.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isEdit ? (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] space-y-1">
                <p>
                  <strong>{schedule?.lokasi}</strong> · {schedule?.kodRuang || schedule?.kod}
                </p>
                <p className="text-slate-500">
                  {schedule?.jabatan} · {SIRI_LABEL[Number(schedule?.siri) || 1]} · Penyelia:{' '}
                  {schedule?.penjaga || 'Belum Dilantik'}
                </p>
                <p className="text-slate-500">
                  Pemeriksa: {schedule?.pemeriksa1 || 'Belum dituntut'}
                  {schedule?.pemeriksa2 ? ` & ${schedule.pemeriksa2}` : ''}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Tarikh Mula <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tarikhMula}
                    onChange={(e) => setTarikhMula(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Tarikh Tamat <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tarikhTamat}
                    onChange={(e) => setTarikhTamat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Catatan</label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="cth: pemeriksaan bersama Penjaga Ruang pada waktu pagi."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Jabatan / Unit <span className="text-rose-500">*</span>
                  </label>
                  {defaultDept && !canChooseDept ? (
                    <div className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 font-mono text-slate-700">
                      {defaultDept}
                    </div>
                  ) : (
                    <select
                      value={jabatan}
                      onChange={(e) => {
                        setJabatan(e.target.value);
                        setLokasiId('');
                      }}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="">— Pilih Jabatan —</option>
                      {departments
                        .filter((dept) => dept.isOperational !== 0)
                        .map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.id} — {dept.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Ruang Diperiksa <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={lokasiId}
                    onChange={(e) => setLokasiId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="">— Pilih Ruang —</option>
                    {availableLocations.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.kodRuang} — {item.nama}
                      </option>
                    ))}
                  </select>
                  {availableLocations.length === 0 ? (
                    <p className="mt-1 text-[10px] font-semibold text-emerald-700">
                      Semua ruang jabatan ini sudah dijadualkan bagi sesi {tahun}.
                    </p>
                  ) : (
                    <p className="mt-1 text-[10px] text-slate-500">
                      {availableLocations.length} ruang belum dijadualkan · setiap ruang diperiksa
                      sekali sahaja
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Siri Pemeriksaan <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((item) => {
                    const aktif = siri === item;
                    const bil = kiraRuangSiri(schedules, item, jabatan);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setSiri(item)}
                        className={`rounded-xl border px-3 py-2 text-left transition ${
                          aktif
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="block text-[11px] font-bold">{SIRI_LABEL[item]}</span>
                        <span
                          className={`block text-[10px] ${aktif ? 'text-amber-300' : 'text-slate-500'}`}
                        >
                          {bulanSiri(item, takwim)} · {bil} ruang
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 space-y-1.5">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900">
                  <Target className="h-3.5 w-3.5" /> Anggaran sasaran
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-emerald-900">
                  <div>
                    <span className="block text-emerald-700">Ruang jabatan</span>
                    <strong className="font-mono text-sm">{departmentLocations.length}</strong>
                  </div>
                  <div>
                    <span className="block text-emerald-700">Siri {siri} dijadualkan</span>
                    <strong className="font-mono text-sm">{ruangSiri}</strong>
                  </div>
                  <div>
                    <span className="block text-emerald-700">Belum dijadualkan</span>
                    <strong className="font-mono text-sm">{sasaran.baki}</strong>
                  </div>
                  <div>
                    <span className="block text-emerald-700">Sasaran akhir</span>
                    <strong className="font-mono text-sm">100%</strong>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-emerald-200/70 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600"
                    style={{ width: `${Math.min(sasaran.peratus, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-emerald-800">
                  Siri dicadangkan: <strong>{SIRI_LABEL[sasaran.siriDicadangkan]}</strong> (
                  {bulanSiri(sasaran.siriDicadangkan, takwim)}) — siri dengan ruang paling sedikit.
                </p>
              </div>

              {selectedLocation && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 space-y-1">
                  <p className="flex items-center gap-1.5 font-bold text-slate-800">
                    <CalendarClock className="h-3.5 w-3.5" /> {selectedLocation.nama}
                  </p>
                  <p>
                    Kategori ruang: {selectedLocation.kategoriRuang || deriveKategoriRuang(selectedLocation.kodRuang) || '—'} ·{' '}
                    {selectedLocation.anggaranAset ?? 0} unit aset (KEW.PA-7)
                  </p>
                  <p>
                    Penyelia Lokasi:{' '}
                    {selectedLocation.penjaga && selectedLocation.penjaga !== 'Belum Dilantik'
                      ? selectedLocation.penjaga
                      : 'Belum Dilantik'}{' '}
                    · akan menetapkan tarikh dalam {bulanSiri(siri, takwim)}
                  </p>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Catatan</label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="cth: keutamaan ruang berisiko tinggi."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <p className="flex items-start gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-[10px] leading-relaxed text-slate-500">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                Selepas didaftarkan: <strong>Penyelia Lokasi</strong> menetapkan tarikh pemeriksaan, dan{' '}
                <strong>Pegawai Pemeriksa</strong> menuntut slot secara self-assign (2 pemeriksa berbeza
                jabatan mengikut 1PP AM 2.4).
              </p>
            </>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              {isEdit ? 'Simpan Tarikh' : 'Daftar Jadual'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
