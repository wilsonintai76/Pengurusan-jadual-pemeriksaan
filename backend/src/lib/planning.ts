import type { DB } from './db';
import {
  DEFAULT_PAIRING_PARAMS,
  buildPlan,
  type InspectorGroup,
  type OfficerRef,
  type PairingParams,
  type PlanResult,
  type TargetLocation,
  type UnitStat,
} from './pairing';
import { isActiveOn, listAssignmentsForOfficer, type AssignmentRow } from './roles';
import type { CycleRow } from './cycles';

export interface CycleParamsRow extends PairingParams {
  cycleId: string;
  planVersion: number;
  lockedAt: string | null;
}

const PARAM_COLUMNS: Record<string, keyof PairingParams> = {
  quota_q: 'quota',
  tolerance_tau: 'tolerance',
  overload_factor: 'overload',
  split_factor: 'split',
};

/** Parameter kitaran; dicipta dengan nilai lalai jika belum ada. */
export async function getCycleParams(db: DB, cycleId: string): Promise<CycleParamsRow> {
  const row = await db
    .prepare(
      `SELECT cycle_id AS cycleId, quota_q AS quota, tolerance_tau AS tolerance,
              overload_factor AS overload, split_factor AS split,
              odd_unit_policy AS oddPolicy, plan_version AS planVersion, locked_at AS lockedAt
       FROM cycle_parameters WHERE cycle_id = ? LIMIT 1`
    )
    .bind(cycleId)
    .first<CycleParamsRow>();

  if (row) return row;

  await db
    .prepare('INSERT INTO cycle_parameters (cycle_id) VALUES (?) ON CONFLICT(cycle_id) DO NOTHING')
    .bind(cycleId)
    .run();

  return {
    cycleId,
    ...DEFAULT_PAIRING_PARAMS,
    planVersion: 0,
    lockedAt: null,
  };
}

export interface ParamsPatch {
  quota?: number;
  tolerance?: number;
  overload?: number;
  split?: number;
  oddPolicy?: 'SIMPANAN' | 'TIGA';
}

/** Kemas kini parameter (disahkan & dihadkan kepada julat munasabah). */
export async function updateCycleParams(
  db: DB,
  cycleId: string,
  patch: ParamsPatch
): Promise<CycleParamsRow> {
  await getCycleParams(db, cycleId);

  const assignments: string[] = [];
  const params: unknown[] = [];

  if (patch.quota !== undefined) {
    if (!Number.isFinite(patch.quota) || patch.quota < 10 || patch.quota > 5000) {
      throw new Error('Kuota Q mesti antara 10 dan 5000 aset.');
    }
    assignments.push('quota_q = ?');
    params.push(patch.quota);
  }
  if (patch.tolerance !== undefined) {
    if (!Number.isFinite(patch.tolerance) || patch.tolerance < 0 || patch.tolerance > 1) {
      throw new Error('Toleransi τ mesti antara 0 dan 1.');
    }
    assignments.push('tolerance_tau = ?');
    params.push(patch.tolerance);
  }
  if (patch.overload !== undefined) {
    if (!Number.isFinite(patch.overload) || patch.overload < 1 || patch.overload > 3) {
      throw new Error('Faktor beban mesti antara 1 dan 3.');
    }
    assignments.push('overload_factor = ?');
    params.push(patch.overload);
  }
  if (patch.split !== undefined) {
    if (!Number.isFinite(patch.split) || patch.split < 1 || patch.split > 5) {
      throw new Error('Faktor pecah mesti antara 1 dan 5.');
    }
    assignments.push('split_factor = ?');
    params.push(patch.split);
  }
  if (patch.oddPolicy !== undefined) {
    if (!['SIMPANAN', 'TIGA'].includes(patch.oddPolicy)) {
      throw new Error("Polisi unit ganjil mesti 'SIMPANAN' atau 'TIGA'.");
    }
    assignments.push('odd_unit_policy = ?');
    params.push(patch.oddPolicy);
  }

  if (assignments.length > 0) {
    await db
      .prepare(
        `UPDATE cycle_parameters SET ${assignments.join(', ')}, updated_at = datetime('now')
         WHERE cycle_id = ?`
      )
      .bind(...params, cycleId)
      .run();
  }

  return getCycleParams(db, cycleId);
}

export interface PlanInputs {
  units: UnitStat[];
  officers: OfficerRef[];
  targets: TargetLocation[];
}

/**
 * Memuatkan unit (aset + pemeriksa aktif), senarai pegawai, dan lokasi sasaran
 * pada tarikh rujukan kitaran. Kiraan aset menggunakan `assets`; jika tiada
 * baris aset, jatuh kepada jumlah `inspection_schedules.kuantiti` bagi unit itu.
 */
export async function loadPlanInputs(db: DB, cycle: CycleRow): Promise<PlanInputs> {
  const date = cycle.tarikhMula;

  const { results: units } = await db
    .prepare(
      `SELECT
         d.id AS unitId,
         COALESCE((
           SELECT SUM(l.asset_total) FROM (
             SELECT l2.id, (
               SELECT COUNT(*) FROM assets a WHERE a.location_id = l2.id
             ) AS asset_total
             FROM locations l2 WHERE l2.department_id = d.id
           ) l
         ), 0) AS assetCount,
         (
           SELECT COUNT(*) FROM officers o
           JOIN role_assignments ra ON ra.officer_id = o.id
           WHERE o.department_id = d.id AND ra.role_id = 'PEMERIKSA' AND ra.status = 'AKTIF'
             AND ra.valid_from <= ? AND (ra.valid_to IS NULL OR ra.valid_to >= ?)
         ) AS inspectorCount
       FROM departments d
       LEFT JOIN department_settings ds ON ds.department_id = d.id
       WHERE COALESCE(ds.is_operational, 1) = 1
       ORDER BY d.id ASC`
    )
    .bind(date, date)
    .all<{ unitId: string; assetCount: number; inspectorCount: number }>();

  const unitStats: UnitStat[] = (units ?? []).map((unit) => ({
    unitId: unit.unitId,
    assetCount: Number(unit.assetCount) || 0,
    inspectorCount: Number(unit.inspectorCount) || 0,
  }));

  // Sandaran kiraan aset daripada jadual pemeriksaan apabila `assets` kosong.
  const { results: scheduleTotals } = await db
    .prepare(
      `SELECT department_id AS unitId, SUM(kuantiti) AS total FROM (
         SELECT s.department_id, COALESCE(r.kuantiti_diperiksa, 0) AS kuantiti
         FROM inspection_schedules s
         LEFT JOIN inspection_reports r ON r.schedule_id = s.id
       ) GROUP BY department_id`
    )
    .all<{ unitId: string; total: number }>();

  const fallback = new Map((scheduleTotals ?? []).map((row) => [row.unitId, Number(row.total) || 0]));
  unitStats.forEach((unit) => {
    if (unit.assetCount === 0) unit.assetCount = fallback.get(unit.unitId) ?? 0;
  });

  const { results: officers } = await db
    .prepare(
      `SELECT DISTINCT o.id AS officerId, o.department_id AS unitId
       FROM officers o
       JOIN role_assignments ra ON ra.officer_id = o.id
       WHERE ra.role_id = 'PEMERIKSA' AND ra.status = 'AKTIF'
         AND ra.valid_from <= ? AND (ra.valid_to IS NULL OR ra.valid_to >= ?)
       ORDER BY o.id ASC`
    )
    .bind(date, date)
    .all<{ officerId: string; unitId: string }>();

  const { results: targets } = await db
    .prepare(
      `SELECT l.id AS locationId, l.department_id AS unitId,
              (SELECT COUNT(*) FROM assets a WHERE a.location_id = l.id) AS assetCount
       FROM locations l
       ORDER BY l.id ASC`
    )
    .all<{ locationId: string; unitId: string; assetCount: number }>();

  const targetList: TargetLocation[] = (targets ?? []).map((target) => ({
    locationId: target.locationId,
    unitId: target.unitId,
    assetCount: Number(target.assetCount) || 0,
  }));

  return { units: unitStats, officers: officers ?? [], targets: targetList };
}

/** Indeks konflik untuk semakan peringkat kumpulan (O(1) setiap lokasi). */
export interface ConflictIndex {
  supervisorsByLocation: Map<string, Set<string>>;
  supervisorsByDepartment: Map<string, Set<string>>;
  assetOfficersByDepartment: Map<string, Set<string>>;
  custodiansByLocation: Map<string, Set<string>>;
}

export async function buildConflictIndex(db: DB, cycle: CycleRow): Promise<ConflictIndex> {
  const date = cycle.tarikhMula;

  const { results: assignments } = await db
    .prepare(
      `SELECT officer_id AS officerId, role_id AS roleId, scope_type AS scopeType, scope_id AS scopeId
       FROM role_assignments
       WHERE status = 'AKTIF' AND valid_from <= ? AND (valid_to IS NULL OR valid_to >= ?)
         AND role_id IN ('PENYELIA_LOKASI','PENOLONG_PEGAWAI_ASET')`
    )
    .bind(date, date)
    .all<{ officerId: string; roleId: string; scopeType: string; scopeId: string | null }>();

  const { results: custodians } = await db
    .prepare('SELECT officer_id AS officerId, location_id AS locationId FROM location_custodians')
    .all<{ officerId: string; locationId: string }>();

  const index: ConflictIndex = {
    supervisorsByLocation: new Map(),
    supervisorsByDepartment: new Map(),
    assetOfficersByDepartment: new Map(),
    custodiansByLocation: new Map(),
  };

  const push = (map: Map<string, Set<string>>, key: string | null, value: string) => {
    if (!key) return;
    const set = map.get(key) ?? new Set<string>();
    set.add(value);
    map.set(key, set);
  };

  (assignments ?? []).forEach((assignment) => {
    if (!assignment.scopeId) return;
    if (assignment.roleId === 'PENYELIA_LOKASI') {
      if (assignment.scopeType === 'LOCATION') push(index.supervisorsByLocation, assignment.scopeId, assignment.officerId);
      else push(index.supervisorsByDepartment, assignment.scopeId, assignment.officerId);
    }
    if (assignment.roleId === 'PENOLONG_PEGAWAI_ASET' && assignment.scopeType === 'DEPARTMENT') {
      push(index.assetOfficersByDepartment, assignment.scopeId, assignment.officerId);
    }
  });

  (custodians ?? []).forEach((custodian) => {
    push(index.custodiansByLocation, custodian.locationId, custodian.officerId);
  });

  return index;
}

/** Semakan kelayakan peringkat kumpulan: SEMUA ahli mesti bebas konflik. */
export function makeGroupEligibility(
  index: ConflictIndex,
  membersByGroup: Map<string, string[]>
): (group: InspectorGroup, target: TargetLocation) => boolean {
  return (group, target) => {
    const members = membersByGroup.get(group.id) ?? group.memberIds;
    if (members.length === 0) return false;

    return members.every((member) => {
      if (index.supervisorsByLocation.get(target.locationId)?.has(member)) return false;
      if (index.supervisorsByDepartment.get(target.unitId)?.has(member)) return false;
      if (index.assetOfficersByDepartment.get(target.unitId)?.has(member)) return false;
      if (index.custodiansByLocation.get(target.locationId)?.has(member)) return false;
      return true;
    });
  };
}

export interface PlanPreview extends PlanResult {
  cycle: { id: string; kod: string; tarikhMula: string; tarikhTamat: string };
  planVersion: number;
  activeInspectors: number;
}

/** Jana pratonton pelan (tiada penulisan). */
export async function previewPlan(db: DB, cycle: CycleRow): Promise<PlanPreview> {
  const params = await getCycleParams(db, cycle.id);
  const { units, officers, targets } = await loadPlanInputs(db, cycle);
  const index = await buildConflictIndex(db, cycle);

  const plan = buildPlan(units, officers, targets, params, (group, target) => {
    const members = group.memberIds;
    if (members.length === 0) return false;
    return members.every((member) => {
      if (index.supervisorsByLocation.get(target.locationId)?.has(member)) return false;
      if (index.supervisorsByDepartment.get(target.unitId)?.has(member)) return false;
      if (index.assetOfficersByDepartment.get(target.unitId)?.has(member)) return false;
      if (index.custodiansByLocation.get(target.locationId)?.has(member)) return false;
      return true;
    });
  });

  return {
    ...plan,
    cycle: {
      id: cycle.id,
      kod: cycle.kod,
      tarikhMula: cycle.tarikhMula,
      tarikhTamat: cycle.tarikhTamat,
    },
    planVersion: params.planVersion,
    activeInspectors: officers.length,
  };
}

export interface LockResult {
  planVersion: number;
  groups: number;
  pairings: number;
  targets: number;
  schedulesCreated: number;
  assignmentsCreated: number;
  preservedTargets: number;
}

/**
 * Mengunci pelan: menulis kumpulan, pasangan, target, jadual dan slot.
 * Lokasi yang jadualnya sudah `Selesai` dikekalkan (tidak diagih semula).
 */
export async function lockPlan(
  db: DB,
  cycle: CycleRow,
  createdById?: string | null
): Promise<LockResult> {
  const preview = await previewPlan(db, cycle);
  const nextVersion = preview.planVersion + 1;

  try {
    return await writePlan(db, cycle, preview, nextVersion, createdById);
  } catch (error) {
    // Gulung balik: buang semua tulisan bagi versi yang gagal supaya pelan lama kekal utuh.
    await rollbackPlan(db, cycle.id, nextVersion);
    throw error;
  }
}

async function rollbackPlan(db: DB, cycleId: string, version: number): Promise<void> {
  try {
    await db.prepare('DELETE FROM group_targets WHERE cycle_id = ? AND plan_version = ?').bind(cycleId, version).run();
    await db
      .prepare(
        'DELETE FROM group_members WHERE group_id IN (SELECT id FROM inspector_groups WHERE cycle_id = ? AND plan_version = ?)'
      )
      .bind(cycleId, version)
      .run();
    await db
      .prepare('DELETE FROM inspector_groups WHERE cycle_id = ? AND plan_version = ?')
      .bind(cycleId, version)
      .run();
    await db
      .prepare('DELETE FROM unit_pairings WHERE cycle_id = ? AND plan_version = ?')
      .bind(cycleId, version)
      .run();
    await db
      .prepare('DELETE FROM cycle_unit_stats WHERE cycle_id = ? AND plan_version = ?')
      .bind(cycleId, version)
      .run();
    await db
      .prepare(
        `UPDATE cycle_parameters SET plan_version = ?, updated_at = datetime('now') WHERE cycle_id = ?`
      )
      .bind(version - 1, cycleId)
      .run();
  } catch (rollbackError) {
    console.error('[plan] Gulung balik pelan gagal:', rollbackError);
  }
}

async function writePlan(
  db: DB,
  cycle: CycleRow,
  preview: PlanPreview,
  nextVersion: number,
  createdById?: string | null
): Promise<LockResult> {

  const { results: completed } = await db
    .prepare(
      `SELECT DISTINCT gt.location_id AS locationId
       FROM group_targets gt
       JOIN inspection_schedules s ON s.id = gt.schedule_id
       WHERE gt.cycle_id = ? AND s.status_id = 'SELESAI'`
    )
    .bind(cycle.id)
    .all<{ locationId: string }>();

  const preserved = new Set((completed ?? []).map((row) => row.locationId));

  // Bersihkan pelan lama (kecuali lokasi yang sudah selesai).
  await db
    .prepare(
      `DELETE FROM group_targets
       WHERE cycle_id = ? AND (schedule_id IS NULL OR schedule_id NOT IN (
         SELECT id FROM inspection_schedules WHERE status_id = 'SELESAI'
       ))`
    )
    .bind(cycle.id)
    .run();

  await db.prepare('DELETE FROM group_members WHERE group_id IN (SELECT id FROM inspector_groups WHERE cycle_id = ?)')
    .bind(cycle.id)
    .run();
  await db.prepare('DELETE FROM inspector_groups WHERE cycle_id = ?').bind(cycle.id).run();
  await db.prepare('DELETE FROM unit_pairings WHERE cycle_id = ?').bind(cycle.id).run();

  const membersByGroup = new Map<string, string[]>();
  preview.groups.forEach((group) => membersByGroup.set(group.id, group.memberIds));

  for (const unit of preview.units) {
    await db
      .prepare(
        `INSERT INTO cycle_unit_stats
           (id, cycle_id, unit_id, asset_count, inspector_count, group_count, reserve_count, plan_version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(cycle_id, unit_id, plan_version) DO UPDATE SET
           asset_count = excluded.asset_count,
           inspector_count = excluded.inspector_count,
           group_count = excluded.group_count,
           reserve_count = excluded.reserve_count`
      )
      .bind(
        `CUS-${cycle.id.slice(-6)}-${unit.unitId}-${nextVersion}`,
        cycle.id,
        unit.unitId,
        unit.assetCount,
        unit.inspectorCount,
        unit.groupCount,
        unit.reserveCount,
        nextVersion
      )
      .run();
  }

  for (const group of preview.groups) {
    const id = `IG-${cycle.id.slice(-6)}-${group.id}-${nextVersion}`;
    await db
      .prepare(
        `INSERT INTO inspector_groups (id, cycle_id, unit_id, label, size, plan_version)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(id, cycle.id, group.unitId, group.id, group.memberIds.length, nextVersion)
      .run();

    let position = 0;
    for (const member of group.memberIds) {
      position += 1;
      await db
        .prepare(
          `INSERT INTO group_members (id, group_id, officer_id, position, is_reserve)
           VALUES (?, ?, ?, ?, 0)`
        )
        .bind(`GM-${id}-${position}`, id, member, position)
        .run();
    }
    for (const reserve of group.reserveMemberIds) {
      position += 1;
      await db
        .prepare(
          `INSERT INTO group_members (id, group_id, officer_id, position, is_reserve)
           VALUES (?, ?, ?, ?, 1)`
        )
        .bind(`GM-${id}-${position}`, id, reserve, position)
        .run();
    }
  }

  for (const decision of preview.decisions) {
    await db
      .prepare(
        `INSERT INTO unit_pairings
           (id, cycle_id, unit_a, unit_b, mode, weight_ab, weight_ba, reason, plan_version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        `UP-${cycle.id.slice(-6)}-${decision.unitA}-${nextVersion}`,
        cycle.id,
        decision.unitA,
        decision.unitB,
        decision.mode,
        decision.weightAB,
        decision.weightBA,
        decision.reason,
        nextVersion
      )
      .run();
  }

  const groupIdByKey = new Map<string, string>();
  const { results: storedGroups } = await db
    .prepare('SELECT id, label FROM inspector_groups WHERE cycle_id = ? AND plan_version = ?')
    .bind(cycle.id, nextVersion)
    .all<{ id: string; label: string }>();
  (storedGroups ?? []).forEach((row) => groupIdByKey.set(row.label, row.id));

  let schedulesCreated = 0;
  let assignmentsCreated = 0;
  let targetsWritten = 0;

  for (const assignment of preview.allocation.assignments) {
    const groupId = groupIdByKey.get(assignment.groupId);
    if (!groupId) continue;

    const existingTarget = await db
      .prepare(
        `SELECT id, schedule_id AS scheduleId FROM group_targets
         WHERE cycle_id = ? AND location_id = ? AND split_index = ? AND plan_version < ? LIMIT 1`
      )
      .bind(cycle.id, assignment.locationId, assignment.splitIndex, nextVersion)
      .first<{ id: string; scheduleId: string | null }>();

    if (preserved.has(assignment.locationId) && existingTarget?.scheduleId) {
      await db
        .prepare(
          `UPDATE group_targets SET group_id = ?, plan_version = ?
           WHERE id = ?`
        )
        .bind(groupId, nextVersion, existingTarget.id)
        .run();
      continue;
    }

    const members = membersByGroup.get(assignment.groupId) ?? [];
    const [pemeriksa1, pemeriksa2] = members;

    const scheduleId = `JAD-${cycle.id.slice(-4)}-${assignment.locationId.slice(-6)}-${assignment.splitIndex}`;

    const scheduleExists = await db
      .prepare('SELECT id FROM inspection_schedules WHERE id = ? LIMIT 1')
      .bind(scheduleId)
      .first<{ id: string }>();

    if (!scheduleExists) {
      const departmentId = assignment.targetUnitId;
      const sessionRow = await db
        .prepare('SELECT id FROM inspection_sessions WHERE id = ? LIMIT 1')
        .bind(cycle.sessionId)
        .first<{ id: string }>();

      // `kod` mesti unik merentas semua jadual: sertakan kitaran, lokasi dan pecahan.
      const kod = `JAD/${departmentId}/${cycle.tarikhMula.slice(0, 4)}/${cycle.kod}/${assignment.locationId}-${
        assignment.splitIndex + 1
      }`;

      await db
        .prepare(
          `INSERT INTO inspection_schedules
             (id, session_id, kod, location_id, department_id, asset_category_id,
              tarikh_mula, tarikh_tamat, pemeriksa1_id, pemeriksa2_id, status_id, created_by_id)
           VALUES (?, ?, ?, ?, ?, 'SEMUA', ?, ?, ?, ?, 'BELUM_MULA', ?)`
        )
        .bind(
          scheduleId,
          sessionRow?.id ?? cycle.sessionId,
          kod,
          assignment.locationId,
          departmentId,
          cycle.tarikhMula,
          cycle.tarikhTamat,
          pemeriksa1 ?? null,
          pemeriksa2 ?? null,
          createdById ?? null
        )
        .run();
      schedulesCreated += 1;
    }

    await db
      .prepare(
        `INSERT INTO group_targets
           (id, cycle_id, group_id, location_id, target_unit_id, asset_count, direction,
            split_index, schedule_id, plan_version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        `GT-${cycle.id.slice(-6)}-${assignment.groupId}-${assignment.locationId}-${assignment.splitIndex}-${nextVersion}`,
        cycle.id,
        groupId,
        assignment.locationId,
        assignment.targetUnitId,
        assignment.assetCount,
        assignment.direction,
        assignment.splitIndex,
        scheduleId,
        nextVersion
      )
      .run();
    targetsWritten += 1;

    // Slot ditetapkan oleh kumpulan: dua ahli mengisi P1/P2.
    const slots: [1 | 2, string | undefined][] = [
      [1, members[0]],
      [2, members[1]],
    ];

    for (const [slot, officerId] of slots) {
      if (!officerId) continue;

      const existing = await db
        .prepare(
          `SELECT id, cycle_id AS cycleId FROM inspection_assignments
           WHERE cycle_id = ? AND location_id = ? AND slot = ? LIMIT 1`
        )
        .bind(cycle.id, assignment.locationId, slot)
        .first<{ id: string; cycleId: string }>();

      if (existing) {
        await db
          .prepare(
            `UPDATE inspection_assignments
             SET inspector_id = ?, schedule_id = ?, status = 'DITETAPKAN', claimed_at = datetime('now')
             WHERE id = ?`
          )
          .bind(officerId, scheduleId, existing.id)
          .run();
      } else {
        await db
          .prepare(
            `INSERT INTO inspection_assignments
               (id, cycle_id, schedule_id, location_id, slot, inspector_id, status, claimed_at)
             VALUES (?, ?, ?, ?, ?, ?, 'DITETAPKAN', datetime('now'))`
          )
          .bind(
            `AG-${cycle.id.slice(-6)}-${assignment.locationId.slice(-6)}-${slot}-${nextVersion}`,
            cycle.id,
            scheduleId,
            assignment.locationId,
            slot,
            officerId
          )
          .run();
      }
      assignmentsCreated += 1;
    }
  }

  await db
    .prepare(
      `UPDATE cycle_parameters
       SET plan_version = ?, locked_at = datetime('now'), updated_at = datetime('now')
       WHERE cycle_id = ?`
    )
    .bind(nextVersion, cycle.id)
    .run();

  await db
    .prepare(
      `INSERT INTO inspection_cycle_snapshots (id, cycle_id, payload, created_by_id)
       VALUES (?, ?, ?, ?)`
    )
    .bind(
      `SNP-${Date.now().toString(36).toUpperCase()}`,
      cycle.id,
      JSON.stringify({
        version: nextVersion,
        params: preview.params,
        decisions: preview.decisions,
        coverage: preview.allocation.coverage,
        unassigned: preview.allocation.unassigned,
        lockedAt: new Date().toISOString(),
      }),
      createdById ?? null
    )
    .run();

  return {
    planVersion: nextVersion,
    groups: preview.groups.length,
    pairings: preview.decisions.length,
    targets: targetsWritten,
    schedulesCreated,
    assignmentsCreated,
    preservedTargets: preserved.size,
  };
}

/** Semakan slot: adakah slot ini telah ditetapkan kepada kumpulan lain? */
export async function findReservedSlot(
  db: DB,
  locationId: string,
  slot: 1 | 2,
  officerId: string,
  date: string
): Promise<{ inspectorId: string | null; cycleId: string } | null> {
  const row = await db
    .prepare(
      `SELECT a.inspector_id AS inspectorId, a.cycle_id AS cycleId
       FROM inspection_assignments a
       JOIN inspection_cycles c ON c.id = a.cycle_id
       WHERE a.location_id = ? AND a.slot = ? AND a.status = 'DITETAPKAN'
         AND c.status IN ('DRAF', 'AKTIF')
         AND c.tarikh_mula <= ? AND c.tarikh_tamat >= ?
         AND a.inspector_id IS NOT NULL
         AND a.inspector_id <> ?
       LIMIT 1`
    )
    .bind(locationId, slot, date, date, officerId)
    .first<{ inspectorId: string | null; cycleId: string }>();

  return row ?? null;
}

export type { AssignmentRow, InspectorGroup, PlanResult };
export { isActiveOn, listAssignmentsForOfficer };
