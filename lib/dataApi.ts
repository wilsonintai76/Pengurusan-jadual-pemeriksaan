import { API_BASE_URL } from './apiConfig';
import { UNAUTHORIZED_EVENT, authHeaders } from './authClient';
import { normalizeRole } from './systemRoles';
import type {
  CycleAssignment,
  CycleDetail,
  CycleMode,
  CycleParams,
  CyclePlan,
  DepartmentInfo,
  EligibleInspector,
  InspectionCycle,
  InspectionSchedule,
  LocationInfo,
  LockPlanResult,
  PbacAuditLog,
  RoleAssignment,
  RoleAssignmentInput,
  RoleDefinition,
  SystemSettings,
  TenureNotice,
  UserSession,
  OfficerRoleSummary,
} from './types';

/** Kredensial yang dijana Worker semasa pendaftaran / set semula. */
export interface IssuedCredentials {
  username: string;
  temporaryPassword: string;
}

/** Aset KEW.PA-7 dihantar ke `PUT /api/locations/:id/assets` (menggantikan senarai lama). */
export interface AssetPayload {
  noSiriPendaftaran: string;
  keteranganAset: string;
  tarikhPenempatan?: string;
  statusFizikal?: string;
  kategori?: string;
}

/** Input pendaftaran pegawai oleh pentadbir (kata laluan dijana automatik). */
export interface NewOfficerInput {
  nama: string;
  dept: string;
  role: string;
  gred?: string;
  telefon?: string;
  sambungan?: string;
  emel?: string;
}

export interface CalendarItem {
  id: string;
  tahun: number;
  tarikh: string;
  tajuk: string;
  kategori: 'MESYUARAT_PRA_JKPAK' | 'MESYUARAT_JKPAK' | 'PEMERIKSAAN' | 'LAIN' | string;
  catatan: string | null;
}

export interface CalendarInput {
  tahun: number;
  tarikh: string;
  tajuk: string;
  kategori?: string;
  catatan?: string | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetchEnvelope<T>(
  path: string,
  init?: RequestInit
): Promise<{ data: T; credentials?: IssuedCredentials }> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  const payload: any = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      payload?.message || `Ralat pelayan (${response.status})`,
      response.status,
      payload?.code,
      payload
    );
  }

  return { data: payload?.data as T, credentials: payload?.credentials };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  const payload: any = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      payload?.message || `Ralat pelayan (${response.status})`,
      response.status,
      payload?.code,
      payload
    );
  }

  return (payload?.data ?? payload) as T;
}

interface OfficerRow {
  id: string;
  nama: string;
  emel: string;
  jawatan: string | null;
  gred: string | null;
  telefon: string | null;
  sambungan: string | null;
  dept: string;
  role: string | null;
  status: string | null;
  roles?: OfficerRoleSummary[];
}

function toUserSession(row: OfficerRow): UserSession {
  return {
    id: row.id,
    email: row.emel,
    name: row.nama,
    dept: row.dept,
    role: normalizeRole(row.role),
    grade: row.gred ?? undefined,
    phone: row.telefon ?? undefined,
    ext: row.sambungan ?? undefined,
    status: (row.status as UserSession['status']) ?? 'Aktif',
    roles: row.roles ?? [],
  };
}

function toOfficerPayload(user: UserSession) {
  return {
    nama: user.name,
    emel: user.email,
    dept: user.dept,
    role: user.role,
    gred: user.grade,
    telefon: user.phone,
    sambungan: user.ext,
    status: user.status,
  };
}

function toSchedule(row: InspectionSchedule): InspectionSchedule {
  if (!row.kewpa11DocKey) return row;

  return {
    ...row,
    kewpa11Doc: {
      name: 'KEW.PA-11 (Cloudflare R2)',
      url: `${API_BASE_URL}/api/storage/file/${encodeURIComponent(row.kewpa11DocKey)}`,
    },
  };
}

export const dataApi = {
  departments: {
    list: () => apiFetch<DepartmentInfo[]>('/api/departments'),
    usage: (id: string) =>
      apiFetch<{
        pegawai: number;
        lokasi: number;
        aset: number;
        jadual: number;
        statistikKitaran: number;
        rekodAudit: number;
        canDelete: boolean;
      }>(`/api/departments/${encodeURIComponent(id)}/usage`),
    create: (payload: {
      id: string;
      nama: string;
      crossPartnerId?: string;
      ketuaJabatan?: string;
      penolongPegawaiAset?: string;
    }) =>
      apiFetch<DepartmentInfo>('/api/departments', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (
      id: string,
      payload: {
        nama?: string;
        crossPartnerId?: string;
        ketuaJabatan?: string;
        penolongPegawaiAset?: string;
      }
    ) =>
      apiFetch<DepartmentInfo>(`/api/departments/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    remove: (id: string) =>
      apiFetch<null>(`/api/departments/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },

  roles: {
    list: () => apiFetch<RoleDefinition[]>('/api/roles'),
  },

  /** Takwim perancangan tahunan (Tetapan). */
  calendar: {
    list: (tahun?: number) =>
      apiFetch<CalendarItem[]>(`/api/calendar${tahun ? `?tahun=${tahun}` : ''}`),
    create: (input: CalendarInput) =>
      apiFetch<CalendarItem>('/api/calendar', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    update: (id: string, input: Partial<CalendarInput>) =>
      apiFetch<CalendarItem>(`/api/calendar/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    remove: (id: string) =>
      apiFetch<null>(`/api/calendar/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },

  roleAssignments: {
    list: (params: { officerId?: string; email?: string; roleId?: string; status?: string } = {}) => {
      const query = new URLSearchParams(
        Object.entries(params).filter(([, value]) => Boolean(value)) as [string, string][]
      ).toString();
      return apiFetch<RoleAssignment[]>(`/api/role-assignments${query ? `?${query}` : ''}`);
    },
    create: (payload: RoleAssignmentInput) =>
      apiFetch<RoleAssignment>('/api/role-assignments', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    end: (id: string, validTo?: string) =>
      apiFetch<RoleAssignment>(`/api/role-assignments/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify({ action: 'end', validTo }),
      }),
    renew: (id: string, body: { validFrom?: string; validTo?: string; notes?: string } = {}) =>
      apiFetch<RoleAssignment>(`/api/role-assignments/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify({ action: 'renew', ...body }),
      }),
  },

  officers: {
    list: async (dept?: string): Promise<UserSession[]> => {
      const query = dept && dept !== 'SEMUA' ? `?dept=${encodeURIComponent(dept)}` : '';
      const rows = await apiFetch<OfficerRow[]>(`/api/officers${query}`);
      return rows.map(toUserSession);
    },    create: async (user: UserSession): Promise<UserSession> => {
      const row = await apiFetch<OfficerRow>('/api/officers', {
        method: 'POST',
        body: JSON.stringify(toOfficerPayload(user)),
      });
      return toUserSession(row);
    },
    /** Daftar pegawai + jana nama pengguna & kata laluan sementara (Pentadbir Sistem). */
    createAccount: async (
      input: NewOfficerInput
    ): Promise<{ officer: UserSession; credentials: IssuedCredentials }> => {
      const { data, credentials } = await apiFetchEnvelope<OfficerRow>('/api/officers', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      if (!credentials) {
        throw new ApiError('Worker tidak memulangkan kredensial pegawai.', 500, 'NO_CREDENTIALS');
      }
      return { officer: toUserSession(data), credentials };
    },
    /** Daftar pegawai ke direktori sahaja (tanpa akaun log masuk) — PPAJ/PPAU & KJ/KU. */
    createDirectoryOfficer: async (
      input: Pick<NewOfficerInput, 'nama' | 'dept' | 'role'>
    ): Promise<UserSession> => {
      const row = await apiFetch<OfficerRow>('/api/officers/directory', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return toUserSession(row);
    },
    /** Jana semula kata laluan sementara bagi pegawai sedia ada (Pentadbir Sistem). */
    resetCredentials: async (identifier: string): Promise<IssuedCredentials> => {
      const { credentials } = await apiFetchEnvelope<unknown>(
        `/api/officers/${encodeURIComponent(identifier)}/credentials`,
        { method: 'POST' }
      );
      if (!credentials) {
        throw new ApiError('Worker tidak memulangkan kredensial pegawai.', 500, 'NO_CREDENTIALS');
      }
      return credentials;
    },
    /** Tetapkan jawatan utama pegawai (label `officers.peranan`). */
    setPrimaryRole: async (identifier: string, roleId: string): Promise<UserSession> => {
      const row = await apiFetch<OfficerRow>(
        `/api/officers/${encodeURIComponent(identifier)}/primary-role`,
        { method: 'PUT', body: JSON.stringify({ roleId }) }
      );
      return toUserSession(row);
    },
    update: async (user: UserSession): Promise<UserSession> => {
      const identifier = encodeURIComponent(user.id || user.email);
      const row = await apiFetch<OfficerRow>(`/api/officers/${identifier}`, {
        method: 'PUT',
        body: JSON.stringify(toOfficerPayload(user)),
      });
      return toUserSession(row);
    },
    remove: (identifier: string) =>
      apiFetch<null>(`/api/officers/${encodeURIComponent(identifier)}`, { method: 'DELETE' }),
    /** Creates the officer when missing, otherwise updates the existing record. */
    save: async (user: UserSession): Promise<UserSession> => {
      if (user.id) {
        try {
          return await dataApi.officers.update(user);
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 404) throw error;
        }
      }

      try {
        return await dataApi.officers.create(user);
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          return dataApi.officers.update(user);
        }
        throw error;
      }
    },
  },

  locations: {
    list: () => apiFetch<LocationInfo[]>('/api/locations'),
    create: (location: LocationInfo) =>
      apiFetch<LocationInfo>('/api/locations', {
        method: 'POST',
        body: JSON.stringify(location),
      }),
    update: (location: LocationInfo) =>
      apiFetch<LocationInfo>(`/api/locations/${encodeURIComponent(location.id)}`, {
        method: 'PUT',
        body: JSON.stringify(location),
      }),
    remove: (id: string) =>
      apiFetch<null>(`/api/locations/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    /** Senarai aset KEW.PA-7 bagi satu ruang (untuk CSV Daftar Pemeriksaan). */
    assets: (id: string) =>
      apiFetchEnvelope<Array<{ noSiriPendaftaran: string; keterangan: string; statusFizikal: string }>>(
        `/api/locations/${encodeURIComponent(id)}/assets`
      ),
    /** Simpan semula senarai aset KEW.PA-7 bagi sesuatu lokasi (ganti sepenuhnya). */
    replaceAssets: (
      id: string,
      assets: AssetPayload[]
    ) =>
      apiFetch<{ count: number }>(`/api/locations/${encodeURIComponent(id)}/assets`, {
        method: 'PUT',
        body: JSON.stringify({ assets }),
      }),
  },

  kewpa7: {
    documents: () => apiFetch<Array<Record<string, unknown>>>('/api/kewpa7/documents'),
    /** Pautkan dokumen KEW.PA-7 (r2Key) kepada lokasi untuk sejarah versi. */
    linkDocument: (r2Key: string, locationId: string) =>
      apiFetch<{ linked: number }>('/api/kewpa7/documents/link', {
        method: 'PUT',
        body: JSON.stringify({ r2Key, locationId }),
      }),
  },

  schedules: {
    list: async () => {
      const rows = await apiFetch<InspectionSchedule[]>('/api/schedules');
      return rows.map(toSchedule);
    },    create: async (schedule: Partial<InspectionSchedule>) => {
      const row = await apiFetch<InspectionSchedule>('/api/schedules', {
        method: 'POST',
        body: JSON.stringify(schedule),
      });
      return toSchedule(row);
    },
    update: async (id: string, schedule: Partial<InspectionSchedule>) => {
      const row = await apiFetch<InspectionSchedule>(
        `/api/schedules/${encodeURIComponent(id)}`,
        {
          method: 'PUT',
          body: JSON.stringify(schedule),
        }
      );
      return toSchedule(row);
    },
    /** Tuntut slot pemeriksa — disahkan oleh PBAC pada pelayan (lantikan + konflik). */
    claim: async (id: string, slot: 1 | 2) => {
      const row = await apiFetch<InspectionSchedule>(
        `/api/schedules/${encodeURIComponent(id)}/claim`,
        {
          method: 'POST',
          body: JSON.stringify({ slot }),
        }
      );
      return toSchedule(row);
    },
    remove: (id: string) =>
      apiFetch<null>(`/api/schedules/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },

  cycles: {
    list: () => apiFetch<InspectionCycle[]>('/api/cycles'),
    get: (id: string) => apiFetch<CycleDetail>(`/api/cycles/${encodeURIComponent(id)}`),
    create: (payload: {
      tarikhMula: string;
      tarikhTamat: string;
      mode?: CycleMode;
      kod?: string;
    }) =>
      apiFetch<InspectionCycle>('/api/cycles', { method: 'POST', body: JSON.stringify(payload) }),
    generate: (id: string, departmentId?: string | null) =>
      apiFetch<{ created: number; schedules: number; skipped: number }>(
        `/api/cycles/${encodeURIComponent(id)}/generate`,
        { method: 'POST', body: JSON.stringify({ departmentId: departmentId ?? null }) }
      ),
    start: (id: string) =>
      apiFetch<{ snapshotId: string; pairs: number; assignments: number }>(
        `/api/cycles/${encodeURIComponent(id)}/start`,
        { method: 'POST', body: JSON.stringify({}) }
      ),
    close: (id: string) =>
      apiFetch<InspectionCycle>(`/api/cycles/${encodeURIComponent(id)}/close`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    eligible: (id: string, scheduleId: string) =>
      apiFetch<EligibleInspector[]>(
        `/api/cycles/${encodeURIComponent(id)}/eligible?scheduleId=${encodeURIComponent(scheduleId)}`
      ),
    reassign: (
      id: string,
      payload: { assignmentId: string; officerId: string; reason: string; note?: string }
    ) =>
      apiFetch<CycleAssignment>(`/api/cycles/${encodeURIComponent(id)}/reassign`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getParams: (id: string) =>
      apiFetch<CycleParams>(`/api/cycles/${encodeURIComponent(id)}/params`),
    saveParams: (
      id: string,
      payload: Partial<Pick<CycleParams, 'quota' | 'tolerance' | 'overload' | 'split' | 'oddPolicy'>>
    ) =>
      apiFetch<CycleParams>(`/api/cycles/${encodeURIComponent(id)}/params`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    plan: (id: string) => apiFetch<CyclePlan>(`/api/cycles/${encodeURIComponent(id)}/plan`),
    lock: (id: string) =>
      apiFetch<LockPlanResult>(`/api/cycles/${encodeURIComponent(id)}/lock`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
  },

  notices: {
    list: (params: { scope?: 'all' | 'mine'; status?: string } = {}) => {
      const query = new URLSearchParams(
        Object.entries(params).filter(([, value]) => Boolean(value)) as [string, string][]
      ).toString();
      return apiFetch<TenureNotice[]>(`/api/notices${query ? `?${query}` : ''}`);
    },
    scan: () =>
      apiFetch<{ created: number; scanned: number }>('/api/notices/scan', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    markRead: (id: string) =>
      apiFetch<null>(`/api/notices/${encodeURIComponent(id)}/read`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
  },

  audit: {
    list: () => apiFetch<PbacAuditLog[]>('/api/audit-logs'),
    create: (log: Omit<PbacAuditLog, 'id' | 'timestamp'>) =>
      apiFetch<PbacAuditLog>('/api/audit-logs', {
        method: 'POST',
        body: JSON.stringify(log),
      }),
  },

  settings: {
    get: async (): Promise<SystemSettings> => {
      const data = await apiFetch<Partial<SystemSettings>>('/api/settings');
      return {
        sesiTahun: data.sesiTahun ?? '',
        tarikhMulaSesi: data.tarikhMulaSesi ?? '',
        tarikhTamatSesi: data.tarikhTamatSesi ?? '',
        tarikhPraJkpak: data.tarikhPraJkpak ?? '',
        ambangAmaranHari: Number(data.ambangAmaranHari) || 0,
        sasaranLiputanPeratus: Number(data.sasaranLiputanPeratus) || 0,
        minimumPegawaiPemeriksa: Number(data.minimumPegawaiPemeriksa) || 0,
        enforceCrossInspection: Boolean(data.enforceCrossInspection),
        enforceCustodianGuard: Boolean(data.enforceCustodianGuard),
        enforceMaintenanceJustification: Boolean(data.enforceMaintenanceJustification),
        namaInstitusi: data.namaInstitusi ?? '',
        kodInstitusi: data.kodInstitusi ?? '',
        namaUnitAset: data.namaUnitAset ?? '',
        pegawaiAsetUtama: data.pegawaiAsetUtama ?? '',
        emelUnitAset: data.emelUnitAset ?? '',
        telefonUnitAset: data.telefonUnitAset ?? '',
      };
    },
    save: (settings: SystemSettings) =>
      apiFetch<SystemSettings>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
  },
};

export const EMPTY_SETTINGS: SystemSettings = {
  sesiTahun: '',
  tarikhMulaSesi: '',
  tarikhTamatSesi: '',
  tarikhPraJkpak: '',
  ambangAmaranHari: 0,
  sasaranLiputanPeratus: 0,
  minimumPegawaiPemeriksa: 0,
  enforceCrossInspection: false,
  enforceCustodianGuard: false,
  enforceMaintenanceJustification: false,
  namaInstitusi: '',
  kodInstitusi: '',
  namaUnitAset: '',
  pegawaiAsetUtama: '',
  emelUnitAset: '',
  telefonUnitAset: '',
};
