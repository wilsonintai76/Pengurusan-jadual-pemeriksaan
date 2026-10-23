'use client';

import React, { useState, useEffect } from 'react';
import SidebarNav from '@/components/SidebarNav';
import MobileBottomNav from '@/components/MobileBottomNav';
import TopHeader from '@/components/TopHeader';
import HomeSection from '@/components/HomeSection';
import EjasSection from '@/components/EjasSection';
import PraJkpakSection from '@/components/PraJkpakSection';
import PekelilingSection from '@/components/PekelilingSection';
import BorangSection from '@/components/BorangSection';
import DirektoriSection from '@/components/DirektoriSection';
import AuditLogSection from '@/components/AuditLogSection';
import PrintArea from '@/components/PrintArea';

import AuthModal from '@/components/modals/AuthModal';
import ScheduleModal from '@/components/modals/ScheduleModal';
import ClaimLocationModal from '@/components/modals/ClaimLocationModal';
import Kewpa11Modal from '@/components/modals/Kewpa11Modal';
import CrossInspectionModal from '@/components/modals/CrossInspectionModal';
import PbacMatrixModal from '@/components/modals/PbacMatrixModal';
import UserProfileModal from '@/components/modals/UserProfileModal';

import { 
  InspectionSchedule, 
  UserSession, 
  PbacAuditLog, 
  LaporanPraJkpak 
} from '@/lib/types';
import { 
  INITIAL_SCHEDULES, 
  INITIAL_AUDIT_LOGS, 
  CROSS_PAIRS 
} from '@/lib/initialData';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const DEFAULT_USER: UserSession = {
  email: 'mohd.fadzli@poliku.edu.my',
  name: 'Ts. Mohd Fadzli (DH44)',
  dept: 'JTMK',
  role: 'Penyelaras Aset & Pegawai Pemeriksa',
  grade: 'DH44',
};

export default function Page() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(DEFAULT_USER);
  const [schedules, setSchedules] = useState<InspectionSchedule[]>(INITIAL_SCHEDULES);
  const [auditLogs, setAuditLogs] = useState<PbacAuditLog[]>(INITIAL_AUDIT_LOGS);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

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
      } catch (e) {
        console.error('Error reading localStorage', e);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const [activeTab, setActiveTab] = useState<
    'home' | 'ejas' | 'praJkpak' | 'pekeliling' | 'borang' | 'direktori' | 'audit'
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

        {/* Main Content Area: pb-24 on mobile so it clears the bottom menu cleanly, pb-10 on desktop */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-10 no-print space-y-6">
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

          {activeTab === 'praJkpak' && (
            <PraJkpakSection
              schedules={schedules}
              onExportCSV={handleExportPraJkpakCSV}
              onPrintWorkingPaper={handlePrintWorkingPaper}
            />
          )}

          {activeTab === 'pekeliling' && <PekelilingSection />}

          {activeTab === 'borang' && (
            <BorangSection onPrintKewpa10={handlePrintKewpa10} />
          )}

          {activeTab === 'direktori' && <DirektoriSection />}

          {activeTab === 'audit' && <AuditLogSection logs={auditLogs} />}
        </main>

        {/* Official Government Footer */}
        <footer className="bg-white border-t border-slate-200 py-5 mt-auto no-print">
          <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-left">
              <strong className="text-slate-800">Portal Pengurusan Aset Alih & e-JAS</strong> &bull; Politeknik Kuching Sarawak
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

      {showCrossModal && <CrossInspectionModal onClose={() => setShowCrossModal(false)} />}

      {showPbacModal && <PbacMatrixModal onClose={() => setShowPbacModal(false)} />}

      {/* Print View Container */}
      <PrintArea mode={printMode} schedules={schedules} />

    </div>
  );
}
