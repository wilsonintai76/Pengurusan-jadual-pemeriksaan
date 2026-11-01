import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAIRING_PARAMS,
  allocateTargets,
  binaZon,
  buildPlan,
  computeGroupCount,
  dalamJalur,
  evaluatePairing,
  formGroups,
  jalurZon,
  loadPerKumpulan,
  pairUnits,
  tentukanModZon,
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

const withGroups = (u: UnitStat, oddPolicy: PairingParams['oddPolicy'] = 'SIMPANAN') => ({
  ...u,
  groupCount: computeGroupCount(u.inspectorCount, oddPolicy),
});

const officersFor = (units: UnitStat[]) =>
  units.flatMap((u) =>
    Array.from({ length: u.inspectorCount }, (_, index) => ({
      officerId: `${u.unitId}-OFF-${String(index + 1).padStart(2, '0')}`,
      unitId: u.unitId,
    }))
  );

const target = (locationId: string, unitId: string, assetCount: number): TargetLocation => ({
  locationId,
  unitId,
  assetCount,
});

describe('jalur sasaran', () => {
  it('lalai Q=375 dan tau=15% memberi jalur 318.75-431.25 dengan had 468.75', () => {
    const jalur = jalurZon(params);
    expect(jalur.min).toBe(318.75);
    expect(jalur.max).toBe(431.25);
    expect(jalur.had).toBe(468.75);
  });

  it('dalamJalur hanya menerima nilai dalam julat', () => {
    expect(dalamJalur(375, params)).toBe(true);
    expect(dalamJalur(318.75, params)).toBe(true);
    expect(dalamJalur(318, params)).toBe(false);
    expect(dalamJalur(432, params)).toBe(false);
  });

  it('loadPerKumpulan melindungi pembahagian sifar', () => {
    expect(loadPerKumpulan(800, 2)).toBe(400);
    expect(loadPerKumpulan(800, 0)).toBe(0);
  });
});

describe('computeGroupCount', () => {
  it('mengira floor(P/2) bagi bilangan genap', () => {
    expect(computeGroupCount(4)).toBe(2);
    expect(computeGroupCount(2)).toBe(1);
  });

  it('menyimpan baki di bawah polisi SIMPANAN dan menerimanya di bawah TIGA', () => {
    expect(computeGroupCount(5, 'SIMPANAN')).toBe(2);
    expect(computeGroupCount(5, 'TIGA')).toBe(3);
  });

  it('pulangkan 0 apabila kurang dua pemeriksa', () => {
    expect(computeGroupCount(1)).toBe(0);
    expect(computeGroupCount(0)).toBe(0);
  });
});

describe('evaluatePairing (dua faktor: aset & pemeriksa)', () => {
  it('lulus apabila nisbah aset:pemeriksa hampir sama dan dalam jalur', () => {
    const hasil = evaluatePairing(
      withGroups(unit('JKE', 800, 4)),
      withGroups(unit('JKM', 760, 4)),
      params
    );
    expect(hasil.ok).toBe(true);
    expect(hasil.weightAB).toBe(380);
    expect(hasil.weightBA).toBe(400);
  });

  it('gagal apabila nisbah berbeza melebihi toleransi', () => {
    const hasil = evaluatePairing(
      withGroups(unit('JKE', 330, 2)),
      withGroups(unit('JKM', 425, 2)),
      params
    );
    expect(hasil.ok).toBe(false);
    expect(hasil.reason).toMatch(/Ketidakseimbangan|di luar jalur/);
  });

  it('gagal apabila satu pihak terlebih beban (aset Banyak, pemeriksa sedikit)', () => {
    const hasil = evaluatePairing(
      withGroups(unit('JKE', 400, 2)),
      withGroups(unit('JKM', 1600, 4)),
      params
    );
    expect(hasil.ok).toBe(false);
    expect(hasil.reason).toMatch(/melebihi had/);
  });

  it('gagal apabila nisbah di luar jalur walaupun seimbang', () => {
    const hasil = evaluatePairing(
      withGroups(unit('JKE', 200, 2)),
      withGroups(unit('JKM', 200, 2)),
      params
    );
    expect(hasil.ok).toBe(false);
    expect(hasil.reason).toMatch(/di luar jalur/);
  });

  it('gagal apabila unit tiada kumpulan', () => {
    const hasil = evaluatePairing(
      withGroups(unit('SOLO', 400, 1)),
      withGroups(unit('JKM', 400, 2)),
      params
    );
    expect(hasil.ok).toBe(false);
    expect(hasil.weightAB).toBeNull();
  });
});

describe('binaZon', () => {
  it('memasangkan dua unit seimbang secara timbal balik', () => {
    const zon = binaZon([unit('JKA', 800, 4), unit('JKM', 760, 4)], params);
    expect(zon).toHaveLength(1);
    expect(zon[0]).toMatchObject({
      unitIds: ['JKA', 'JKM'],
      kind: 'PASANGAN',
      mode: 'TIMBAL_BALIK',
      groupCount: 4,
      loadPerGroup: 390,
    });
  });

  it('menggabung unit kecil dan unit tanpa pemeriksa ke zon sedia ada', () => {
    const zon = binaZon(
      [
        unit('JKA', 800, 4),
        unit('JKE', 420, 2),
        unit('JTMK', 180, 2),
        unit('JMSK', 120, 0),
      ],
      params
    );

    const gabungan = zon.find((zona) => zona.unitIds.includes('JTMK'));
    expect(gabungan).toBeDefined();
    expect(gabungan?.unitIds).toContain('JMSK');
    expect(gabungan?.kind).toBe('GABUNGAN');
    expect(gabungan?.mode).toBe('SEHALA');
    expect(gabungan?.unitIds).toHaveLength(3);
  });

  it('tidak memecahkan pasangan timbal balik apabila menggabung', () => {
    const zon = binaZon(
      [unit('JKA', 760, 4), unit('JKM', 760, 4), unit('JTMK', 150, 2)],
      params
    );
    const pasangan = zon.find((zona) => zona.kind === 'PASANGAN');
    expect(pasangan?.unitIds).toEqual(['JKA', 'JKM']);
    expect(zon.some((zona) => zona.unitIds.includes('JTMK'))).toBe(true);
  });

  it('menggabung unit kecil ke unit berlebihan supaya beban menjadi hampir Q', () => {
    const zon = binaZon([unit('A', 700, 2), unit('B', 200, 2)], params);
    expect(zon).toHaveLength(1);
    expect(zon[0].unitIds).toEqual(['A', 'B']);
    expect(zon[0].groupCount).toBe(2);
    expect(zon[0].loadPerGroup).toBe(450);
    expect(zon[0].mode).toBe('SEHALA');
  });

  it('mengekalkan unit berlebihan sebagai zon sendiri apabila tiada unit kecil', () => {
    const zon = binaZon([unit('BESAR', 1600, 4)], params);
    expect(zon[0]).toMatchObject({ kind: 'TUNGGAL', mode: 'SEHALA', loadPerGroup: 800 });
  });

  it('mengutamakan rakan silang dalam gabungan', () => {
    const zon = binaZon([unit('JKA', 700, 2), unit('JKM', 750, 2), unit('KECIL', 60, 2)], params, {
      crossPartnerByUnit: { KECIL: 'JKA' },
    });
    const hos = zon.find((zona) => zona.unitIds.includes('KECIL'));
    expect(hos?.unitIds).toContain('JKA');
  });

  it('mengutamakan bangunan sama apabila tiada rakan silang', () => {
    const zon = binaZon([unit('JKA', 700, 2), unit('JKM', 750, 2), unit('KECIL', 60, 2)], params, {
      buildingByUnit: { KECIL: 'BGN1', JKA: 'BGN1', JKM: 'BGN2' },
    });
    const hos = zon.find((zona) => zona.unitIds.includes('KECIL'));
    expect(hos?.unitIds).toContain('JKA');
  });

  it('memberi id zon yang stabil mengikut unit pertama', () => {
    const zon = binaZon([unit('Z', 800, 4), unit('A', 780, 4)], params);
    expect(zon.map((zona) => zona.id)).toEqual(['ZON-01']);
    expect(zon[0].unitIds).toEqual(['A', 'Z']);
  });
});

describe('tentukanModZon', () => {
  it('SEHALA bagi zon satu unit', () => {
    expect(tentukanModZon({ unitIds: ['A'], kind: 'TUNGGAL', groupCount: 1 }, params).mode).toBe(
      'SEHALA'
    );
  });

  it('SEHALA bagi zon tanpa pemeriksa', () => {
    expect(
      tentukanModZon({ unitIds: ['A', 'B'], kind: 'TANPA_PEMERIKSA', groupCount: 0 }, params).mode
    ).toBe('SEHALA');
  });

  it('TIMBAL_BALIK bagi pasangan dua unit', () => {
    expect(tentukanModZon({ unitIds: ['A', 'B'], kind: 'PASANGAN', groupCount: 4 }, params).mode).toBe(
      'TIMBAL_BALIK'
    );
  });
});

describe('pairUnits', () => {
  it('menghasilkan satu keputusan timbal balik bagi setiap pasangan', () => {
    const decisions = pairUnits([unit('JKA', 800, 4), unit('JKM', 760, 4)], params);
    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({
      unitA: 'JKA',
      unitB: 'JKM',
      mode: 'TIMBAL_BALIK',
      weightAB: 380,
      weightBA: 400,
    });
  });

  it('menghasilkan keputusan sehala bagi setiap unit dalam zon gabungan', () => {
    const decisions = pairUnits(
      [unit('JTMK', 150, 2), unit('JMSK', 120, 0)],
      params
    );
    expect(decisions).toHaveLength(2);
    expect(decisions.every((d) => d.mode === 'SEHALA')).toBe(true);
    expect(decisions.every((d) => d.weightAB === null)).toBe(true);
  });
});

describe('formGroups', () => {
  it('membentuk kumpulan dua orang secara deterministik', () => {
    const units = [unit('JKE', 800, 4), unit('JKM', 800, 2)];
    const groups = formGroups(units, officersFor(units), params);
    expect(groups.map((group) => group.id)).toEqual(['GRP-JKE-01', 'GRP-JKE-02', 'GRP-JKM-01']);
    expect(groups[0].memberIds).toEqual(['JKE-OFF-01', 'JKE-OFF-02']);
  });

  it('menyimpan ahli tersisa sebagai simpanan', () => {
    const units = [unit('JKE', 800, 5)];
    const groups = formGroups(units, officersFor(units), params);
    expect(groups).toHaveLength(2);
    expect(groups[1].reserveMemberIds).toEqual(['JKE-OFF-05']);
  });

  it('membentuk kumpulan 3 orang dengan polisi TIGA', () => {
    const units = [unit('JKE', 800, 5)];
    const groups = formGroups(units, officersFor(units), { ...params, oddPolicy: 'TIGA' });
    expect(groups).toHaveLength(2);
    expect(groups[1].memberIds).toEqual(['JKE-OFF-03', 'JKE-OFF-04', 'JKE-OFF-05']);
  });

  it('memasangkan baki unit berbeza dalam zon gabungan (merentas jabatan)', () => {
    const units = [unit('JKA', 800, 3), unit('JKM', 60, 3)];
    const zon = binaZon(units, params);
    expect(zon).toHaveLength(1);
    const groups = formGroups(units, officersFor(units), params, zon);

    const silang = groups.find((group) => group.crossUnit);
    expect(silang).toBeDefined();
    expect(silang?.memberIds).toEqual(['JKA-OFF-03', 'JKM-OFF-03']);
    expect(silang?.zoneId).toBe(zon[0].id);
  });
});

describe('allocateTargets', () => {
  const groups: InspectorGroup[] = [
    { id: 'GRP-A-01', unitId: 'A', memberIds: ['a1', 'a2'], reserveMemberIds: [] },
    { id: 'GRP-B-01', unitId: 'B', memberIds: ['b1', 'b2'], reserveMemberIds: [] },
  ];

  const target = (locationId: string, unitId: string, assetCount: number): TargetLocation => ({
    locationId,
    unitId,
    assetCount,
  });

  it('kumpulan timbal balik hanya memeriksa lokasi unit pasangan', () => {
    const hasil = allocateTargets(
      [target('L-A', 'A', 400), target('L-B', 'B', 380)],
      groups,
      [{ unitA: 'A', unitB: 'B', mode: 'TIMBAL_BALIK', weightAB: 380, weightBA: 400, reason: '' }],
      params,
      alwaysEligible
    );
    expect(hasil.assignments).toHaveLength(2);
    const untukA = hasil.assignments.find((a) => a.locationId === 'L-A');
    const untukB = hasil.assignments.find((a) => a.locationId === 'L-B');
    expect(untukA?.groupId).toBe('GRP-B-01');
    expect(untukB?.groupId).toBe('GRP-A-01');
    expect(hasil.coverage).toBe(1);
  });

  it('melangkau lokasi apabila semua kumpulan berkonflik', () => {
    const hasil = allocateTargets([target('L-A', 'A', 400)], groups, [], params, () => false);
    expect(hasil.unassigned).toHaveLength(1);
  });

  it('memecah lokasi besar melebihi 1.5 x Q antara beberapa kumpulan', () => {
    const hasil = allocateTargets([target('L-BESAR', 'A', 1200)], groups, [], params, alwaysEligible);
    expect(hasil.assignments).toHaveLength(2);
    expect(hasil.assignments.map((a) => a.assetCount)).toEqual([600, 600]);
    expect(hasil.assignments.map((a) => a.splitIndex)).toEqual([0, 1]);
  });

  it('tidak memecah lokasi kecil', () => {
    const hasil = allocateTargets([target('L-KECIL', 'A', 300)], groups, [], params, alwaysEligible);
    expect(hasil.assignments).toHaveLength(1);
  });

  it('mengagihkan beban secara seimbang (LPT)', () => {
    const hasil = allocateTargets(
      [target('L1', 'A', 400), target('L2', 'A', 380), target('L3', 'A', 200)],
      groups,
      [],
      params,
      alwaysEligible
    );
    const beban = Object.values(hasil.groupLoad).sort((a, b) => a - b);
    expect(beban[1] - beban[0]).toBeLessThanOrEqual(400);
  });
});

describe('buildPlan', () => {
  it('dua larian dengan input sama menghasilkan output identik', () => {
    const units = [
      unit('JKE', 800, 4),
      unit('JKM', 780, 4),
      unit('JKA', 200, 2),
      unit('JP', 150, 0),
    ];
    const targets = units.flatMap((u) => [
      { locationId: `${u.unitId}-L1`, unitId: u.unitId, assetCount: Math.round(u.assetCount / 2) },
      { locationId: `${u.unitId}-L2`, unitId: u.unitId, assetCount: Math.round(u.assetCount / 2) },
    ]);

    const a = buildPlan(units, officersFor(units), targets, params, alwaysEligible);
    const b = buildPlan(units, officersFor(units), targets, params, alwaysEligible);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('mencadang kuota seimbang jumlah aset / jumlah kumpulan', () => {
    const units = [unit('JKE', 800, 4), unit('JKM', 800, 4)];
    const plan = buildPlan(units, officersFor(units), [], params, alwaysEligible);
    expect(plan.suggestedQuota).toBe(400);
    expect(plan.groups).toHaveLength(4);
  });

  it('menyertakan zon dan memberi amaran beban rendah', () => {
    const units = [unit('JTMK', 150, 2), unit('JMSK', 120, 0)];
    const plan = buildPlan(units, officersFor(units), [], params, alwaysEligible);
    expect(plan.zones.length).toBeGreaterThan(0);
    expect(plan.warnings.some((w) => /di bawah sasaran/.test(w))).toBe(true);
  });

  it('memberi amaran kekurangan kumpulan apabila aset melebihi kapasiti', () => {
    const units = [unit('BESAR', 2000, 2)];
    const plan = buildPlan(units, officersFor(units), [], params, alwaysEligible);
    expect(plan.warnings.some((w) => /Kekurangan kumpulan/.test(w))).toBe(true);
  });

  it('mengira liputan terhadap jumlah aset sasaran', () => {
    const units = [unit('JKE', 800, 4), unit('JKM', 780, 4)];
    const targets = [target('L1', 'JKE', 400), target('L2', 'JKM', 380)];
    const plan = buildPlan(units, officersFor(units), targets, params, alwaysEligible);
    expect(plan.allocation.coverage).toBe(1);
  });
});
