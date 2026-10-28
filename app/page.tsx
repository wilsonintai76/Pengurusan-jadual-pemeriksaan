'use client';

import React, { useState, useEffect } from 'react';
import SidebarNav from '@/components/SidebarNav';
import MobileBottomNav from '@/components/MobileBottomNav';
import TopHeader from '@/components/TopHeader';
import HomeSection from '@/components/HomeSection';
import EjasSection from '@/components/EjasSection';
import PraJkpakSection from '@/components/PraJkpakSection';
import PekelilingSection from '@/components/PekelilingSection';
import DirektoriSection from '@/components/DirektoriSection';
import DirektoriLokasiSection from '@/components/DirektoriLokasiSection';
import DirektoriJabatanSection from '@/components/DirektoriJabatanSection';
import TetapanSection from '@/components/TetapanSection';
import AuditLogSection from '@/components/AuditLogSection';
import PrintArea from '@/components/PrintArea';

import AuthModal from '@/components/modals/AuthModal';
import ScheduleModal from '@/components/modals/ScheduleModal';
import ClaimLocationModal from '@/components/modals/ClaimLocationModal';
import Kewpa11Modal from '@/components/modals/Kewpa11Modal';
import Kewpa7UploadModal from '@/components/modals/Kewpa7UploadModal';
import CrossInspectionModal from '@/components/modals/CrossInspectionModal';
import PbacMatrixModal from '@/components/modals/PbacMatrixModal';
import UserProfileModal from '@/components/modals/UserProfileModal';

import { 
  InspectionSchedule, 
  UserSession, 
  PbacAuditLog, 
  LaporanPraJkpak,
  LocationInfo,
  SystemSettings,
  Kewpa7Record
} from '@/lib/types';
import { 
  INITIAL_SCHEDULES, 
  INITIAL_AUDIT_LOGS, 
  CROSS_PAIRS,
  INITIAL_USERS,
  INITIAL_LOCATIONS,
  DEFAULT_SETTINGS,
  DEPARTMENTS
} from '@/lib/initialData';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const DEFAULT_USER: UserSession = {
  email: 'admin.aset@poliku.edu.my',
  name: 'En. Wan Ismail Bin Wan Ali (N32)',
  dept: 'PENTADBIRAN',
  role: 'Pentadbir Sistem',
  grade: 'N32',
};

export default function Page() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(DEFAULT_USER);
  const [users, setUsers] = useState<UserSession[]>(INITIAL_USERS);
  const [schedules, setSchedules] = useState<InspectionSchedule[]>(INITIAL_SCHEDULES);
  const [auditLogs, setAuditLogs] = useState<PbacAuditLog[]>(INITIAL_AUDIT_LOGS);
  const [locations, setLocations] = useState<LocationInfo[]>(INITIAL_LOCATIONS);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [kewpa7Records, setKewpa7Records] = useState<Kewpa7Record[]>([]);
  const [locationDeptFilter, setLocationDeptFilter] = useState<string>('');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showKewpa7Modal, setShowKewpa7Modal] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedUser = localStorage.getItem('ejas_auth_user');
        if (savedUser) {
          setCurrentUser(JSON.parse(savedUser));
        } else {
          // If no user saved in localStorage, keep DEFAULT_USER or let user switch anytime
          localStorage.setItem('ejas_auth_user', JSON.stringify(DEFAULT_USER));
        }

        const savedSchedules = localStorage.getItem('ejas_schedules_data');
        if (savedSchedules) {
          setSchedules(JSON.parse(savedSchedules));
        }

        const savedLogs = localStorage.getItem('ejas_pbac_logs');
        if (savedLogs) {
          setAuditLogs(JSON.parse(savedLogs));
        }

        const savedUsers = localStorage.getItem('ejas_users_data');
        if (savedUsers) {
          setUsers(JSON.parse(savedUsers));
        }

        const savedLocations = localStorage.getItem('ejas_locations_data');
        if (savedLocations) {
          setLocations(JSON.parse(savedLocations));
        }

        const savedSettings = localStorage.getItem('ejas_settings_data');
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }

        const savedKewpa7 = localStorage.getItem('ejas_kewpa7_records_d1');
        if (savedKewpa7) {
          setKewpa7Records(JSON.parse(savedKewpa7));
        }
      } catch (e) {
        console.error('Error reading localStorage', e);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const [activeTab, setActiveTab] = useState<
    'home' | 'ejas' | 'praJkpak' | 'pekeliling' | 'direktori' | 'audit' | 'lokasi' | 'jabatan' | 'tetapan'
  >('home');
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<InspectionSchedule | null>(null);
  const [showClaimModal, setShowClaimModal] = useState<boolean>(false);
  const [showKewpaModal, setShowKewpaModal] = useState<boolean>(false);
  const [activeKewpaSchedule, setActiveKewpaSchedule] = useState<InspectionSchedule | null>(null);
  const [showCrossModal, setShowCrossModal] = useState<boolean>(false);
  const [showPbacModal, setShowPbacModal] = useState<boolean>(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState<boolean>(false);

  const handleSaveUserProfile = (updatedUser: UserSession) => {
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('ejas_auth_user', JSON.stringify(updatedUser));
    } catch (e) {
      console.error('Error saving user profile to localStorage', e);
    }
  };

  // Print state
  const [printMode, setPrintMode] = useState<'kewpa10' | 'praJkpak'>('kewpa10');

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Save schedules when changed
  const updateSchedules = (newSchedules: InspectionSchedule[]) => {
    setSchedules(newSchedules);
    try {
      localStorage.setItem('ejas_schedules_data', JSON.stringify(newSchedules));
    } catch (e) {
      console.error('Error saving schedules', e);
    }
  };

  // Save audit logs when changed
  const addAuditLog = (newLog: Omit<PbacAuditLog, 'id' | 'timestamp'>) => {
    const log: PbacAuditLog = {
      ...newLog,
      id: `LOG-${(auditLogs.length + 1).toString().padStart(3, '0')}`,
      timestamp: new Date().toLocaleString('ms-MY', { hour12: false }),
    };
    const updated = [log, ...auditLogs];
    setAuditLogs(updated);
    try {
      localStorage.setItem('ejas_pbac_logs', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving audit logs', e);
    }
  };

  // Auth handlers
  const handleAuthSuccess = (user: UserSession) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('ejas_auth_user', JSON.stringify(user));
    } catch (e) {}
    setShowAuthModal(false);
    showToast(`Selamat kembali, ${user.name} (${user.dept})`, 'success');
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('ejas_auth_user');
    } catch (e) {}
    setCurrentUser(null);
    setShowUserProfileModal(false);
    setShowAuthModal(true);
    showToast('Anda telah berjaya log keluar dari Portal Pengurusan Aset POLIKU.', 'info');
  };

  // User Directory CRUD handlers
  const handleUpdateUser = (updatedUser: UserSession) => {
    const updated = users.map((u) => (u.email === updatedUser.email ? updatedUser : u));
    setUsers(updated);
    if (currentUser?.email === updatedUser.email) {
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem('ejas_auth_user', JSON.stringify(updatedUser));
      } catch (e) {
        console.error(e);
      }
    }
    try {
      localStorage.setItem('ejas_users_data', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    showToast(`Maklumat pegawai ${updatedUser.name} berjaya dikemaskini.`, 'success');
  };

  const handleDeleteUser = (userEmail: string) => {
    const target = users.find((u) => u.email === userEmail);
    if (!target) return;
    if (currentUser?.email === userEmail) {
      showToast('Tidak boleh memadam akaun pegawai yang sedang aktif log masuk.', 'error');
      return;
    }
    const updated = users.filter((u) => u.email !== userEmail);
    setUsers(updated);
    try {
      localStorage.setItem('ejas_users_data', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    showToast(`Pegawai ${target.name} telah dipadam dari direktori.`, 'info');
  };

  // Location Directory CRUD handlers
  const handleAddLocation = (newLoc: LocationInfo) => {
    const updated = [newLoc, ...locations];
    setLocations(updated);
    try {
      localStorage.setItem('ejas_locations_data', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    showToast(`Lokasi "${newLoc.nama}" (${newLoc.kodRuang}) berjaya didaftarkan.`, 'success');
  };

  const handleUpdateLocation = (updatedLoc: LocationInfo) => {
    const updated = locations.map((loc) => loc.id === updatedLoc.id ? updatedLoc : loc);
    setLocations(updated);
    try {
      localStorage.setItem('ejas_locations_data', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    showToast(`Maklumat lokasi "${updatedLoc.nama}" telah dikemaskini.`, 'success');
  };

  const handleDeleteLocation = (id: string) => {
    const target = locations.find((l) => l.id === id);
    const updated = locations.filter((l) => l.id !== id);
    setLocations(updated);
    try {
      localStorage.setItem('ejas_locations_data', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    showToast(`Lokasi "${target?.nama || id}" telah dipadam.`, 'info');
  };

  // KEW.PA-7 Extraction & Edge D1 Save Handler
  const handleSaveKewpa7Record = (record: Kewpa7Record, createdLocation?: LocationInfo) => {
    const updatedRecords = [record, ...kewpa7Records];
    setKewpa7Records(updatedRecords);
    try {
      localStorage.setItem('ejas_kewpa7_records_d1', JSON.stringify(updatedRecords));
    } catch (e) {
      console.error(e);
    }

    if (createdLocation) {
      const existingLocIdx = locations.findIndex(
        (l) => l.nama.toLowerCase() === createdLocation.nama.toLowerCase() || l.kodRuang === createdLocation.kodRuang
      );
      let updatedLocations = [...locations];
      if (existingLocIdx >= 0) {
        updatedLocations[existingLocIdx] = {
          ...updatedLocations[existingLocIdx],
          anggaranAset: createdLocation.anggaranAset,
          penjaga: createdLocation.penjaga,
        };
      } else {
        updatedLocations = [createdLocation, ...locations];
      }
      setLocations(updatedLocations);
      try {
        localStorage.setItem('ejas_locations_data', JSON.stringify(updatedLocations));
      } catch (e) {
        console.error(e);
      }
    }

    addAuditLog({
      userEmail: currentUser?.email || 'ppa@poliku.edu.my',
      action: 'kewpa7:upload_auto_extract',
      resourceId: record.id,
      decision: 'PERMIT',
      policyId: 'POL_KEWPA7_AUTOMATED_PREFILL',
      notes: `PPAJ/PPAU berjaya memuat naik & mengekstrak borang KEW.PA-7 bagi ${record.lokasi} (${record.senaraiAset.length} unit aset tersimpan di D1).`,
    });

    showToast(`Borang KEW.PA-7 (${record.lokasi}) berjaya diekstrak & ${record.senaraiAset.length} unit aset disimpan di Edge D1!`, 'success');
  };

  // Settings Handlers
  const handleSaveSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('ejas_settings_data', JSON.stringify(newSettings));
    } catch (e) {
      console.error(e);
    }
    showToast('Semua tetapan sistem dan pekeliling telah disimpan.', 'success');
  };

  const handleResetDefaultData = () => {
    setSchedules(INITIAL_SCHEDULES);
    setUsers(INITIAL_USERS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setLocations(INITIAL_LOCATIONS);
    setSettings(DEFAULT_SETTINGS);
    setCurrentUser(DEFAULT_USER);
    try {
      localStorage.setItem('ejas_schedules_data', JSON.stringify(INITIAL_SCHEDULES));
      localStorage.setItem('ejas_users_data', JSON.stringify(INITIAL_USERS));
      localStorage.setItem('ejas_pbac_logs', JSON.stringify(INITIAL_AUDIT_LOGS));
      localStorage.setItem('ejas_locations_data', JSON.stringify(INITIAL_LOCATIONS));
      localStorage.setItem('ejas_settings_data', JSON.stringify(DEFAULT_SETTINGS));
      localStorage.setItem('ejas_auth_user', JSON.stringify(DEFAULT_USER));
    } catch (e) {
      console.error(e);
    }
    showToast('Pangkalan data telah berjaya diset semula kepada data contoh rasmi POLIKU!', 'success');
  };

  const handleExportFullBackupJSON = () => {
    const backupData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      institution: settings.namaInstitusi,
      schedules,
      users,
      locations,
      auditLogs,
      settings,
      departments: DEPARTMENTS,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `POLIKU_Asset_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Fail sandaran JSON berjaya dimuat turun.', 'success');
  };

  const handleImportBackupJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.schedules) {
          setSchedules(parsed.schedules);
          localStorage.setItem('ejas_schedules_data', JSON.stringify(parsed.schedules));
        }
        if (parsed.users) {
          setUsers(parsed.users);
          localStorage.setItem('ejas_users_data', JSON.stringify(parsed.users));
        }
        if (parsed.locations) {
          setLocations(parsed.locations);
          localStorage.setItem('ejas_locations_data', JSON.stringify(parsed.locations));
        }
        if (parsed.auditLogs) {
          setAuditLogs(parsed.auditLogs);
          localStorage.setItem('ejas_pbac_logs', JSON.stringify(parsed.auditLogs));
        }
        if (parsed.settings) {
          setSettings(parsed.settings);
          localStorage.setItem('ejas_settings_data', JSON.stringify(parsed.settings));
        }
        showToast('Pangkalan data berjaya dipulihkan daripada fail sandaran!', 'success');
      } catch (err) {
        showToast('Ralat: Fail JSON tidak sah atau format tidak disokong.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Schedule CRUD
  const handleSaveSchedule = (scheduleData: Partial<InspectionSchedule>) => {
    if (editingSchedule) {
      // Edit
      const updated = schedules.map((s) =>
        s.id === editingSchedule.id ? ({ ...s, ...scheduleData } as InspectionSchedule) : s
      );
      updateSchedules(updated);
      showToast(`Jadual ${editingSchedule.kod || editingSchedule.lokasi} berjaya dikemaskini.`, 'success');
    } else {
      // Add
      const newId = `JAD-2026-${scheduleData.jabatan}-${Date.now().toString().slice(-4)}`;
      const newSchedule: InspectionSchedule = {
        id: newId,
        kod: scheduleData.kod || `JAD/${scheduleData.jabatan}/2026/${(schedules.length + 1).toString().padStart(2, '0')}`,
        jabatan: scheduleData.jabatan || 'JTMK',
        lokasi: scheduleData.lokasi || 'Makmal Baru',
        kategori: scheduleData.kategori || 'Semua (Harta Modal & Aset Bernilai Rendah)',
        kuantiti: Number(scheduleData.kuantiti) || 10,
        tarikhMula: scheduleData.tarikhMula || '2026-03-01',
        tarikhTamat: scheduleData.tarikhTamat || '2026-03-03',
        pemeriksa1: scheduleData.pemeriksa1 || '',
        pemeriksa2: scheduleData.pemeriksa2 || '',
        penjaga: scheduleData.penjaga || '',
        status: scheduleData.status || 'Belum Mula',
        catatan: scheduleData.catatan || '',
        createdBy: currentUser?.email || 'penyelaras@poliku.edu.my',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      const updated = [newSchedule, ...schedules];
      updateSchedules(updated);
      showToast(`Jadual bagi ${newSchedule.lokasi} berjaya didaftarkan.`, 'success');
    }

    setShowScheduleModal(false);
    setEditingSchedule(null);
  };

  const handleDeleteSchedule = (id: string) => {
    const item = schedules.find((s) => s.id === id);
    if (!item) return;

    if (window.confirm(`Adakah anda pasti untuk memadam jadual pemeriksaan bagi ${item.lokasi}?`)) {
      const updated = schedules.filter((s) => s.id !== id);
      updateSchedules(updated);
      showToast(`Jadual bagi ${item.lokasi} telah dipadam.`, 'info');
    }
  };

  // Claim Location Slot (with PBAC Guard)
  const handleClaimSlot = (scheduleId: string, slot: 1 | 2) => {
    const target = schedules.find((s) => s.id === scheduleId);
    if (!target || !currentUser) return;

    // PBAC Conflict Guard Check: Room Custodian cannot inspect own room
    const custodianName = target.penjaga.toLowerCase();
    const inspectorName = currentUser.name.toLowerCase();
    const nameKeywords = inspectorName.split(' ').filter((w) => w.length > 2 && !w.startsWith('('));

    const isConflict = nameKeywords.some((word) => custodianName.includes(word));

    if (isConflict) {
      addAuditLog({
        userEmail: currentUser.email,
        action: 'schedule:claim',
        resourceId: target.id,
        decision: 'DENY',
        policyId: 'POL_CONFLICT_CUSTODIAN_GUARD',
        notes: `Tuntutan ditolak: Pegawai (${currentUser.name}) adalah Pegawai Penjaga Ruang bilik ini berpandukan 1PP AM 2.4.`,
      });

      showToast(
        `Akses Ditolak: Di bawah 1PP AM 2.4 Bab C, anda adalah Penjaga Ruang bagi ${target.lokasi} dan dilarang memeriksa makmal sendiri!`,
        'error'
      );
      return;
    }

    // Success claim
    const inspectorLabel = `${currentUser.name} (${currentUser.dept})`;
    const updated = schedules.map((s) => {
      if (s.id === scheduleId) {
        return {
          ...s,
          pemeriksa1: slot === 1 ? inspectorLabel : s.pemeriksa1,
          pemeriksa1Email: slot === 1 ? currentUser.email : s.pemeriksa1Email,
          pemeriksa2: slot === 2 ? inspectorLabel : s.pemeriksa2,
          pemeriksa2Email: slot === 2 ? currentUser.email : s.pemeriksa2Email,
          status: s.status === 'Belum Mula' ? ('Sedang Dijalankan' as const) : s.status,
        };
      }
      return s;
    });

    updateSchedules(updated);

    addAuditLog({
      userEmail: currentUser.email,
      action: 'schedule:claim',
      resourceId: target.id,
      decision: 'PERMIT',
      policyId: 'POL_CROSS_INSPECTION_MANDATE',
      notes: `Pegawai ${currentUser.dept} berjaya menuntut slot Pemeriksa ${slot} bagi makmal ${target.lokasi} (${target.jabatan}).`,
    });

    showToast(`Slot Pemeriksa ${slot} bagi ${target.lokasi} berjaya dituntut!`, 'success');
  };

  // Submit KEW.PA-11 & Pra-JKPAK findings
  const handleSubmitKewpa11 = (
    scheduleId: string,
    report: LaporanPraJkpak,
    driveUrl: string
  ) => {
    const updated = schedules.map((s) => {
      if (s.id === scheduleId) {
        return {
          ...s,
          status: 'Selesai' as const,
          kewpa11Doc: {
            name: 'KEWPA11_Imbasan_Disahkan.pdf',
            url: driveUrl,
          },
          laporanPraJkpak: report,
        };
      }
      return s;
    });

    updateSchedules(updated);

    if (report.rosak > 0) {
      addAuditLog({
        userEmail: currentUser?.email || 'pemeriksa@poliku.edu.my',
        action: 'report:kewpa11_submit',
        resourceId: scheduleId,
        decision: 'PERMIT',
        policyId: 'POL_LO_COMPLIANCE_ENFORCED',
        notes: `Pengesahan aset rosak (${report.rosak} unit) lengkap dengan No. Aduan (${report.noLaporanKerosakan}) dan LO (${report.noPesananKerajaan}).`,
      });
    }

    if (report.usang > 0) {
      addAuditLog({
        userEmail: currentUser?.email || 'pemeriksa@poliku.edu.my',
        action: 'report:kewpa11_submit',
        resourceId: scheduleId,
        decision: 'PERMIT',
        policyId: 'POL_IDLE_JUSTIFICATION_REQUIRED',
        notes: `Justifikasi ${report.usang} unit aset usang didokumenkan mengikut sebab piawai pekeliling untuk syor pelupusan.`,
      });
    }

    setShowKewpaModal(false);
    setActiveKewpaSchedule(null);
    showToast('Laporan KEW.PA-11 & dapatan Pra-JKPAK berjaya disahkan selesai!', 'success');
  };

  // Print Triggers
  const handlePrintKewpa10 = () => {
    setPrintMode('kewpa10');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintWorkingPaper = () => {
    setPrintMode('praJkpak');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // CSV Exports
  const handleExportSchedulesCSV = () => {
    let csv = 'Bil,Kod,Jabatan,Lokasi,Kategori,Kuantiti,TarikhMula,TarikhTamat,Pemeriksa1,Pemeriksa2,Penjaga,Status,Catatan\n';
    schedules.forEach((d, i) => {
      csv += `${i + 1},"${d.kod || ''}","${d.jabatan}","${d.lokasi}","${d.kategori}",${d.kuantiti},"${d.tarikhMula}","${d.tarikhTamat}","${d.pemeriksa1}","${d.pemeriksa2}","${d.penjaga || ''}","${d.status}","${d.catatan || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Jadual_Aset_POLIKU_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Fail CSV Jadual Pemeriksaan berjaya dimuat turun.', 'success');
  };

  const handleExportPraJkpakCSV = () => {
    let csv = 'Bil,Jabatan,Lokasi,Baik,Rosak,Usang,Hilang,NoAduanKerosakan,NoPesananKerajaanLO,StatusPembaikan,SebabUsang,JustifikasiUsang,CadanganPraJKPAK\n';
    const selesai = schedules.filter((s) => s.status === 'Selesai' && s.laporanPraJkpak);

    selesai.forEach((d, i) => {
      const r = d.laporanPraJkpak!;
      csv += `${i + 1},"${d.jabatan}","${d.lokasi}",${r.baik || 0},${r.rosak || 0},${r.usang || 0},${r.hilang || 0},"${r.noLaporanKerosakan || ''}","${r.noPesananKerajaan || ''}","${r.statusPenyelenggaraan || ''}","${r.sebabTidakDigunakan || ''}","${r.justifikasiTidakDigunakan || ''}","${r.cadangan || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Kompilasi_Pra_JKPAK_POLIKU_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Fail CSV Kompilasi Pra-JKPAK berjaya dimuat turun.', 'success');
  };

  const praJkpakCount = schedules.filter((s) => s.status === 'Selesai' && s.laporanPraJkpak).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans antialiased">
      
      {/* Toast Alert Banner */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-fade-in no-print">
          <div
            className={`px-4 py-3 rounded-2xl shadow-lg border text-xs sm:text-sm font-medium flex items-center justify-between gap-3 ${
              toast.type === 'error'
                ? 'bg-rose-900 text-white border-rose-800'
                : toast.type === 'info'
                ? 'bg-slate-900 text-white border-slate-800'
                : 'bg-emerald-900 text-white border-emerald-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
              ) : toast.type === 'info' ? (
                <Info className="w-4 h-4 text-sky-300 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-white/70 hover:text-white p-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. Desktop UI: Left Sidebar Nav (hidden on mobile, sticky on lg+) */}
      <SidebarNav
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onSync={() => showToast('Pangkalan data Cloudflare D1 berjaya disegerakkan.', 'success')}
        praJkpakCount={praJkpakCount}
        onOpenClaimModal={() => setShowClaimModal(true)}
        onOpenAddSchedule={() => {
          if (!currentUser) {
            showToast('Sila log masuk sebagai Penyelaras Aset Jabatan atau Pentadbir Sistem.', 'info');
            setShowAuthModal(true);
            return;
          }
          setEditingSchedule(null);
          setShowScheduleModal(true);
        }}
        onOpenPbacModal={() => setShowPbacModal(true)}
        onOpenLogin={() => setShowAuthModal(true)}
        onOpenUserProfile={() => {
          if (!currentUser) {
            setShowAuthModal(true);
          } else {
            setShowUserProfileModal(true);
          }
        }}
      />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">

        {/* Top Header: Breadcrumbs on desktop, compact POLIKU top bar on mobile */}
        <TopHeader
          currentUser={currentUser}
          activeTab={activeTab}
          onSync={() => showToast('Pangkalan data Cloudflare D1 berjaya disegerakkan.', 'success')}
          onOpenClaimModal={() => {
            if (!currentUser) {
              showToast('Sila log masuk sebagai Pegawai Pemeriksa atau Penyelaras Aset.', 'info');
              setShowAuthModal(true);
              return;
            }
            setShowClaimModal(true);
          }}
          onOpenAddSchedule={() => {
            if (!currentUser) {
              showToast('Sila log masuk sebagai Penyelaras Aset Jabatan atau Pentadbir Sistem.', 'info');
              setShowAuthModal(true);
              return;
            }
            setEditingSchedule(null);
            setShowScheduleModal(true);
          }}
          onOpenLogin={() => setShowAuthModal(true)}
          onOpenUserProfile={() => {
            if (!currentUser) {
              setShowAuthModal(true);
            } else {
              setShowUserProfileModal(true);
            }
          }}
        />

        {/* Main Content Area: pb-24 on mobile so it clears the bottom menu cleanly, maximized desktop width */}
        <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 pb-24 lg:pb-10 no-print space-y-6">
          {activeTab === 'home' && (
            <HomeSection
              schedules={schedules}
              onOpenEjas={() => setActiveTab('ejas')}
              onOpenPraJkpak={() => setActiveTab('praJkpak')}
              onOpenClaim={() => {
                if (!currentUser) {
                  showToast('Sila log masuk sebagai Pegawai Pemeriksa atau Penyelaras Aset.', 'info');
                  setShowAuthModal(true);
                  return;
                }
                setShowClaimModal(true);
              }}
              onOpenPekeliling={() => setActiveTab('pekeliling')}
            />
          )}

          {activeTab === 'ejas' && (
            <EjasSection
              schedules={schedules}
              currentUser={currentUser}
              onOpenAddSchedule={() => {
                if (!currentUser) {
                  showToast('Sila log masuk sebagai Penyelaras Aset Jabatan atau Pentadbir Sistem.', 'info');
                  setShowAuthModal(true);
                  return;
                }
                setEditingSchedule(null);
                setShowScheduleModal(true);
              }}
              onOpenEditSchedule={(schedule) => {
                if (!currentUser) {
                  showToast('Sila log masuk terlebih dahulu untuk mengemaskini jadual.', 'info');
                  setShowAuthModal(true);
                  return;
                }
                setEditingSchedule(schedule);
                setShowScheduleModal(true);
              }}
              onDeleteSchedule={handleDeleteSchedule}
              onOpenClaimModal={() => {
                if (!currentUser) {
                  showToast('Sila log masuk sebagai Pegawai Pemeriksa atau Penyelaras Aset.', 'info');
                  setShowAuthModal(true);
                  return;
                }
                setShowClaimModal(true);
              }}
              onOpenKewpa11Modal={(schedule) => {
                if (!currentUser) {
                  showToast('Sila log masuk sebagai Pegawai Pemeriksa untuk mengisikan perakuan KEW.PA-11.', 'info');
                  setShowAuthModal(true);
                  return;
                }
                setActiveKewpaSchedule(schedule);
                setShowKewpaModal(true);
              }}
              onOpenCrossModal={() => setShowCrossModal(true)}
              onOpenPbacModal={() => setShowPbacModal(true)}
              onExportCSV={handleExportSchedulesCSV}
              onPrintKewpa10={handlePrintKewpa10}
            />
          )}

          {activeTab === 'lokasi' && (
            <DirektoriLokasiSection
              locations={locations}
              currentUser={currentUser}
              onAddLocation={handleAddLocation}
              onUpdateLocation={handleUpdateLocation}
              onDeleteLocation={handleDeleteLocation}
              onNavigateToSchedule={(jadualId) => {
                setActiveTab('ejas');
              }}
              onOpenKewpa7Modal={() => setShowKewpa7Modal(true)}
              initialDeptFilter={locationDeptFilter}
            />
          )}

          {activeTab === 'jabatan' && (
            <DirektoriJabatanSection
              departments={DEPARTMENTS}
              schedules={schedules}
              onSelectDepartmentForLocations={(deptId) => {
                setLocationDeptFilter(deptId);
                setActiveTab('lokasi');
              }}
              onOpenEjas={() => setActiveTab('ejas')}
            />
          )}

          {activeTab === 'praJkpak' && (
            <PraJkpakSection
              schedules={schedules}
              onExportCSV={handleExportPraJkpakCSV}
              onPrintWorkingPaper={handlePrintWorkingPaper}
            />
          )}

          {activeTab === 'pekeliling' && <PekelilingSection />}

          {activeTab === 'direktori' && (
            <DirektoriSection
              currentUser={currentUser}
              users={users}
              onSwitchUser={(user) => {
                setCurrentUser(user);
                try {
                  localStorage.setItem('ejas_auth_user', JSON.stringify(user));
                } catch (e) {
                  console.error(e);
                }
                showToast(`Berjaya menukar akaun kepada: ${user.name} (${user.role})`, 'success');
              }}
              onAddUser={(newUser) => {
                const updated = [newUser, ...users];
                setUsers(updated);
                try {
                  localStorage.setItem('ejas_users_data', JSON.stringify(updated));
                } catch (e) {
                  console.error(e);
                }
                showToast(`Pegawai baru ${newUser.name} berjaya didaftarkan!`, 'success');
              }}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
            />
          )}

          {activeTab === 'audit' && <AuditLogSection logs={auditLogs} />}

          {activeTab === 'tetapan' && (
            <TetapanSection
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onResetDefaultData={handleResetDefaultData}
              onExportFullBackupJSON={handleExportFullBackupJSON}
              onImportBackupJSON={handleImportBackupJSON}
              currentUser={currentUser}
            />
          )}
        </main>

        {/* Official Government Footer */}
        <footer className="bg-white border-t border-slate-200 py-5 mt-auto no-print">
          <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-left">
              <strong className="text-slate-800">Portal Pengurusan Aset Alih & Jadual Pemeriksaan</strong> &bull; Politeknik Kuching Sarawak
              <p className="text-[11px] text-slate-400 mt-0.5">
                Kementerian Pendidikan Tinggi Malaysia &bull; Pematuhan 1PP Tatacara Pengurusan Aset Alih Kerajaan (AM 2.4)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <button onClick={() => setShowPbacModal(true)} className="hover:text-purple-700 transition">
                Polisi PBAC
              </button>
              <button onClick={() => setActiveTab('pekeliling')} className="hover:text-sky-700 transition">
                Pekeliling TPA
              </button>
              <button onClick={() => setActiveTab('home')} className="hover:text-slate-900 transition">
                Laman Utama
              </button>
            </div>
          </div>
        </footer>

      </div>

      {/* 2. Mobile UI: Fixed Bottom Menu (visible on mobile < lg, hidden on lg+) */}
      <MobileBottomNav
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onSync={() => showToast('Pangkalan data Cloudflare D1 berjaya disegerakkan.', 'success')}
        praJkpakCount={praJkpakCount}
        onOpenClaimModal={() => {
          if (!currentUser) {
            showToast('Sila log masuk sebagai Pegawai Pemeriksa atau Penyelaras Aset.', 'info');
            setShowAuthModal(true);
            return;
          }
          setShowClaimModal(true);
        }}
        onOpenPbacModal={() => setShowPbacModal(true)}
        onOpenLogin={() => setShowAuthModal(true)}
        onOpenUserProfile={() => {
          if (!currentUser) {
            setShowAuthModal(true);
          } else {
            setShowUserProfileModal(true);
          }
        }}
      />

      {/* Modals */}
      {showAuthModal && (
        <AuthModal
          onSuccess={handleAuthSuccess}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {showUserProfileModal && currentUser && (
        <UserProfileModal
          user={currentUser}
          schedules={schedules}
          onClose={() => setShowUserProfileModal(false)}
          onSaveUser={handleSaveUserProfile}
          onLogout={handleLogout}
          onOpenKewpa11={(schedule) => {
            setActiveKewpaSchedule(schedule);
            setShowKewpaModal(true);
          }}
          showToast={showToast}
        />
      )}

      {showScheduleModal && (
        <ScheduleModal
          schedule={editingSchedule}
          defaultDept={currentUser?.dept || 'JTMK'}
          onClose={() => {
            setShowScheduleModal(false);
            setEditingSchedule(null);
          }}
          onSave={handleSaveSchedule}
        />
      )}

      {showClaimModal && (
        <ClaimLocationModal
          schedules={schedules}
          currentUser={currentUser}
          onClose={() => setShowClaimModal(false)}
          onClaimSlot={(scheduleId, slot) => {
            handleClaimSlot(scheduleId, slot);
            setShowClaimModal(false);
          }}
        />
      )}

      {showKewpaModal && activeKewpaSchedule && (
        <Kewpa11Modal
          schedule={activeKewpaSchedule}
          onClose={() => {
            setShowKewpaModal(false);
            setActiveKewpaSchedule(null);
          }}
          onSubmit={handleSubmitKewpa11}
        />
      )}

      {showKewpa7Modal && (
        <Kewpa7UploadModal
          isOpen={showKewpa7Modal}
          onClose={() => setShowKewpa7Modal(false)}
          currentUser={currentUser}
          onSaveKewpa7Record={handleSaveKewpa7Record}
        />
      )}

      {showCrossModal && <CrossInspectionModal onClose={() => setShowCrossModal(false)} />}

      {showPbacModal && <PbacMatrixModal onClose={() => setShowPbacModal(false)} />}

      {/* Print View Container */}
      <PrintArea mode={printMode} schedules={schedules} />

    </div>
  );
}
