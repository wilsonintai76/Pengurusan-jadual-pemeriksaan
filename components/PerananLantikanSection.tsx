import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarPlus,
  CalendarClock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Search,
  Loader2,
  Users,
  UserPlus,
  Bell,
  BellRing,
} from 'lucide-react';
import type {
  DepartmentInfo,
  LocationInfo,
  RoleAssignment,
  RoleDefinition,
  TenureNotice,
  UserSession,
} from '@/lib/types';
import { dataApi } from '@/lib/dataApi';
import AppointmentModal from '@/components/modals/AppointmentModal';
import OfficerCreateModal from '@/components/modals/OfficerCreateModal';
import type { IssuedCredentials, NewOfficerInput } from '@/lib/dataApi';

interface PerananLantikanSectionProps {
  officers: UserSession[];
  departments: DepartmentInfo[];
  locations: LocationInfo[];
  canManage: boolean;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  /** Daftar pengguna baharu (Pentadbir Sistem) — kredensial dijana Worker. */
  onCreateOfficer?: (
    input: NewOfficerInput
  ) => Promise<{ officer: UserSession; credentials: IssuedCredentials }>;
  /** Dipanggil selepas lantikan/pengguna berubah (induk memuat semula direktori). */
  onChanged?: () => void;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

function daysUntil(dateIso?: string | null): number | null {
  if (!dateIso) return null;
  const diff =
    new Date(`${dateIso}T00:00:00Z`).getTime() - new Date(`${todayIso()}T00:00:00Z`).getTime();
  return Math.round(diff / 86_400_000);
}

function isActive(assignment: RoleAssignment): boolean {
  const today = todayIso();
  return (
    assignment.status === 'AKTIF' &&
    assignment.validFrom <= today &&
    (!assignment.validTo || assignment.validTo >= today)
  );
}

export default function PerananLantikanSection({
  officers,
  departments,
  locations,
  canManage,
  onShowToast,
  onCreateOfficer,
  onChanged,
}: PerananLantikanSectionProps) {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'SEMUA' | 'AKTIF' | 'TAMAT'>('SEMUA');
  const [modal, setModal] = useState<{ mode: 'create' | 'renew'; initial?: RoleAssignment } | null>(
    null
  );
  const [notices, setNotices] = useState<TenureNotice[]>([]);
  const [showNotices, setShowNotices] = useState(true);
  const [showCreateOfficer, setShowCreateOfficer] = useState(false);

  const officerById = useMemo(() => {
    const map = new Map<string, UserSession>();
    officers.forEach((officer) => {
      if (officer.id) map.set(officer.id, officer);
    });
    return map;
  }, [officers]);

  const locationById = useMemo(() => {
    const map = new Map<string, LocationInfo>();
    locations.forEach((location) => map.set(location.id, location));
    return map;
  }, [locations]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [roleList, assignmentList, noticeList] = await Promise.all([
        dataApi.roles.list(),
        dataApi.roleAssignments.list(),
        dataApi.notices.list({ scope: 'all' }).catch(() => [] as TenureNotice[]),
      ]);
      setRoles(roleList);
      setAssignments(assignmentList);
      setNotices(noticeList);
    } catch (error) {
      onShowToast(`Gagal memuatkan lantikan: ${(error as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleScan = async () => {
    try {
      const result = await dataApi.notices.scan();
      onShowToast(`${result.created} notifikasi baharu (${result.scanned} lantikan diperiksa).`, 'success');
      await load();
    } catch (error) {
      onShowToast((error as Error).message, 'error');
    }
  };

  const handleReadNotice = async (id: string) => {
    try {
      await dataApi.notices.markRead(id);
      setNotices((prev) =>
        prev.map((notice) => (notice.id === id ? { ...notice, status: 'DIBACA' } : notice))
      );
    } catch (error) {
      onShowToast((error as Error).message, 'error');
    }
  };

  const unreadNotices = notices.filter((notice) => notice.status === 'BARU');

  const stats = useMemo(() => {
    const active = assignments.filter(isActive);
    const expiring = active.filter((assignment) => {
      const days = daysUntil(assignment.validTo);
      return days !== null && days <= 60;
    });
    return {
      total: assignments.length,
      active: active.length,
      expiring: expiring.length,
      ended: assignments.filter((assignment) => !isActive(assignment)).length,
    };
  }, [assignments]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return assignments
      .filter((assignment) => {
        const officer = officerById.get(assignment.officerId);
        const matchesQuery =
          !query ||
          (officer?.name ?? '').toLowerCase().includes(query) ||
          (officer?.email ?? '').toLowerCase().includes(query) ||
          assignment.roleName.toLowerCase().includes(query);
        const matchesRole = !roleFilter || assignment.roleId === roleFilter;
        const active = isActive(assignment);
        const matchesStatus =
          statusFilter === 'SEMUA' || (statusFilter === 'AKTIF' ? active : !active);
        return matchesQuery && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        const aEnded = isActive(a) ? 0 : 1;
        const bEnded = isActive(b) ? 0 : 1;
        if (aEnded !== bEnded) return aEnded - bEnded;
        return a.validFrom < b.validFrom ? 1 : -1;
      });
  }, [assignments, officerById, search, roleFilter, statusFilter]);

  const handleEnd = async (assignment: RoleAssignment) => {
    const officer = officerById.get(assignment.officerId);
    const label = officer?.name ?? assignment.officerId;
    if (!window.confirm(`Tamatkan lantikan ${assignment.roleName} bagi ${label}?`)) return;

    try {
      await dataApi.roleAssignments.end(assignment.id);
      onShowToast('Lantikan ditamatkan. Rekod sejarah dikekalkan.', 'info');
      await load();
    } catch (error) {
      onShowToast((error as Error).message, 'error');
    }
  };

  const scopeLabel = (assignment: RoleAssignment) => {
    if (assignment.scopeType === 'GLOBAL') return 'Global';
    if (assignment.scopeType === 'DEPARTMENT') {
      const department = departments.find((item) => item.id === assignment.scopeId);
      return department ? `${department.id}` : (assignment.scopeId ?? '-');
    }
    const location = assignment.scopeId ? locationById.get(assignment.scopeId) : undefined;
    return location ? `${location.kodRuang}` : 'Lokasi dipadam';
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-slate-800" />
            Peranan &amp; Lantikan PBAC
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lantikan berskop dan bertempoh. Hanya lantikan <strong>Pegawai Pemeriksa</strong> yang aktif
            membenarkan pelaksanaan pemeriksaan.
          </p>
        </div>

        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            {onCreateOfficer && (
              <button
                type="button"
                onClick={() => setShowCreateOfficer(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-50"
              >
                <UserPlus className="w-4 h-4 text-slate-600" />
                Daftar Pengguna
              </button>
            )}
            <button
              type="button"
              onClick={() => setModal({ mode: 'create' })}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
            >
              <CalendarPlus className="w-4 h-4 text-amber-400" />
              Tambah Lantikan
            </button>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
            <ShieldAlert className="w-3.5 h-3.5" />
            Hanya Pentadbir Sistem boleh mengubah lantikan
          </span>
        )}
      </div>

      {canManage && unreadNotices.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900">
              <BellRing className="h-3.5 w-3.5" />
              {unreadNotices.length} notifikasi lantikan belum dibaca
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleScan}
                className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[10px] font-bold text-amber-900 hover:bg-amber-100"
              >
                Imbas Semula (60 hari)
              </button>
              <button
                type="button"
                onClick={() => setShowNotices((value) => !value)}
                className="rounded-lg px-2 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-100"
              >
                {showNotices ? 'Sembunyikan' : 'Tunjuk'}
              </button>
            </div>
          </div>

          {showNotices && (
            <ul className="mt-2 space-y-1.5">
              {unreadNotices.slice(0, 6).map((notice) => (
                <li
                  key={notice.id}
                  className={`flex items-start justify-between gap-2 rounded-xl border bg-white px-2.5 py-1.5 text-[11px] ${
                    notice.severity === 'critical'
                      ? 'border-rose-200 text-rose-800'
                      : 'border-amber-200 text-amber-900'
                  }`}
                >
                  <span className="flex items-start gap-1.5 leading-relaxed">
                    <Bell className="mt-0.5 h-3 w-3 shrink-0" />
                    {notice.mesej}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleReadNotice(notice.id)}
                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  >
                    Tanda dibaca
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Jumlah Lantikan', value: stats.total, icon: Users, tone: 'text-slate-900' },
          { label: 'Aktif', value: stats.active, icon: ShieldCheck, tone: 'text-emerald-700' },
          { label: 'Luput ≤ 60 Hari', value: stats.expiring, icon: CalendarClock, tone: 'text-amber-700' },
          { label: 'Tamat', value: stats.ended, icon: ShieldAlert, tone: 'text-rose-700' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {label}
              </span>
              <Icon className={`w-4 h-4 ${tone}`} />
            </div>
            <p className={`mt-1 font-mono text-xl font-bold ${tone}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama pegawai, emel atau peranan…"
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">Semua Peranan</option>
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
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="SEMUA">Semua Status</option>
            <option value="AKTIF">Aktif</option>
            <option value="TAMAT">Tamat / Ditamatkan</option>
          </select>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            title="Muat semula"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-xs font-medium text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Memuatkan lantikan…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Tiada lantikan sepadan dengan penapis semasa.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-bold">Pegawai</th>
                  <th className="px-4 py-2.5 font-bold">Peranan</th>
                  <th className="px-4 py-2.5 font-bold">Skop</th>
                  <th className="px-4 py-2.5 font-bold">Tempoh</th>
                  <th className="px-4 py-2.5 font-bold">Baki</th>
                  <th className="px-4 py-2.5 font-bold">Status</th>
                  {canManage && <th className="px-4 py-2.5 font-bold text-right">Tindakan</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((assignment) => {
                  const officer = officerById.get(assignment.officerId);
                  const active = isActive(assignment);
                  const remaining = daysUntil(assignment.validTo);
                  const expiringSoon = active && remaining !== null && remaining <= 60;

                  return (
                    <tr key={assignment.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <span className="block font-semibold text-slate-900">
                          {officer?.name ?? assignment.officerId}
                        </span>
                        <span className="block text-[10px] font-mono text-slate-400">
                          {officer?.email ?? '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{assignment.roleName}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                          {assignment.scopeType}
                        </span>
                        <span className="ml-1.5 font-mono text-[10px] text-slate-500">
                          {scopeLabel(assignment)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                        {assignment.validFrom} → {assignment.validTo ?? 'kekal'}
                      </td>
                      <td className="px-4 py-3">
                        {!active ? (
                          <span className="text-[11px] font-semibold text-rose-600">Tamat</span>
                        ) : remaining === null ? (
                          <span className="text-[11px] text-slate-500">Kekal</span>
                        ) : (
                          <span
                            className={`text-[11px] font-bold ${
                              expiringSoon ? 'text-amber-700' : 'text-slate-600'
                            }`}
                          >
                            {remaining} hari
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : assignment.status === 'AKTIF'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {active ? 'AKTIF' : assignment.status === 'AKTIF' ? 'LUPUT' : 'DITAMATKAN'}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setModal({ mode: 'renew', initial: assignment })}
                              disabled={!assignment.validTo}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              title={
                                assignment.validTo
                                  ? 'Perbaharui (rekod baharu)'
                                  : 'Jawatan hakiki tidak bertempoh — tiada pembaharuan'
                              }
                            >
                              <RefreshCw className="w-3 h-3" />
                              Perbaharui
                            </button>
                            {active && (
                              <button
                                type="button"
                                onClick={() => handleEnd(assignment)}
                                className="rounded-lg border border-rose-200 px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-50"
                              >
                                Tamatkan
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateOfficer && onCreateOfficer && (
        <OfficerCreateModal
          departments={departments}
          onCreate={onCreateOfficer}
          onClose={() => setShowCreateOfficer(false)}
          onShowToast={onShowToast}
        />
      )}

      {modal && (
        <AppointmentModal
          mode={modal.mode}
          initial={modal.initial ?? null}
          officers={officers}
          roles={roles}
          departments={departments}
          locations={locations}
          onClose={() => setModal(null)}
          onSaved={() => {
            load();
            onChanged?.();
          }}
          onShowToast={onShowToast}
          onRequestCreateOfficer={() => {
            setModal(null);
            setShowCreateOfficer(true);
          }}
        />
      )}
    </div>
  );
}
