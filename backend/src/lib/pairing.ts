/**
 * Penjana mod pemeriksaan (pairing unit + agihan LPT).
 *
 * Modul ini TULEN: tiada I/O, tiada `Date.now()`, tiada rawak. Semua susunan
 * menggunakan kunci deterministik supaya dua larian dengan input sama
 * menghasilkan output yang sama (syarat untuk audit & ujian unit).
 */

export type PairMode = 'TIMBAL_BALIK' | 'SEHALA';
export type OddUnitPolicy = 'SIMPANAN' | 'TIGA';

export interface PairingParams {
  /** Q — anggaran aset bagi satu kumpulan (dua orang). */
  quota: number;
  /** τ — toleransi ketidakseimbangan antara dua arah. */
  tolerance: number;
  /** Faktor beban berlebihan (lalai 1.25 × Q). */
  overload: number;
  /** Faktor pecah lokasi besar (lalai 1.5 × Q). */
  split: number;
  /** Rawatan unit dengan bilangan pemeriksa ganjil. */
  oddPolicy: OddUnitPolicy;
}

export const DEFAULT_PAIRING_PARAMS: PairingParams = {
  quota: 120,
  tolerance: 0.2,
  overload: 1.25,
  split: 1.5,
  oddPolicy: 'SIMPANAN',
};

export interface UnitStat {
  unitId: string;
  assetCount: number;
  inspectorCount: number;
}

export interface OfficerRef {
  officerId: string;
  unitId: string;
}

export interface InspectorGroup {
  id: string;
  unitId: string;
  memberIds: string[];
  /** Ahli yang tersisa (unit ganjil, polisi SIMPANAN). */
  reserveMemberIds: string[];
}

export interface TargetLocation {
  locationId: string;
  unitId: string;
  assetCount: number;
}

export interface PairDecision {
  unitA: string;
  unitB: string | null;
  mode: PairMode;
  /** Beban kumpulan A yang memeriksa B (A_B / G_A). */
  weightAB: number | null;
  /** Beban kumpulan B yang memeriksa A (A_A / G_B). */
  weightBA: number | null;
  reason: string;
}

export interface TargetAssignment {
  groupId: string;
  unitId: string;
  locationId: string;
  targetUnitId: string;
  assetCount: number;
  direction: PairMode;
  splitIndex: number;
}

export interface AllocationResult {
  assignments: TargetAssignment[];
  unassigned: TargetLocation[];
  groupLoad: Record<string, number>;
  assignedAssets: number;
  totalAssets: number;
  coverage: number;
}

export interface PlanResult {
  params: PairingParams;
  units: (UnitStat & { groupCount: number; reserveCount: number })[];
  groups: InspectorGroup[];
  decisions: PairDecision[];
  allocation: AllocationResult;
  /** Cadangan kuota seimbang: ΣA / ΣG (0 jika tiada kumpulan). */
  suggestedQuota: number;
}

const round = (value: number): number => Math.round(value * 1000) / 1000;

/** G_u = floor(P_u / 2); polisi `TIGA` membenarkan kumpulan 3 orang bagi baki. */
export function computeGroupCount(inspectorCount: number, oddPolicy: OddUnitPolicy = 'SIMPANAN'): number {
  if (inspectorCount < 2) return 0;
  if (inspectorCount % 2 === 0) return inspectorCount / 2;
  return oddPolicy === 'TIGA' ? Math.ceil(inspectorCount / 2) : Math.floor(inspectorCount / 2);
}

/** Ujian keseimbangan dua hala (langkah 2). */
export function evaluatePairing(
  a: UnitStat & { groupCount: number },
  b: UnitStat & { groupCount: number },
  params: PairingParams
): { ok: boolean; weightAB: number | null; weightBA: number | null; reason: string } {
  if (a.groupCount === 0 || b.groupCount === 0) {
    return {
      ok: false,
      weightAB: null,
      weightBA: null,
      reason: `Unit ${a.groupCount === 0 ? a.unitId : b.unitId} tiada kumpulan pemeriksa (G=0)`,
    };
  }

  const weightAB = b.assetCount / a.groupCount;
  const weightBA = a.assetCount / b.groupCount;
  const limit = params.quota * params.overload;

  if (weightAB > limit || weightBA > limit) {
    const over = weightAB > limit ? `W(${a.unitId}→${b.unitId})=${round(weightAB)}` : `W(${b.unitId}→${a.unitId})=${round(weightBA)}`;
    return {
      ok: false,
      weightAB,
      weightBA,
      reason: `${over} melebihi had ${round(limit)} aset/kumpulan`,
    };
  }

  const imbalance = Math.abs(weightAB - weightBA) / Math.max(weightAB, weightBA, 1);
  if (imbalance > params.tolerance) {
    return {
      ok: false,
      weightAB,
      weightBA,
      reason: `Ketidakseimbangan ${round(imbalance * 100)}% melebihi toleransi ${round(params.tolerance * 100)}%`,
    };
  }

  return {
    ok: true,
    weightAB,
    weightBA,
    reason: `Seimbang — W ${round(weightAB)} : ${round(weightBA)} (Δ ${round(imbalance * 100)}%)`,
  };
}

/**
 * Pasangkan unit mengikut saiz aset menurun, jiran bersebelahan (1-2, 3-4, …).
 * Unit tanpa kumpulan pemeriksa dipisahkan dahulu ke sehala.
 */
export function pairUnits(units: UnitStat[], params: PairingParams): PairDecision[] {
  const withGroups = units.map((unit) => ({
    ...unit,
    groupCount: computeGroupCount(unit.inspectorCount, params.oddPolicy),
  }));

  const eligible = [...withGroups]
    .filter((unit) => unit.groupCount > 0)
    .sort((a, b) => b.assetCount - a.assetCount || a.unitId.localeCompare(b.unitId));

  const noCapacity = withGroups
    .filter((unit) => unit.groupCount === 0)
    .sort((a, b) => a.unitId.localeCompare(b.unitId))
    .map<PairDecision>((unit) => ({
      unitA: unit.unitId,
      unitB: null,
      mode: 'SEHALA',
      weightAB: null,
      weightBA: null,
      reason: 'Tiada kumpulan pemeriksa aktif (G=0)',
    }));

  const decisions: PairDecision[] = [];
  let index = 0;

  while (index + 1 < eligible.length) {
    const a = eligible[index];
    const b = eligible[index + 1];
    const test = evaluatePairing(a, b, params);
    decisions.push({
      unitA: a.unitId,
      unitB: b.unitId,
      mode: test.ok ? 'TIMBAL_BALIK' : 'SEHALA',
      weightAB: test.ok ? round(test.weightAB ?? 0) : round(test.weightAB ?? 0),
      weightBA: test.ok ? round(test.weightBA ?? 0) : round(test.weightBA ?? 0),
      reason: test.reason,
    });
    index += 2;
  }

  if (index < eligible.length) {
    const leftover = eligible[index];
    decisions.push({
      unitA: leftover.unitId,
      unitB: null,
      mode: 'SEHALA',
      weightAB: null,
      weightBA: null,
      reason: 'Unit baki tanpa pasangan (bilangan unit ganjil)',
    });
  }

  return [...decisions, ...noCapacity];
}

/** Bentuk kumpulan: ahli diisih mengikut `officerId` supaya kekal deterministik. */
export function formGroups(
  units: UnitStat[],
  officers: OfficerRef[],
  params: PairingParams
): InspectorGroup[] {
  const groups: InspectorGroup[] = [];

  const sortedUnits = [...units].sort((a, b) => a.unitId.localeCompare(b.unitId));

  for (const unit of sortedUnits) {
    const members = officers
      .filter((officer) => officer.unitId === unit.unitId)
      .map((officer) => officer.officerId)
      .sort((a, b) => a.localeCompare(b));

    let groupIndex = 0;
    let cursor = 0;

    while (cursor + 1 < members.length) {
      const isLastPair = cursor + 4 > members.length;
      const useTriple =
        params.oddPolicy === 'TIGA' &&
        members.length % 2 === 1 &&
        isLastPair &&
        cursor + 3 === members.length;

      const memberIds = useTriple ? members.slice(cursor, cursor + 3) : members.slice(cursor, cursor + 2);
      groupIndex += 1;
      groups.push({
        id: `GRP-${unit.unitId}-${String(groupIndex).padStart(2, '0')}`,
        unitId: unit.unitId,
        memberIds,
        reserveMemberIds: [],
      });
      cursor += memberIds.length;
    }

    if (cursor < members.length) {
      const leftover = members[cursor];
      const last = groups.filter((group) => group.unitId === unit.unitId).at(-1);
      if (last) last.reserveMemberIds = [leftover];
      else
        groups.push({
          id: `GRP-${unit.unitId}-RSV`,
          unitId: unit.unitId,
          memberIds: [],
          reserveMemberIds: [leftover],
        });
    }
  }

  return groups;
}

export type GroupEligibility = (group: InspectorGroup, target: TargetLocation) => boolean;

interface PoolItem {
  group: InspectorGroup;
  direction: PairMode;
}

/**
 * Agihan LPT (Longest Processing Time first): lokasi terbesar dahulu,
 * diberi kepada kumpulan layak dengan beban terendah.
 */
export function allocateTargets(
  targets: TargetLocation[],
  groups: InspectorGroup[],
  decisions: PairDecision[],
  params: PairingParams,
  canGroupInspect: GroupEligibility
): AllocationResult {
  const groupsByUnit = new Map<string, InspectorGroup[]>();
  groups.forEach((group) => {
    groupsByUnit.set(group.unitId, [...(groupsByUnit.get(group.unitId) ?? []), group]);
  });

  const modeByUnit = new Map<string, PairMode>();
  const partnerByUnit = new Map<string, string | null>();
  decisions.forEach((decision) => {
    modeByUnit.set(decision.unitA, decision.mode);
    partnerByUnit.set(decision.unitA, decision.unitB);
    if (decision.unitB) {
      modeByUnit.set(decision.unitB, decision.mode);
      partnerByUnit.set(decision.unitB, decision.unitA);
    }
  });

  const sehalaGroups = groups.filter((group) => modeByUnit.get(group.unitId) !== 'TIMBAL_BALIK');

  const poolFor = (target: TargetLocation): PoolItem[] => {
    const mode = modeByUnit.get(target.unitId) ?? 'SEHALA';
    const partner = partnerByUnit.get(target.unitId) ?? null;

    if (mode === 'TIMBAL_BALIK' && partner) {
      return (groupsByUnit.get(partner) ?? []).map((group) => ({ group, direction: 'TIMBAL_BALIK' as const }));
    }

    return sehalaGroups.map((group) => ({ group, direction: 'SEHALA' as const }));
  };

  const load = new Map<string, number>();
  groups.forEach((group) => load.set(group.id, 0));

  const assignments: TargetAssignment[] = [];
  const unassigned: TargetLocation[] = [];

  const sortedTargets = [...targets].sort(
    (a, b) => b.assetCount - a.assetCount || a.locationId.localeCompare(b.locationId)
  );

  for (const target of sortedTargets) {
    const pool = poolFor(target).filter((item) => canGroupInspect(item.group, target));

    if (pool.length === 0) {
      unassigned.push(target);
      continue;
    }

    const ordered = [...pool].sort((a, b) => {
      const loadDiff = (load.get(a.group.id) ?? 0) - (load.get(b.group.id) ?? 0);
      if (loadDiff !== 0) return loadDiff;
      // Dalam sehala, utamakan kumpulan dari unit lain, kemudian id.
      if (a.direction === 'SEHALA') {
        const aOwn = a.group.unitId === target.unitId ? 1 : 0;
        const bOwn = b.group.unitId === target.unitId ? 1 : 0;
        if (aOwn !== bOwn) return aOwn - bOwn;
      }
      return a.group.id.localeCompare(b.group.id);
    });

    const needsSplit = target.assetCount > params.quota * params.split;

    if (!needsSplit) {
      const chosen = ordered[0];
      assignments.push({
        groupId: chosen.group.id,
        unitId: chosen.group.unitId,
        locationId: target.locationId,
        targetUnitId: target.unitId,
        assetCount: target.assetCount,
        direction: chosen.direction,
        splitIndex: 0,
      });
      load.set(chosen.group.id, (load.get(chosen.group.id) ?? 0) + target.assetCount);
      continue;
    }

    // Lokasi besar dipecah antara beberapa kumpulan beban terendah.
    const chunkCount = Math.min(ordered.length, Math.max(2, Math.ceil(target.assetCount / params.quota)));
    const baseChunk = Math.floor(target.assetCount / chunkCount);
    const remainder = target.assetCount - baseChunk * chunkCount;

    for (let index = 0; index < chunkCount; index += 1) {
      const chosen = ordered[index];
      const chunk = baseChunk + (index < remainder ? 1 : 0);
      assignments.push({
        groupId: chosen.group.id,
        unitId: chosen.group.unitId,
        locationId: target.locationId,
        targetUnitId: target.unitId,
        assetCount: chunk,
        direction: chosen.direction,
        splitIndex: index,
      });
      load.set(chosen.group.id, (load.get(chosen.group.id) ?? 0) + chunk);
    }
  }

  const assignedAssets = assignments.reduce((sum, item) => sum + item.assetCount, 0);
  const totalAssets = sortedTargets.reduce((sum, target) => sum + target.assetCount, 0);

  return {
    assignments,
    unassigned,
    groupLoad: Object.fromEntries(load),
    assignedAssets,
    totalAssets,
    coverage: totalAssets === 0 ? 0 : round(assignedAssets / totalAssets),
  };
}

/** Bangunkan pelan penuh (kumpulan → pasangan → agihan) tanpa menyimpan apa-apa. */
export function buildPlan(
  units: UnitStat[],
  officers: OfficerRef[],
  targets: TargetLocation[],
  params: PairingParams,
  canGroupInspect: GroupEligibility
): PlanResult {
  const groups = formGroups(units, officers, params);
  const decisions = pairUnits(units, params);
  const allocation = allocateTargets(targets, groups, decisions, params, canGroupInspect);

  const totalAssets = units.reduce((sum, unit) => sum + unit.assetCount, 0);
  const totalGroups = groups.length;

  return {
    params,
    units: units
      .map((unit) => {
        const unitGroups = groups.filter((group) => group.unitId === unit.unitId);
        return {
          ...unit,
          groupCount: unitGroups.length,
          reserveCount: unitGroups.reduce((sum, group) => sum + group.reserveMemberIds.length, 0),
        };
      })
      .sort((a, b) => a.unitId.localeCompare(b.unitId)),
    groups,
    decisions,
    allocation,
    suggestedQuota: totalGroups === 0 ? 0 : Math.round(totalAssets / totalGroups),
  };
}
