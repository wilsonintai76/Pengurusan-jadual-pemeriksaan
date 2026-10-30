import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, ShieldAlert } from 'lucide-react';
import { MIN_PASSWORD_LENGTH, changePassword } from '@/lib/authClient';
import type { UserSession } from '@/lib/types';

interface ForcePasswordModalProps {
  user: UserSession | null;
  onDone: () => void;
  onLogout: () => void;
}

/** Tetingkap wajib: kata laluan sementara mesti ditukar sebelum portal digunakan. */
export default function ForcePasswordModal({ user, onDone, onLogout }: ForcePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;

    setError('');

    if (!currentPassword) {
      setError('Sila masukkan kata laluan sementara yang diberikan oleh Pentadbir Sistem.');
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Kata laluan baharu mestilah sekurang-kurangnya ${MIN_PASSWORD_LENGTH} aksara.`);
      return;
    }
    if (newPassword === currentPassword) {
      setError('Kata laluan baharu mestilah berbeza daripada kata laluan sementara.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Pengesahan kata laluan tidak sepadan.');
      return;
    }

    setIsSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setIsDone(true);
      window.setTimeout(onDone, 900);
    } catch (err) {
      setError((err as Error).message || 'Gagal menukar kata laluan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-800 bg-slate-900 p-6 text-white">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800">
            <KeyRound className="h-6 w-6 text-amber-400" />
          </div>
          <h3 className="text-center text-base font-extrabold tracking-tight sm:text-lg">
            Tukar Kata Laluan Sementara
          </h3>
          <p className="mt-1 text-center text-xs text-slate-300">
            Akaun ini menggunakan kata laluan yang dijana Pentadbir Sistem. Tukar dahulu untuk
            meneruskan.
          </p>
          {user && (
            <p className="mt-2.5 truncate text-center font-mono text-[11px] text-amber-300">
              {user.email} · {user.dept}
            </p>
          )}
        </div>

        {isDone ? (
          <div className="space-y-3 p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <p className="text-sm font-bold text-slate-900">Kata laluan berjaya ditukar</p>
            <p className="text-xs text-slate-500">Membuka portal…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-6 text-xs sm:text-sm" noValidate>
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Semua tindakan lain disekat sehingga kata laluan ditukar. Gunakan kata laluan
                peribadi yang kukuh.
              </span>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Kata Laluan Sementara <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Seperti yang diberikan pentadbir"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Kata Laluan Baharu <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder={`Minimum ${MIN_PASSWORD_LENGTH} aksara`}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-10 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Sembunyikan kata laluan' : 'Tunjukkan kata laluan'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Sahkan Kata Laluan Baharu <span className="text-rose-500">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Ulang kata laluan baharu"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {error && (
              <p className="flex items-start gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menyimpan…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-amber-400" />
                  <span>Tukar &amp; Teruskan</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="w-full rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Log keluar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
