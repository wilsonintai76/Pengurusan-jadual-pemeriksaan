import React, { useState } from 'react';
import { Building2, Loader2, AlertCircle, X, ShieldAlert } from 'lucide-react';
import type { DepartmentInfo } from '@/lib/types';

interface DepartmentModalProps {
  mode: 'create' | 'edit';
  initial?: DepartmentInfo | null;
  departments: DepartmentInfo[];
  onClose: () => void;
  onSubmit: (payload: {
    id?: string;
    nama: string;
    crossPartnerId?: string;
    ketuaJabatan?: string;
    penolongPegawaiAset?: string;
  }) => Promise<void>;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function DepartmentModal({
  mode,
  initial,
  departments,
  onClose,
  onSubmit,
  onShowToast,
}: DepartmentModalProps) {
  const isEdit = mode === 'edit';
  const [code, setCode] = useState(initial?.id ?? '');
  const [nama, setNama] = useState(initial?.name ?? '');
  const [partner, setPartner] = useState(initial?.crossPartnerId ?? '');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    setError('');

    const cleanCode = code.trim().toUpperCase();
    if (!isEdit && !/^[A-Z][A-Z0-9-]{1,15}$/.test(cleanCode)) {
      setError('Kod jabatan mesti bermula dengan huruf; huruf besar/nombor/sengkang sahaja (2–16 aksara).');
      return;
    }
    if (!nama.trim()) {
      setError('Nama jabatan wajib diisi.');
      return;
    }
    if (partner && partner === (isEdit ? initial?.id : cleanCode)) {
      setError('Pasangan pemeriksaan silang tidak boleh jabatan yang sama.');
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit({
        id: isEdit ? undefined : cleanCode,
        nama: nama.trim(),
        crossPartnerId: isEdit ? partner : undefined,
      });
      onClose();
    } catch (submitError) {
      const message = (submitError as Error).message || 'Gagal menyimpan jabatan.';
      setError(message);
      onShowToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const partnerOptions = departments.filter(
    (department) =>
      department.id !== (isEdit ? initial?.id : code.trim().toUpperCase()) &&
      department.isOperational !== 0
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-amber-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {isEdit ? 'Kemas Kini Jabatan' : 'Tambah Jabatan / Unit'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Ikut carta organisasi Politeknik. Hanya Pentadbir Sistem boleh mengubah direktori.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4 text-xs">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Kod Jabatan <span className="text-rose-500">*</span>
              </label>
              <input
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase());
                  setError('');
                }}
                disabled={isEdit}
                placeholder="cth. JTMK"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs uppercase focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
              />
              {isEdit && (
                <p className="mt-1 text-[10px] text-slate-500">
                  Kod tidak boleh diubah — ia kunci rujukan rekod lain.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Nama Jabatan / Unit <span className="text-rose-500">*</span>
              </label>
              <input
                value={nama}
                onChange={(event) => {
                  setNama(event.target.value);
                  setError('');
                }}
                placeholder="cth. Jabatan Teknologi Maklumat & Komunikasi"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {isEdit && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Tetapan lanjutan
              </p>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  Pasangan Silang (⇄) <span className="font-normal text-slate-400">(pilihan)</span>
                </label>
                <select
                  value={partner}
                  onChange={(event) => setPartner(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">— Tiada —</option>
                  {partnerOptions.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.id} — {department.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold text-slate-500">Ketua Jabatan (KJ)</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-800">
                    {initial?.ketuaJabatan || 'Belum dilantik'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500">
                    Penolong Pegawai Aset (PPAJ/PPAU)
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-800">
                    {initial?.penolongPegawaiAset || 'Belum dilantik'}
                  </p>
                </div>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-500">
                KJ &amp; PPAJ ditetapkan daripada senarai pegawai di{' '}
                <strong>Direktori Pegawai → Peranan &amp; Lantikan</strong> (PPAJ boleh lebih daripada
                seorang).
              </p>
            </div>
          )}

          {!isEdit && (
            <p className="flex items-start gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2 text-[10px] leading-relaxed text-slate-500">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              Cukup daftar kod dan nama dahulu. Ketua Jabatan, Penolong Pegawai Aset dan Pasangan
              Silang boleh ditetapkan kemudian.
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p className="flex items-start gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2 text-[10px] leading-relaxed text-slate-500">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            Gandingan silang digunakan oleh Penjana Mod Pemeriksaan dan sekatan tuntutan slot
            (POL_CROSS_INSPECTION_MANDATE). Perubahan direkod dalam jejak audit.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isSaving ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Tambah Jabatan'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
