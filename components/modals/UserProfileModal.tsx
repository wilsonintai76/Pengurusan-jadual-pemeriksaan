import React, { useState } from 'react';
import { 
  X, 
  User, 
  KeyRound, 
  History, 
  Save, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Check, 
  Lock, 
  Eye, 
  EyeOff, 
  Phone, 
  BadgeCheck,
  Briefcase,
  Mail,
  ExternalLink,
  Sparkles,
  LogOut
} from 'lucide-react';
import { UserSession, InspectionSchedule } from '@/lib/types';
import { MIN_PASSWORD_LENGTH, changePassword } from '@/lib/authClient';
import { ROLE_LABELS } from '@/lib/systemRoles';

import { useDepartments } from '@/lib/useReferenceData';

interface UserProfileModalProps {
  user: UserSession;
  schedules: InspectionSchedule[];
  onClose: () => void;
  onSaveUser: (updatedUser: UserSession) => void;
  onLogout?: () => void;
  onOpenKewpa11?: (schedule: InspectionSchedule) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function UserProfileModal({
  user,
  schedules,
  onClose,
  onSaveUser,
  onLogout,
  onOpenKewpa11,
  showToast,
}: UserProfileModalProps) {
  const departments = useDepartments();
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'password'>('profile');

  // Form State - Profile
  const [name, setName] = useState(user.name || '');
  const [email] = useState(user.email || '');
  const [dept, setDept] = useState(user.dept || '');
  const [role, setRole] = useState(user.role || '');
  const [grade, setGrade] = useState(user.grade || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [ext, setExt] = useState(user.ext || '');

  // Form State - Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passSaved, setPassSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);


  // User Inspection History
  const mySchedules = schedules.filter(s => {
    const isP1 = s.pemeriksa1 && s.pemeriksa1.toLowerCase().includes(user.name.split(' ')[0].toLowerCase());
    const isP2 = s.pemeriksa2 && s.pemeriksa2.toLowerCase().includes(user.name.split(' ')[0].toLowerCase());
    const isPenjaga = s.penjaga && s.penjaga.toLowerCase().includes(user.name.split(' ')[0].toLowerCase());
    const isDept = s.jabatan === user.dept;
    return isP1 || isP2 || isPenjaga || isDept;
  });

  const completedCount = mySchedules.filter(s => s.status === 'Selesai').length;
  const ongoingCount = mySchedules.filter(s => s.status === 'Sedang Dijalankan').length;
  const pendingCount = mySchedules.filter(s => s.status === 'Belum Mula' || s.status === 'Tertangguh').length;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      if (showToast) showToast('Sila masukkan nama penuh pegawai.', 'error');
      return;
    }

    const updated: UserSession = {
      ...user,
      name,
      dept,
      role,
      grade,
      phone,
      ext,
    };

    onSaveUser(updated);
    setProfileSaved(true);
    if (showToast) showToast('Profil pegawai berjaya dikemaskini.', 'success');
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      if (showToast) showToast('Sila masukkan kata laluan semasa.', 'error');
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      if (showToast) showToast(`Kata laluan baru mestilah sekurang-kurangnya ${MIN_PASSWORD_LENGTH} aksara.`, 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      if (showToast) showToast('Kata laluan baru dan pengesahan tidak sepadan.', 'error');
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
    } catch (error) {
      if (showToast) showToast((error as Error).message || 'Gagal menukar kata laluan.', 'error');
      return;
    }

    setPassSaved(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    if (showToast) showToast('Kata laluan berjaya dikemaskini!', 'success');
    setTimeout(() => setPassSaved(false), 3000);
  };

  // Password strength checker
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { score: 1, label: 'Lemah', color: 'bg-rose-500' };
    if (score <= 4) return { score: 2, label: 'Sederhana', color: 'bg-amber-500' };
    return { score: 3, label: 'Kuat & Selamat', color: 'bg-emerald-500' };
  };

  const passStrength = getPasswordStrength(newPassword);

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-950 text-white p-6 flex items-center justify-between border-b border-slate-800 relative">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 font-bold text-lg flex items-center justify-center font-mono shadow-md shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight leading-tight">
                  Profil Pegawai Pemeriksa & Penyelaras
                </h3>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                  1PP AM 2.4
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{user.name}</span>
                <span>&bull;</span>
                <span className="text-amber-300 font-mono font-semibold">{user.dept}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onLogout && (
              <button
                type="button"
                onClick={handleLogoutClick}
                className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-800/80 font-bold text-xs transition flex items-center gap-1.5 shadow-2xs"
                title="Log Keluar Akaun"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Log Keluar</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 px-6 pt-3 flex gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
              activeTab === 'profile'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Kemaskini Profil</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 relative ${
              activeTab === 'history'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Sejarah Pemeriksaan</span>
            <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full font-mono">
              {mySchedules.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('password')}
            className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
              activeTab === 'password'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Tukar Kata Laluan</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: PROFIL PEGAWAI */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              
              {/* Badge Preview Banner */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-bold flex items-center justify-center font-mono">
                    <BadgeCheck className="w-6 h-6 text-slate-950" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">
                      Kad Pengenalan Pemeriksa / Penyelaras Aset
                    </h4>
                    <p className="text-sm font-bold text-white mt-0.5">{name || user.name}</p>
                    <p className="text-xs text-slate-400">
                      {role} &bull; <strong className="text-sky-300 font-mono">{grade}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-emerald-400 font-semibold self-stretch sm:self-auto justify-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Politeknik Kuching Sarawak</span>
                </div>
              </div>

              {profileSaved && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Maklumat profil anda berjaya dikemaskini dan disimpan secara tempatan!</span>
                </div>
              )}

              {/* Input Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Nama Penuh */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-500" />
                    <span>Nama Penuh Pegawai (Sertai Gelaran)</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Ts. Mohd Fadzli Bin Abidin"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Alamat Emel Rasmi (POLIKU)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-mono cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Diuruskan oleh Pentadbir Sistem ICT
                  </span>
                </div>

                {/* Gred Jawatan */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-sky-500" />
                    <span>Gred / Skim Perkhidmatan</span>
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="DH54">DH54 - Pegawai Pendidikan Pengajian Tinggi</option>
                    <option value="DH52">DH52 - Pegawai Pendidikan Pengajian Tinggi</option>
                    <option value="DH48">DH48 - Pegawai Pendidikan Pengajian Tinggi</option>
                    <option value="DH44">DH44 - Pegawai Pendidikan Pengajian Tinggi</option>
                    <option value="DH41">DH41 - Pegawai Pendidikan Pengajian Tinggi</option>
                    <option value="J48">J48 - Jurutera / Pegawai Teknikal</option>
                    <option value="J41">J41 - Jurutera / Pegawai Teknikal</option>
                    <option value="JA29">JA29 - Penolong Jurutera</option>
                    <option value="N29">N29 - Penolong Pegawai Tadbir</option>
                  </select>
                </div>

                {/* Jabatan / Unit */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Jabatan / Unit Bertugas</span>
                  </label>
                  <select
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.id} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Peranan Dalam Portal */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Peranan Dalam Inspect-Able</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {ROLE_LABELS.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* No Telefon */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-rose-500" />
                    <span>No. Telefon Bimbit / Pejabat</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 082-845599"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Sambungan Extension */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Sambungan Ext. (Intercom POLIKU)
                  </label>
                  <input
                    type="text"
                    value={ext}
                    onChange={(e) => setExt(e.target.value)}
                    placeholder="Contoh: 102"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

              </div>

              {/* Submit & Logout Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                {onLogout ? (
                  <button
                    type="button"
                    onClick={handleLogoutClick}
                    className="px-3.5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold text-xs transition flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>Log Keluar Dari Akaun</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan Profil</span>
                  </button>
                </div>
              </div>

            </form>
          )}

          {/* TAB 2: SEJARAH PEMERIKSAAN */}
          {activeTab === 'history' && (
            <div className="space-y-5">
              
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm font-mono">
                    {mySchedules.length}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                      Jumlah Lokasi
                    </span>
                    <strong className="text-xs font-bold text-slate-900 dark:text-white">
                      Tugasan Diberi
                    </strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-sm font-mono">
                    {completedCount}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold block">
                      Selesai & Disahkan
                    </span>
                    <strong className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                      Dengan KEW.PA-11
                    </strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-sm font-mono">
                    {ongoingCount + pendingCount}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold block">
                      Dalam Tindakan
                    </span>
                    <strong className="text-xs font-bold text-amber-800 dark:text-amber-200">
                      Aktif / Tertangguh
                    </strong>
                  </div>
                </div>
              </div>

              {/* Table List of Inspection History */}
              {mySchedules.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Tiada jadual pemeriksaan dikaitkan secara terus dengan nama anda lagi.
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Anda boleh menuntut lokasi pemeriksaan dalam menu Sistem Inspect-Able untuk memulakan pengesahan fizikal.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-slate-300 border-b border-slate-800 font-mono text-[11px]">
                          <th className="p-3 font-semibold">Kod & Lokasi</th>
                          <th className="p-3 font-semibold">Jabatan</th>
                          <th className="p-3 font-semibold">Kuantiti Aset</th>
                          <th className="p-3 font-semibold">Gandingan Pemeriksa</th>
                          <th className="p-3 font-semibold">Status</th>
                          <th className="p-3 font-semibold text-right">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {mySchedules.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                            <td className="p-3">
                              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 block text-[11px]">
                                {s.kod}
                              </span>
                              <strong className="text-slate-900 dark:text-white font-semibold">
                                {s.lokasi}
                              </strong>
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-300">
                              {s.jabatan}
                            </td>
                            <td className="p-3 font-mono">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                                {s.kuantiti} Unit
                              </span>
                            </td>
                            <td className="p-3 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                              <div>P1: <strong className="text-slate-800 dark:text-slate-200">{s.pemeriksa1}</strong></div>
                              <div>P2: <strong className="text-slate-800 dark:text-slate-200">{s.pemeriksa2}</strong></div>
                            </td>
                            <td className="p-3">
                              {s.status === 'Selesai' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>Selesai</span>
                                </span>
                              ) : s.status === 'Sedang Dijalankan' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Sedang Jalan</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium text-[10px]">
                                  <span>{s.status}</span>
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {onOpenKewpa11 && (
                                <button
                                  onClick={() => {
                                    onClose();
                                    onOpenKewpa11(s);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] transition flex items-center gap-1 ml-auto"
                                >
                                  <FileText className="w-3 h-3 text-amber-400" />
                                  <span>KEW.PA-11</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: TUKAR KATA LALUAN */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-5">
              
              <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/50 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                  <strong className="font-bold block mb-0.5">Keselamatan Akaun Portal Pemeriksaan Aset:</strong>
                  Sila gunakan kata laluan yang kuat untuk melindungi data pemeriksaan fizikal dan kelulusan dokumen KEW.PA-11 mengikut garis panduan keselamatan siber POLIKU.
                </div>
              </div>

              {passSaved && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Kata laluan anda telah berjaya dikemaskini!</span>
                </div>
              )}

              <div className="space-y-4 max-w-lg">
                
                {/* Kata Laluan Semasa */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Kata Laluan Semasa</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Masukkan kata laluan semasa anda"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Kata Laluan Baru */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                      <span>Kata Laluan Baru</span>
                    </span>
                    {passStrength.label && (
                      <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded text-white ${passStrength.color}`}>
                        {passStrength.label}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Sekurang-kurangnya 6 aksara"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password meter bar */}
                  {newPassword && (
                    <div className="mt-2 h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full transition-all duration-300 ${passStrength.color}`}
                        style={{ width: `${(passStrength.score / 3) * 100}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Pengesahan Kata Laluan Baru */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Pengesahan Kata Laluan Baru</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulang kata laluan baru"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-[11px] text-rose-500 mt-1 font-medium">
                      Kata laluan pengesahan tidak sepadan!
                    </p>
                  )}
                </div>

              </div>

              {/* Submit Password Form */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={!newPassword || newPassword !== confirmPassword}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Kemaskini Kata Laluan</span>
                </button>
              </div>

            </form>
          )}

        </div>

      </div>

    </div>
  );
}
