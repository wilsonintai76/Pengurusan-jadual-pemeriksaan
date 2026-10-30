import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Crosshair,
  Eye,
  EyeOff,
  FileSearch,
  FileSignature,
  Info,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  ScanLine,
  ShieldCheck,
  UserCheck,
  UserRound,
} from 'lucide-react';
import type {
  DepartmentInfo,
  InspectionSchedule,
  LocationInfo,
  SystemSettings,
  UserSession,
} from '@/lib/types';
import { AuthApiError, MIN_PASSWORD_LENGTH, login, type AuthSession } from '@/lib/authClient';

interface LandingPageProps {
  officers: UserSession[];
  departments: DepartmentInfo[];
  locations: LocationInfo[];
  schedules: InspectionSchedule[];
  settings: SystemSettings;
  isLoadingData?: boolean;
  onLogin: (session: AuthSession) => void;
  onGuest: () => void;
}

const COMPLIANCE_POINTS = [
  'Jadual pemeriksaan mengikut jabatan & lokasi',
  'Dokumen KEW.PA-7 dan KEW.PA-11 berpusat',
  'Pematuhan pemeriksaan silang PBAC',
  'Jejak audit bagi setiap keputusan akses',
];

const FEATURES = [
  {
    icon: CalendarCheck,
    title: 'Jadual Pemeriksaan 1PP AM 2.4',
    text: 'Rancang pemeriksaan fizikal mengikut jabatan, lokasi dan kategori aset dalam satu papan pemuka.',
  },
  {
    icon: FileSignature,
    title: 'Pengesahan KEW.PA-11',
    text: 'Sahkan laporan pemeriksaan dan simpan dokumen sokongan terus pada rekod jadual berkaitan.',
  },
  {
    icon: ScanLine,
    title: 'Ekstrak KEW.PA-7 (OCR)',
    text: 'Muat naik senarai aset KEW.PA-7 dan biarkan enjin AI mengekstrak butiran aset secara automatik.',
  },
  {
    icon: Crosshair,
    title: 'Pemeriksaan Silang PBAC',
    text: 'Kuatkuasa pemisahan tugas melalui pasangan pemeriksa silang antara jabatan pemilik aset.',
  },
  {
    icon: MapPin,
    title: 'Direktori Ruang & Peta',
    text: 'Kod ruang, pegawai penjaga dan kedudukan lokasi aset dipetakan untuk pemantauan liputan.',
  },
  {
    icon: ShieldCheck,
    title: 'Jejak Audit & Jejaring',
    text: 'Setiap keputusan akses direkodkan dalam log audit PBAC yang boleh disemak oleh pentadbir.',
  },
];

const WORKFLOW = [
  {
    title: 'Perancangan',
    text: 'Daftar jadual pemeriksaan mengikut jabatan, lokasi dan kategori aset untuk sesi semasa.',
  },
  {
    title: 'Pelaksanaan',
    text: 'Pegawai pemeriksa menjalankan pemeriksaan fizikal dan merekod status sebenar aset.',
  },
  {
    title: 'Pengesahan',
    text: 'Muat naik KEW.PA-7 / KEW.PA-11 dan lengkapkan laporan Pra-JKPAK bagi setiap lokasi.',
  },
  {
    title: 'Pelaporan & Audit',
    text: 'Pantau liputan pemeriksaan dan semak jejak audit keputusan akses PBAC.',
  },
];

const REFERENCES = [
  {
    code: '1PP AM 2.4',
    title: 'Tatacara Pengurusan Aset Alih Kerajaan',
    text: 'Rujukan utama perancangan dan pelaksanaan pemeriksaan fizikal aset alih kerajaan.',
  },
  {
    code: 'KEW.PA-7',
    title: 'Senarai Aset Alih',
    text: 'Daftar aset bagi setiap ruang yang menjadi asas semakan fizikal pemeriksa.',
  },
  {
    code: 'KEW.PA-11',
    title: 'Laporan Pemeriksaan Aset Alih',
    text: 'Laporan rasmi keputusan pemeriksaan yang disahkan oleh pegawai pemeriksa.',
  },
  {
    code: 'Pra-JKPAK',
    title: 'Kompilasi Laporan Pra-JKPAK',
    text: 'Ringkasan status aset (baik, rosak, usang, hilang) sebelum pembentangan JKPAK.',
  },
];

export default function LandingPage({
  officers,
  departments,
  locations,
  schedules,
  settings,
  isLoadingData,
  onLogin,
  onGuest,
}: LandingPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usernameRef = useRef<HTMLInputElement>(null);

  const institution = settings.namaInstitusi?.trim() || 'Politeknik Kuching Sarawak';
  const assetUnitName = settings.namaUnitAset?.trim() || 'Unit Pengurusan Aset';
  const helpEmail = settings.emelUnitAset?.trim();
  const helpPhone = settings.telefonUnitAset?.trim();

  const stats = useMemo(
    () => [
      { label: 'Jabatan / Unit', value: departments.length },
      { label: 'Lokasi Aset', value: locations.length },
      { label: 'Jadual Pemeriksaan', value: schedules.length },
      { label: 'Pegawai Berdaftar', value: officers.length },
    ],
    [departments.length, locations.length, schedules.length, officers.length]
  );
  const hasDirectoryData = stats.some((stat) => stat.value > 0);

  const focusLogin = () => {
    document.getElementById('log-masuk')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => usernameRef.current?.focus(), 320);
  };

  const handleForgotPassword = () => {
    const contacts = [helpEmail, helpPhone].filter(Boolean).join(' / ');
    setError('');
    setNotice(
      `Untuk set semula kata laluan, sila hubungi ${assetUnitName}${contacts ? ` (${contacts})` : ''}.`
    );
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError('');
    setNotice('');

    if (!username.trim() || !password) {
      setError('Sila masukkan nama pengguna dan kata laluan.');
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await login(username.trim(), password);
      onLogin(session);
    } catch (authError) {
      if (authError instanceof AuthApiError && authError.code === 'ACTIVATION_REQUIRED') {
        setNotice(
          'Akaun ini belum mempunyai kata laluan. Sila hubungi Pentadbir Sistem untuk penjanaan kata laluan sementara.'
        );
        return;
      }
      setError((authError as Error).message || 'Pengesahan gagal. Sila cuba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 text-amber-400 shadow-inner">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="whitespace-nowrap text-base font-bold tracking-tight text-white">
                  Portal Pemeriksaan Aset
                </span>
                <span className="rounded bg-amber-400 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-950">
                  Inspect-Able
                </span>
              </div>
              <p className="truncate text-[11px] text-slate-400">{institution}</p>
            </div>
          </div>

          <nav className="hidden items-center gap-7 text-xs font-semibold text-slate-300 lg:flex">
            <a href="#utama" className="transition hover:text-white">
              Utama
            </a>
            <a href="#ciri" className="transition hover:text-white">
              Ciri Utama
            </a>
            <a href="#aliran" className="transition hover:text-white">
              Aliran Kerja
            </a>
            <a href="#panduan" className="transition hover:text-white">
              Rujukan
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] text-slate-400 sm:inline">
              v{__APP_VERSION__}
            </span>
            <button
              type="button"
              onClick={focusLogin}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-3.5 py-2 text-xs font-bold text-white ring-1 ring-inset ring-white/15 transition hover:bg-white/10"
            >
              <KeyRound className="h-3.5 w-3.5 text-amber-400" />
              <span>Log Masuk</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="utama" className="relative overflow-hidden border-b border-white/5">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-amber-400/10 blur-3xl" />
          <div className="absolute -right-32 top-0 h-[30rem] w-[30rem] rounded-full bg-sky-400/10 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.07)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        </div>

        <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:items-start lg:gap-10 lg:px-8 lg:py-20">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold text-amber-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>1PP AM 2.4 &bull; Pekeliling Perbendaharaan Malaysia</span>
            </div>

            <h1 className="mt-5 text-3xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-5xl">
              Pengurusan &amp; Pemeriksaan{' '}
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                Aset Alih
              </span>{' '}
              POLIKU
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Platform bersepadu perancangan pemeriksaan aset alih kerajaan: jadual pemeriksaan fizikal,
              pengesahan KEW.PA-7 dan KEW.PA-11, laporan Pra-JKPAK, serta jejak audit PBAC dalam satu
              direktori berpusat.
            </p>

            <ul className="mt-6 grid gap-2.5 text-xs text-slate-300 sm:grid-cols-2">
              {COMPLIANCE_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={focusLogin}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-400/20 transition hover:bg-amber-300"
              >
                <span>Log Masuk Portal</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onGuest}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10"
              >
                <span>Teruskan sebagai pelawat</span>
              </button>
            </div>

            {hasDirectoryData && (
              <dl className="mt-10 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <dd className="font-mono text-xl font-bold tracking-tight text-white">
                      {stat.value.toLocaleString('ms-MY')}
                    </dd>
                    <dt className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {stat.label}
                    </dt>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* Sign-in card */}
          <div id="log-masuk" className="lg:col-span-5">
            <div className="rounded-3xl border border-white/15 bg-white p-6 text-slate-900 shadow-2xl shadow-slate-950/60 sm:p-7">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-amber-400">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                    Log Masuk Pegawai
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Masukkan nama pengguna dan kata laluan yang diberikan oleh Pentadbir Sistem.
                  </p>
                </div>
              </div>

                <form onSubmit={handleSignIn} className="mt-6 space-y-4" noValidate>
                  <div>
                    <label
                      htmlFor="username"
                      className="mb-1.5 block text-xs font-semibold text-slate-700"
                    >
                      Nama Pengguna <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={usernameRef}
                        id="username"
                        name="username"
                        type="text"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                        value={username}
                        onChange={(event) => {
                          setUsername(event.target.value);
                          setError('');
                        }}
                        placeholder="nama.pegawai@poliku.edu.my"
                        aria-invalid={Boolean(error)}
                        aria-describedby="username-hint"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      />
                    </div>
                    <p id="username-hint" className="mt-1 text-[11px] text-slate-500">
                      E-mel rasmi penuh atau bahagian sebelum <span className="font-mono">@</span>.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-1.5 block text-xs font-semibold text-slate-700"
                    >
                      Kata Laluan <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setError('');
                        }}
                        placeholder="Masukkan kata laluan anda"
                        aria-invalid={Boolean(error)}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? 'Sembunyikan kata laluan' : 'Tunjukkan kata laluan'}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Minimum {MIN_PASSWORD_LENGTH} aksara
                    </span>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[11px] font-semibold text-slate-600 underline-offset-2 transition hover:text-slate-900 hover:underline"
                    >
                      Lupa kata laluan?
                    </button>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {notice && (
                    <div
                      role="status"
                      className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800"
                    >
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{notice}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Mengesahkan…</span>
                      </>
                    ) : (
                      <>
                        <span>Log Masuk</span>
                        <ArrowRight className="h-4 w-4 text-amber-400" />
                      </>
                    )}
                  </button>
                </form>

              <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left text-[11px] font-medium leading-relaxed text-slate-600">
                  <UserCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                  <span>
                    Akaun pegawai didaftarkan oleh <strong>Pentadbir Sistem</strong>. Nama pengguna
                    dan kata laluan sementara dijana automatik semasa pendaftaran.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onGuest}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-slate-500 transition hover:text-slate-900"
                >
                  <span>Teruskan sebagai pelawat</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-4 flex items-start gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-[10px] leading-relaxed font-medium text-slate-500">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>
                          Kata laluan disahkan pada pelayan Worker (PBKDF2-SHA256) dan sesi menggunakan token
                          bertandatangan yang tamat selepas 8 jam.
                        </span>
                      </div>

              {isLoadingData && (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Menyegerakkan direktori pegawai D1…</span>
                </p>
              )}

              {!isLoadingData && officers.length === 0 && !error && (
                <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
                  Direktori pegawai belum dimuatkan. Akaun pegawai didaftarkan oleh Pentadbir Sistem
                  melalui menu Direktori Pegawai.
                </p>
              )}
            </div>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Akses terhad kepada pegawai {institution}.</span>
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="ciri" className="border-b border-white/5 py-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400">Ciri Utama</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Satu portal untuk seluruh kitaran pemeriksaan aset
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Daripada perancangan jadual sehingga pengesahan laporan dan jejak audit, setiap langkah
              pemeriksaan aset alih direkodkan dalam pangkalan data berpusat.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-amber-400/40 hover:bg-white/[0.06]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-900 text-amber-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-white">{title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="aliran" className="border-b border-white/5 bg-slate-900/40 py-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400">Aliran Kerja</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Empat langkah pemeriksaan yang teratur
            </h2>
          </div>

          <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW.map((step, index) => (
              <li
                key={step.title}
                className="relative rounded-2xl border border-white/10 bg-slate-950/60 p-5"
              >
                <span className="font-mono text-xs font-bold text-amber-400">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-2 text-sm font-bold text-white">{step.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* References */}
      <section id="panduan" className="border-b border-white/5 py-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400">Rujukan</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Berpandukan tatacara pengurusan aset
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Setiap borang dan laporan dalam portal ini merujuk dokumen rasmi pengurusan aset alih
                kerajaan yang sedang berkuat kuasa.
              </p>
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-medium text-slate-400">
                <FileSearch className="h-3.5 w-3.5 text-amber-400" />
                <span>Kandungan pekeliling penuh tersedia dalam portal.</span>
              </div>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
              {REFERENCES.map((reference) => (
                <div
                  key={reference.code}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <dt className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-amber-400" />
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      {reference.code}
                    </span>
                  </dt>
                  <dd className="mt-2">
                    <p className="text-sm font-bold text-white">{reference.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">{reference.text}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-14">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-amber-400/25 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 px-6 py-10 sm:px-10">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl"
            />
            <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                  Sedia untuk memulakan pemeriksaan aset?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Log masuk menggunakan akaun pegawai rasmi untuk mengurus jadual pemeriksaan, dokumen
                  KEW.PA dan laporan Pra-JKPAK jabatan anda.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={focusLogin}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
                >
                  <span>Log Masuk</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={focusLogin}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <span>Log Masuk Pegawai</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-slate-900 text-amber-400">
                  <Boxes className="h-4 w-4" />
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-bold text-white">Portal Pemeriksaan Aset Inspect-Able</p>
                  <p className="text-[11px] text-slate-400">{institution}</p>
                </div>
              </div>
              <p className="mt-4 max-w-xs text-[11px] leading-relaxed text-slate-400">
                Portal pengurusan dan perancangan pemeriksaan aset alih kerajaan berpandukan 1PP AM 2.4.
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Pautan</p>
              <ul className="mt-3 space-y-2 text-[11px] text-slate-400">
                <li>
                  <a href="#ciri" className="transition hover:text-white">
                    Ciri Utama
                  </a>
                </li>
                <li>
                  <a href="#aliran" className="transition hover:text-white">
                    Aliran Kerja
                  </a>
                </li>
                <li>
                  <a href="#panduan" className="transition hover:text-white">
                    Rujukan Pekeliling
                  </a>
                </li>
                <li>
                  <a href="#log-masuk" className="transition hover:text-white">
                    Log Masuk Pegawai
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Hubungi</p>
              <ul className="mt-3 space-y-2 text-[11px] text-slate-400">
                <li className="flex items-center gap-2">
                  <Boxes className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  <span>{assetUnitName}</span>
                </li>
                {helpEmail && (
                  <li className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <a href={`mailto:${helpEmail}`} className="transition hover:text-white">
                      {helpEmail}
                    </a>
                  </li>
                )}
                {helpPhone && (
                  <li className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <span>{helpPhone}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-white/10 pt-5 text-[10px] text-slate-500 sm:flex-row sm:items-center">
            <p>
              &copy; {new Date().getFullYear()} {institution}. Hak cipta terpelihara.
            </p>
            <p className="font-mono">versi {__APP_VERSION__}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
