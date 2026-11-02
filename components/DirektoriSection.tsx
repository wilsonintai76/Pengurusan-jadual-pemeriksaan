import React, { useEffect, useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Building2, 
  ShieldCheck, 
  ArrowLeftRight, 
  Download, 
  Phone, 
  Mail, 
  FileSpreadsheet, 
  Filter, 
  ArrowUpDown, 
  SlidersHorizontal, 
  Clock, 
  Briefcase,
  BadgeCheck,
  Copy,
  KeyRound
} from 'lucide-react';
import { useDepartments } from '@/lib/useReferenceData';
import { UserSession, SystemRole, DepartmentInfo, LocationInfo, RoleAssignment, RoleScopeType } from '@/lib/types';
import type { AccessPermission, IssuedCredentials, OfficerAccess, NewOfficerInput } from '@/lib/dataApi';
import { dataApi } from '@/lib/dataApi';
import { JAWATAN_ROLES, ROLE_LABELS, ROLE_LABELS_JAWATAN, isRole, normalizeRole, roleIdOf, roleShort, BELUM_DILANTIK } from '@/lib/systemRoles';

/** Ambang amaran lantikan bakal tamat (hari). */
const HARI_AMARAN_LUPUT = 60;

/** Peranan yang boleh ditanda terus dalam dialog pegawai (skop mengikut polisi). */
const PERANAN_BOLEH_DITANDA: Array<{
  id: string;
  label: string;
  ringkas: string;
  scope: RoleScopeType;
  nota: string;
}> = [
  { id: 'KETUA_JABATAN', label: 'Ketua Jabatan / Unit', ringkas: 'KJ/KU', scope: 'DEPARTMENT', nota: 'akses utama jabatan/unit' },
  { id: 'KETUA_PROGRAM', label: 'Ketua Program', ringkas: 'KP', scope: 'DEPARTMENT', nota: 'akses utama jabatan/unit' },
  { id: 'PEGAWAI_ASET', label: 'Pegawai Aset', ringkas: 'PA', scope: 'DEPARTMENT', nota: 'akses utama jabatan/unit' },
  { id: 'PENOLONG_PEGAWAI_ASET', label: 'Penolong Pegawai Aset', ringkas: 'PPAJ/PPAU', scope: 'DEPARTMENT', nota: 'daftar pegawai & ruang jabatan' },
  { id: 'PENYELIA_LOKASI', label: 'Penyelia Lokasi', ringkas: 'PL', scope: 'LOCATION', nota: 'wajib pilih ruang' },
  { id: 'PEMERIKSA', label: 'Pegawai Pemeriksa', ringkas: 'PP', scope: 'GLOBAL', nota: 'wajib tarikh lantikan' },
];

const hariIni = () => new Date().toISOString().slice(0, 10);

/** Tarikh tamat lantikan pemeriksa lalai — 24 bulan (1PP AM 2.4). */
const tamatLalaiPemeriksa = (mula: string) => {
  const d = new Date(`${mula || hariIni()}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 24);
  return d.toISOString().slice(0, 10);
};

/** Jumlah hari sebelum lantikan tamat (null = kekal / tiada tarikh). */
const hariKeTamat = (validTo?: string | null): number | null => {
  if (!validTo) return null;
  const tamat = new Date(`${validTo}T23:59:59`).getTime();
  if (Number.isNaN(tamat)) return null;
  return Math.ceil((tamat - Date.now()) / 86_400_000);
};

/** Semua peranan aktif pegawai — tiada pemisahan jawatan/lantikan lagi. */
const lantikanPegawai = (user: UserSession) => user.roles ?? [];

const adaLantikan = (user: UserSession, roleId: string) =>
  (user.roles ?? []).some((r) => r.roleId === roleId);

const lantikanHampirLuput = (user: UserSession) =>
  lantikanPegawai(user).some((r) => {
    const hari = hariKeTamat(r.validTo);
    return hari !== null && hari >= 0 && hari <= HARI_AMARAN_LUPUT;
  });

interface DirektoriSectionProps {
  currentUser?: UserSession | null;
  users?: UserSession[];
  /** Pendaftaran hanya untuk pentadbir: Worker menjana nama pengguna & kata laluan. */
  /**
   * `credentials` null bermaksud pegawai itu sudah ada dalam direktori —
   * kredensial sedia ada dikekalkan (tiada akaun pendua dicipta).
   */
  onCreateOfficer?: (
    input: NewOfficerInput
  ) => Promise<{ officer: UserSession; credentials: IssuedCredentials | null; existing?: boolean }>;
  onResetCredentials?: (user: UserSession) => Promise<IssuedCredentials>;
  /** Tetapkan jawatan utama (memerlukan lantikan aktif bagi peranan itu). */
  onSetPrimaryRole?: (user: UserSession, roleId: string) => Promise<void>;
  onUpdateUser?: (user: UserSession) => void;
  onDeleteUser?: (userEmail: string) => void;
  canManage?: boolean;
  /**
   * Jabatan yang boleh didaftar/dikemas kini oleh PPAJ/PPAU (skop lantikan sendiri).
   * Pentadbir Sistem tidak memerlukan senarai ini.
   */
  jabatanDiurus?: string[];
  /** Senarai jabatan & lokasi untuk pengurusan lantikan (sub-tab). */
  departments?: DepartmentInfo[];
  locations?: LocationInfo[];
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  /** Dipanggil selepas lantikan berubah supaya App memuat semula data. */
  onRolesChanged?: () => void;
}

/** Konfigurasi warna lencana mengikut id peranan (lihat lib/systemRoles.ts). */
const ROLE_CONFIG: Record<
  string,
  { bg: string; text: string; border: string; badge: string; iconBg: string }
> = {
  KETUA_JABATAN: {
    bg: 'bg-purple-50',
    text: 'text-purple-900',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-900 border-purple-300',
    iconBg: 'bg-purple-700 text-white',
  },
  KETUA_PROGRAM: {
    bg: 'bg-blue-50',
    text: 'text-blue-900',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-900 border-blue-300',
    iconBg: 'bg-blue-700 text-white',
  },
  PEGAWAI_ASET: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-900',
    border: 'border-indigo-200',
    badge: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    iconBg: 'bg-indigo-700 text-white',
  },
  PENOLONG_PEGAWAI_ASET: {
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    iconBg: 'bg-amber-600 text-white',
  },
  PENYELIA_LOKASI: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-900',
    border: 'border-cyan-200',
    badge: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    iconBg: 'bg-cyan-700 text-white',
  },
  PEMERIKSA: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-900',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    iconBg: 'bg-emerald-700 text-white',
  },
  PENTADBIR_SISTEM: {
    bg: 'bg-rose-50',
    text: 'text-rose-900',
    border: 'border-rose-200',
    badge: 'bg-rose-100 text-rose-900 border-rose-300',
    iconBg: 'bg-rose-700 text-white',
  },
};

const DEFAULT_ROLE_CONFIG = {
  bg: 'bg-slate-50',
  text: 'text-slate-900',
  border: 'border-slate-200',
  badge: 'bg-slate-100 text-slate-800 border-slate-300',
  iconBg: 'bg-slate-700 text-white',
};
export default function DirektoriSection({
  currentUser,
  users = [],
  onCreateOfficer,
  onResetCredentials,
  onSetPrimaryRole,
  onUpdateUser,
  onDeleteUser,
  canManage = false,
  jabatanDiurus = [],
  departments: departmentsProp,
  locations = [],
  onShowToast,
  onRolesChanged,
}: DirektoriSectionProps) {
  /** PPAJ/PPAU boleh urus pegawai jabatan sendiri (daftar/kemaskini sahaja). */
  const bolehDaftarPegawai = canManage || jabatanDiurus.length > 0;
  const bolehKemaskiniPegawai = (dept?: string) =>
    canManage || (Boolean(dept) && jabatanDiurus.includes(String(dept)));

  const [issued, setIssued] = useState<IssuedCredentials | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [issuedFor, setIssuedFor] = useState<string>('');
  const referenceDepartments = useDepartments();
  const departments = departmentsProp ?? referenceDepartments;
  const [activeSubTab] = useState<'crudTable' | 'roles'>('crudTable');
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('SEMUA');
  const [deptFilter, setDeptFilter] = useState('SEMUA');
  const [statusFilter, setStatusFilter] = useState('SEMUA');
  // Penapis berasaskan PBAC: lantikan aktif, skop & tempoh sah
  const [capaianFilter, setCapaianFilter] = useState<
    'SEMUA' | 'PENTADBIR' | 'PEMERIKSA' | 'PENYELIA' | 'TANPA_PERANAN' | 'AKAN_LUPUT'
  >('SEMUA');
  const [sortBy, setSortBy] = useState<'name' | 'dept' | 'role' | 'grade'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserSession | null>(null);
  const [viewingUser, setViewingUser] = useState<UserSession | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserSession | null>(null);

  // Tab dalam dialog pegawai: Maklumat | Peranan (tick)
  const [tabDialog, setTabDialog] = useState<'maklumat' | 'peranan'>('maklumat');

  // Penandaan peranan terus dalam dialog (tulis ke role_assignments)
  const [lantikanSedia, setLantikanSedia] = useState<RoleAssignment[]>([]);
  const [perananTanda, setPerananTanda] = useState<Record<string, boolean>>({});
  const [ppMula, setPpMula] = useState(hariIni());
  const [ppTamat, setPpTamat] = useState('');
  const [plLokasi, setPlLokasi] = useState('');
  const [ralatPeranan, setRalatPeranan] = useState('');

  // Capaian berkesan (PBAC) bagi pegawai yang sedang dilihat
  const [akses, setAkses] = useState<OfficerAccess | null>(null);
  const [aksesLoading, setAksesLoading] = useState(false);
  const [aksesError, setAksesError] = useState('');

  useEffect(() => {
    if (!viewingUser) {
      setAkses(null);
      setAksesError('');
      return;
    }

    let dibatalkan = false;
    const identifier = viewingUser.id || viewingUser.email;
    setAkses(null);
    setAksesError('');
    setAksesLoading(true);

    dataApi.officers
      .access(identifier)
      .then((hasil) => {
        if (!dibatalkan) setAkses(hasil);
      })
      .catch((error: unknown) => {
        if (!dibatalkan) setAksesError((error as Error).message || 'Capaian gagal dibaca.');
      })
      .finally(() => {
        if (!dibatalkan) setAksesLoading(false);
      });

    return () => {
      dibatalkan = true;
    };
  }, [viewingUser]);

  // Form state for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dept: '',
    role: '' as SystemRole | '',
    grade: '',
    phone: '',
    ext: '',
    roomAssigned: '',
    programmeAssigned: '',
    status: 'Aktif' as 'Aktif' | 'Cuti' | 'Tidak Aktif',
  });

  const [formError, setFormError] = useState('');

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // penyemak imbas menyekat clipboard — nilai masih kelihatan pada skrin
    }
  };

  const resetPerananTanda = () => {
    setLantikanSedia([]);
    setPerananTanda({});
    setPpMula(hariIni());
    setPpTamat('');
    setPlLokasi('');
    setRalatPeranan('');
  };

  /** Baca lantikan aktif pegawai dan tandakan kotak yang berkaitan. */
  const muatLantikan = async (user: UserSession) => {
    const identifier = user.id || user.email;
    try {
      const senarai = await dataApi.roleAssignments.list({ officerId: identifier });
      const aktif = senarai.filter((item) => item.status === 'AKTIF');
      setLantikanSedia(aktif);

      const tanda: Record<string, boolean> = {};
      aktif.forEach((item) => {
        tanda[item.roleId] = true;
      });
      setPerananTanda(tanda);

      const pp = aktif.find((item) => item.roleId === 'PEMERIKSA');
      setPpMula(pp?.validFrom ?? hariIni());
      setPpTamat(pp?.validTo ?? '');

      const pl = aktif.find((item) => item.roleId === 'PENYELIA_LOKASI');
      setPlLokasi(pl?.scopeId ?? '');
    } catch {
      // Senarai lantikan gagal dibaca — borang maklumat masih boleh disimpan.
    }
  };

  const togglePeranan = (roleId: string) => {
    setRalatPeranan('');
    setPerananTanda((prev) => {
      const baharu = { ...prev, [roleId]: !prev[roleId] };
      if (roleId === 'PEMERIKSA' && baharu[roleId] && !ppTamat) {
        setPpTamat(tamatLalaiPemeriksa(ppMula));
      }
      return baharu;
    });
  };

  /**
   * Selaraskan `role_assignments` dengan kotak yang ditanda:
   * tamatkan yang tidak ditanda / berubah, cipta yang baharu.
   */
  const simpanPeranan = async (
    officerId: string,
    jabatan: string,
    jabatanLama?: string
  ): Promise<boolean> => {
    if (perananTanda.PEMERIKSA && !ppMula) {
      setRalatPeranan('Sila tetapkan tarikh lantikan Pegawai Pemeriksa.');
      return false;
    }
    if (perananTanda.PENYELIA_LOKASI && !plLokasi) {
      setRalatPeranan('Sila pilih ruang bagi Penyelia Lokasi.');
      return false;
    }

    // Pertukaran jabatan menjadikan skop lama tidak sah — lantikan berjabatan mesti dicipta semula.
    const jabatanBerubah = Boolean(jabatanLama && jabatanLama !== jabatan);
    const skopUntuk = (roleId: string) => {
      const opsi = PERANAN_BOLEH_DITANDA.find((item) => item.id === roleId);
      if (!opsi) return { scopeType: 'DEPARTMENT' as RoleScopeType, scopeId: jabatan as string | undefined };
      if (opsi.scope === 'LOCATION') return { scopeType: opsi.scope, scopeId: plLokasi || undefined };
      if (opsi.scope === 'DEPARTMENT') return { scopeType: opsi.scope, scopeId: jabatan };
      return { scopeType: opsi.scope, scopeId: undefined };
    };

    const berubah = (sedia: RoleAssignment, roleId: string) => {
      const opsi = PERANAN_BOLEH_DITANDA.find((item) => item.id === roleId);
      if (jabatanBerubah && opsi?.scope === 'DEPARTMENT') return true;
      if (roleId === 'PENYELIA_LOKASI') return (sedia.scopeId ?? '') !== plLokasi;
      if (roleId === 'PEMERIKSA') return sedia.validFrom !== ppMula || (sedia.validTo ?? '') !== ppTamat;
      return false;
    };

    for (const sedia of lantikanSedia) {
      const ditanda = Boolean(perananTanda[sedia.roleId]);
      if (!ditanda || berubah(sedia, sedia.roleId)) {
        await dataApi.roleAssignments.end(sedia.id);
      }
    }

    for (const opsi of PERANAN_BOLEH_DITANDA) {
      if (!perananTanda[opsi.id]) continue;
      const sedia = lantikanSedia.find((item) => item.roleId === opsi.id);
      if (sedia && !berubah(sedia, opsi.id)) continue;

      const skop = skopUntuk(opsi.id);
      await dataApi.roleAssignments.create({
        officerId,
        role: opsi.id,
        scopeType: skop.scopeType,
        scopeId: skop.scopeId,
        validFrom: opsi.id === 'PEMERIKSA' ? ppMula : undefined,
        validTo: opsi.id === 'PEMERIKSA' ? ppTamat || undefined : undefined,
        notes: 'Ditetapkan melalui Direktori Pegawai',
      });
    }

    return true;
  };

  // Open add modal
  const handleOpenAddModal = () => {
    setIssued(null);
    setIssuedFor('');
    resetPerananTanda();
    setTabDialog('maklumat');
    setFormData({
      name: '',
      email: '',
      dept: departments[0]?.id ?? '',
      role: '',
      grade: '',
      phone: '',
      ext: '',
      roomAssigned: '',
      programmeAssigned: '',
      status: 'Aktif',
    });
    setFormError('');
    setShowAddModal(true);
  };

  // Open edit modal
  const handleOpenEditModal = (user: UserSession) => {
    setEditingUser(user);
    setTabDialog('maklumat');
    resetPerananTanda();
    void muatLantikan(user);
    setFormData({
      name: user.name,
      email: user.email,
      dept: user.dept,
      role: (ROLE_LABELS_JAWATAN.includes(user.role as SystemRole) ? user.role : '') as SystemRole | '',
      grade: user.grade || '',
      phone: user.phone || '',
      ext: user.ext || '',
      roomAssigned: user.roomAssigned || '',
      programmeAssigned: user.programmeAssigned || '',
      status: (user.status || 'Aktif') as 'Aktif' | 'Cuti' | 'Tidak Aktif',
    });
    setFormError('');
  };

  // Submit Add — Worker menjana nama pengguna & kata laluan sementara
  const handleSaveNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (!formData.name.trim()) {
      setFormError('Sila masukkan nama penuh pegawai.');
      return;
    }
    if (!formData.dept) {
      setFormError('Sila pilih jabatan / unit.');
      return;
    }
    if (!onCreateOfficer) {
      setFormError('Pendaftaran pegawai hanya boleh dibuat oleh Pentadbir Sistem.');
      return;
    }

    const email = formData.email.trim().toLowerCase();
    if (email && !email.includes('@')) {
      setFormError('Sila masukkan emel rasmi yang sah atau biarkan kosong.');
      return;
    }

    setFormError('');
    setIsSaving(true);
    try {
      const { officer, credentials, existing } = await onCreateOfficer({
        nama: formData.name.trim(),
        dept: formData.dept,
        role: formData.role || undefined,
        gred: formData.grade.trim() || undefined,
        telefon: formData.phone.trim() || undefined,
        sambungan: formData.ext.trim() || undefined,
        emel: email || undefined,
      });

      // Tanda peranan yang dipilih hanya untuk pegawai baharu (elak menimpa lantikan sedia ada).
      const adaTanda = PERANAN_BOLEH_DITANDA.some((opsi) => perananTanda[opsi.id]);
      if (adaTanda && !existing) {
        try {
          await simpanPeranan(officer.id || officer.email, formData.dept);
        } catch (error) {
          setRalatPeranan((error as Error).message || 'Peranan gagal ditetapkan.');
        }
      }

      if (credentials) {
        setIssued(credentials);
        setIssuedFor(`${officer.name} (${officer.dept})`);
      } else {
        setFormError(
          `${officer.name} sudah ada dalam direktori. Rekod sedia ada digunakan — tiada akaun pendua dicipta.`
        );
      }      setFormData({
        name: '',
        email: '',
        dept: '',
        role: '',
        grade: '',
        phone: '',
        ext: '',
        roomAssigned: '',
        programmeAssigned: '',
        status: 'Aktif',
      });
      resetPerananTanda();
    } catch (error) {
      setFormError((error as Error).message || 'Pendaftaran pegawai gagal.');
    } finally {
      setIsSaving(false);
    }
  };

  // Jana semula kata laluan sementara
  const handleResetCredentials = async (user: UserSession) => {
    if (!onResetCredentials || isSaving) return;
    setFormError('');
    setIsSaving(true);
    try {
      const credentials = await onResetCredentials(user);
      setIssued(credentials);
      setIssuedFor(`${user.name} (${user.dept})`);
    } catch (error) {
      setFormError((error as Error).message || 'Gagal menjana kata laluan.');
    } finally {
      setIsSaving(false);
    }
  };
  // Tetapkan jawatan utama
  const handleSetPrimary = async (user: UserSession, roleId: string) => {
    if (!onSetPrimaryRole || isSaving) return;
    setFormError('');
    setIsSaving(true);
    try {
      await onSetPrimaryRole(user, roleId);
      setViewingUser(null);
    } catch (error) {
      setFormError((error as Error).message || 'Gagal menetapkan jawatan utama.');
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Edit
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!formData.name.trim()) {
      setFormError('Sila masukkan nama penuh pegawai.');
      return;
    }
    if (perananTanda.PEMERIKSA && !ppMula) {
      setRalatPeranan('Sila tetapkan tarikh lantikan Pegawai Pemeriksa.');
      setTabDialog('peranan');
      return;
    }
    if (perananTanda.PENYELIA_LOKASI && !plLokasi) {
      setRalatPeranan('Sila pilih ruang bagi Penyelia Lokasi.');
      setTabDialog('peranan');
      return;
    }

    const updated: UserSession = {
      ...editingUser,
      name: formData.name.trim(),
      dept: formData.dept,
      // Peranan diuruskan melalui tick (role_assignments) — label paparan tidak diubah di sini.
      role: editingUser.role,
      grade: formData.grade.trim(),
      phone: formData.phone.trim() || undefined,
      ext: formData.ext.trim() || undefined,
      roomAssigned: formData.roomAssigned.trim() || undefined,
      programmeAssigned: formData.programmeAssigned.trim() || undefined,
      status: formData.status,
    };

    if (onUpdateUser) {
      onUpdateUser(updated);
    }

    try {
      await simpanPeranan(editingUser.id || editingUser.email, formData.dept, editingUser.dept);
      onRolesChanged?.();
    } catch (error) {
      setRalatPeranan((error as Error).message || 'Peranan gagal dikemas kini.');
      setTabDialog('peranan');
      return;
    }

    setEditingUser(null);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deletingUser) return;
    if (onDeleteUser) {
      onDeleteUser(deletingUser.email);
    }
    setDeletingUser(null);
  };

  // Export to CSV
  const handleExportCSV = () => {
    let csv = 'Bil,Nama Pegawai,Emel,Jabatan,Peranan Utama,Peranan & Skop,Tarikh Luput Terdekat,Gred,Telefon,Sambungan,Skop Tugas/Bilik,Status\n';
    filteredUsers.forEach((u, i) => {
      const scope = u.roomAssigned || u.programmeAssigned || '-';
      const lantikan =
        lantikanPegawai(u)
          .map(
            (r) =>
              `${roleShort(r.roleId)}${
                r.scopeType === 'GLOBAL' ? '' : ` (${r.scopeType}${r.scopeId ? ` ${r.scopeId}` : ''})`
              }`
          )
          .join('; ') || '-';
      const luput =
        lantikanPegawai(u)
          .map((r) => r.validTo)
          .filter((d): d is string => Boolean(d))
          .sort()[0] ?? 'kekal';
      csv += `${i + 1},"${u.name}","${u.email}","${u.dept}","${u.role}","${lantikan}","${luput}","${u.grade || ''}","${u.phone || ''}","${u.ext || ''}","${scope}","${u.status || 'Aktif'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Direktori_Pegawai_POLIKU_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Kiraan lantikan & pegawai berbilang peranan
  const appointedInspectors = useMemo(
    () =>
      users.filter((user) => (user.roles ?? []).some((r) => r.roleId === 'PEMERIKSA')).length,
    [users]
  );

  const multiRoleCount = useMemo(
    () => users.filter((user) => (user.roles ?? []).length > 1).length,
    [users]
  );

  /** Kiraan pegawai mengikut jenis lantikan aktif (asas penapis PBAC). */
  const capaianCounts = useMemo(
    () => ({
      pentadbir: users.filter((u) => adaLantikan(u, 'PENTADBIR_SISTEM')).length,
      pemeriksa: users.filter((u) => adaLantikan(u, 'PEMERIKSA')).length,
      penyelia: users.filter((u) => adaLantikan(u, 'PENYELIA_LOKASI')).length,
      tanpaPeranan: users.filter((u) => lantikanPegawai(u).length === 0).length,
      akanLuput: users.filter((u) => lantikanHampirLuput(u)).length,
    }),
    [users]
  );

  // Count by roles
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = ROLE_LABELS.reduce<Record<string, number>>(
      (acc, label) => ({ ...acc, [label]: 0 }),
      {}
    );
    users.forEach((u) => {
      const label = normalizeRole(u.role);
      counts[label] = (counts[label] ?? 0) + 1;
    });
    return counts;
  }, [users]);

  // Filtered & sorted users
  const filteredUsers = users
    .filter((u) => {
      const matchesQuery = 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.dept.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.roomAssigned && u.roomAssigned.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.programmeAssigned && u.programmeAssigned.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.ext && u.ext.includes(searchQuery));

      const matchesRole = roleFilter === 'SEMUA' || normalizeRole(u.role) === roleFilter;
      const matchesDept = deptFilter === 'SEMUA' || u.dept === deptFilter;
      const matchesStatus = statusFilter === 'SEMUA' || (u.status || 'Aktif') === statusFilter;
      const matchesCapaian =
        capaianFilter === 'SEMUA'
          ? true
          : capaianFilter === 'PENTADBIR'
            ? adaLantikan(u, 'PENTADBIR_SISTEM')
            : capaianFilter === 'PEMERIKSA'
              ? adaLantikan(u, 'PEMERIKSA')
              : capaianFilter === 'PENYELIA'
                ? adaLantikan(u, 'PENYELIA_LOKASI')
                : capaianFilter === 'TANPA_PERANAN'
                  ? lantikanPegawai(u).length === 0
                  : lantikanHampirLuput(u);

      return matchesQuery && matchesRole && matchesDept && matchesStatus && matchesCapaian;
    })
    .slice()
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'dept') {
        comparison = a.dept.localeCompare(b.dept);
      } else if (sortBy === 'role') {
        comparison = a.role.localeCompare(b.role);
      } else if (sortBy === 'grade') {
        comparison = (a.grade || '').localeCompare(b.grade || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const activeFiltersCount = 
    (roleFilter !== 'SEMUA' ? 1 : 0) + 
    (deptFilter !== 'SEMUA' ? 1 : 0) + 
    (statusFilter !== 'SEMUA' ? 1 : 0) + 
    (capaianFilter !== 'SEMUA' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  /**
   * Panel penandaan peranan (checkbox) — dikongsi oleh dialog daftar & kemaskini.
   * Skop ditetapkan automatik mengikut polisi; Pemeriksa perlu tarikh, PL perlu ruang.
   */
  const renderPerananTanda = () => (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-slate-500">
        Tanda peranan yang dipegang pegawai ini. Skop ditetapkan automatik:{' '}
        <strong>KJ/KU, KP, PA, PPAJ/PPAU</strong> → jabatan pegawai; <strong>PL</strong> → ruang yang
        dipilih; <strong>PP</strong> → global (rakan silang), dengan tarikh lantikan.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PERANAN_BOLEH_DITANDA.map((opsi) => {
          const ditanda = Boolean(perananTanda[opsi.id]);
          const sedia = lantikanSedia.find((item) => item.roleId === opsi.id);
          return (
            <label
              key={opsi.id}
              className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 transition ${
                ditanda ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="checkbox"
                checked={ditanda}
                onChange={() => togglePeranan(opsi.id)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span className="min-w-0">
                <span className="block text-[11px] font-bold text-slate-900">
                  {opsi.ringkas} · {opsi.label}
                </span>
                <span className="block text-[10px] text-slate-500">{opsi.nota}</span>
                {ditanda && sedia && (
                  <span className="mt-0.5 block font-mono text-[9px] text-slate-500">
                    {sedia.scopeType}
                    {sedia.scopeId ? ` ${sedia.scopeId}` : ' (global)'} ·{' '}
                    {sedia.validTo ? `tamat ${sedia.validTo}` : 'kekal'}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {perananTanda.PEMERIKSA && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10px] font-bold text-emerald-900">
              Tarikh Lantikan Pemeriksa *
            </label>
            <input
              type="date"
              value={ppMula}
              onChange={(e) => {
                setPpMula(e.target.value);
                if (!ppTamat) setPpTamat(tamatLalaiPemeriksa(e.target.value));
              }}
              className="w-full rounded-lg border border-emerald-200 px-2 py-1.5 font-mono text-[11px] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold text-emerald-900">
              Tarikh Tamat (lalai 24 bulan)
            </label>
            <input
              type="date"
              value={ppTamat}
              onChange={(e) => setPpTamat(e.target.value)}
              className="w-full rounded-lg border border-emerald-200 px-2 py-1.5 font-mono text-[11px] focus:outline-none"
            />
          </div>
        </div>
      )}

      {perananTanda.PENYELIA_LOKASI && (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-3">
          <label className="mb-1 block text-[10px] font-bold text-cyan-900">
            Ruang Dipertanggungjawabkan *
          </label>
          <select
            value={plLokasi}
            onChange={(e) => setPlLokasi(e.target.value)}
            className="w-full rounded-lg border border-cyan-200 px-2 py-1.5 text-[11px] focus:outline-none"
          >
            <option value="">— Pilih ruang —</option>
            {locations
              .filter((l) => !formData.dept || l.jabatan === formData.dept)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.kodRuang} — {l.nama}
                </option>
              ))}
          </select>
          {locations.filter((l) => !formData.dept || l.jabatan === formData.dept).length === 0 && (
            <p className="mt-1 text-[10px] font-semibold text-rose-600">
              Tiada ruang berdaftar bagi jabatan ini — daftar di Direktori Lokasi dahulu.
            </p>
          )}
        </div>
      )}

      {ralatPeranan && <p className="text-[11px] font-semibold text-rose-600">{ralatPeranan}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Quick Actions */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Pengurusan Pengguna Berpusat (CRUD Direktori)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Direktori Pegawai POLIKU
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {users.length} pegawai
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                {appointedInspectors} dilantik PP
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                {multiRoleCount} berbilang peranan
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
              Pusat pendaftaran, kemaskini maklumat pegawai, dan pemetaan peranan tadbir urus aset alih kerajaan berpandukan tatacara 1PP AM 2.4. Akaun pegawai hanya didaftarkan oleh Pentadbir Sistem; nama pengguna dan kata laluan sementara dijana automatik oleh Worker.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center gap-2 shadow-2xs"
              title="Muat Turun Direktori dalam Format Fail CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Eksport CSV</span>
            </button>

            {bolehDaftarPegawai && (
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center gap-2 shadow-xs"
                title="Akaun pegawai didaftarkan oleh Pentadbir Sistem atau PPAJ/PPAU (jabatan sendiri) — kredensial dijana automatik"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Daftar Pegawai Baru</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. KPI Peranan (bilangan pegawai yang memegang setiap peranan) */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {JAWATAN_ROLES.map((jawatan) => {
            const count = roleCounts[jawatan.label] || 0;
            const cfg = ROLE_CONFIG[jawatan.id] ?? DEFAULT_ROLE_CONFIG;
            const isSelected = roleFilter === jawatan.label;

            return (
              <button
                key={jawatan.id}
                onClick={() => setRoleFilter(isSelected ? 'SEMUA' : jawatan.label)}
                className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between gap-1.5 ${
                  isSelected ? 'ring-2 ring-slate-900 shadow-xs' : 'hover:border-slate-300'
                } ${cfg.bg} ${cfg.border}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-tight text-slate-600 font-mono truncate">
                    {jawatan.short}
                  </span>
                  <span className={`text-xs font-mono font-extrabold px-1.5 py-0.2 rounded-md ${cfg.badge}`}>
                    {count}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-900 leading-tight">
                  {jawatan.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Jadual Direktori — peranan ditanda terus dalam borang pegawai */}
      <div className="flex border-b border-slate-200">
        <button
          className="px-5 py-3 text-xs sm:text-sm font-bold border-b-2 border-slate-900 text-slate-950 font-extrabold transition flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          <span>Jadual Direktori Pegawai (CRUD)</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-800 font-mono">
            {filteredUsers.length}
          </span>
        </button>
      </div>


      {activeSubTab === 'crudTable' && (
        <div className="space-y-4">
          
          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              
              {/* Search input */}
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, emel, no. tel bimbit, atau bilik jagaan..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Role filter */}
              <div className="md:col-span-3">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-medium text-slate-700"
                >
                  <option value="SEMUA">Semua Peranan</option>
                  {ROLE_LABELS_JAWATAN.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  <option value={BELUM_DILANTIK}>{BELUM_DILANTIK}</option>
                </select>
              </div>

              {/* Department filter */}
              <div className="md:col-span-2">
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-medium text-slate-700 font-mono"
                >
                  <option value="SEMUA">Semua Jabatan</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.id}</option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <div className="md:col-span-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-medium text-slate-700"
                >
                  <option value="SEMUA">Semua Status</option>
                  <option value="Aktif">Aktif</option>
                  <option value="Cuti">Cuti</option>
                  <option value="Tidak Aktif">Tidak Aktif</option>
                </select>
              </div>

            </div>

            {/* Penapis Capaian PBAC — lantikan, skop & tempoh sah */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                Capaian PBAC
              </span>
              {([
                { id: 'SEMUA', label: 'Semua', count: users.length, tone: 'slate' },
                { id: 'PENTADBIR', label: 'Pentadbir Sistem', count: capaianCounts.pentadbir, tone: 'rose' },
                { id: 'PEMERIKSA', label: 'Pegawai Pemeriksa', count: capaianCounts.pemeriksa, tone: 'emerald' },
                { id: 'PENYELIA', label: 'Penyelia Lokasi', count: capaianCounts.penyelia, tone: 'cyan' },
                { id: 'TANPA_PERANAN', label: 'Tiada peranan', count: capaianCounts.tanpaPeranan, tone: 'slate' },
                { id: 'AKAN_LUPUT', label: `Luput ≤ ${HARI_AMARAN_LUPUT} hari`, count: capaianCounts.akanLuput, tone: 'amber' },
              ] as const).map((chip) => {
                const active = capaianFilter === chip.id;
                const tones: Record<string, string> = {
                  slate: 'border-slate-200 bg-slate-50 text-slate-700',
                  rose: 'border-rose-200 bg-rose-50 text-rose-700',
                  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
                  cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700',
                  amber: 'border-amber-200 bg-amber-50 text-amber-800',
                };
                return (
                  <button
                    key={chip.id}
                    onClick={() => setCapaianFilter(active ? 'SEMUA' : chip.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold transition ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                        : `${tones[chip.tone]} hover:border-slate-400`
                    }`}
                    title={`Tapis ${chip.label.toLowerCase()} (${chip.count} pegawai)`}
                  >
                    <span>{chip.label}</span>
                    <span
                      className={`rounded px-1 font-mono ${
                        active ? 'bg-white/20 text-white' : 'bg-white text-slate-600'
                      }`}
                    >
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active filters indicators & Sort controls */}
            <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-slate-100 gap-2">
              <div className="flex items-center gap-2 text-slate-500">
                <span>Memaparkan <strong className="text-slate-900 font-mono">{filteredUsers.length}</strong> daripada <strong className="text-slate-900 font-mono">{users.length}</strong> pegawai</span>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setRoleFilter('SEMUA');
                      setDeptFilter('SEMUA');
                      setStatusFilter('SEMUA');
                      setCapaianFilter('SEMUA');
                    }}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 underline font-mono ml-2"
                  >
                    Set Semula ({activeFiltersCount} penapis)
                  </button>
                )}
              </div>

              {/* Sort By controls */}
              <div className="flex items-center gap-2 text-slate-600">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-medium">Susun:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="py-1 px-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-medium"
                >
                  <option value="name">Nama Pegawai</option>
                  <option value="dept">Jabatan</option>
                  <option value="role">Peranan Utama</option>
                  <option value="grade">Gred</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px]"
                  title="Tukar tertib susunan"
                >
                  {sortOrder === 'asc' ? 'A → Z' : 'Z → A'}
                </button>
              </div>
            </div>
          </div>

          {/* 4. CRUD Main Data Table - Flat clean square edges for desktop maximization with no corner clipping */}
          <div className="bg-white rounded-none border border-slate-200 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-900 text-white font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-3 text-center w-12 text-slate-300 border-b border-slate-800">#</th>
                    <th className="py-3.5 px-4 min-w-[210px] text-slate-100 border-b border-slate-800">Maklumat Pegawai & Emel</th>
                    <th className="py-3.5 px-4 min-w-[210px] text-slate-100 border-b border-slate-800">Peranan</th>
                    <th className="py-3.5 px-3 min-w-[120px] text-slate-100 border-b border-slate-800">Jabatan</th>
                    <th className="py-3.5 px-4 min-w-[190px] text-slate-100 border-b border-slate-800">Skop Tugas / Bilik / Program</th>
                    <th className="py-3.5 px-3 text-center min-w-[85px] text-slate-100 border-b border-slate-800">Status</th>
                    <th className="py-3.5 px-4 text-center min-w-[150px] text-slate-100 border-b border-slate-800">Tindakan CRUD</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 space-y-2">
                        <Users className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="font-semibold text-slate-600">Tiada rekod pegawai dijumpai</p>
                        <p className="text-[11px] text-slate-400">Sila ubah kata kunci carian atau tetapan penapis anda.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user, idx) => {
                      const isCurrentActive = currentUser?.email === user.email;
                      const roleConfig = ROLE_CONFIG[roleIdOf(user.role) ?? ''] ?? {
                        badge: 'bg-slate-100 text-slate-800 border-slate-200',
                        text: 'text-slate-800',
                        iconBg: 'bg-slate-800 text-white',
                      };

                      return (
                        <tr 
                          key={user.email} 
                          className={`hover:bg-slate-50/80 transition ${
                            isCurrentActive ? 'bg-amber-50/60 font-medium' : ''
                          }`}
                        >
                          {/* 1. Index / Number */}
                          <td className="py-3.5 px-3.5 text-center font-mono text-slate-400 text-[11px]">
                            {idx + 1}
                          </td>

                          {/* 2. Officer Info & Email */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold font-mono text-xs shrink-0 shadow-2xs ${
                                isCurrentActive 
                                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-500' 
                                  : 'bg-slate-800 text-slate-100'
                              }`}>
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <strong className="text-slate-900 font-bold text-xs truncate max-w-[200px]">
                                    {user.name}
                                  </strong>
                                  {isCurrentActive && (
                                    <span className="text-[9px] font-bold bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-mono">
                                      SEDANG AKTIF
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-500 block font-mono truncate max-w-[200px]">
                                  {user.email}
                                </span>
                                <span className="text-[11px] text-slate-600 block font-mono font-semibold">
                                  {user.phone || '—'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 3. Official Role Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border font-mono ${roleConfig.badge}`}>
                              <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                              <span>{roleShort(user.role)}</span>
                            </span>
                            {(user.roles ?? []).filter((r) => r.roleId !== roleIdOf(user.role)).length > 0 && (
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                {(user.roles ?? [])
                                  .filter((r) => r.roleId !== roleIdOf(user.role))
                                  .map((r, index) => (
                                    <span
                                      key={`${r.roleId}-${r.scopeId ?? 'g'}-${index}`}
                                      title={`${r.roleName} · ${r.scopeType}${
                                        r.scopeId ? ` ${r.scopeId}` : ''
                                      }${r.validTo ? ` · tamat ${r.validTo}` : ' · kekal'}`}
                                      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                                        r.kategori === 'LANTIKAN'
                                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                          : 'border-slate-200 bg-slate-50 text-slate-600'
                                      }`}
                                    >
                                      + {roleShort(r.roleId)}
                                      {(() => {
                                        const hari = hariKeTamat(r.validTo);
                                        return hari !== null && hari >= 0 && hari <= HARI_AMARAN_LUPUT
                                          ? ` ⏳${hari}h`
                                          : '';
                                      })()}
                                    </span>
                                  ))}
                              </div>
                            )}
                          </td>

                          {/* 4. Jabatan / Unit */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono text-[10px] font-bold">
                              {user.dept}
                            </span>
                          </td>

                          {/* 5. Assigned Scope / Rooms */}
                          <td className="py-3.5 px-4">
                            {user.roomAssigned ? (
                              <div className="flex items-center gap-1.5 text-cyan-800 font-medium text-[11px]">
                                <Building2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                                <span className="truncate max-w-[170px]" title={user.roomAssigned}>
                                  {user.roomAssigned}
                                </span>
                              </div>
                            ) : user.programmeAssigned ? (
                              <div className="flex items-center gap-1.5 text-blue-800 font-medium text-[11px]">
                                <Briefcase className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="truncate max-w-[170px]" title={user.programmeAssigned}>
                                  {user.programmeAssigned}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Pemeriksaan Silang & Am</span>
                            )}
                          </td>

                          {/* 6. Status */}
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                              (user.status || 'Aktif') === 'Aktif'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : (user.status === 'Cuti')
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                (user.status || 'Aktif') === 'Aktif' ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}></span>
                              <span>{user.status || 'Aktif'}</span>
                            </span>
                          </td>

                          {/* 8. CRUD Actions Toolbar */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              
                              {/* View detail button */}
                              <button
                                onClick={() => setViewingUser(user)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                                title="Lihat Profil Lengkap"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Edit button — pentadbir atau PPAJ/PPAU bagi jabatan sendiri */}
                              {bolehKemaskiniPegawai(user.dept) && (
                                <button
                                  onClick={() => handleOpenEditModal(user)}
                                  className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition"
                                  title="Kemaskini Maklumat Pegawai"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete button */}
                              {canManage && (
                                <button
                                  onClick={() => setDeletingUser(user)}
                                  disabled={isCurrentActive}
                                  className={`p-1.5 rounded-lg transition ${
                                    isCurrentActive
                                      ? 'text-slate-300 cursor-not-allowed'
                                      : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                                  }`}
                                  title={isCurrentActive ? 'Tidak boleh memadam akaun aktif' : 'Padam Pegawai'}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}

                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
              <span className="font-mono text-[11px]">
                Direktori disegerak dengan pangkalan data Cloudflare D1 &bull; 1PP AM 2.4
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Aktif: {users.filter(u => (u.status || 'Aktif') === 'Aktif').length}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Cuti: {users.filter(u => u.status === 'Cuti').length}</span>
                </span>
                <span className="font-bold text-slate-800">
                  Jumlah: {users.length} Pegawai
                </span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* MODAL 1: CREATE OFFICER (Daftar Pegawai Baru) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-sm">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Daftar Pegawai & Jana Kredensial
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kata laluan sementara dijana automatik oleh Worker — dipaparkan sekali sahaja
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewUser} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Penuh & Gelaran Jawatan *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Ts. Mohd Fadzli Bin Ramli (DH44)"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Emel Rasmi POLIKU (pilihan)
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="kosongkan untuk jana automatik"
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">
                      Jika kosong, nama pengguna dijana daripada nama penuh (cth: mohd.fadzli).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Jabatan / Unit *
                    </label>
                    <select
                      value={formData.dept}
                      onChange={(e) => { setFormData({ ...formData, dept: e.target.value }); setPlLokasi(''); }}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 font-mono font-medium"
                    >
                      <option value="">— Pilih Jabatan —</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.id} - {d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      No. Tel Bimbit
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="cth. 012-3456789"
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Status Pegawai
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Cuti">Cuti</option>
                      <option value="Tidak Aktif">Tidak Aktif</option>
                    </select>
                  </div>
                </div>
              </div>

              {issued && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <p className="text-xs font-bold">
                      Kredensial dijana — serahkan kepada pegawai (tidak boleh dilihat semula)
                    </p>
                  </div>
                  {issuedFor && (
                    <p className="text-[11px] font-semibold text-emerald-900">{issuedFor}</p>
                  )}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-white border border-emerald-200 px-3 py-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Nama Pengguna
                        </p>
                        <p className="font-mono text-xs font-bold text-slate-900">{issued.username}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(issued.username)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        title="Salin nama pengguna"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-white border border-emerald-200 px-3 py-2">
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
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        title="Salin kata laluan"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-emerald-800">
                    Pegawai <strong>wajib</strong> menukar kata laluan sementara ini semasa log masuk pertama (semua tindakan lain disekat sehingga ditukar).
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Peranan &amp; Lantikan (pilihan)
                </p>
                {renderPerananTanda()}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setIssued(null);
                    setIssuedFor('');
                    resetPerananTanda();
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                >
                  {issued ? 'Selesai' : 'Batal'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>{isSaving ? 'Menjana kredensial…' : 'Daftar & Jana Kredensial'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT OFFICER (Kemaskini Pegawai) */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Kemaskini Maklumat Pegawai
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {editingUser.email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditUser} className="space-y-4">
              {/* Tab dalam dialog: Maklumat | Peranan */}
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs">
                {([
                  { id: 'maklumat', label: 'Maklumat' },
                  { id: 'peranan', label: 'Peranan & Lantikan' },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTabDialog(tab.id)}
                    className={`flex-1 rounded-lg px-3 py-1.5 font-bold transition ${
                      tabDialog === tab.id
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {tabDialog === 'peranan' && renderPerananTanda()}

              <div className={`space-y-3 ${tabDialog === 'peranan' ? 'hidden' : ''}`}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Penuh & Gelaran Jawatan *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Emel Rasmi POLIKU (ID Kekal)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={formData.email}
                      className="w-full p-2.5 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-mono cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Jabatan / Unit *
                    </label>
                    <select
                      value={formData.dept}
                      onChange={(e) => { setFormData({ ...formData, dept: e.target.value }); setPlLokasi(''); }}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 font-mono font-medium"
                    >
                      <option value="">— Pilih Jabatan —</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.id} - {d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      No. Tel Bimbit
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="cth. 012-3456789"
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Status Pegawai
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Cuti">Cuti</option>
                      <option value="Tidak Aktif">Tidak Aktif</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW OFFICER DETAIL (Lihat Butiran Profil & PBAC) */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider font-mono">
                Kad Profil Pegawai
              </span>
              <button
                onClick={() => setViewingUser(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 text-amber-400 font-bold font-mono text-xl flex items-center justify-center shrink-0 shadow-md">
                {viewingUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                  {viewingUser.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {viewingUser.email}
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono text-[10px] font-bold">
                    {viewingUser.dept}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono text-[10px] font-semibold border border-slate-200">
                    {viewingUser.phone || 'Tiada no. tel'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                    (viewingUser.status || 'Aktif') === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {viewingUser.status || 'Aktif'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-xs">
              {lantikanHampirLuput(viewingUser) && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-[10px] font-bold text-amber-800">
                  Lantikan bakal tamat dalam tempoh {HARI_AMARAN_LUPUT} hari — perbaharui melalui tab
                  Peranan &amp; Lantikan sebelum tarikh luput.
                </div>
              )}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-slate-500">Peranan Utama:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {viewingUser.role}
                </span>
              </div>

              {(viewingUser.roles ?? []).length > 0 && (
                <div className="pb-2 border-b border-slate-200/80 space-y-1.5">
                  <span className="text-slate-500 block">Semua Peranan Aktif:</span>
                  <div className="space-y-1">
                    {(viewingUser.roles ?? []).map((r, index) => (
                      <div
                        key={`${r.roleId}-${r.scopeId ?? 'g'}-${index}`}
                        className="flex items-center justify-between gap-2 rounded-lg bg-white border border-slate-200 px-2 py-1"
                      >
                        <span className="font-semibold text-slate-800">{r.roleName}</span>
                        <span className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                          <span
                            className={`rounded px-1 py-0.2 font-bold ${
                              r.validTo
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {r.validTo ? 'BERTEMPOH' : 'KEKAL'}
                          </span>
                          <span className="text-slate-500">
                            {r.scopeType === 'GLOBAL'
                              ? 'GLOBAL'
                              : `${r.scopeType} ${r.scopeId ?? ''}`}
                          </span>
                          <span className={r.validTo ? 'text-amber-700' : 'text-slate-400'}>
                            {r.validTo ? `tamat ${r.validTo}` : 'kekal'}
                          </span>
                        </span>
                        {canManage &&
                          onSetPrimaryRole &&
                          r.roleId !== roleIdOf(viewingUser.role) && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(viewingUser, r.roleId)}
                              disabled={isSaving}
                              className="shrink-0 rounded-md border border-slate-300 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                              title="Jadikan jawatan utama"
                            >
                              Utama
                            </button>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingUser.roomAssigned && (
                <div className="flex items-start justify-between pb-2 border-b border-slate-200/80 gap-2">
                  <span className="text-cyan-800 font-medium">Bilik/Makmal Jagaan:</span>
                  <span className="font-bold text-cyan-950 text-right">
                    {viewingUser.roomAssigned}
                  </span>
                </div>
              )}

              {viewingUser.programmeAssigned && (
                <div className="flex items-start justify-between pb-2 border-b border-slate-200/80 gap-2">
                  <span className="text-blue-800 font-medium">Program Akademik:</span>
                  <span className="font-bold text-blue-950 text-right">
                    {viewingUser.programmeAssigned}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-slate-500">No. Tel Bimbit:</span>
                <span className="font-mono text-slate-800">{viewingUser.phone || '—'}</span>
              </div>
            </div>

            {/* Capaian Berkesan (PBAC) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Capaian Berkesan (PBAC)</span>
                </div>
                {akses?.skop && (
                  <span className="text-[9px] font-mono font-bold rounded bg-slate-900 text-white px-1.5 py-0.5">
                    {akses.skop.global
                      ? 'SELURUH SISTEM'
                      : `${akses.skop.jabatan.length} jabatan · ${akses.skop.lokasi.length} lokasi`}
                  </span>
                )}
              </div>

              {aksesLoading && (
                <p className="text-[11px] text-slate-400">Membaca capaian daripada Worker…</p>
              )}
              {aksesError && (
                <p className="text-[11px] font-semibold text-rose-600">{aksesError}</p>
              )}

              {akses && (
                <>
                  {akses.bakalLuput > 0 && (
                    <p className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">
                      {akses.bakalLuput} lantikan bakal tamat dalam {HARI_AMARAN_LUPUT} hari —
                      perbaharui melalui tab Peranan &amp; Lantikan.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {akses.skop.jabatan.map((jabatan) => (
                      <span
                        key={`skop-jab-${jabatan}`}
                        className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold font-mono text-amber-800"
                      >
                        JABATAN {jabatan}
                      </span>
                    ))}
                    {akses.skop.lokasi.map((lokasi) => (
                      <span
                        key={`skop-lok-${lokasi}`}
                        className="rounded-md border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 text-[9px] font-bold font-mono text-cyan-800"
                      >
                        {lokasi}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(
                      akses.kebenaran.reduce<Record<string, AccessPermission[]>>((acc, item) => {
                        acc[item.modul] = [...(acc[item.modul] ?? []), item];
                        return acc;
                      }, {})
                    ).map(([modul, senarai]) => (
                      <div key={modul} className="flex items-start gap-2">
                        <span className="w-[74px] shrink-0 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 pt-0.5">
                          {modul}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {senarai.map((item) => (
                            <span
                              key={item.kunci}
                              title={
                                item.melalui.length
                                  ? `Diberi oleh: ${item.melalui.join(', ')}`
                                  : 'Kebenaran asas semua pengguna log masuk'
                              }
                              className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${
                                item.melalui.length
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                  : 'border-slate-200 bg-slate-50 text-slate-500'
                              }`}
                            >
                              {item.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-400">
                    Kebenaran hijau diberi oleh lantikan; kelabu ialah kebenaran asas semua
                    pengguna log masuk.
                  </p>
                </>
              )}
            </div>

            {/* PBAC Policy Notice */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200 text-xs text-indigo-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Ketetapan PBAC & 1PP AM 2.4:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-indigo-800">
                {(() => {
                  const activeRoles = viewingUser.roles ?? [];
                  const hasInspector = activeRoles.some((r) => r.roleId === 'PEMERIKSA');
                  const supervisedRooms = activeRoles.filter(
                    (r) => r.roleId === 'PENYELIA_LOKASI' && r.scopeType === 'LOCATION'
                  ).length;
                  const parts: string[] = [];

                  if (hasInspector) {
                    parts.push(
                      'Dilantik Pegawai Pemeriksa — boleh menjalankan pemeriksaan fizikal 100% dan mengesahkan KEW.PA-11.'
                    );
                  }
                  if (isRole(viewingUser.role, 'PENOLONG_PEGAWAI_ASET') || isRole(viewingUser.role, 'PEGAWAI_ASET')) {
                    parts.push(
                      'Pegawai aset jabatan — disekat daripada memeriksa aset jabatan sendiri (pemisahan tugas).'
                    );
                  }
                  if (supervisedRooms > 0) {
                    parts.push(
                      `Penyelia ${supervisedRooms} ruang — disekat daripada memeriksa ruang tersebut.`
                    );
                  }
                  if (isRole(viewingUser.role, 'KETUA_JABATAN') || isRole(viewingUser.role, 'KETUA_PROGRAM')) {
                    parts.push('Berkuasa mengesahkan laporan dan kertas perakuan JKPAK.');
                  }
                  if (isRole(viewingUser.role, 'PENTADBIR_SISTEM')) {
                    parts.push('Capaian penuh pentadbiran sistem dan kawalan dasar PBAC.');
                  }
                  if (!parts.length) {
                    parts.push(
                      'Tiada konflik kepentingan. Boleh dilantik sebagai pemeriksa melalui menu Peranan & Lantikan.'
                    );
                  }

                  return parts.join(' ');
                })()}
              </p>
            </div>

            {issued && issuedFor.startsWith(viewingUser.name) && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 space-y-2">
                <p className="text-[11px] font-bold text-emerald-800">
                  Kata laluan sementara baharu (tunjuk sekali sahaja)
                </p>
                <div className="flex items-center justify-between gap-2 rounded-xl bg-white border border-emerald-200 px-3 py-1.5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Nama Pengguna
                    </p>
                    <p className="font-mono text-xs font-bold text-slate-900">{issued.username}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(issued.username)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    title="Salin nama pengguna"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-xl bg-white border border-emerald-200 px-3 py-1.5">
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
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    title="Salin kata laluan"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {formError && (
              <p className="text-[11px] font-semibold text-rose-700">{formError}</p>
            )}

            <div className="pt-2 flex items-center justify-between gap-3">
              {canManage && onResetCredentials && (
                <button
                  onClick={() => handleResetCredentials(viewingUser)}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs disabled:opacity-60"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>{isSaving ? 'Menjana…' : 'Jana Kata Laluan'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  setViewingUser(null);
                  setIssued(null);
                  setIssuedFor('');
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition ml-auto"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE CONFIRMATION */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-extrabold text-slate-900 text-base">
                Padam Pegawai dari Direktori?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Adakah anda pasti untuk memadam rekod bagi pegawai:
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left font-mono text-xs">
                <div className="font-bold text-slate-900">{deletingUser.name}</div>
                <div className="text-slate-500">{deletingUser.email}</div>
                <div className="text-rose-600 text-[11px] font-semibold mt-1">Peranan: {deletingUser.role}</div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sahkan Padam</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
