import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAIRING_PARAMS,
  allocateTargets,
  buildPlan,
  computeGroupCount,
  evaluatePairing,
  formGroups,
  pairUnits,
  type InspectorGroup,
  type PairingParams,
  type TargetLocation,
  type UnitStat,
} from './pairing';

const params: PairingParams = { ...DEFAULT_PAIRING_PARAMS };
const alwaysEligible = () => true;

const unit = (unitId: string, assetCount: number, inspectorCount: number): UnitStat => ({
  unitId,
  assetCount,
  inspectorCount,
});

const officersFor = (units: UnitStat[]) =>
  units.flatMap((u) =>
    Array.from({ length: u.inspectorCount }, (_, index) => ({
      officerId: `${u.unitId}-OFF-${String(index + 1).padStart(2, '0')}`,
      unitId: u.unitId,
    }))
  );

describe('computeGroupCount', () => {
  it('mengira floor(P/2) bagi bilangan genap', () => {
    expect(computeGroupCount(4)).toBe(2);
    expect(computeGroupCount(2)).toBe(1);
  });

  it('menyimpan baki di bawah polisi SIMPANAN', () => {
    expect(computeGroupCount(5, 'SIMPANAN')).toBe(2);
  });

  it('membenarkan kumpulan 3 orang di bawah polisi TIGA', () => {
    expect(computeGroupCount(5, 'TIGA')).toBe(3);
  });

  it('pulangkan 0 apabila kurang dua pemeriksa', () => {
    expect(computeGroupCount(1)).toBe(0);
    expect(computeGroupCount(0)).toBe(0);
  });
});

describe('evaluatePairing', () => {
  it('lulus bagi unit seimbang', () => {
    const a = { ...unit('JKE', 240, 4), groupCount: 2 };
    const b = { ...unit('JKM', 240, 4), groupCount: 2 };
    const result = evaluatePairing(a, b, params);
    expect(result.ok).toBe(true);
    expect(result.weightAB).toBe(120);
    expect(result.weightBA).toBe(120);
  });

  it('gagal apabila satu kumpulan terlebih beban (melebihi 1.25×Q)', () => {
    const a = { ...unit('JKE', 100, 2), groupCount: 1 };
    const b = { ...unit('JKM', 600, 8), groupCount: 4 };
    const result = evaluatePairing(a, b, params);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('melebihi had');
  });

  it('gagal apabila ketidakseimbangan melebihi toleransi', () => {
    const a = { ...unit('JKE', 120, 2), groupCount: 1 };
    const b = { ...unit('JKM', 200, 2), groupCount: 2 };
    const result = evaluatePairing(a, b, params);
    // W(JKE→JKM) = 200/1 = 200 (>150) -> gagal atas beban dahulu
    expect(result.ok).toBe(false);

    const balancedLoad = evaluatePairing(
      { ...unit('JKE', 120, 2), groupCount: 2 },
      { ...unit('JKM', 200, 2), groupCount: 2 },
      params
    );
    // W = 200/2 = 100 vs 120/2 = 60 → Δ 40% > 20%
    expect(balancedLoad.ok).toBe(false);
    expect(balancedLoad.reason).toContain('Ketidakseimbangan');
  });

  it('gagal apabila unit tiada kumpulan', () => {
    const result = evaluatePairing(
      { ...unit('JKE', 100, 1), groupCount: 0 },
      { ...unit('JKM', 100, 2), groupCount: 1 },
      params
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('G=0');
  });
});

describe('pairUnits', () => {
  it('memasangkan jiran selepas susunan saiz menurun', () => {
    const decisions = pairUnits(
      [unit('A', 400, 4), unit('B', 380, 4), unit('C', 200, 4), unit('D', 180, 4)],
      { ...params, quota: 200 }
    );
    expect(decisions.map((d) => [d.unitA, d.unitB])).toEqual([
      ['A', 'B'],
      ['C', 'D'],
    ]);
    expect(decisions.every((d) => d.mode === 'TIMBAL_BALIK')).toBe(true);
  });

  it('kuota terlalu rendah memaksa semua pasangan ke sehala', () => {
    // Q=120 dengan 400 aset / 2 kumpulan → 200 aset sekumpulan (> 1.25 × 120).
    const decisions = pairUnits([unit('A', 400, 4), unit('B', 380, 4)], params);
    expect(decisions).toHaveLength(1);
    expect(decisions[0].mode).toBe('SEHALA');
    expect(decisions[0].reason).toContain('melebihi had');
  });

  it('unit tinggal tanpa pasangan jatuh ke sehala', () => {
    const decisions = pairUnits([unit('A', 400, 4), unit('B', 380, 4), unit('C', 50, 4)], params);
    const leftover = decisions.find((d) => d.unitA === 'C');
    expect(leftover?.mode).toBe('SEHALA');
    expect(leftover?.unitB).toBeNull();
    expect(leftover?.reason).toContain('baki');
  });

  it('unit tanpa kapasiti terus ke sehala', () => {
    const decisions = pairUnits([unit('A', 400, 4), unit('B', 380, 4), unit('SOLO', 900, 1)], params);
    const solo = decisions.find((d) => d.unitA === 'SOLO');
    expect(solo?.mode).toBe('SEHALA');
    expect(solo?.reason).toContain('G=0');
  });
});

describe('formGroups', () => {
  it('membentuk kumpulan dua orang secara deterministik', () => {
    const units = [unit('JKE', 100, 4), unit('JKM', 100, 2)];
    const groups = formGroups(units, officersFor(units), params);
    expect(groups.map((g) => g.id)).toEqual(['GRP-JKE-01', 'GRP-JKE-02', 'GRP-JKM-01']);
    expect(groups[0].memberIds).toEqual(['JKE-OFF-01', 'JKE-OFF-02']);
  });

  it('menyimpan ahli tersisa sebagai simpanan', () => {
    const units = [unit('JKE', 100, 5)];
    const groups = formGroups(units, officersFor(units), params);
    expect(groups).toHaveLength(2);
    expect(groups[1].reserveMemberIds).toEqual(['JKE-OFF-05']);
  });

  it('membentuk kumpulan 3 orang dengan polisi TIGA', () => {
    const units = [unit('JKE', 100, 5)];
    const groups = formGroups(units, officersFor(units), { ...params, oddPolicy: 'TIGA' });
    expect(groups).toHaveLength(2);
    expect(groups[1].memberIds).toHaveLength(3);
  });
});

describe('allocateTargets', () => {
  const timbalBalikDecisions = [
    { unitA: 'JKE', unitB: 'JKM', mode: 'TIMBAL_BALIK' as const, weightAB: 50, weightBA: 50, reason: 'ok' },
  ];
  const groups: InspectorGroup[] = [
    { id: 'GRP-JKE-01', unitId: 'JKE', memberIds: ['a1', 'a2'], reserveMemberIds: [] },
    { id: 'GRP-JKM-01', unitId: 'JKM', memberIds: ['b1', 'b2'], reserveMemberIds: [] },
  ];
  const targets: TargetLocation[] = [
    { locationId: 'L-A', unitId: 'JKE', assetCount: 50 },
    { locationId: 'L-B', unitId: 'JKM', assetCount: 60 },
  ];

  it('kumpulan hanya memeriksa lokasi unit pasangan', () => {
    const result = allocateTargets(targets, groups, timbalBalikDecisions, params, alwaysEligible);
    expect(result.assignments).toHaveLength(2);
    expect(result.assignments.find((a) => a.locationId === 'L-B')?.groupId).toBe('GRP-JKE-01');
    expect(result.assignments.find((a) => a.locationId === 'L-A')?.groupId).toBe('GRP-JKM-01');
  });

  it('melangkau lokasi apabila semua kumpulan berkonflik', () => {
    const result = allocateTargets(targets, groups, timbalBalikDecisions, params, () => false);
    expect(result.assignments).toHaveLength(0);
    expect(result.unassigned).toHaveLength(2);
    expect(result.coverage).toBe(0);
  });

  it('memecah lokasi besar melebihi 1.5×Q antara beberapa kumpulan', () => {
    const bigTarget: TargetLocation[] = [
      { locationId: 'L-BIG', unitId: 'JKM', assetCount: 400 },
    ];
    const moreGroups: InspectorGroup[] = [
      { id: 'GRP-JKE-01', unitId: 'JKE', memberIds: ['a1', 'a2'], reserveMemberIds: [] },
      { id: 'GRP-JKE-02', unitId: 'JKE', memberIds: ['a3', 'a4'], reserveMemberIds: [] },
    ];
    const result = allocateTargets(bigTarget, moreGroups, timbalBalikDecisions, params, alwaysEligible);
    expect(result.assignments.length).toBeGreaterThan(1);
    expect(result.assignments.every((a) => a.locationId === 'L-BIG')).toBe(true);
    expect(result.assignments.reduce((sum, a) => sum + a.assetCount, 0)).toBe(400);
  });

  it('tidak memecah lokasi kecil', () => {
    const small: TargetLocation[] = [{ locationId: 'L-S', unitId: 'JKM', assetCount: 100 }];
    const result = allocateTargets(small, groups, timbalBalikDecisions, params, alwaysEligible);
    expect(result.assignments).toHaveLength(1);
  });

  it('mengagihkan beban secara seimbang (LPT)', () => {
    const many: TargetLocation[] = Array.from({ length: 6 }, (_, i) => ({
      locationId: `L-${String(i + 1).padStart(2, '0')}`,
      unitId: 'JKM',
      assetCount: 40,
    }));
    const pool: InspectorGroup[] = [
      { id: 'GRP-JKE-01', unitId: 'JKE', memberIds: ['a1', 'a2'], reserveMemberIds: [] },
      { id: 'GRP-JKE-02', unitId: 'JKE', memberIds: ['a3', 'a4'], reserveMemberIds: [] },
    ];
    const result = allocateTargets(many, pool, timbalBalikDecisions, params, alwaysEligible);
    expect(result.groupLoad['GRP-JKE-01']).toBe(120);
    expect(result.groupLoad['GRP-JKE-02']).toBe(120);
    expect(result.coverage).toBe(1);
  });
});

describe('buildPlan determinisme', () => {
  it('dua larian dengan input sama menghasilkan output identik', () => {
    const units = [unit('JKE', 500, 6), unit('JKM', 480, 6), unit('JKA', 200, 2), unit('JP', 150, 2)];
    const officers = officersFor(units);
    const targets: TargetLocation[] = [
      { locationId: 'L-01', unitId: 'JKE', assetCount: 120 },
      { locationId: 'L-02', unitId: 'JKM', assetCount: 90 },
      { locationId: 'L-03', unitId: 'JKA', assetCount: 200 },
      { locationId: 'L-04', unitId: 'JP', assetCount: 150 },
    ];
    const tuned = { ...params, quota: 200 };

    const first = buildPlan(units, officers, targets, tuned, alwaysEligible);
    const second = buildPlan(
      [...units].reverse(),
      [...officers].reverse(),
      [...targets].reverse(),
      tuned,
      alwaysEligible
    );

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('mencadang kuota seimbang ΣA/ΣG', () => {
    const units = [unit('JKE', 400, 4), unit('JKM', 400, 4)];
    const plan = buildPlan(units, officersFor(units), [], params, alwaysEligible);
    expect(plan.groups).toHaveLength(4);
    expect(plan.suggestedQuota).toBe(200);
  });

  it('mengira liputan terhadap jumlah aset sasaran', () => {
    const units = [unit('JKE', 100, 2), unit('JKM', 100, 2)];
    const targets: TargetLocation[] = [
      { locationId: 'L-01', unitId: 'JKE', assetCount: 60 },
      { locationId: 'L-02', unitId: 'JKM', assetCount: 40 },
    ];
    const plan = buildPlan(units, officersFor(units), targets, params, alwaysEligible);
    expect(plan.allocation.totalAssets).toBe(100);
    expect(plan.allocation.coverage).toBe(1);
  });
});
