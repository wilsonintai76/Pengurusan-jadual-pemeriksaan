import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarPlus,
  CheckCircle2,
  Loader2,
  Lock,
  PlayCircle,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import CrossPairMatrix from '@/components/CrossPairMatrix';
import type {
  CycleAssignment,
  CycleDetail,
  CycleFlag,
  CycleMode,
  CyclePlan,
  DepartmentInfo,
  EligibleInspector,
  InspectionCycle,
  OddUnitPolicy,
  RoleAssignment,
  UserSession,
} from '@/lib/types';
import { dataApi } from '@/lib/dataApi';

interface KitaranSectionProps {
  officers: UserSession[];
  departments: DepartmentInfo[];
  myAssignments: RoleAssignment[];
  canManage: boolean;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const statusStyles: Record<string, string> = {
  DRAF: 'bg-slate-100 text-slate-700 border-slate-200',
  AKTIF: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SELESAI: 'bg-rose-50 text-rose-700 border-rose-200',
};

const severityStyles: Record<CycleFlag['severity'], string> = {
  info: 'bg-slate-50 text-slate-700 border-slate-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  critical: 'bg-rose-50 text-rose-800 border-rose-200',
};

export default function KitaranSection({
  officers,
  departments,
  myAssignments,
  canManage,
  onShowToast,
}: KitaranSectionProps) {
  const [cycles, setCycles] = useState<InspectionCycle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CycleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<'kitaran' | 'mod'>('kitaran');
  const [form, setForm] = useState({
    kod: '',
    mode: 'TIMBAL_BALIK' as CycleMode,
    tarikhMula: todayIso(),
    tarikhTamat: `${new Date().getFullYear()}-12-31`,
    departmentId: '',
  });

  const [reassign, setReassign] = useState<{ assignment: CycleAssignment; candidates: EligibleInspector[] } | null>(null);
  const [reassignOfficer, setReassignOfficer] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  const isInspector = useMemo(() => {
    const today = todayIso();
    return myAssignments.some(
      (assignment) =>
        assignment.roleId === 'PEMERIKSA' &&
        assignment.status === 'AKTIF' &&
        assignment.validFrom <= today &&
        (!assignment.validTo || assignment.validTo >= today)
    );
  }, [myAssignments]);

  const loadCycles = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await dataApi.cycles.list();
      setCycles(list);
      if (!selectedId && list.length > 0) setSelectedId(list[0].id);
    } catch (error) {
      onShowToast(`Gagal memuatkan kitaran: ${(error as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast, selectedId]);

  const loadDetail = useCallback(
    async (id: string) => {
      try {
        setDetail(await dataApi.cycles.get(id));
      } catch (error) {
        onShowToast(`Gagal memuatkan butiran kitaran: ${(error as Error).message}`, 'error');
      }
    },
    [onShowToast]
  );

  useEffect(() => {
    loadCycles();
    // Penyenaraian dijalankan sekali sahaja pada pemasangan komponen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const runAction = async (action: () => Promise<string>) => {
    if (isWorking) return;
    setIsWorking(true);
    try {
      const message = await action();
      onShowToast(message, 'success');
      await loadCycles();
      if (selectedId) await loadDetail(selectedId);
    } catch (error) {
      onShowToast((error as Error).message, 'error');
    } finally {
      setIsWorking(false);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    await runAction(async () => {
      const created = await dataApi.cycles.create({
        kod: form.kod.trim() || undefined,
        mode: form.mode,
        tarikhMula: form.tarikhMula,
        tarikhTamat: form.tarikhTamat,
      });
      setSelectedId(created.id);
      setShowCreate(false);
      return 'Kitaran dicipta sebagai DRAF. Jana penugasan untuk mengisi kolam.';
    });
  };

  const handleGenerate = () =>
    runAction(async () => {
      if (!selectedId) throw new Error('Pilih kitaran terlebih dahulu.');
      const result = await dataApi.cycles.generate(selectedId, form.departmentId || null);
      return `${result.created} penugasan dijana daripada ${result.schedules} jadual (${result.skipped} dilangkau).`;
    });

  const handleStart = () =>
    runAction(async () => {
      if (!selectedId) throw new Error('Pilih kitaran terlebih dahulu.');
      const result = await dataApi.cycles.start(selectedId);
      return `Kitaran dimulakan — ${result.pairs} pasangan timbal balik dikunci.`;
    });

  const handleClose = () =>
    runAction(async () => {
      if (!selectedId) throw new Error('Pilih kitaran terlebih dahulu.');
      if (!window.confirm('Tutup kitaran ini? Penjanaan dan penugasan semula akan disekat.')) {
        throw new Error('Ditutup oleh pengguna.');
      }
      await dataApi.cycles.close(selectedId);
      return 'Kitaran ditutup.';
    });

  const openReassign = async (assignment: CycleAssignment) => {
    if (!selectedId) return;
    if (!assignment.scheduleId) {
      onShowToast('Penugasan ini tiada jadual berkaitan; gunakan tuntutan slot biasa.', 'info');
      return;
    }
    try {
      const candidates = await dataApi.cycles.eligible(selectedId, assignment.scheduleId);
      setReassign({ assignment, candidates });
      setReassignOfficer('');
      setReassignReason('');
    } catch (error) {
      onShowToast((error as Error).message, 'error');
    }
  };

  const handleReassign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId || !reassign) return;
    if (!reassignOfficer || !reassignReason.trim()) {
      onShowToast('Pilih pegawai dan nyatakan sebab penugasan semula.', 'error');
      return;
    }

    await runAction(async () => {
      await dataApi.cycles.reassign(selectedId, {
        assignmentId: reassign.assignment.id,
        officerId: reassignOfficer,
        reason: reassignReason.trim(),
      });
      setReassign(null);
      return 'Penugasan semula direkod dalam jejak audit.';
    });
  };

  const [plan, setPlan] = useState<CyclePlan | null>(null);
  const [planParams, setPlanParams] = useState({
    quota: 120,
    tolerance: 0.2,
    overload: 1.25,
    split: 1.5,
    oddPolicy: 'SIMPANAN' as OddUnitPolicy,
  });
  const [isPlanning, setIsPlanning] = useState(false);
  const [savedPlanVersion, setSavedPlanVersion] = useState(0);

  const planUnits = useMemo(
    () => (plan ? plan.units.filter((unit) => unit.assetCount > 0 || unit.inspectorCount > 0) : []),
    [plan]
  );
  const planDecisions = useMemo(() => {
    if (!plan) return [];
    const active = new Set(planUnits.map((unit) => unit.unitId));
    return plan.decisions.filter(
      (decision) => active.has(decision.unitA) || (decision.unitB ? active.has(decision.unitB) : false)
    );
  }, [plan, planUnits]);

  const selected = cycles.find((cycle) => cycle.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) return;
    dataApi.cycles
      .getParams(selectedId)
      .then((params) => {
        setPlanParams({
          quota: params.quota,
          tolerance: params.tolerance,
          overload: params.overload,
          split: params.split,
          oddPolicy: params.oddPolicy,
        });
        setSavedPlanVersion(params.planVersion);
      })
      .catch(() => undefined);
    setPlan(null);
  }, [selectedId]);

  const handleSaveParams = () =>
    runAction(async () => {
      if (!selectedId) throw new Error('Pilih kitaran terlebih dahulu.');
      await dataApi.cycles.saveParams(selectedId, {
        quota: Number(planParams.quota),
        tolerance: Number(planParams.tolerance),
        overload: Number(planParams.overload),
        split: Number(planParams.split),
        oddPolicy: planParams.oddPolicy,
      });
      return 'Parameter pelan disimpan dan direkod dalam audit.';
    });

  const handlePreviewPlan = async () => {
    if (!selectedId || isPlanning) return;
    setIsPlanning(true);
    try {
      setPlan(await dataApi.cycles.plan(selectedId));
    } catch (error) {
      onShowToast((error as Error).message, 'error');
    } finally {
      setIsPlanning(false);
    }
  };

  const handleLockPlan = () =>
    runAction(async () => {
      if (!selectedId) throw new Error('Pilih kitaran terlebih dahulu.');
      const result = await dataApi.cycles.lock(selectedId);
      await handlePreviewPlan();
      return `Pelan v${result.planVersion} dikunci — ${result.groups} kumpulan, ${result.targets} sasaran, ${result.schedulesCreated} jadual baharu.`;
    });
  const flagsByAssignment = useMemo(() => {
    const map = new Map<string, CycleFlag[]>();
    detail?.flags.forEach((flag) => {
      map.set(flag.assignmentId, [...(map.get(flag.assignmentId) ?? []), flag]);
    });
    return map;
  }, [detail]);

  const criticalFlags = detail?.flags.filter((flag) => flag.severity === 'critical') ?? [];
  const unclaimed = detail?.assignments.filter((assignment) => !assignment.inspectorId) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-slate-800" />
            Kitaran Pemeriksaan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kolam lokasi layak per kitaran. Pegawai dilantik menuntut slot; pasangan timbal balik dikunci
            semasa kitaran dimulakan.
          </p>
        </div>

        {canManage && activeTab === 'kitaran' ? (
          <button
            type="button"
            onClick={() => setShowCreate((value) => !value)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            <CalendarPlus className="w-4 h-4 text-amber-400" />
            Kitaran Baharu
          </button>
        ) : !canManage ? (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
            <ShieldAlert className="w-3.5 h-3.5" />
            Pengurusan kitaran: Pentadbir Sistem
          </span>
        ) : null}
      </div>

      {/* Sub-tab: Kitaran beroperasi vs Mod Pemeriksaan (matriks gandingan) */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('kitaran')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition sm:text-sm ${
            activeTab === 'kitaran'
              ? 'border-slate-900 font-extrabold text-slate-950'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <CalendarPlus className="w-4 h-4" />
          <span>Kitaran &amp; Pelan</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mod')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition sm:text-sm ${
            activeTab === 'mod'
              ? 'border-slate-900 font-extrabold text-slate-950'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 text-teal-600" />
          <span>Mod Pemeriksaan (⇄)</span>
        </button>
      </div>

      {activeTab === 'mod' && <CrossPairMatrix departments={departments} officers={officers} />}

      {activeTab === 'kitaran' && (<>

      {activeTab === 'kitaran' && showCreate && canManage && (
        <form
          onSubmit={handleCreate}
          className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:grid-cols-2 lg:grid-cols-5"
        >
          <div className="lg:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold text-slate-700">Kod Kitaran</label>
            <input
              value={form.kod}
              onChange={(event) => setForm({ ...form, kod: event.target.value })}
              placeholder="cth. KIT/2026/01 (auto jika kosong)"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-700">Mod</label>
            <select
              value={form.mode}
              onChange={(event) => setForm({ ...form, mode: event.target.value as CycleMode })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="TIMBAL_BALIK">Timbal Balik</option>
              <option value="SEHALA">Sehala</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-700">Tarikh Mula</label>
            <input
              type="date"
              value={form.tarikhMula}
              onChange={(event) => setForm({ ...form, tarikhMula: event.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-700">Tarikh Tamat</label>
            <input
              type="date"
              value={form.tarikhTamat}
              onChange={(event) => setForm({ ...form, tarikhTamat: event.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="mb-1 block text-[11px] font-semibold text-slate-700">
              Tapisan Jabatan semasa jana (pilihan)
            </label>
            <select
              value={form.departmentId}
              onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">Semua jabatan</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.id} — {department.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isWorking}
              className="w-full rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
            >
              {isWorking ? 'Mencipta…' : 'Cipta Kitaran'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16 text-xs font-medium text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memuatkan kitaran…
        </div>
      ) : cycles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-amber-500" />
          <p className="mt-3 text-sm font-bold text-slate-800">Belum ada kitaran pemeriksaan</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
            Cipta kitaran, jana kolam lokasi layak daripada jadual pemeriksaan sedia ada, kemudian mulakan
            kitaran untuk mengunci pasangan timbal balik.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="space-y-2 lg:col-span-4">
            {cycles.map((cycle) => (
              <button
                key={cycle.id}
                type="button"
                onClick={() => setSelectedId(cycle.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selectedId === cycle.id
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold">{cycle.kod}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                      selectedId === cycle.id ? 'border-white/30 bg-white/10 text-white' : statusStyles[cycle.status]
                    }`}
                  >
                    {cycle.status}
                  </span>
                </div>
                <p className={`mt-1 text-[11px] ${selectedId === cycle.id ? 'text-slate-300' : 'text-slate-500'}`}>
                  {cycle.tarikhMula} → {cycle.tarikhTamat}
                </p>
                <div className={`mt-2 flex items-center gap-3 text-[10px] font-semibold ${
                  selectedId === cycle.id ? 'text-slate-300' : 'text-slate-500'
                }`}>
                  <span>{cycle.mode === 'TIMBAL_BALIK' ? 'Timbal Balik' : 'Sehala'}</span>
                  <span>•</span>
                  <span>{cycle.claimedSlots ?? 0}/{cycle.totalLocations ?? 0} slot</span>
                  {(cycle.flaggedCount ?? 0) > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-amber-500">{cycle.flaggedCount} flag</span>
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-8">
            {selected && detail ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">{detail.cycle.kod}</h3>
                      <p className="text-[11px] text-slate-500">
                        {detail.cycle.mode === 'TIMBAL_BALIK' ? 'Timbal Balik' : 'Sehala'} •{' '}
                        {detail.cycle.tarikhMula} → {detail.cycle.tarikhTamat}
                        {detail.cycle.snapshotAt && ` • snapshot ${detail.cycle.snapshotAt}`}
                      </p>
                    </div>

                    {canManage && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleGenerate}
                          disabled={isWorking || detail.cycle.status === 'SELESAI'}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isWorking ? 'animate-spin' : ''}`} />
                          Jana Kolam
                        </button>
                        <button
                          type="button"
                          onClick={handleStart}
                          disabled={isWorking || detail.cycle.status !== 'DRAF'}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          Mulakan
                        </button>
                        <button
                          type="button"
                          onClick={handleClose}
                          disabled={isWorking || detail.cycle.status === 'SELESAI'}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Tutup
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { label: 'Lokasi', value: detail.cycle.totalLocations ?? 0 },
                      { label: 'Slot Dituntut', value: detail.cycle.claimedSlots ?? 0 },
                      { label: 'Slot Terbuka', value: unclaimed.length },
                      { label: 'Flag', value: detail.flags.length },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {stat.label}
                        </p>
                        <p className="font-mono text-lg font-bold text-slate-900">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  {!isInspector && !canManage && (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
                      Anda bukan pemeriksa bertauliah — kolam dipaparkan untuk rujukan sahaja.
                    </p>
                  )}
                </div>

                {canManage && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                          <Sparkles className="h-4 w-4 text-amber-500" />
                          Penjana Mod Pemeriksaan
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Kumpulan 2 orang per unit → ujian keseimbangan W → pasangan timbal balik/se­hala → agihan LPT.
                        </p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-600">
                        pelan v{plan?.planVersion ?? savedPlanVersion}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Kuota Q
                        <input
                          type="number"
                          min={10}
                          max={5000}
                          value={planParams.quota}
                          onChange={(event) =>
                            setPlanParams({ ...planParams, quota: Number(event.target.value) })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-xs font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </label>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        τ
                        <input
                          type="number"
                          step="0.05"
                          min={0}
                          max={1}
                          value={planParams.tolerance}
                          onChange={(event) =>
                            setPlanParams({ ...planParams, tolerance: Number(event.target.value) })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-xs font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </label>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Beban
                        <input
                          type="number"
                          step="0.05"
                          min={1}
                          max={3}
                          value={planParams.overload}
                          onChange={(event) =>
                            setPlanParams({ ...planParams, overload: Number(event.target.value) })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-xs font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </label>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Pecah
                        <input
                          type="number"
                          step="0.1"
                          min={1}
                          max={5}
                          value={planParams.split}
                          onChange={(event) =>
                            setPlanParams({ ...planParams, split: Number(event.target.value) })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-xs font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </label>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Unit Ganjil
                        <select
                          value={planParams.oddPolicy}
                          onChange={(event) =>
                            setPlanParams({ ...planParams, oddPolicy: event.target.value as OddUnitPolicy })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        >
                          <option value="SIMPANAN">Simpanan</option>
                          <option value="TIGA">Kumpulan 3</option>
                        </select>
                      </label>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveParams}
                        disabled={isWorking}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Simpan Parameter
                      </button>
                      <button
                        type="button"
                        onClick={handlePreviewPlan}
                        disabled={isPlanning}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        {isPlanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-amber-400" />}
                        Jana Pratonton
                      </button>
                      <button
                        type="button"
                        onClick={handleLockPlan}
                        disabled={isWorking || !plan}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Kunci Pelan
                      </button>
                      {plan && (
                        <span className="font-mono text-[10px] text-slate-500">
                          Cadangan Q ≈ {plan.suggestedQuota} • {plan.groups.length} kumpulan •{' '}
                          {(plan.allocation.coverage * 100).toFixed(1)}% liputan
                        </span>
                      )}
                    </div>

                    {plan && (
                      <div className="mt-3 space-y-3">
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                              <tr>
                                <th className="px-3 py-2 font-bold">Unit</th>
                                <th className="px-3 py-2 font-bold">Aset</th>
                                <th className="px-3 py-2 font-bold">Pemeriksa</th>
                                <th className="px-3 py-2 font-bold">Kumpulan</th>
                                <th className="px-3 py-2 font-bold">Ganjil</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {planUnits.map((unit) => (
                                <tr key={unit.unitId}>
                                  <td className="px-3 py-1.5 font-mono font-semibold text-slate-800">
                                    {unit.unitId}
                                  </td>
                                  <td className="px-3 py-1.5 font-mono text-slate-600">{unit.assetCount}</td>
                                  <td className="px-3 py-1.5 font-mono text-slate-600">
                                    {unit.inspectorCount}
                                  </td>
                                  <td className="px-3 py-1.5 font-mono font-bold text-slate-900">
                                    {unit.groupCount}
                                  </td>
                                  <td className="px-3 py-1.5 font-mono text-slate-500">
                                    {unit.reserveCount || '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                              <tr>
                                <th className="px-3 py-2 font-bold">Pasangan</th>
                                <th className="px-3 py-2 font-bold">Mod</th>
                                <th className="px-3 py-2 font-bold">W (A→B / B→A)</th>
                                <th className="px-3 py-2 font-bold">Sebab</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {planDecisions.map((decision) => (
                                <tr key={`${decision.unitA}-${decision.unitB ?? 'solo'}`}>
                                  <td className="px-3 py-1.5 font-mono font-semibold text-slate-800">
                                    {decision.unitA} ⇄ {decision.unitB ?? '—'}
                                  </td>
                                  <td className="px-3 py-1.5">
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                        decision.mode === 'TIMBAL_BALIK'
                                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                          : 'border-amber-200 bg-amber-50 text-amber-800'
                                      }`}
                                    >
                                      {decision.mode === 'TIMBAL_BALIK' ? 'TIMBAL BALIK' : 'SEHALA'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-1.5 font-mono text-slate-600">
                                    {decision.weightAB === null || decision.weightAB === undefined
                                      ? '—'
                                      : `${decision.weightAB} / ${decision.weightBA}`}
                                  </td>
                                  <td className="px-3 py-1.5 text-slate-600">{decision.reason}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {plan.allocation.unassigned.length > 0 && (
                          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800">
                            <strong>{plan.allocation.unassigned.length} lokasi tidak teragih</strong> (semua
                            kumpulan berkonflik atau tiada kumpulan layak):{' '}
                            {plan.allocation.unassigned
                              .slice(0, 6)
                              .map((item) => item.locationId)
                              .join(', ')}
                            {plan.allocation.unassigned.length > 6 && ' …'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {criticalFlags.length > 0 && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold text-rose-800">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {criticalFlags.length} penugasan memerlukan tindakan (lantikan tamat/tiada)
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {criticalFlags.slice(0, 4).map((flag) => (
                        <li key={`${flag.assignmentId}-${flag.code}`} className="text-[11px] text-rose-700">
                          • {flag.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <div className="border-b border-slate-100 px-4 py-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Kolam Penugasan ({detail.assignments.length})
                    </p>
                  </div>

                  {detail.assignments.length === 0 ? (
                    <p className="px-4 py-10 text-center text-xs text-slate-500">
                      Kolam kosong. Tekan <strong>Jana Kolam</strong> untuk mencipta slot daripada jadual
                      pemeriksaan dalam tempoh kitaran.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="px-4 py-2 font-bold">Ruang</th>
                            <th className="px-4 py-2 font-bold">Slot</th>
                            <th className="px-4 py-2 font-bold">Pemeriksa</th>
                            <th className="px-4 py-2 font-bold">Status</th>
                            {canManage && <th className="px-4 py-2 text-right font-bold">Tindakan</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detail.assignments.map((assignment) => {
                            const flags = flagsByAssignment.get(assignment.id) ?? [];
                            const worst = flags.find((flag) => flag.severity === 'critical') ?? flags[0];

                            return (
                              <tr key={assignment.id} className="hover:bg-slate-50/70">
                                <td className="px-4 py-2.5">
                                  <span className="font-mono text-[11px] font-semibold text-slate-800">
                                    {assignment.kodRuang ?? assignment.locationId}
                                  </span>
                                  <span className="block text-[10px] text-slate-500">
                                    {assignment.locationName ?? '-'}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600">
                                  P{assignment.slot ?? '-'}
                                </td>
                                <td className="px-4 py-2.5">
                                  {assignment.inspectorName ? (
                                    <>
                                      <span className="block font-semibold text-slate-800">
                                        {assignment.inspectorName}
                                      </span>
                                      <span className="block text-[10px] font-mono text-slate-400">
                                        {assignment.inspectorEmail}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">Belum dituntut</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5">
                                  <span
                                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                      assignment.inspectorId
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 bg-slate-50 text-slate-600'
                                    }`}
                                  >
                                    {assignment.status}
                                  </span>
                                  {worst && (
                                    <span
                                      className={`mt-1 flex items-start gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${severityStyles[worst.severity]}`}
                                      title={worst.message}
                                    >
                                      <AlertTriangle className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                                      {worst.code}
                                    </span>
                                  )}
                                </td>
                                {canManage && (
                                  <td className="px-4 py-2.5 text-right">
                                    <button
                                      type="button"
                                      onClick={() => openReassign(assignment)}
                                      disabled={detail.cycle.status === 'SELESAI'}
                                      className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                    >
                                      Tugas Semula
                                    </button>
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

                {isInspector && unclaimed.length > 0 && detail.cycle.status === 'AKTIF' && (
                  <p className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-medium text-sky-800">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {unclaimed.length} slot masih terbuka — tuntut melalui <strong>Tuntut Lokasi Silang</strong>.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-xs text-slate-500">
                Pilih kitaran di sebelah kiri.
              </div>
            )}
          </div>
        </div>
      )}

      {reassign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleReassign}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Tugas Semula Slot</h3>
                <p className="text-[11px] text-slate-500">
                  {reassign.assignment.kodRuang} • Slot P{reassign.assignment.slot}
                  {reassign.assignment.inspectorName && ` • kini ${reassign.assignment.inspectorName}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReassign(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  Pegawai Layak ({reassign.candidates.length})
                </label>
                <select
                  value={reassignOfficer}
                  onChange={(event) => setReassignOfficer(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">— Pilih Pegawai —</option>
                  {reassign.candidates.map((candidate) => (
                    <option key={candidate.officerId} value={candidate.officerId}>
                      {candidate.nama} ({candidate.dept})
                    </option>
                  ))}
                </select>
                {reassign.candidates.length === 0 && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600">
                    Tiada pegawai layak bagi jadual ini (semak lantikan pemeriksa &amp; konflik).
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Sebab Penugasan Semula</label>
                <input
                  value={reassignReason}
                  onChange={(event) => setReassignReason(event.target.value)}
                  placeholder="cth. lantikan pemeriksa tamat pada 2026-10-01"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <p className="flex items-start gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2 text-[10px] leading-relaxed text-slate-500">
                <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Penugasan semula direkod dalam jejak audit PBAC (`cycle:reassign`) bersama sebabnya.
              </p>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setReassign(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isWorking || reassign.candidates.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {isWorking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Simpan Penugasan
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
      </>)}
    </div>
  );
}
