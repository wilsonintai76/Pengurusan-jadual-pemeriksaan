import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, Loader2, Plus, ShieldCheck, UserPlus, X } from 'lucide-react';
import type { DepartmentInfo, SystemRole, UserSession } from '@/lib/types';
import type { IssuedCredentials, NewOfficerInput } from '@/lib/dataApi';
import { REGISTRATION_ROLES, DEFAULT_JAWATAN } from '@/lib/systemRoles';

interface OfficerCreateModalProps {
  departments: DepartmentInfo[];
  defaultDept?: string;
  onCreate: (input: NewOfficerInput) => Promise<{ officer: UserSession; credentials: IssuedCredentials }>;
  onClose: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

/**
 * Pendaftaran pengguna oleh Pentadbir Sistem. Nama pengguna & kata laluan
 * sementara dijana oleh Worker dan dipaparkan sekali sahaja.
 */
export default function OfficerCreateModal({
  departments,
  defaultDept,
  onCreate,
  onClose,
  onShowToast,
}: OfficerCreateModalProps) {
  const [nama, setNama] = useState('');
  const [emel, setEmel] = useState('');
  const [dept, setDept] = useState(defaultDept || departments[0]?.id || '');
  const [jawatan, setJawatan] = useState<SystemRole>(DEFAULT_JAWATAN);
  const [telefon, setTelefon] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [issued, setIssued] = useState<IssuedCredentials | null>(null);
  const [createdName, setCreatedName] = useState('');

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // penyemak imbas menyekat clipboard — nilai masih kelihatan pada skrin
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;

    if (!nama.trim()) {
      setError('Sila masukkan nama penuh pegawai.');
      return;
    }
    if (!dept) {
      setError('Sila pilih jabatan / unit.');
      return;
    }
    const cleanEmail = emel.trim().toLowerCase();
    if (cleanEmail && !cleanEmail.includes('@')) {
      setError('Format emel tidak sah atau biarkan kosong untuk jana automatik.');
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      const result = await onCreate({
        nama: nama.trim(),
        dept,
        role: jawatan,
        telefon: telefon.trim() || undefined,
        emel: cleanEmail || undefined,
      });
      setIssued(result.credentials);
      setCreatedName(result.officer.name);
      setNama('');
      setEmel('');
      setTelefon('');
      onShowToast(`Pengguna ${result.officer.name} didaftarkan.`, 'success');
    } catch (err) {
      setError((err as Error).message || 'Pendaftaran pengguna gagal.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-amber-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Daftar Pengguna Baharu</h3>
              <p className="text-[11px] text-slate-500">
                Nama pengguna &amp; kata laluan sementara dijana automatik oleh Worker
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 px-5 py-4 text-xs">
          <div>
            <label className="mb-1 block font-semibold text-slate-700">
              Nama Penuh &amp; Gelaran <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={nama}
              onChange={(event) => setNama(event.target.value)}
              placeholder="cth. Ts. Mohd Fadzli Bin Ramli"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Jawatan <span className="text-rose-500">*</span>
              </label>
              <select
                value={jawatan}
                onChange={(event) => setJawatan(event.target.value as SystemRole)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {REGISTRATION_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] font-medium text-amber-700">
                Lantikan <strong>Pegawai Pemeriksa (PP)</strong> dibuat selepas pendaftaran (Peranan
                &amp; Lantikan).
              </p>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Jabatan / Unit <span className="text-rose-500">*</span>
              </label>
              <select
                value={dept}
                onChange={(event) => setDept(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">— Pilih Jabatan —</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.id} — {department.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Emel Rasmi <span className="font-normal text-slate-400">(pilihan)</span>
              </label>
              <input
                type="email"
                value={emel}
                onChange={(event) => setEmel(event.target.value)}
                placeholder="kosongkan untuk jana automatik"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                No. Tel Bimbit <span className="font-normal text-slate-400">(pilihan)</span>
              </label>
              <input
                type="tel"
                value={telefon}
                onChange={(event) => setTelefon(event.target.value)}
                placeholder="cth. 012-3456789"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {issued && (
            <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <p className="text-xs font-bold">
                  Kredensial dijana — serahkan kepada {createdName} (tidak boleh dilihat semula)
                </p>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-1.5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Nama Pengguna
                  </p>
                  <p className="font-mono text-xs font-bold text-slate-900">{issued.username}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(issued.username)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  title="Salin nama pengguna"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-1.5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Kata Laluan Sementara
                  </p>
                  <p className="font-mono text-xs font-bold text-slate-900">
                    {issued.temporaryPassword}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(issued.temporaryPassword)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  title="Salin kata laluan"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[10px] font-medium leading-relaxed text-emerald-800">
                Pengguna <strong>wajib</strong> menukar kata laluan semasa log masuk pertama.
              </p>
            </div>
          )}

          {error && (
            <p className="flex items-start gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span>
              Hanya Pentadbir Sistem boleh mendaftar pengguna. Kata laluan disimpan sebagai hash
              PBKDF2-SHA256.
            </span>
          </p>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {issued ? 'Selesai' : 'Batal'}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menjana kredensial…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 text-amber-400" />
                  Daftar &amp; Jana Kredensial
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
