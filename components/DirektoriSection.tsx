'use client';

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  UserCheck, 
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
  BadgeCheck
} from 'lucide-react';
import { DEPARTMENTS, CROSS_PAIRS, INITIAL_USERS } from '@/lib/initialData';
import { UserSession, SystemRole } from '@/lib/types';

interface DirektoriSectionProps {
  currentUser?: UserSession | null;
  users?: UserSession[];
  onSwitchUser?: (user: UserSession) => void;
  onAddUser?: (user: UserSession) => void;
  onUpdateUser?: (user: UserSession) => void;
  onDeleteUser?: (userEmail: string) => void;
}

const OFFICIAL_ROLES: SystemRole[] = [
  'Ketua Jabatan',
  'Ketua Program',
  'Penolong Pegawai Aset Jabatan/Unit',
  'Penyelia Lokasi',
  'Pentadbir Sistem',
  'Pegawai Pemeriksa',
];

const ROLE_CONFIG: Record<
  string, 
  { bg: string; text: string; border: string; badge: string; iconBg: string }
> = {
  'Ketua Jabatan': {
    bg: 'bg-purple-50',
    text: 'text-purple-900',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-900 border-purple-300',
    iconBg: 'bg-purple-700 text-white',
  },
  'Ketua Program': {
    bg: 'bg-blue-50',
    text: 'text-blue-900',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-900 border-blue-300',
    iconBg: 'bg-blue-700 text-white',
  },
  'Penolong Pegawai Aset Jabatan/Unit': {
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    iconBg: 'bg-amber-600 text-white',
  },
  'Penyelia Lokasi': {
    bg: 'bg-cyan-50',
    text: 'text-cyan-900',
    border: 'border-cyan-200',
    badge: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    iconBg: 'bg-cyan-700 text-white',
  },
  'Pentadbir Sistem': {
    bg: 'bg-rose-50',
    text: 'text-rose-900',
    border: 'border-rose-200',
    badge: 'bg-rose-100 text-rose-900 border-rose-300',
    iconBg: 'bg-rose-700 text-white',
  },
  'Pegawai Pemeriksa': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-900',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    iconBg: 'bg-emerald-700 text-white',
  },
};

export default function DirektoriSection({
  currentUser,
  users = INITIAL_USERS,
  onSwitchUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}: DirektoriSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<'crudTable' | 'crossMatrix'>('crudTable');
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('SEMUA');
  const [deptFilter, setDeptFilter] = useState('SEMUA');
  const [statusFilter, setStatusFilter] = useState('SEMUA');
  const [sortBy, setSortBy] = useState<'name' | 'dept' | 'role' | 'grade'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserSession | null>(null);
  const [viewingUser, setViewingUser] = useState<UserSession | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserSession | null>(null);

  // Form state for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dept: 'JTMK',
    role: 'Pegawai Pemeriksa' as SystemRole,
    grade: 'DH41',
    phone: '082-845500',
    ext: '100',
    roomAssigned: '',
    programmeAssigned: '',
    status: 'Aktif' as 'Aktif' | 'Cuti' | 'Tidak Aktif',
  });

  const [formError, setFormError] = useState('');

  // Open add modal
  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      email: '',
      dept: 'JTMK',
      role: 'Pegawai Pemeriksa',
      grade: 'DH41',
      phone: '082-845500',
      ext: '100',
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
    setFormData({
      name: user.name,
      email: user.email,
      dept: user.dept,
      role: (OFFICIAL_ROLES.includes(user.role as SystemRole) ? user.role : 'Pegawai Pemeriksa') as SystemRole,
      grade: user.grade || 'DH41',
      phone: user.phone || '082-845500',
      ext: user.ext || '100',
      roomAssigned: user.roomAssigned || '',
      programmeAssigned: user.programmeAssigned || '',
      status: (user.status || 'Aktif') as 'Aktif' | 'Cuti' | 'Tidak Aktif',
    });
    setFormError('');
  };

  // Submit Add
  const handleSaveNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Sila masukkan nama penuh pegawai.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setFormError('Sila masukkan emel rasmi yang sah.');
      return;
    }
    // Check if email already exists
    if (users.some((u) => u.email.toLowerCase() === formData.email.trim().toLowerCase())) {
      setFormError('Emel ini telah didaftarkan dalam sistem. Sila gunakan emel lain.');
      return;
    }

    const newUser: UserSession = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      dept: formData.dept,
      role: formData.role,
      grade: formData.grade.trim() || 'DH41',
      phone: formData.phone.trim() || '082-845500',
      ext: formData.ext.trim() || '100',
      roomAssigned: formData.roomAssigned.trim() || undefined,
      programmeAssigned: formData.programmeAssigned.trim() || undefined,
      status: formData.status,
    };

    if (onAddUser) {
      onAddUser(newUser);
    }
    setShowAddModal(false);
  };

  // Submit Edit
  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!formData.name.trim()) {
      setFormError('Sila masukkan nama penuh pegawai.');
      return;
    }

    const updated: UserSession = {
      ...editingUser,
      name: formData.name.trim(),
      dept: formData.dept,
      role: formData.role,
      grade: formData.grade.trim() || 'DH41',
      phone: formData.phone.trim() || '082-845500',
      ext: formData.ext.trim() || '100',
      roomAssigned: formData.roomAssigned.trim() || undefined,
      programmeAssigned: formData.programmeAssigned.trim() || undefined,
      status: formData.status,
    };

    if (onUpdateUser) {
      onUpdateUser(updated);
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
    let csv = 'Bil,Nama Pegawai,Emel,Jabatan,Peranan Rasmi,Gred,Telefon,Sambungan,Skop Tugas/Bilik,Status\n';
    filteredUsers.forEach((u, i) => {
      const scope = u.roomAssigned || u.programmeAssigned || '-';
      csv += `${i + 1},"${u.name}","${u.email}","${u.dept}","${u.role}","${u.grade || ''}","${u.phone || ''}","${u.ext || ''}","${scope}","${u.status || 'Aktif'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Direktori_Pegawai_POLIKU_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Count by roles
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'Ketua Jabatan': 0,
      'Ketua Program': 0,
      'Penolong Pegawai Aset Jabatan/Unit': 0,
      'Penyelia Lokasi': 0,
      'Pentadbir Sistem': 0,
      'Pegawai Pemeriksa': 0,
    };
    users.forEach((u) => {
      if (counts[u.role] !== undefined) {
        counts[u.role] += 1;
      }
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

      const matchesRole = roleFilter === 'SEMUA' || u.role === roleFilter;
      const matchesDept = deptFilter === 'SEMUA' || u.dept === deptFilter;
      const matchesStatus = statusFilter === 'SEMUA' || (u.status || 'Aktif') === statusFilter;

      return matchesQuery && matchesRole && matchesDept && matchesStatus;
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
    (searchQuery.trim() ? 1 : 0);

  // Cross pairs list deduplicated
  const pairedCards = [
    { a: 'JTMK', b: 'JKE', nameA: 'Jabatan Teknologi Maklumat & Komunikasi', nameB: 'Jabatan Kejuruteraan Elektrik' },
    { a: 'JKM', b: 'JKA', nameA: 'Jabatan Kejuruteraan Mekanikal', nameB: 'Jabatan Kejuruteraan Awam' },
    { a: 'JP', b: 'JPA', nameA: 'Jabatan Perdagangan', nameB: 'Jabatan Pengajian Am' },
    { a: 'JMSK', b: 'PENTADBIRAN', nameA: 'Jabatan Matematik, Sains & Komputer', nameB: 'Pentadbiran & Unit Pengurusan Aset' },
    { a: 'HAL EHWAL PELAJAR', b: 'PSA', nameA: 'Jabatan Hal Ehwal Pelajar (JHEP)', nameB: 'Perpustakaan Tan Sri Hamdan' },
    { a: 'CISEC', b: 'ULPL', nameA: 'CISEC', nameB: 'Unit Latihan & Pendidikan Lanjutan' },
  ];

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
              Jadual Direktori Pegawai & 6 Peranan Rasmi POLIKU
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
              Pusat pendaftaran, kemaskini maklumat pegawai, dan pemetaan peranan tadbir urus aset alih kerajaan berpandukan tatacara 1PP AM 2.4. Menyokong penukaran sesi akaun pantas untuk pengujian sistem secara masa nyata.
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

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Daftar Pegawai Baru</span>
            </button>
          </div>
        </div>

        {/* 2. Role KPI Breakdown Chips (6 Official Roles) */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {OFFICIAL_ROLES.map((role) => {
            const count = roleCounts[role] || 0;
            const cfg = ROLE_CONFIG[role] || { badge: 'bg-slate-100 text-slate-800 border-slate-200' };
            const isSelected = roleFilter === role;

            return (
              <button
                key={role}
                onClick={() => setRoleFilter(isSelected ? 'SEMUA' : role)}
                className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between gap-1.5 ${
                  isSelected
                    ? 'ring-2 ring-slate-900 shadow-xs'
                    : 'hover:border-slate-300'
                } ${cfg.bg} ${cfg.border}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-tight text-slate-600 font-mono">
                    {role.includes('Penolong') ? 'Penolong Aset' : role}
                  </span>
                  <span className={`text-xs font-mono font-extrabold px-1.5 py-0.2 rounded-md ${cfg.badge}`}>
                    {count}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-900 truncate">
                  {role}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Sub-Tab Switcher: Jadual CRUD vs Matriks Silang */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('crudTable')}
          className={`px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeSubTab === 'crudTable'
              ? 'border-slate-900 text-slate-950 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Jadual Direktori Pegawai (CRUD)</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-800 font-mono">
            {filteredUsers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('crossMatrix')}
          className={`px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeSubTab === 'crossMatrix'
              ? 'border-slate-900 text-slate-950 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 text-teal-600" />
          <span>Matriks Padanan Silang (⇄ 1PP AM 2.4)</span>
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
                  placeholder="Cari nama, emel, sambungan ext, atau bilik jagaan..."
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
                  <option value="SEMUA">Semua Peranan Rasmi (6 Peranan)</option>
                  {OFFICIAL_ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
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
                  {DEPARTMENTS.map((d) => (
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
                  <option value="role">Peranan Rasmi</option>
                  <option value="grade">Gred Jawatan</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px]"
                  title="Tukar tertib susunan"
                >
                  {sortOrder === 'asc' ? 'A &rarr; Z' : 'Z &rarr; A'}
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
                    <th className="py-3.5 px-4 min-w-[210px] text-slate-100 border-b border-slate-800">Peranan Rasmi (6 Peranan)</th>
                    <th className="py-3.5 px-3 min-w-[120px] text-slate-100 border-b border-slate-800">Jabatan & Gred</th>
                    <th className="py-3.5 px-4 min-w-[190px] text-slate-100 border-b border-slate-800">Skop Tugas / Bilik / Program</th>
                    <th className="py-3.5 px-3 min-w-[110px] text-slate-100 border-b border-slate-800">Tel & Samb.</th>
                    <th className="py-3.5 px-3 text-center min-w-[85px] text-slate-100 border-b border-slate-800">Status</th>
                    <th className="py-3.5 px-4 text-center min-w-[150px] text-slate-100 border-b border-slate-800">Tindakan CRUD</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 space-y-2">
                        <Users className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="font-semibold text-slate-600">Tiada rekod pegawai dijumpai</p>
                        <p className="text-[11px] text-slate-400">Sila ubah kata kunci carian atau tetapan penapis anda.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user, idx) => {
                      const isCurrentActive = currentUser?.email === user.email;
                      const roleConfig = ROLE_CONFIG[user.role] || {
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
                              </div>
                            </div>
                          </td>

                          {/* 3. Official Role Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border font-mono ${roleConfig.badge}`}>
                              <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                              <span>{user.role}</span>
                            </span>
                          </td>

                          {/* 4. Dept & Grade */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono text-[10px] font-bold">
                                {user.dept}
                              </span>
                              <span className="text-slate-600 font-mono text-[11px] font-semibold">
                                {user.grade || 'DH41'}
                              </span>
                            </div>
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

                          {/* 6. Phone & Extension */}
                          <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            <div>{user.phone || '082-845500'}</div>
                            <div className="text-[10px] text-slate-400">Ext: {user.ext || '100'}</div>
                          </td>

                          {/* 7. Status */}
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

                              {/* Edit button */}
                              <button
                                onClick={() => handleOpenEditModal(user)}
                                className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition"
                                title="Kemaskini Maklumat Pegawai"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {/* Switch user / login as button */}
                              {onSwitchUser && (
                                <button
                                  onClick={() => onSwitchUser(user)}
                                  disabled={isCurrentActive}
                                  className={`p-1.5 rounded-lg transition ${
                                    isCurrentActive
                                      ? 'text-emerald-700 bg-emerald-50 cursor-default'
                                      : 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                                  }`}
                                  title={isCurrentActive ? 'Akaun sedang aktif' : 'Tukar ke Akaun Ini (Uji Peranan)'}
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete button */}
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

      {/* SUB-TAB 2: Matriks Padanan Silang (⇄ 1PP AM 2.4) */}
      {activeSubTab === 'crossMatrix' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-teal-100 text-teal-800">
                  <ArrowLeftRight className="w-4 h-4" />
                </span>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Matriks Gandingan Pemeriksaan Silang (⇄) Sesi 2026
                </h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Di bawah ketetapan 1PP AM 2.4 Bab C dan Pengurusan Integriti JKPAK POLIKU, setiap jabatan digandingkan secara timbal balik (⇄) untuk memeriksa makmal dan bengkel rakan silang. Pegawai Penjaga Ruang dihalang memeriksa ruang jagaan sendiri.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {pairedCards.map((pair, idx) => (
                <div 
                  key={idx}
                  className="bg-slate-50 rounded-2xl p-4 border border-slate-200/90 space-y-3 hover:shadow-sm transition"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                    <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider font-mono">
                      Gandingan Silang #{idx + 1}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                      Timbal Balik (⇄)
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 text-center space-y-1">
                      <span className="text-sm font-extrabold text-slate-900 font-mono block">
                        {pair.a}
                      </span>
                      <span className="text-[10px] text-slate-500 line-clamp-1 block">
                        {pair.nameA}
                      </span>
                      <span className="text-[10px] text-indigo-700 font-bold block pt-1">
                        {users.filter(u => u.dept === pair.a).length} Pegawai
                      </span>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                      ⇄
                    </div>

                    <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 text-center space-y-1">
                      <span className="text-sm font-extrabold text-slate-900 font-mono block">
                        {pair.b}
                      </span>
                      <span className="text-[10px] text-slate-500 line-clamp-1 block">
                        {pair.nameB}
                      </span>
                      <span className="text-[10px] text-indigo-700 font-bold block pt-1">
                        {users.filter(u => u.dept === pair.b).length} Pegawai
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-tight pt-1">
                    Pegawai Pemeriksa dari <strong>{pair.a}</strong> akan dilantik mengesahkan aset di <strong>{pair.b}</strong> dan sebaliknya.
                  </p>
                </div>
              ))}
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
                    Daftar Pegawai Baru ke Direktori
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih satu daripada 6 Peranan Rasmi mengikut struktur organisasi
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
                      Emel Rasmi POLIKU *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="nama@poliku.edu.my"
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Jabatan / Unit *
                    </label>
                    <select
                      value={formData.dept}
                      onChange={(e) => setFormData({ ...formData, dept: e.target.value })}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 font-mono font-medium"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d.id} value={d.id}>{d.id} - {d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Peranan Rasmi (6 Peranan Mandatori) *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as SystemRole })}
                      className="w-full p-2.5 text-xs bg-amber-50 border border-amber-300 font-bold text-slate-900 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900"
                    >
                      {OFFICIAL_ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Gred Jawatan
                    </label>
                    <input
                      type="text"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      placeholder="Contoh: DH44 / N32 / FA29"
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      No. Telefon
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="082-845500"
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sambungan (Ext)
                    </label>
                    <input
                      type="text"
                      value={formData.ext}
                      onChange={(e) => setFormData({ ...formData, ext: e.target.value })}
                      placeholder="101"
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

                {formData.role === 'Penyelia Lokasi' && (
                  <div>
                    <label className="block text-xs font-bold text-cyan-900 mb-1">
                      Nama Bilik / Makmal Dipertanggungjawabkan (Penjaga Ruang)
                    </label>
                    <input
                      type="text"
                      value={formData.roomAssigned}
                      onChange={(e) => setFormData({ ...formData, roomAssigned: e.target.value })}
                      placeholder="Contoh: Makmal Multimedia & Pengaturcaraan 1"
                      className="w-full p-2.5 text-xs bg-cyan-50 border border-cyan-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 text-cyan-950 font-medium"
                    />
                    <p className="text-[10px] text-cyan-700 mt-1 font-mono">
                      * Polisi PBAC 1PP AM 2.4 akan melarang pegawai memeriksa bilik jagaan sendiri.
                    </p>
                  </div>
                )}

                {formData.role === 'Ketua Program' && (
                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">
                      Program Akademik / Kursus Dipertanggungjawabkan
                    </label>
                    <input
                      type="text"
                      value={formData.programmeAssigned}
                      onChange={(e) => setFormData({ ...formData, programmeAssigned: e.target.value })}
                      placeholder="Contoh: Diploma Teknologi Maklumat (Teknologi Digital)"
                      className="w-full p-2.5 text-xs bg-blue-50 border border-blue-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 text-blue-950 font-medium"
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>Daftar Pegawai</span>
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
                      onChange={(e) => setFormData({ ...formData, dept: e.target.value })}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 font-mono font-medium"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d.id} value={d.id}>{d.id} - {d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Peranan Rasmi (6 Peranan Mandatori) *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as SystemRole })}
                      className="w-full p-2.5 text-xs bg-amber-50 border border-amber-300 font-bold text-slate-900 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900"
                    >
                      {OFFICIAL_ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Gred Jawatan
                    </label>
                    <input
                      type="text"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      placeholder="Contoh: DH44 / N32"
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      No. Telefon
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sambungan (Ext)
                    </label>
                    <input
                      type="text"
                      value={formData.ext}
                      onChange={(e) => setFormData({ ...formData, ext: e.target.value })}
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

                {formData.role === 'Penyelia Lokasi' && (
                  <div>
                    <label className="block text-xs font-bold text-cyan-900 mb-1">
                      Nama Bilik / Makmal Dipertanggungjawabkan (Penjaga Ruang)
                    </label>
                    <input
                      type="text"
                      value={formData.roomAssigned}
                      onChange={(e) => setFormData({ ...formData, roomAssigned: e.target.value })}
                      placeholder="Contoh: Makmal Multimedia & Pengaturcaraan 1"
                      className="w-full p-2.5 text-xs bg-cyan-50 border border-cyan-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 text-cyan-950 font-medium"
                    />
                  </div>
                )}

                {formData.role === 'Ketua Program' && (
                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">
                      Program Akademik / Kursus Dipertanggungjawabkan
                    </label>
                    <input
                      type="text"
                      value={formData.programmeAssigned}
                      onChange={(e) => setFormData({ ...formData, programmeAssigned: e.target.value })}
                      placeholder="Contoh: Diploma Kejuruteraan Elektrik"
                      className="w-full p-2.5 text-xs bg-blue-50 border border-blue-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 text-blue-950 font-medium"
                    />
                  </div>
                )}
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
                    Gred: {viewingUser.grade || 'DH41'}
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
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-slate-500">Peranan Rasmi:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {viewingUser.role}
                </span>
              </div>

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

              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-slate-500">No. Telefon Rasmi:</span>
                <span className="font-mono text-slate-800">{viewingUser.phone || '082-845500'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Sambungan (Ext):</span>
                <span className="font-mono text-slate-800">{viewingUser.ext || '100'}</span>
              </div>
            </div>

            {/* PBAC Policy Notice */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200 text-xs text-indigo-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Ketetapan PBAC & 1PP AM 2.4:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-indigo-800">
                {viewingUser.role === 'Penyelia Lokasi'
                  ? 'Sebagai Pegawai Penjaga Ruang, pegawai ini dihalang daripada menuntut pemeriksaan ke atas bilik sendiri untuk memelihara integriti audit.'
                  : viewingUser.role === 'Pegawai Pemeriksa'
                  ? 'Pegawai bertauliah untuk menjalankan pemeriksaan fizikal 100% dan mengesahkan borang KEW.PA-11.'
                  : viewingUser.role === 'Pentadbir Sistem'
                  ? 'Mempunyai capaian penuh pengurusan sistem, pendaftaran takwim dan kawalan keselamatan dasar PBAC.'
                  : 'Berkuasa memantau takwim, mengesahkan laporan JKPAK dan menandatangani kertas perakuan mesyuarat.'}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              {onSwitchUser && (
                <button
                  onClick={() => {
                    onSwitchUser(viewingUser);
                    setViewingUser(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Log Masuk Akaun Ini</span>
                </button>
              )}

              <button
                onClick={() => setViewingUser(null)}
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
