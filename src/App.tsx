import React, { useState, useEffect, useMemo } from 'react';
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
import KitaranSection from '@/components/KitaranSection';
import PrintArea from '@/components/PrintArea';
import PrintPreviewModal from '@/components/modals/PrintPreviewModal';

import LandingPage from '@/components/LandingPage';
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
  Kewpa7Record,
  DepartmentInfo,
  AppointmentSummary,
  RoleAssignment,
} from '@/lib/types';
import { dataApi, EMPTY_SETTINGS, ApiError, type AssetPayload } from '@/lib/dataApi';
import { ShieldCheck } from 'lucide-react';
import { NEW_VERSION_EVENT } from '@/lib/versionWatcher';
import { ringkasLaporan, teksDokumen } from '@/lib/praJkpak';
import { UNAUTHORIZED_EVENT, clearSession, fetchAuthMeta, type AuthSession } from '@/lib/authClient';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import ForcePasswordModal from '@/components/modals/ForcePasswordModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [users, setUsers] = useState<UserSession[]>([]);
  const [schedules, setSchedules] = useState<InspectionSchedule[]>([]);
  const [auditLogs, setAuditLogs] = useState<PbacAuditLog[]>([]);
  const [locations, setLocations] = useState<LocationInfo[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(EMPTY_SETTINGS);
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [kewpa7Records, setKewpa7Records] = useState<Kewpa7Record[]>([]);
  const [locationDeptFilter, setLocationDeptFilter] = useState<string>('');
  const [showLanding, setShowLanding] = useState<boolean>(() => {
    try {
      return !sessionStorage.getItem('ejas_auth_user');
    } catch {
      return true;
    }
  });
  const [showKewpa7Modal, setShowKewpa7Modal] = useState<boolean>(false);
  const [appointment, setAppointment] = useState<AppointmentSummary | null>(null);
  const [myAssignments, setMyAssignments] = useState<RoleAssignment[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const reloadFromD1 = async () => {
    // Muatan utama tidak boleh bergantung pada audit (khusus pentadbir): satu kegagalan
    // tidak boleh menjatuhkan seluruh data.
    const [departmentList, officerList, locationList, scheduleList, settingsData] =
      await Promise.all([
        dataApi.departments.list(),
        dataApi.officers.list(),
        dataApi.locations.list(),
        dataApi.schedules.list(),
        dataApi.settings.get(),
      ]);

    setDepartments(departmentList.filter((department) => department.isOperational !== 0));
    setUsers(officerList);
    setLocations(locationList);
    setSchedules(scheduleList);
    setSettings(settingsData);
  };

  /** Jejak audit hanya untuk Pentadbir Sistem (API menolak peranan lain dengan 403). */
  const reloadAuditLogs = async () => {
    try {
      setAuditLogs(await dataApi.audit.list());
    } catch {
      setAuditLogs([]);
    }
  };

  useEffect(() => {
    let savedUser: UserSession | null = null;
    try {
      const raw = sessionStorage.getItem('ejas_auth_user');
      savedUser = raw ? (JSON.parse(raw) as UserSession) : null;
    } catch {
      savedUser = null;
    }

    setCurrentUser(savedUser);
    setShowLanding(!savedUser);

    if (savedUser) {
      fetchAuthMeta().then((meta) => {
        setAppointment(meta?.appointment ?? null);
        setMyAssignments(meta?.assignments ?? []);
        if (meta?.mustChangePassword) setMustChangePassword(true);
      });
    }

    let active = true;
    (async () => {
      try {
        await reloadFromD1();
      } catch (error) {
        console.error('Gagal memuatkan data daripada Cloudflare D1:', error);
        if (active) {
          setToast({
            message: `Gagal memuatkan data daripada Cloudflare D1: ${(error as Error).message}`,
            type: 'error',
          });
        }
      } finally {
        if (active) setIsLoadingData(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // Token ditolak oleh Worker (tamat/tidak sah): tutup sesi dan kembali ke landing.
  useEffect(() => {
    const handleUnauthorized = () => {
      clearSession();
      try {
        sessionStorage.removeItem('ejas_auth_user');
      } catch {
        // abaikan ralat storan setempat
      }
      setCurrentUser(null);
      setShowUserProfileModal(false);
        setShowLanding(true);
      setToast({ message: 'Sesi tidak sah atau telah tamat. Sila log masuk semula.', type: 'info' });
      setTimeout(() => setToast(null), 4000);
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const [activeTab, setActiveTab] = useState<
    | 'home'
    | 'ejas'
    | 'praJkpak'
    | 'pekeliling'
    | 'direktori'
    | 'kitaran'
    | 'audit'
    | 'lokasi'
    | 'jabatan'
    | 'tetapan'
  >('home');
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<InspectionSchedule | null>(null);
  const [showClaimModal, setShowClaimModal] = useState<boolean>(false);
  const [showKewpaModal, setShowKewpaModal] = useState<boolean>(false);
  const [activeKewpaSchedule, setActiveKewpaSchedule] = useState<InspectionSchedule | null>(null);
  const [showCrossModal, setShowCrossModal] = useState<boolean>(false);
  const [showPbacModal, setShowPbacModal] = useState<boolean>(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState<boolean>(false);

  const isSystemAdmin = useMemo(() => {
    // Label peranan sebagai jaring keselamatan sekiranya senarai lantikan belum dimuatkan.
    if (String(currentUser?.role ?? '').includes('Pentadbir')) return true;

    const today = new Date().toISOString().slice(0, 10);
    return myAssignments.some(
      (assignment) =>
        assignment.roleId === 'PENTADBIR_SISTEM' &&
        assignment.status === 'AKTIF' &&
        assignment.validFrom <= today &&
        (!assignment.validTo || assignment.validTo >= today)
    );
  }, [myAssignments, currentUser?.role]);

  // Jejak audit dimuat hanya apabila pengguna ialah Pentadbir Sistem.
  useEffect(() => {
    if (isSystemAdmin && currentUser) {
      void reloadAuditLogs();
    } else {
      setAuditLogs([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSystemAdmin, currentUser?.email]);

  /** Jabatan yang boleh didaftar/dikemas kini pegawai oleh PPAJ/PPAU (skop sendiri). */
  const jabatanDiurusPegawai = useMemo(() => {
    if (isSystemAdmin) return [];
    const today = new Date().toISOString().slice(0, 10);
    const aktif = (assignment: RoleAssignment) =>
      assignment.status === 'AKTIF' &&
      (!assignment.validFrom || assignment.validFrom <= today) &&
      (!assignment.validTo || assignment.validTo >= today);

    return Array.from(
      new Set(
        myAssignments
          .filter((assignment) => assignment.roleId === 'PENOLONG_PEGAWAI_ASET' && aktif(assignment))
          .filter((assignment) => assignment.scopeType === 'DEPARTMENT' && assignment.scopeId)
          .map((assignment) => assignment.scopeId as string)
      )
    );
  }, [isSystemAdmin, myAssignments]);

  /**
   * Laporan KEW.PA-11 hanya boleh diisi oleh Pegawai Pemeriksa yang ditugaskan
   * (atau Pentadbir Sistem); pengguna lain hanya boleh melihat (baca-sahaja).
   */
  const canEditKewpa11 = (schedule: InspectionSchedule) => {
    if (isSystemAdmin) return true;
    const emel = String(currentUser?.email ?? '').toLowerCase();
    if (!emel) return false;
    return [schedule.pemeriksa1Email, schedule.pemeriksa2Email]
      .filter(Boolean)
      .some((email) => String(email).toLowerCase() === emel);
  };

  const handleSaveUserProfile = (updatedUser: UserSession) => {
    setCurrentUser(updatedUser);
    try {
      sessionStorage.setItem('ejas_auth_user', JSON.stringify(updatedUser));
    } catch (e) {
      console.error('Error saving user profile to sessionStorage', e);
    }

    dataApi.officers
      .save(updatedUser)
      .then((saved) => {
        setUsers((prev) => prev.map((u) => (u.email === updatedUser.email ? saved : u)));
      })
      .catch((error: Error) => showToast(`Gagal menyimpan profil ke D1: ${error.message}`, 'error'));
  };

  // Print state
  const [printPreview, setPrintPreview] = useState<'kewpa10' | 'praJkpak' | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Versi baharu dikesan → sesi akan ditamatkan dan halaman dimuat semula oleh `lib/versionWatcher`.
  useEffect(() => {
    const onNewVersion = (event: Event) => {
      const build = (event as CustomEvent<{ build?: number }>).detail?.build;
      showToast(
        `Versi baharu${build ? ` (build ${build})` : ''} dikesan. Anda akan dilog keluar dan halaman dimuat semula…`,
        'info'
      );
    };

    window.addEventListener(NEW_VERSION_EVENT, onNewVersion);
    return () => window.removeEventListener(NEW_VERSION_EVENT, onNewVersion);
  }, []);

  // Save schedules when changed
  const updateSchedules = (newSchedules: InspectionSchedule[]) => {
    setSchedules(newSchedules);
  };

  // Save audit logs when changed
  const addAuditLog = (newLog: Omit<PbacAuditLog, 'id' | 'timestamp'>) => {
    dataApi.audit
      .create(newLog)
      .then((log) => setAuditLogs((prev) => [log, ...prev]))
      .catch((error: Error) => console.error('Gagal merekod jejak audit ke D1:', error));
  };

  // Auth handlers
  // Tindakan yang memerlukan identiti: buka semula halaman log masuk (kad log masuk di hero).
  const requireLogin = () => {
    setShowLanding(true);
  };

  const handleAuthSuccess = (session: AuthSession) => {
    const user = session.user;
    setCurrentUser(user);
    try {
      sessionStorage.setItem('ejas_auth_user', JSON.stringify(user));
    } catch {
      // abaikan ralat storan setempat
    }
    setShowLanding(false);

    // Kata laluan sementara: paksa tukar sebelum portal digunakan (Worker turut menyekat).
    if (session.mustChangePassword) {
      setMustChangePassword(true);
      showToast('Sila tukar kata laluan sementara anda untuk meneruskan.', 'info');
      return;
    }

    showToast(`Selamat kembali, ${user.name} (${user.dept})`, 'success');

    // Muat semula data dengan token baharu — muatan awal berlaku sebelum log masuk.
    reloadFromD1().catch((error: Error) =>
      showToast(`Gagal memuatkan data daripada Cloudflare D1: ${error.message}`, 'error')
    );

    fetchAuthMeta().then((meta) => {
      setAppointment(meta?.appointment ?? null);
      setMyAssignments(meta?.assignments ?? []);
    });

    dataApi.officers
      .save(user)
      .then((saved) => {
        setCurrentUser(saved);
        try {
          sessionStorage.setItem('ejas_auth_user', JSON.stringify(saved));
        } catch {
          // abaikan ralat storan setempat
        }
        setUsers((prev) => {
          const exists = prev.some((u) => u.email === saved.email);
          return exists
            ? prev.map((u) => (u.email === saved.email ? saved : u))
            : [saved, ...prev];
        });
      })
      .catch((error: Error) =>
        showToast(`Sesi dibuka, tetapi direktori pegawai gagal disegerakkan: ${error.message}`, 'error')
      );
  };

  const handleLogout = () => {
    clearSession();
    try {
      sessionStorage.removeItem('ejas_auth_user');
    } catch {
      // abaikan ralat storan setempat
    }
    setCurrentUser(null);
    setMustChangePassword(false);
    setShowUserProfileModal(false);
    setShowLanding(true);
    showToast('Anda telah berjaya log keluar dari Portal Pengurusan Aset POLIKU.', 'info');
  };

  // User Directory CRUD handlers
  const handleUpdateUser = (updatedUser: UserSession) => {
    dataApi.officers
      .update(updatedUser)
      .then((saved) => {
        setUsers((prev) =>
          prev.map((u) =>
            updatedUser.id ? (u.id === updatedUser.id ? saved : u) : u.email === updatedUser.email ? saved : u
          )
        );

        if (currentUser?.email === updatedUser.email) {
          setCurrentUser(saved);
          try {
            sessionStorage.setItem('ejas_auth_user', JSON.stringify(saved));
          } catch (e) {
            console.error(e);
          }
        }

        showToast(`Maklumat pegawai ${saved.name} berjaya dikemaskini.`, 'success');
      })
      .catch((error: Error) => showToast(`Gagal mengemaskini pegawai: ${error.message}`, 'error'));
  };

  const handleDeleteUser = (userEmail: string) => {
    const target = users.find((u) => u.email === userEmail);
    if (!target) return;
    if (currentUser?.email === userEmail) {
      showToast('Tidak boleh memadam akaun pegawai yang sedang aktif log masuk.', 'error');
      return;
    }

    dataApi.officers
      .remove(target.id || userEmail)
      .then(() => {
        setUsers((prev) => prev.filter((u) => u.email !== userEmail));
        showToast(`Pegawai ${target.name} telah dipadam dari direktori.`, 'info');
      })
      .catch((error: Error) => showToast(`Gagal memadam pegawai: ${error.message}`, 'error'));
  };

  // Location Directory CRUD handlers
  const handleAddLocation = (newLoc: LocationInfo, assets?: AssetPayload[]) => {
    dataApi.locations
      .create(newLoc)
      .then(async (saved) => {
        if (assets?.length) await dataApi.locations.replaceAssets(saved.id, assets);
        setLocations((prev) => [saved, ...prev]);
        showToast(`Lokasi "${saved.nama}" (${saved.kodRuang}) berjaya disimpan.`, 'success');
        // Penjaga ruang menjana lantikan PENYELIA_LOKASI — segarkan direktori pegawai.
        await reloadFromD1();
      })
      .catch((error: Error) => showToast(`Gagal mendaftar lokasi: ${error.message}`, 'error'));
  };

  const handleUpdateLocation = (updatedLoc: LocationInfo, assets?: AssetPayload[]) => {
    dataApi.locations
      .update(updatedLoc)
      .then(async (saved) => {
        if (assets?.length) await dataApi.locations.replaceAssets(saved.id, assets);
        setLocations((prev) => prev.map((loc) => (loc.id === saved.id ? saved : loc)));
        showToast(`Maklumat lokasi "${saved.nama}" telah dikemaskini.`, 'success');
        await reloadFromD1();
      })
      .catch((error: Error) => showToast(`Gagal mengemaskini lokasi: ${error.message}`, 'error'));
  };

  const handleDeleteLocation = (id: string) => {
    const target = locations.find((l) => l.id === id);

    dataApi.locations
      .remove(id)
      .then(() => {
        setLocations((prev) => prev.filter((l) => l.id !== id));
        showToast(`Lokasi "${target?.nama || id}" telah dipadam.`, 'info');
        // Lantikan skop lokasi ditamatkan — segarkan direktori pegawai.
        return reloadFromD1();
      })
      .catch((error: Error) => showToast(`Gagal memadam lokasi: ${error.message}`, 'error'));
  };

  // KEW.PA-7 Extraction & Edge D1 Save Handler
  const handleSaveKewpa7Record = (record: Kewpa7Record, createdLocation?: LocationInfo) => {
    setKewpa7Records((prev) => [record, ...prev]);

    if (createdLocation) {
      const assetPayload = (record.senaraiAset || []).map((asset) => ({
        noSiriPendaftaran: asset.noSiriPendaftaran,
        keteranganAset: asset.keteranganAset,
        statusFizikal: asset.statusFizikal,
        kategori: asset.kategori,
      }));

      // Pelayan melakukan upsert ikut kod lokasi: muat naik semula menimpa ruang sedia ada
      // (nama, bangunan/aras, aset, penyelia) tanpa mencipta ruang pendua.
      dataApi.locations
        .create(createdLocation)
        .then((saved) => {
          setLocations((prev) => {
            const exists = prev.some((item) => item.id === saved.id);
            return exists ? prev.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...prev];
          });
          return dataApi.locations.replaceAssets(saved.id, assetPayload).then(() => saved);
        })
        .then((saved) =>
          record.r2Key
            ? dataApi.kewpa7.linkDocument(record.r2Key, saved.id).catch(() => undefined)
            : undefined
        )
        .then(() => reloadFromD1())
        .catch((error: Error) => showToast(`Gagal menyimpan lokasi: ${error.message}`, 'error'));
    }

    addAuditLog({
      userEmail: currentUser?.email || 'ppa@poliku.edu.my',
      action: 'kewpa7:upload_auto_extract',
      resourceId: record.id,
      decision: 'PERMIT',
      policyId: 'POL_KEWPA7_AUTOMATED_PREFILL',
      notes: `PPAJ/PPAU memuat naik KEW.PA-7 bagi ${record.lokasi} (${record.senaraiAset.length} unit aset). Data lokasi sedia ada ditimpa jika kod lokasi sama.`,
    });

    showToast(
      `KEW.PA-7 (${record.lokasi}) disimpan — ${record.senaraiAset.length} unit aset, penyelia & maklumat ruang dikemaskini.`,
      'success'
    );
  };

  // Settings Handlers
  const handleSaveSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);

    dataApi.settings
      .save(newSettings)
      .then((saved) => {
        setSettings({ ...newSettings, ...saved });
        showToast('Semua tetapan sistem dan pekeliling telah disimpan ke Cloudflare KV.', 'success');
      })
      .catch((error: Error) => showToast(`Gagal menyimpan tetapan: ${error.message}`, 'error'));
  };

  const handleReloadFromD1 = async () => {
    try {
      await reloadFromD1();
      showToast('Data terkini berjaya dimuat semula daripada Cloudflare D1.', 'success');
    } catch (error) {
      showToast(`Gagal memuat semula data: ${(error as Error).message}`, 'error');
    }
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
      departments,
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
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse((e.target?.result as string) || '{}');
        let imported = 0;

        for (const location of parsed.locations ?? []) {
          await dataApi.locations.create(location);
          imported += 1;
        }

        for (const officer of parsed.users ?? []) {
          await dataApi.officers.save(officer);
          imported += 1;
        }

        for (const schedule of parsed.schedules ?? []) {
          await dataApi.schedules.create(schedule);
          imported += 1;
        }

        if (parsed.settings) {
          await dataApi.settings.save(parsed.settings);
        }

        await reloadFromD1();
        showToast(`Sandaran berjaya dipulihkan ke Cloudflare D1 (${imported} rekod diimport).`, 'success');
      } catch (err) {
        showToast(`Ralat semasa memulihkan sandaran: ${(err as Error).message}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  // Schedule CRUD
  const handleSaveSchedule = (scheduleData: Partial<InspectionSchedule>) => {
    if (editingSchedule) {
      dataApi.schedules
        .update(editingSchedule.id, scheduleData)
        .then((saved) => {
          setSchedules((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
          showToast(`Jadual ${saved.kod || saved.lokasi} berjaya dikemaskini.`, 'success');
        })
        .catch((error: Error) => showToast(`Gagal mengemaskini jadual: ${error.message}`, 'error'));
    } else {
      dataApi.schedules
        .create(scheduleData)
        .then((saved) => {
          setSchedules((prev) => [saved, ...prev]);
          showToast(`Jadual bagi ${saved.lokasi} berjaya didaftarkan.`, 'success');
        })
        .catch((error: Error) => showToast(`Gagal mendaftar jadual: ${error.message}`, 'error'));
    }

    setShowScheduleModal(false);
    setEditingSchedule(null);
  };

  const handleDeleteSchedule = (id: string) => {
    const item = schedules.find((s) => s.id === id);
    if (!item) return;

    if (window.confirm(`Adakah anda pasti untuk memadam jadual pemeriksaan bagi ${item.lokasi}?`)) {
      dataApi.schedules
        .remove(id)
        .then(() => {
          setSchedules((prev) => prev.filter((s) => s.id !== id));
          showToast(`Jadual bagi ${item.lokasi} telah dipadam.`, 'info');
        })
        .catch((error: Error) => showToast(`Gagal memadam jadual: ${error.message}`, 'error'));
    }
  };

  // Claim Location Slot (PBAC disahkan oleh Worker: lantikan + konflik + silang)
  const handleClaimSlot = (scheduleId: string, slot: 1 | 2) => {
    const target = schedules.find((s) => s.id === scheduleId);
    if (!target || !currentUser) return;

    dataApi.schedules
      .claim(scheduleId, slot)
      .then((saved) => {
        setSchedules((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
        showToast(`Slot Pemeriksa ${slot} bagi ${target.lokasi} berjaya dituntut.`, 'success');
      })
      .catch((error: Error) => {
        const payload =
          error instanceof ApiError ? (error.data as { reasons?: string[] } | undefined) : undefined;
        showToast(payload?.reasons?.[0] ?? error.message, 'error');
      });
  };

  // Submit KEW.PA-11 & Pra-JKPAK findings
  const handleSubmitKewpa11 = (
    scheduleId: string,
    report: LaporanPraJkpak,
    kewpa11DocKey: string
  ) => {
    dataApi.schedules
      .update(scheduleId, {
        status: 'Selesai',
        kewpa11DocKey,
        laporanPraJkpak: report,
      })
      .then((saved) => {
        setSchedules((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
        showToast(
          `KEW.PA-11 bagi ${saved.lokasi} disimpan ke Cloudflare R2 — status jadual: ${saved.status}.`,
          'success'
        );
      })
      .catch((error: Error) => showToast(`Gagal menyimpan laporan KEW.PA-11: ${error.message}`, 'error'));

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
    setPrintPreview('kewpa10');
  };

  const handlePrintWorkingPaper = () => {
    setPrintPreview('praJkpak');
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
    let csv =
      'Bil,Jabatan,Lokasi,JumlahAset,A,B,C,D,E,F,DokumenC,DokumenD,DokumenE,DokumenF,SebabB,CadanganPraJKPAK,TarikhHantar\n';
    const selesai = schedules.filter((s) => s.status === 'Selesai' && s.laporanPraJkpak);

    const sel = (nilai: string) => `"${String(nilai).replace(/"/g, '""')}"`;

    selesai.forEach((d, i) => {
      const ringkasan = ringkasLaporan(d.laporanPraJkpak);
      const { pecahan } = ringkasan;
      const dokumen = (kod: 'C' | 'D' | 'E' | 'F') => {
        const item = ringkasan.dokumen.find((dok) => dok.kod === kod);
        return item ? teksDokumen(item) : '';
      };

      csv +=
        [
          i + 1,
          sel(d.jabatan),
          sel(d.lokasi),
          ringkasan.jumlahDiperiksa,
          pecahan.A,
          pecahan.B,
          pecahan.C,
          pecahan.D,
          pecahan.E,
          pecahan.F,
          sel(dokumen('C')),
          sel(dokumen('D')),
          sel(dokumen('E')),
          sel(dokumen('F')),
          sel(ringkasan.sebabTidakDigunakan),
          sel(ringkasan.cadangan),
          sel(ringkasan.tarikhHantar ?? ''),
        ].join(',') + '\n';
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

  const toastNode = toast && (
    <div className="fixed top-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-md animate-fade-in no-print">
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
  );

  // Landing page gate: unauthenticated visitors get the public hero + sign-in form
  if (showLanding) {
    return (
      <>
        {toastNode}
        <LandingPage
          officers={users}
          departments={departments}
          locations={locations}
          schedules={schedules}
          settings={settings}
          isLoadingData={isLoadingData}
          onLogin={handleAuthSuccess}
          onGuest={() => {
            setShowLanding(false);
            showToast('Anda melayari portal sebagai pelawat. Log masuk untuk mengurus pemeriksaan aset.', 'info');
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans antialiased">
      {toastNode}

      {/* 1. Desktop UI: Left Sidebar Nav (hidden on mobile, sticky on lg+) */}
      <SidebarNav
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        isAdmin={isSystemAdmin}
        tahunSesi={settings.sesiTahun}
        onSync={() => showToast('Pangkalan data Cloudflare D1 berjaya disegerakkan.', 'success')}
        praJkpakCount={praJkpakCount}
        onOpenPbacModal={() => setShowPbacModal(true)}
        onOpenLogin={() => requireLogin()}
        onOpenUserProfile={() => {
          if (!currentUser) {
            requireLogin();
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
          tahunSesi={settings.sesiTahun}
          onSync={() => showToast('Pangkalan data Cloudflare D1 berjaya disegerakkan.', 'success')}
          onOpenClaimModal={() => {
            if (!currentUser) {
              showToast('Sila log masuk sebagai Pegawai Pemeriksa atau Penyelaras Aset.', 'info');
              requireLogin();
              return;
            }
            setShowClaimModal(true);
          }}
          onOpenAddSchedule={() => {
            if (!currentUser) {
              showToast('Sila log masuk sebagai Penyelaras Aset Jabatan atau Pentadbir Sistem.', 'info');
              requireLogin();
              return;
            }
            setEditingSchedule(null);
            setShowScheduleModal(true);
          }}
          onOpenLogin={() => requireLogin()}
          onOpenUserProfile={() => {
            if (!currentUser) {
              requireLogin();
            } else {
              setShowUserProfileModal(true);
            }
          }}
        />

        {/* Main Content Area: pb-24 on mobile so it clears the bottom menu cleanly, maximized desktop width */}
        <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 pb-24 lg:pb-10 no-print space-y-6">
          {isLoadingData && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-800">
              Memuatkan data terkini daripada Cloudflare D1…
            </div>
          )}
          {activeTab === 'home' && (
            <HomeSection
              schedules={schedules}
              onOpenEjas={() => setActiveTab('ejas')}
              onOpenPraJkpak={() => setActiveTab('praJkpak')}
              onOpenClaim={() => {
                if (!currentUser) {
                  showToast('Sila log masuk sebagai Pegawai Pemeriksa atau Penyelaras Aset.', 'info');
                  requireLogin();
                  return;
                }
                setShowClaimModal(true);
              }}
              onOpenPekeliling={() => setActiveTab('pekeliling')}
              tahunSesi={settings.sesiTahun}
            />
          )}

          {activeTab === 'ejas' && (
            <EjasSection
              schedules={schedules}
              currentUser={currentUser}
              onOpenAddSchedule={() => {
                if (!currentUser) {
                  showToast('Sila log masuk sebagai Penyelaras Aset Jabatan atau Pentadbir Sistem.', 'info');
                  requireLogin();
                  return;
                }
                setEditingSchedule(null);
                setShowScheduleModal(true);
              }}
              onOpenEditSchedule={(schedule) => {
                if (!currentUser) {
                  showToast('Sila log masuk terlebih dahulu untuk mengemaskini jadual.', 'info');
                  requireLogin();
                  return;
                }
                setEditingSchedule(schedule);
                setShowScheduleModal(true);
              }}
              onDeleteSchedule={handleDeleteSchedule}
              onOpenClaimModal={() => {
                if (!currentUser) {
                  showToast('Sila log masuk sebagai Pegawai Pemeriksa atau Penyelaras Aset.', 'info');
                  requireLogin();
                  return;
                }
                setShowClaimModal(true);
              }}
              onOpenKewpa11Modal={(schedule) => {
                if (!currentUser) {
                  showToast('Sila log masuk sebagai Pegawai Pemeriksa untuk mengisikan perakuan KEW.PA-11.', 'info');
                  requireLogin();
                  return;
                }
                setActiveKewpaSchedule(schedule);
                setShowKewpaModal(true);
              }}
              onOpenCrossModal={() => setShowCrossModal(true)}
              onOpenPbacModal={() => setShowPbacModal(true)}
              onExportCSV={handleExportSchedulesCSV}
              onPrintKewpa10={handlePrintKewpa10}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'lokasi' && (
            <DirektoriLokasiSection
              locations={locations}
              currentUser={currentUser}
              myAssignments={myAssignments}
              onAddLocation={handleAddLocation}
              onUpdateLocation={handleUpdateLocation}
              onDeleteLocation={handleDeleteLocation}
              onNavigateToSchedule={(jadualId) => {
                setActiveTab('ejas');
              }}
              onOpenKewpa7Modal={() => setShowKewpa7Modal(true)}
              onShowToast={showToast}
              initialDeptFilter={locationDeptFilter}
            />
          )}

          {activeTab === 'jabatan' && (
            <DirektoriJabatanSection
              departments={departments}
              schedules={schedules}
              canManage={isSystemAdmin}
              onShowToast={showToast}
              onRefresh={reloadFromD1}
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
              canManage={isSystemAdmin}
              jabatanDiurus={jabatanDiurusPegawai}
              onCreateOfficer={async (input) => {
                const result = await dataApi.officers.createAccount(input);
                setUsers((prev) => [result.officer, ...prev]);
                showToast(
                  `Pegawai ${result.officer.name} didaftarkan. Nama pengguna: ${result.credentials.username}`,
                  'success'
                );
                return result;
              }}
              onResetCredentials={async (user) => {
                const credentials = await dataApi.officers.resetCredentials(user.id || user.email);
                showToast(`Kata laluan sementara baharu dijana untuk ${user.name}.`, 'success');
                return credentials;
              }}
              onSetPrimaryRole={async (user, roleId) => {
                const saved = await dataApi.officers.setPrimaryRole(user.id || user.email, roleId);
                setUsers((prev) =>
                  prev.map((item) =>
                    item.email === saved.email ? { ...item, ...saved, roles: item.roles } : item
                  )
                );
                showToast(`Jawatan utama ${saved.name} ditetapkan kepada ${saved.role}.`, 'success');
              }}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              departments={departments}
              locations={locations}
              onShowToast={showToast}
              onRolesChanged={() => {
                // Lantikan mengubah penjaga ruang (skop LOCATION) — segarkan lokasi + pegawai sekali.
                reloadFromD1().catch(() => undefined);
              }}
            />
          )}


          {activeTab === 'kitaran' && isSystemAdmin && (
            <KitaranSection
              officers={users}
              departments={departments}
              myAssignments={myAssignments}
              canManage={isSystemAdmin}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'kitaran' && !isSystemAdmin && (
            <div className="bg-white rounded-2xl border border-rose-200 shadow-2xs p-8 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Akses Ditolak</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Menu <strong>Kitaran Pemeriksaan</strong> hanya boleh diakses oleh pegawai dengan lantikan{' '}
                <span className="font-mono">PENTADBIR_SISTEM</span>.
              </p>
              <button
                onClick={() => setActiveTab('home')}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
              >
                Kembali ke Utama
              </button>
            </div>
          )}

          {activeTab === 'audit' && isSystemAdmin && <AuditLogSection logs={auditLogs} />}

          {activeTab === 'audit' && !isSystemAdmin && (
            <div className="bg-white rounded-2xl border border-rose-200 shadow-2xs p-8 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Akses Ditolak</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Menu <strong>Jejak Audit PBAC</strong> hanya boleh diakses oleh pegawai dengan lantikan{' '}
                <span className="font-mono">PENTADBIR_SISTEM</span>.
              </p>
              <button
                onClick={() => setActiveTab('home')}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
              >
                Kembali ke Utama
              </button>
            </div>
          )}

          {activeTab === 'tetapan' && isSystemAdmin && (
            <TetapanSection
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onReloadData={handleReloadFromD1}
              onExportFullBackupJSON={handleExportFullBackupJSON}
              onImportBackupJSON={handleImportBackupJSON}
              currentUser={currentUser}
              myAssignments={myAssignments}
            />
          )}

          {activeTab === 'tetapan' && !isSystemAdmin && (
            <div className="bg-white rounded-2xl border border-rose-200 shadow-2xs p-8 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Akses Ditolak</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Menu <strong>Tetapan Sistem</strong> hanya boleh diakses oleh pegawai dengan lantikan{' '}
                <span className="font-mono">PENTADBIR_SISTEM</span>. Hubungi Pentadbir Sistem untuk
                sebarang perubahan konfigurasi.
              </p>
              <button
                onClick={() => setActiveTab('home')}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
              >
                Kembali ke Utama
              </button>
            </div>
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
              <span
                className="font-mono text-[11px] text-slate-400 border border-slate-200 rounded-full px-2 py-0.5"
                title={`Dibina pada ${__BUILD_TIME__}`}
              >
                {__APP_VERSION__}
              </span>
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
        isAdmin={isSystemAdmin}
        onSync={() => showToast('Pangkalan data Cloudflare D1 berjaya disegerakkan.', 'success')}
        praJkpakCount={praJkpakCount}
        onOpenClaimModal={() => {
          if (!currentUser) {
            showToast('Sila log masuk sebagai Pegawai Pemeriksa atau Penyelaras Aset.', 'info');
            requireLogin();
            return;
          }
          setShowClaimModal(true);
        }}
        onOpenPbacModal={() => setShowPbacModal(true)}
        onOpenLogin={() => requireLogin()}
        onOpenUserProfile={() => {
          if (!currentUser) {
            requireLogin();
          } else {
            setShowUserProfileModal(true);
          }
        }}
      />

      {/* Modals */}

      {mustChangePassword && currentUser && (
        <ForcePasswordModal
          user={currentUser}
          onDone={() => {
            setMustChangePassword(false);
            handleAuthSuccess({
              token: '',
              expiresAt: '',
              user: currentUser,
              mustChangePassword: false,
            });
          }}
          onLogout={handleLogout}
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
          schedules={schedules}
          defaultDept={currentUser?.dept || 'JTMK'}
          tahunSesi={settings.sesiTahun}
          canChooseDept={isSystemAdmin}
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
          appointment={appointment}
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
          readOnly={!canEditKewpa11(activeKewpaSchedule)}
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
      {printPreview && (
        <PrintPreviewModal
          title={
            printPreview === 'kewpa10'
              ? 'Pratonton KEW.PA-10 — Jadual Pemeriksaan Aset Alih Tahunan'
              : 'Pratonton Kertas Pembentangan Pra-JKPAK'
          }
          subtitle="Semak dokumen, kemudian tekan Cetak."
          onClose={() => setPrintPreview(null)}
        >
          <PrintArea mode={printPreview} schedules={schedules} tahun={settings.sesiTahun} />
        </PrintPreviewModal>
      )}

    </div>
  );
}
