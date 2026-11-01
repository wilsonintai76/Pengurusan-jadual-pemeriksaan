/**
 * Penjana mod pemeriksaan: pembentukan ZON, penentuan mod (TIMBAL_BALIK / SEHALA),
 * pembentukan kumpulan pemeriksa, dan agihan lokasi (LPT).
 *
 * Dua faktor menentukan mod bagi setiap unit:
 *   1. bilangan aset (KEW.PA-7)  — A
 *   2. bilangan pemeriksa aktif  — P, dengan G = floor(P/2) kumpulan
 *
 * Beban per kumpulan r = A / G. Timbal balik hanya wajar apabila r bagi kedua-dua
 * unit hampir sama DAN berada dalam jalur sasaran Q +/- tau (lalai 375 +/- 15%).
 * Unit yang r jauh di bawah jalur digabung dengan unit lain; unit yang jauh di atas
 * jalur memerlukan bantuan kumpulan lain. Zon gabungan berkongsi kolam pemeriksa
 * (termasuk merentas jabatan).
 *
 * Modul ini TULEN: tiada I/O, tiada Date.now(), tiada rawak. Semua susunan
 * menggunakan kunci deterministik supaya dua larian dengan input sama
 * menghasilkan output yang sama (syarat untuk audit & ujian unit).
 */

export type PairMode = 'TIMBAL_BALIK' | 'SEHALA';
export type OddUnitPolicy = 'SIMPANAN' | 'TIGA';

/** Bentuk zon: pasangan timbal balik, gabungan, tunggal, atau tanpa pemeriksa. */
export type ZoneKind = 'PASANGAN' | 'GABUNGAN' | 'TUNGGAL' | 'TANPA_PEMERIKSA';

export interface PairingParams {
  /** Q — sasaran aset bagi satu kumpulan (dua orang). */
  quota: number;
  /** tau — separuh lebar jalur sasaran DAN toleransi keseimbangan dua hala. */
  tolerance: number;
  /** Had keras beban bagi satu kumpulan (gandaan Q). */
  overload: number;
  /** Ambang pecahan lokasi besar (gandaan Q). */
  split: number;
  /** Rawatan unit dengan bilangan pemeriksa ganjil. */
  oddPolicy: OddUnitPolicy;
}

export const DEFAULT_PAIRING_PARAMS: PairingParams = {
  quota: 375,
  tolerance: 0.15,
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

/** Petunjuk untuk keutamaan gabungan (kekal deterministik). */
export interface ZoneHints {
  /** Rakan pemeriksaan silang rasmi bagi unit (departments.cross_partner_id). */
  crossPartnerByUnit?: Record<string, string>;
  /** Bangunan utama unit — untuk menggabung unit yang berhampiran. */
  buildingByUnit?: Record<string, string>;
}

export interface InspectionZone {
  id: string;
  /** Unit ahli, diisih menaik. */
  unitIds: string[];
  assetCount: number;
  inspectorCount: number;
  groupCount: number;
  /** r = A / G (0 apabila tiada kumpulan). */
  loadPerGroup: number;
  kind: ZoneKind;
  mode: PairMode;
  note: string;
}

export interface InspectorGroup {
  id: string;
  /** Unit utama kumpulan (unit ahli pertama bagi kumpulan campuran). */
  unitId: string;
  zoneId?: string;
  memberIds: string[];
  /** Ahli yang tersisa (unit ganjil, polisi SIMPANAN). */
  reserveMemberIds: string[];
  /** Ahli yang datang dari unit berbeza dalam zon gabungan. */
  crossUnit?: boolean;
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
  zoneId?: string;
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
  zones: InspectionZone[];
  groups: InspectorGroup[];
  decisions: PairDecision[];
  allocation: AllocationResult;
  /** Cadangan kuota seimbang: jumlah aset / jumlah kumpulan (0 jika tiada kumpulan). */
  suggestedQuota: number;
  /** Amaran yang perlu ditangani penyelaras (beban, liputan, kekurangan kumpulan). */
  warnings: string[];
}

const round = (value: number): number => Math.round(value * 1000) / 1000;

const byId = (a: { unitId: string }, b: { unitId: string }): number =>
  a.unitId.localeCompare(b.unitId);

/** G_u = floor(P_u / 2); polisi TIGA membenarkan kumpulan 3 orang bagi baki. */
export function computeGroupCount(
  inspectorCount: number,
  oddPolicy: OddUnitPolicy = 'SIMPANAN'
): number {
  if (inspectorCount < 2) return 0;
  if (inspectorCount % 2 === 0) return inspectorCount / 2;
  return oddPolicy === 'TIGA' ? Math.ceil(inspectorCount / 2) : Math.floor(inspectorCount / 2);
}

export interface JalurZon {
  /** Had bawah jalur sasaran: Q x (1 - tau). */
  min: number;
  /** Had atas jalur sasaran: Q x (1 + tau). */
  max: number;
  /** Had keras: Q x overload. */
  had: number;
}

export function jalurZon(params: PairingParams): JalurZon {
  return {
    min: round(params.quota * (1 - params.tolerance)),
    max: round(params.quota * (1 + params.tolerance)),
    had: round(params.quota * params.overload),
  };
}

/** r = A / G — aset yang perlu diperiksa oleh satu kumpulan. */
export function loadPerKumpulan(assetCount: number, groupCount: number): number {
  if (groupCount <= 0) return 0;
  return round(assetCount / groupCount);
}

export function dalamJalur(r: number, params: PairingParams): boolean {
  const jalur = jalurZon(params);
  return r >= jalur.min && r <= jalur.max;
}

/**
 * Ujian keseimbangan dua hala. Lulus hanya apabila:
 *   1. kedua-dua unit mempunyai sekurang-kurangnya satu kumpulan;
 *   2. beban kedua-dua arah tidak melebihi had keras (overload x Q);
 *   3. kedua-dua nisbah aset:kumpulan berada dalam jalur sasaran Q +/- tau; dan
 *   4. perbezaan beban dua arah tidak melebihi tau.
 */
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
  const jalur = jalurZon(params);

  if (weightAB > jalur.had || weightBA > jalur.had) {
    const over =
      weightAB > jalur.had
        ? `W(${a.unitId}->${b.unitId})=${round(weightAB)}`
        : `W(${b.unitId}->${a.unitId})=${round(weightBA)}`;
    return {
      ok: false,
      weightAB,
      weightBA,
      reason: `${over} melebihi had ${jalur.had} aset/kumpulan`,
    };
  }

  const ratioA = a.assetCount / a.groupCount;
  const ratioB = b.assetCount / b.groupCount;

  if (!dalamJalur(ratioA, params) || !dalamJalur(ratioB, params)) {
    const unitLuar = !dalamJalur(ratioA, params) ? a.unitId : b.unitId;
    const nilai = !dalamJalur(ratioA, params) ? ratioA : ratioB;
    return {
      ok: false,
      weightAB,
      weightBA,
      reason: `Beban ${unitLuar} ${round(nilai)} aset/kumpulan di luar jalur ${jalur.min}-${jalur.max}`,
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
    reason: `Seimbang - W ${round(weightAB)} : ${round(weightBA)} (delta ${round(imbalance * 100)}%) dalam jalur ${jalur.min}-${jalur.max}`,
  };
}

interface CalonZon {
  unitIds: string[];
  assetCount: number;
  inspectorCount: number;
  groupCount: number;
  kind: ZoneKind;
  note: string;
}

function gabungKeZon(zon: CalonZon, unit: UnitStat & { groupCount: number }): void {
  zon.unitIds = [...zon.unitIds, unit.unitId].sort();
  zon.assetCount += unit.assetCount;
  zon.inspectorCount += unit.inspectorCount;
  zon.groupCount += unit.groupCount;
  if (zon.kind === 'TUNGGAL' || zon.kind === 'TANPA_PEMERIKSA') zon.kind = 'GABUNGAN';
}

/**
 * Pilih zon hos untuk unit yang digabung. Pasangan TIMBAL_BALIK tidak pernah dipecahkan.
 * Keutamaan: rakan silang -> bangunan sama -> beban (jenis) -> jarak ke Q -> id zon.
 */
function cariZonHos(
  zon: CalonZon[],
  unit: UnitStat & { groupCount: number },
  jenis: 'KECIL' | 'TANPA',
  params: PairingParams,
  hints: ZoneHints
): number | null {
  const jalur = jalurZon(params);
  let terbaik: number | null = null;
  let skorTerbaik: number[] = [];
  let idTerbaik = '';

  zon.forEach((calon, index) => {
    if (calon.kind === 'PASANGAN') return;

    const jumlahKumpulan = calon.groupCount + unit.groupCount;
    if (jumlahKumpulan === 0) return;

    const rBaru = (calon.assetCount + unit.assetCount) / jumlahKumpulan;
    if (rBaru > jalur.had) return;

    const rakanSilang = hints.crossPartnerByUnit?.[unit.unitId];
    const silang = rakanSilang && calon.unitIds.includes(rakanSilang) ? 0 : 1;

    const bangunan = hints.buildingByUnit?.[unit.unitId];
    const bangunanSama =
      bangunan && calon.unitIds.some((id) => hints.buildingByUnit?.[id] === bangunan) ? 0 : 1;

    // Unit tanpa pemeriksa: cari zon paling lapang. Unit kecil: cari zon paling sarat.
    const beban = jenis === 'TANPA' ? rBaru : -rBaru;
    const skor = [silang, bangunanSama, beban, Math.abs(rBaru - params.quota)];

    if (terbaik === null) {
      terbaik = index;
      skorTerbaik = skor;
      idTerbaik = calon.unitIds[0];
      return;
    }

    const beza = skor.findIndex((nilai, i) => nilai !== skorTerbaik[i]);
    if (beza >= 0) {
      if (skor[beza] < skorTerbaik[beza]) {
        terbaik = index;
        skorTerbaik = skor;
        idTerbaik = calon.unitIds[0];
      }
      return;
    }

    if (calon.unitIds[0] < idTerbaik) {
      terbaik = index;
      skorTerbaik = skor;
      idTerbaik = calon.unitIds[0];
    }
  });

  return terbaik;
}

/**
 * Bentuk zon pemeriksaan:
 *   1. unit dalam jalur sasaran dipasangkan secara timbal balik apabila seimbang;
 *   2. unit melebihi jalur menjadi zon sendiri (perlu bantuan kumpulan lain);
 *   3. unit di bawah jalur dan unit tanpa pemeriksa digabung ke zon yang sesuai.
 */
export function binaZon(
  units: UnitStat[],
  params: PairingParams,
  hints: ZoneHints = {}
): InspectionZone[] {
  const jalur = jalurZon(params);

  const stats = [...units]
    .map((unit) => ({
      ...unit,
      groupCount: computeGroupCount(unit.inspectorCount, params.oddPolicy),
    }))
    .sort(byId);

  const rOf = (unit: UnitStat & { groupCount: number }) =>
    loadPerKumpulan(unit.assetCount, unit.groupCount);

  const denganKumpulan = stats.filter((unit) => unit.groupCount > 0);
  const tanpaKumpulan = stats.filter((unit) => unit.groupCount === 0);

  const fit = denganKumpulan
    .filter((unit) => rOf(unit) >= jalur.min && rOf(unit) <= jalur.max)
    .sort((a, b) => rOf(a) - rOf(b) || byId(a, b));

  const kecil = denganKumpulan
    .filter((unit) => rOf(unit) < jalur.min)
    .sort((a, b) => rOf(a) - rOf(b) || byId(a, b));

  const over = denganKumpulan
    .filter((unit) => rOf(unit) > jalur.max)
    .sort((a, b) => rOf(b) - rOf(a) || byId(a, b));

  const zon: CalonZon[] = [];

  const buatZon = (
    unit: UnitStat & { groupCount: number },
    kind: ZoneKind,
    note: string
  ): void => {
    zon.push({
      unitIds: [unit.unitId],
      assetCount: unit.assetCount,
      inspectorCount: unit.inspectorCount,
      groupCount: unit.groupCount,
      kind,
      note,
    });
  };

  // 1. Pasangan timbal balik antara unit dalam jalur sasaran.
  const belumPasang = [...fit];
  while (belumPasang.length > 0) {
    const a = belumPasang.shift() as UnitStat & { groupCount: number };
    let indeks = -1;

    for (let i = 0; i < belumPasang.length; i += 1) {
      if (evaluatePairing(a, belumPasang[i], params).ok) {
        indeks = i;
        break;
      }
    }

    if (indeks < 0) {
      buatZon(a, 'TUNGGAL', `Beban ${rOf(a)} aset/kumpulan - tiada rakan seimbang dalam jalur`);
      continue;
    }

    const b = belumPasang.splice(indeks, 1)[0];
    zon.push({
      unitIds: [a.unitId, b.unitId].sort(),
      assetCount: a.assetCount + b.assetCount,
      inspectorCount: a.inspectorCount + b.inspectorCount,
      groupCount: a.groupCount + b.groupCount,
      kind: 'PASANGAN',
      note: `Timbal balik ${a.unitId} <-> ${b.unitId} - beban ${rOf(a)} : ${rOf(b)} aset/kumpulan`,
    });
  }

  // 2. Unit melebihi jalur: zon sendiri, perlu bantuan kumpulan dari zon gabungan.
  over.forEach((unit) => {
    buatZon(
      unit,
      'TUNGGAL',
      `Beban ${rOf(unit)} aset/kumpulan melebihi ${jalur.max} - perlu bantuan kumpulan lain`
    );
  });

  // 3. Unit tanpa pemeriksa dikumpul dalam satu kolam, kemudian unit kecil digabung
  //    ke zon yang paling sesuai (termasuk kolam itu — di sinilah pemeriksa unit kecil
  //    memikul aset unit yang tiada pemeriksa).
  if (tanpaKumpulan.length > 0) {
    zon.push({
      unitIds: tanpaKumpulan.map((unit) => unit.unitId).sort(),
      assetCount: tanpaKumpulan.reduce((sum, unit) => sum + unit.assetCount, 0),
      inspectorCount: 0,
      groupCount: 0,
      kind: 'TANPA_PEMERIKSA',
      note: 'Tiada pemeriksa aktif - aset perlu diperiksa unit lain',
    });
  }

  for (const unit of kecil) {
    const hos = cariZonHos(zon, unit, 'KECIL', params, hints);
    if (hos !== null) {
      gabungKeZon(zon[hos], unit);
      continue;
    }
    buatZon(unit, 'TUNGGAL', `Beban ${rOf(unit)} aset/kumpulan di bawah ${jalur.min}`);
  }

  // 4. Kolam yang masih tiada pemeriksa diserap oleh zon yang paling lapang.
  zon
    .filter((calon) => calon.kind === 'TANPA_PEMERIKSA')
    .forEach((kolam) => {
      let hos: CalonZon | null = null;
      let rTerendah = Number.POSITIVE_INFINITY;

      zon.forEach((calon) => {
        if (calon === kolam || calon.groupCount === 0) return;
        const rBaru = (calon.assetCount + kolam.assetCount) / calon.groupCount;
        if (rBaru > jalur.had) return;
        if (rBaru < rTerendah || (rBaru === rTerendah && hos && calon.unitIds[0] < hos.unitIds[0])) {
          hos = calon;
          rTerendah = rBaru;
        }
      });

      if (!hos) return;
      const sasaran: CalonZon = hos;
      sasaran.unitIds = [...sasaran.unitIds, ...kolam.unitIds].sort();
      sasaran.assetCount += kolam.assetCount;
      sasaran.inspectorCount += kolam.inspectorCount;
      sasaran.groupCount += kolam.groupCount;
      if (sasaran.kind === 'TUNGGAL' || sasaran.kind === 'TANPA_PEMERIKSA') sasaran.kind = 'GABUNGAN';
      zon.splice(zon.indexOf(kolam), 1);
    });

  return [...zon]
    .sort((a, b) => a.unitIds[0].localeCompare(b.unitIds[0]))
    .map((calonZon, index) => {
      const id = `ZON-${String(index + 1).padStart(2, '0')}`;
      const mod = tentukanModZon(calonZon, params);
      const beban = loadPerKumpulan(calonZon.assetCount, calonZon.groupCount);
      const nota =
        calonZon.kind === 'GABUNGAN'
          ? `Gabungan ${calonZon.unitIds.length} unit - ${calonZon.assetCount} aset / ${calonZon.groupCount} kumpulan (${beban} aset/kumpulan)`
          : calonZon.note || mod.reason;

      return {
        id,
        unitIds: calonZon.unitIds,
        assetCount: calonZon.assetCount,
        inspectorCount: calonZon.inspectorCount,
        groupCount: calonZon.groupCount,
        loadPerGroup: beban,
        kind: calonZon.kind,
        mode: mod.mode,
        note: nota,
      };
    });
}

/** Mod bagi satu zon: TIMBAL_BALIK hanya untuk pasangan dua unit yang seimbang. */
export function tentukanModZon(
  zon: Pick<CalonZon, 'unitIds' | 'kind' | 'groupCount'>,
  params: PairingParams
): { mode: PairMode; reason: string } {
  const jalur = jalurZon(params);

  if (zon.groupCount === 0) {
    return { mode: 'SEHALA', reason: 'Tiada pemeriksa aktif dalam zon' };
  }
  if (zon.unitIds.length < 2) {
    return {
      mode: 'SEHALA',
      reason: `Zon satu unit - tiada rakan untuk timbal balik (sasaran ${jalur.min}-${jalur.max})`,
    };
  }
  if (zon.kind === 'PASANGAN') {
    return { mode: 'TIMBAL_BALIK', reason: 'Dua unit seimbang dalam jalur sasaran' };
  }
  return {
    mode: 'SEHALA',
    reason: `Zon gabungan ${zon.unitIds.length} unit - kolam pemeriksa terbuka`,
  };
}

/** Keputusan mod per unit (satu rekod bagi setiap unit dalam setiap zon). */
export function pairUnits(
  units: UnitStat[],
  params: PairingParams,
  hints: ZoneHints = {}
): PairDecision[] {
  const zon = binaZon(units, params, hints);
  const stats = new Map(units.map((unit) => [unit.unitId, unit]));

  return zon.flatMap<PairDecision>((zona) => {
    if (zona.mode === 'TIMBAL_BALIK' && zona.unitIds.length === 2) {
      const [idA, idB] = zona.unitIds;
      const a = stats.get(idA);
      const b = stats.get(idB);
      if (a && b) {
        const ga = computeGroupCount(a.inspectorCount, params.oddPolicy);
        const gb = computeGroupCount(b.inspectorCount, params.oddPolicy);
        return [
          {
            unitA: idA,
            unitB: idB,
            mode: 'TIMBAL_BALIK',
            weightAB: ga > 0 ? round(b.assetCount / ga) : null,
            weightBA: gb > 0 ? round(a.assetCount / gb) : null,
            reason: zona.note,
            zoneId: zona.id,
          },
        ];
      }
    }

    return zona.unitIds.map((unitId) => ({
      unitA: unitId,
      unitB: null,
      mode: 'SEHALA' as const,
      weightAB: null,
      weightBA: null,
      reason: zona.note,
      zoneId: zona.id,
    }));
  });
}

/**
 * Bentuk kumpulan: pasangkan pemeriksa dalam unit sendiri dahulu, kemudian baki
 * unit berbeza dalam zon yang sama (gabungan merentas jabatan).
 */
export function formGroups(
  units: UnitStat[],
  officers: OfficerRef[],
  params: PairingParams,
  zones?: InspectionZone[]
): InspectorGroup[] {
  const stats = new Map(units.map((unit) => [unit.unitId, unit]));

  const zonBerkesan: Array<{ id: string; unitIds: string[] }> =
    zones && zones.length > 0
      ? [...zones]
      : [...stats.keys()].sort().map((unitId) => ({ id: `ZON-${unitId}`, unitIds: [unitId] }));

  const unitDalamZon = new Set(zonBerkesan.flatMap((zona) => zona.unitIds));
  const groups: InspectorGroup[] = [];

  for (const zona of zonBerkesan) {
    const kumpulanZon: InspectorGroup[] = [];
    const baki: string[] = [];

    for (const unitId of [...zona.unitIds].sort()) {
      const members = officers
        .filter((officer) => officer.unitId === unitId)
        .map((officer) => officer.officerId)
        .sort((a, b) => a.localeCompare(b));

      let cursor = 0;
      let indeks = 0;

      while (cursor + 1 < members.length) {
        const isLastPair = cursor + 4 > members.length;
        const useTriple =
          params.oddPolicy === 'TIGA' &&
          members.length % 2 === 1 &&
          isLastPair &&
          cursor + 3 === members.length;

        const memberIds = useTriple
          ? members.slice(cursor, cursor + 3)
          : members.slice(cursor, cursor + 2);

        indeks += 1;
        kumpulanZon.push({
          id: `GRP-${unitId}-${String(indeks).padStart(2, '0')}`,
          unitId,
          zoneId: zona.id,
          memberIds,
          reserveMemberIds: [],
        });
        cursor += memberIds.length;
      }

      if (cursor < members.length) baki.push(members[cursor]);
    }

    // Baki unit berbeza dalam zon gabungan dipasangkan (termasuk merentas jabatan).
    const bakiTersusun = [...baki].sort((a, b) => a.localeCompare(b));
    let silang = 0;
    let digunakan = 0;

    for (; digunakan + 1 < bakiTersusun.length; digunakan += 2) {
      silang += 1;
      kumpulanZon.push({
        id: `GRP-${zona.id}-X${String(silang).padStart(2, '0')}`,
        unitId: zona.unitIds[0],
        zoneId: zona.id,
        memberIds: [bakiTersusun[digunakan], bakiTersusun[digunakan + 1]],
        reserveMemberIds: [],
        crossUnit: true,
      });
    }

    if (digunakan < bakiTersusun.length) {
      const sisa = bakiTersusun[digunakan];
      const terakhir = kumpulanZon.filter((group) => group.memberIds.length > 0).at(-1);
      if (terakhir) terakhir.reserveMemberIds = [sisa];
      else
        kumpulanZon.push({
          id: `GRP-${zona.id}-RSV`,
          unitId: zona.unitIds[0],
          zoneId: zona.id,
          memberIds: [],
          reserveMemberIds: [sisa],
        });
    }

    groups.push(...kumpulanZon);
  }

  // Unit di luar mana-mana zon (jika pemanggil menghantar subset zon).
  const unitTanpaZon = [...stats.keys()].filter((unitId) => !unitDalamZon.has(unitId)).sort();
  for (const unitId of unitTanpaZon) {
    const members = officers
      .filter((officer) => officer.unitId === unitId)
      .map((officer) => officer.officerId)
      .sort((a, b) => a.localeCompare(b));

    for (let i = 0; i + 1 < members.length; i += 2) {
      groups.push({
        id: `GRP-${unitId}-${String(i / 2 + 1).padStart(2, '0')}`,
        unitId,
        memberIds: [members[i], members[i + 1]],
        reserveMemberIds: [],
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
 * Agihan LPT (Longest Processing Time first): lokasi terbesar dahulu, diberi kepada
 * kumpulan layak dengan beban terendah.
 *
 * TIMBAL_BALIK -> kolam tertutup (kumpulan rakan sahaja).
 * SEHALA       -> kolam terbuka semua kumpulan sehala; unit lain diutamakan supaya
 *                 pemeriksa tidak memeriksa ruang jabatan sendiri.
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
      return (groupsByUnit.get(partner) ?? []).map((group) => ({
        group,
        direction: 'TIMBAL_BALIK' as const,
      }));
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

    const chunkCount = Math.min(
      ordered.length,
      Math.max(2, Math.ceil(target.assetCount / params.quota))
    );
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

/** Amaran yang perlu ditangani penyelaras sebelum pelan dikunci. */
function binaAmaran(plan: {
  params: PairingParams;
  zones: InspectionZone[];
  groups: InspectorGroup[];
  allocation: AllocationResult;
}): string[] {
  const jalur = jalurZon(plan.params);
  const amaran: string[] = [];

  plan.zones.forEach((zona) => {
    if (zona.groupCount === 0) return;
    if (zona.loadPerGroup > jalur.had) {
      amaran.push(
        `${zona.id} (${zona.unitIds.join(' + ')}): ${zona.loadPerGroup} aset/kumpulan melebihi had ${jalur.had}.`
      );
    } else if (zona.loadPerGroup < jalur.min) {
      amaran.push(
        `${zona.id} (${zona.unitIds.join(' + ')}): hanya ${zona.loadPerGroup} aset/kumpulan - di bawah sasaran ${jalur.min}.`
      );
    }
    if (zona.kind === 'TANPA_PEMERIKSA') {
      amaran.push(
        `${zona.id} (${zona.unitIds.join(' + ')}): tiada pemeriksa aktif - aset bergantung pada zon lain.`
      );
    }
  });

  const jumlahKumpulan = plan.groups.filter((group) => group.memberIds.length > 0).length;
  const jumlahAset = plan.zones.reduce((sum, zona) => sum + zona.assetCount, 0);

  if (jumlahKumpulan > 0 && jumlahAset > jumlahKumpulan * jalur.had) {
    const perlu = Math.ceil(jumlahAset / jalur.had) - jumlahKumpulan;
    amaran.push(
      `Kekurangan kumpulan: ${jumlahAset} aset memerlukan ${Math.ceil(jumlahAset / jalur.had)} kumpulan pada had ${jalur.had}, hanya ${jumlahKumpulan} tersedia (tambah ${perlu}).`
    );
  }

  Object.entries(plan.allocation.groupLoad).forEach(([groupId, beban]) => {
    if (beban > jalur.had) {
      amaran.push(`Kumpulan ${groupId} menerima ${round(beban)} aset - melebihi had ${jalur.had}.`);
    }
  });

  if (plan.allocation.unassigned.length > 0) {
    amaran.push(
      `${plan.allocation.unassigned.length} lokasi tidak dapat diagihkan (konflik PBAC atau tiada kumpulan layak).`
    );
  }

  return amaran;
}

/** Bangunkan pelan penuh (zon -> kumpulan -> mod -> agihan) tanpa menyimpan apa-apa. */
export function buildPlan(
  units: UnitStat[],
  officers: OfficerRef[],
  targets: TargetLocation[],
  params: PairingParams,
  canGroupInspect: GroupEligibility,
  hints: ZoneHints = {}
): PlanResult {
  const zones = binaZon(units, params, hints);
  const groups = formGroups(units, officers, params, zones);
  const decisions = pairUnits(units, params, hints);
  const allocation = allocateTargets(targets, groups, decisions, params, canGroupInspect);

  const totalAssets = units.reduce((sum, unit) => sum + unit.assetCount, 0);
  const totalGroups = groups.filter((group) => group.memberIds.length > 0).length;

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
      .sort(byId),
    zones,
    groups,
    decisions,
    allocation,
    suggestedQuota: totalGroups === 0 ? 0 : Math.round(totalAssets / totalGroups),
    warnings: binaAmaran({ params, zones, groups, allocation }),
  };
}
