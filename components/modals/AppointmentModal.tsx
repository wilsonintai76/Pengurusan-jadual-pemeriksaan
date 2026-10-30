import React, { useEffect, useMemo, useState } from 'react';
import { X, CalendarPlus, RefreshCw, ShieldCheck, Loader2, AlertCircle, UserPlus } from 'lucide-react';
import type {
  DepartmentInfo,
  LocationInfo,
  RoleAssignment,
  RoleDefinition,
  RoleScopeType,
  UserSession,
} from '@/lib/types';
import { dataApi } from '@/lib/dataApi';

interface AppointmentModalProps {
  mode: 'create' | 'renew';
  initial?: RoleAssignment | null;
  officers: UserSession[];
  roles: RoleDefinition[];
  departments: DepartmentInfo[];
  locations: LocationInfo[];
  onClose: () => void;
  onSaved: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  /** Buka borang pendaftaran pengguna baharu (jika pegawai belum wujud). */
  onRequestCreateOfficer?: () => void;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

function addMonths(dateIso: string, months: number): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export default function AppointmentModal({
  mode,
  initial,
  officers,
  roles,
  departments,
  locations,
  onClose,
  onSaved,
  onShowToast,
  onRequestCreateOfficer,
}: AppointmentModalProps) {
  const [officerId, setOfficerId] = useState(initial?.officerId ?? '');
  const [roleId, setRoleId] = useState(initial?.roleId ?? '');
  const [scopeType, setScopeType] = useState<RoleScopeType>(initial?.scopeType ?? 'GLOBAL');
  const [scopeId, setScopeId] = useState(initial?.scopeId ?? '');
  const [validFrom, setValidFrom] = useState(todayIso());
  const [validTo, setValidTo] = useState('');
  const [notes, setNotes] = useState(
    mode === 'renew' && initial ? `Pembaharuan lantikan ${initial.roleName}` : ''
  );
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [setAsPrimary, setSetAsPrimary] = useState(true);

  const selectedRole = useMemo(() => roles.find((role) => role.id === roleId), [roles, roleId]);
  const isRenew = mode === 'renew';

  useEffect(() => {
    if (isRenew && initial) {
      setScopeType(initial.scopeType);
      setScopeId(initial.scopeId ?? '');
      return;
    }
    if (selectedRole) {
      setScopeType(selectedRole.scopeType);
      setScopeId('');
    }
  }, [selectedRole, isRenew, initial]);

  const autoTenureEnd =
    selectedRole?.defaultTenureMonths && validFrom
      ? addMonths(validFrom, selectedRole.defaultTenureMonths)
      : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    setError('');

    if (!isRenew && !officerId) {
      setError('Sila pilih pegawai.');
      return;
    }
    if (!roleId) {
      setError('Sila pilih peranan.');
      return;
    }
    if (scopeType !== 'GLOBAL' && !scopeId) {
      setError(
        scopeType === 'DEPARTMENT'
          ? 'Sila pilih jabatan skop.'
          : locations.length === 0
            ? 'Tiada lokasi berdaftar. Daftar ruang di Direktori Lokasi dahulu.'
            : 'Sila pilih lokasi skop.'
      );
      return;
    }
    if (validTo && validTo < validFrom) {
      setError('Tarikh tamat mesti selepas tarikh mula.');
      return;
    }

    setIsSaving(true);
    try {
      if (isRenew && initial) {
        await dataApi.roleAssignments.renew(initial.id, {
          validFrom,
          validTo: validTo || undefined,
          notes: notes.trim() || undefined,
        });
        onShowToast('Lantikan diperbaharui sebagai rekod baharu.', 'success');
      } else {
        await dataApi.roleAssignments.create({
          officerId,
          role: roleId,
          scopeType,
          scopeId: scopeType === 'GLOBAL' ? null : scopeId,
          validFrom,
          validTo: validTo || undefined,
          notes: notes.trim() || undefined,
        });

        if (setAsPrimary && selectedRole?.kategori === 'JAWATAN') {
          await dataApi.officers.setPrimaryRole(officerId, roleId);
          onShowToast('Peranan ditambah dan dijadikan jawatan utama.', 'success');
        } else {
          onShowToast('Peranan baharu berjaya ditambah.', 'success');
        }
      }

      onSaved();
      onClose();
    } catch (saveError) {
      setError((saveError as Error).message || 'Gagal menyimpan lantikan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center">
              {isRenew ? <RefreshCw className="w-5 h-5" /> : <CalendarPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {isRenew ? 'Perbaharui Peranan' : 'Tambah Peranan Pegawai'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isRenew
                  ? 'Rekod baharu dicipta; lantikan lama ditutup pada tarikh mula baharu.'
                  : 'Satu pegawai boleh memegang beberapa peranan serentak (jawatan, tanggungjawab & lantikan).'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Pegawai</label>
            <select
              value={officerId}
              onChange={(event) => setOfficerId(event.target.value)}
              disabled={isRenew}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="">— Pilih Pegawai —</option>
              {officers.map((officer) => (
                <option key={officer.id ?? officer.email} value={officer.id ?? officer.email}>
                  {officer.name} ({officer.dept})
                </option>
              ))}
            </select>
            {!isRenew && onRequestCreateOfficer && (
              <button
                type="button"
                onClick={onRequestCreateOfficer}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 underline-offset-2 hover:underline"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Pegawai belum wujud? Daftar pengguna baharu
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Peranan</label>
              <select
                value={roleId}
                onChange={(event) => setRoleId(event.target.value)}
                disabled={isRenew}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="">— Pilih Peranan —</option>
                <optgroup label="Jawatan (hakiki)">
                  {roles
                    .filter((role) => role.kategori !== 'LANTIKAN')
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.nama}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Lantikan (bertempoh)">
                  {roles
                    .filter((role) => role.kategori === 'LANTIKAN')
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.nama}
                      </option>
                    ))}
                </optgroup>
              </select>
              <p className="mt-1 text-[10px] font-medium text-slate-500">
                {selectedRole?.kategori === 'JAWATAN'
                  ? 'Jawatan hakiki — kekal sehingga ditukar.'
                  : selectedRole
                  ? `Lantikan bertempoh${
                      selectedRole.defaultTenureMonths
                        ? ` (${selectedRole.defaultTenureMonths} bulan)`
                        : ''
                    }.`
                  : 'Jawatan = jawatan HR; Lantikan = kuasa bertempoh.'}
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Skop</label>
              <select
                value={scopeType}
                onChange={(event) => {
                  setScopeType(event.target.value as RoleScopeType);
                  setScopeId('');
                }}
                disabled={isRenew || Boolean(selectedRole)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="GLOBAL">Global</option>
                <option value="DEPARTMENT">Jabatan</option>
                <option value="LOCATION">Lokasi</option>
              </select>
            </div>
          </div>

          {scopeType === 'DEPARTMENT' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Jabatan Skop</label>
              <select
                value={scopeId}
                onChange={(event) => setScopeId(event.target.value)}
                disabled={isRenew}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="">— Pilih Jabatan —</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.id} — {department.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {scopeType === 'LOCATION' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Lokasi Skop</label>
              <select
                value={scopeId}
                onChange={(event) => setScopeId(event.target.value)}
                disabled={isRenew}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="">— Pilih Lokasi —</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.kodRuang} — {location.nama} ({location.jabatan})
                  </option>
                ))}
              </select>
              {locations.length === 0 && (
                <p className="mt-1 text-[10px] font-semibold text-rose-600">
                  Tiada lokasi berdaftar. Daftar ruang di <strong>Direktori Lokasi</strong> dahulu
                  sebelum melantik Penyelia Lokasi.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tarikh Mula</label>
              <input
                type="date"
                value={validFrom}
                onChange={(event) => setValidFrom(event.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tarikh Tamat <span className="font-normal text-slate-400">(pilihan)</span>
              </label>
              <input
                type="date"
                value={validTo}
                onChange={(event) => setValidTo(event.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
            <span>
              {autoTenureEnd
                ? `Kosong = tempoh lalai ${selectedRole?.defaultTenureMonths} bulan (tamat ${autoTenureEnd}).`
                : 'Kosong = lantikan kekal sehingga ditamatkan.'}
            </span>
          </p>

          {!isRenew && selectedRole?.kategori === 'JAWATAN' && (
            <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-900">
              <input
                type="checkbox"
                checked={setAsPrimary}
                onChange={(event) => setSetAsPrimary(event.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 accent-slate-900"
              />
              <span>
                Jadikan <strong>{selectedRole.nama}</strong> sebagai jawatan utama pegawai ini
                (dipaparkan di Direktori Pegawai).
              </span>
            </label>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Catatan <span className="font-normal text-slate-400">(pilihan)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="cth. surat lantikan bil. 12/2026"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSaving ? 'Menyimpan…' : isRenew ? 'Perbaharui Lantikan' : 'Simpan Lantikan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
