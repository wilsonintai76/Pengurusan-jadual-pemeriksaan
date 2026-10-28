'use client';

import React, { useState } from 'react';
import { Lock, ShieldCheck, UserCheck, AlertCircle, Sparkles, X, ShieldAlert, KeyRound } from 'lucide-react';
import { UserSession } from '@/lib/types';
import { CROSS_PAIRS } from '@/lib/initialData';

interface AuthModalProps {
  onSuccess: (user: UserSession) => void;
  onClose?: () => void;
}

export default function AuthModal({ onSuccess, onClose }: AuthModalProps) {
  const [email, setEmail] = useState('mohd.fadzli@poliku.edu.my');
  const [name, setName] = useState('Ts. Mohd Fadzli (DH44)');
  const [dept, setDept] = useState('JTMK');
  const [role, setRole] = useState('Ketua Jabatan');
  const [errorMsg, setErrorMsg] = useState('');

  const quickDemoAccounts = [
    { 
      title: 'Ketua Jabatan', 
      email: 'kj.jtmk@poliku.edu.my', 
      name: 'Dr. Haji Ramli Bin Hashim (DH52)', 
      dept: 'JTMK', 
      role: 'Ketua Jabatan',
      badge: 'KJ'
    },
    { 
      title: 'Ketua Program', 
      email: 'kp.dsk@poliku.edu.my', 
      name: 'Pn. Mastura Binti Ahmad (DH48)', 
      dept: 'JTMK', 
      role: 'Ketua Program',
      badge: 'KP'
    },
    { 
      title: 'Penolong Pegawai Aset', 
      email: 'ppa.jtmk@poliku.edu.my', 
      name: 'Pn. Siti Rohana Binti Mohd (DH41)', 
      dept: 'JTMK', 
      role: 'Penolong Pegawai Aset Jabatan/Unit',
      badge: 'PPA'
    },
    { 
      title: 'Penyelia Lokasi', 
      email: 'penyelia.makmal1@poliku.edu.my', 
      name: 'En. Zulhilmi Bin Ariffin (JA29)', 
      dept: 'JTMK', 
      role: 'Penyelia Lokasi',
      badge: 'Penyelia Ruang'
    },
    { 
      title: 'Pentadbir Sistem', 
      email: 'admin.aset@poliku.edu.my', 
      name: 'En. Wan Ismail Bin Wan Ali (N32)', 
      dept: 'PENTADBIRAN', 
      role: 'Pentadbir Sistem',
      badge: 'Super Admin'
    },
    { 
      title: 'Pegawai Pemeriksa', 
      email: 'rosnah@poliku.edu.my', 
      name: 'Pn. Rosnah Binti Kassim (DH44)', 
      dept: 'JTMK', 
      role: 'Pegawai Pemeriksa',
      badge: 'Pemeriksa AM 2.4'
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.endsWith('@poliku.edu.my') && !cleanEmail.endsWith('.gov.my')) {
      setErrorMsg('Akses ditolak: Sila gunakan emel rasmi @poliku.edu.my atau domain kerajaan .gov.my');
      return;
    }

    if (!name.trim()) {
      setErrorMsg('Sila masukkan nama penuh dan gred pegawai.');
      return;
    }

    setErrorMsg('');
    const session: UserSession = {
      email: cleanEmail,
      name: name.trim(),
      dept,
      role,
      grade: name.includes('(') ? name.split('(')[1]?.replace(')', '') : 'DH41',
    };

    onSuccess(session);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header Strip */}
        <div className="bg-slate-900 p-6 text-white text-center border-b border-slate-800 relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Tutup & Semak Portal"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <KeyRound className="w-6 h-6 text-amber-400" />
          </div>

          <h3 className="text-base sm:text-lg font-extrabold tracking-tight">
            Log Masuk Pegawai POLIKU
          </h3>

          <p className="text-xs text-slate-300 mt-0.5">
            Penyelaras Aset Jabatan &bull; Pentadbir Sistem &bull; Pemeriksa
          </p>

          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Pengesahan Emel @poliku.edu.my</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
          
          {/* Quick Demo Fill Buttons */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/90 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-mono">
              Pilih Peranan Log Masuk Pantas:
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {quickDemoAccounts.map((acc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setName(acc.name);
                    setDept(acc.dept);
                    setRole(acc.role);
                    setErrorMsg('');
                  }}
                  className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-medium text-slate-800 text-left transition flex flex-col justify-between"
                >
                  <span className="font-bold text-slate-900 block truncate">{acc.title}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{acc.badge}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Emel Rasmi Pegawai <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama.pegawai@poliku.edu.my"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            />
            {errorMsg && (
              <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Nama Penuh & Gred <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth: Ts. Mohd Fadzli (DH44)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Jabatan / Unit Pemilik <span className="text-rose-500">*</span>
            </label>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              {Object.keys(CROSS_PAIRS).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Peranan Pengunaan <span className="text-rose-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white font-medium"
            >
              <option value="Ketua Jabatan">Ketua Jabatan (KJ)</option>
              <option value="Ketua Program">Ketua Program (KP)</option>
              <option value="Penolong Pegawai Aset Jabatan/Unit">Penolong Pegawai Aset Jabatan/Unit (PPA)</option>
              <option value="Penyelia Lokasi">Penyelia Lokasi (Pegawai Penjaga Ruang)</option>
              <option value="Pentadbir Sistem">Pentadbir Sistem (Super Admin / Pegawai Aset)</option>
              <option value="Pegawai Pemeriksa">Pegawai Pemeriksa (1PP AM 2.4)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition flex items-center justify-center gap-2 shadow-xs"
          >
            <UserCheck className="w-4 h-4 text-amber-400" />
            <span>Sahkan & Masuk Sesi</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition"
            >
              Teruskan sebagai Pelawat (Semak Portal)
            </button>
          )}
        </form>

      </div>
    </div>
  );
}
