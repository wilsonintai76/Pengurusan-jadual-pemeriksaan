import type { DB } from './db';
import {
  evaluateInspectionEligibility,
  loadSchedulePolicyRow,
  policyForCodes,
  summarizeInspectorAppointment,
  todayIso,
  type DenialCode,
} from './policies';
import { isActiveOn, listAssignmentsForOfficer, type AssignmentRow } from './roles';

export type CycleMode = 'SEHALA' | 'TIMBAL_BALIK';
export type CycleStatus = 'DRAF' | 'AKTIF' | 'SELESAI';

export interface CycleRow {
  id: string;
  sessionId: string;
  kod: string;
  mode: CycleMode;
  tarikhMula: string;
  tarikhTamat: string;
  status: CycleStatus;
  snapshotAt: string | null;
  createdAt: string;
}

export interface CycleSummaryRow extends CycleRow {
  totalLocations: number;
  claimedSlots: number;
  openSlots: number;
  flaggedCount: number;
}

export interface AssignmentRowOut {
  id: string;
  cycleId: string;
  scheduleId: string | null;
  locationId: string;
  kodRuang: string | null;
  locationName: string | null;
  departmentId: string | null;
  slot: number | null;
  inspectorId: string | null;
  inspectorName: string | null;
  inspectorEmail: string | null;
  status: string;
  claimedAt: string | null;
}

/** Isu yang perlu tindakan pentadbir bagi satu penugasan dalam kitaran. */
export interface AssignmentFlag {
  assignmentId: string;
  code: DenialCode | 'NOT_CLAIMED';
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

const CYCLE_SELECT = `
  SELECT
    c.id,
    c.session_id AS sessionId,
    c.kod,
    c.mode,
    c.tarikh_mula AS tarikhMula,
    c.tarikh_tamat AS tarikhTamat,
    c.status,
    c.snapshot_at AS snapshotAt,
    c.created_at AS createdAt
  FROM inspection_cycles c
`;

export async function listCycles(db: DB): Promise<CycleSummaryRow[]> {
  const { results } = await db
    .prepare(`${CYCLE_SELECT} ORDER BY c.tarikh_mula DESC, c.created_at DESC LIMIT 100`)
    .all<CycleRow>();

  const cycles = results ?? [];
  const summaries: CycleSummaryRow[] = [];

  for (const cycle of cycles) {
    const counts = await db
      .prepare(
        `SELECT
           COUNT(DISTINCT location_id) AS totalLocations,
           SUM(CASE WHEN inspector_id IS NOT NULL THEN 1 ELSE 0 END) AS claimedSlots,
           SUM(CASE WHEN inspector_id IS NULL THEN 1 ELSE 0 END) AS openSlots
         FROM inspection_assignments WHERE cycle_id = ?`
      )
      .bind(cycle.id)
      .first<{ totalLocations: number; claimedSlots: number; openSlots: number }>();

    const flags = await evaluateCycleFlags(db, cycle);

    summaries.push({
      ...cycle,
      totalLocations: Number(counts?.totalLocations) || 0,
      claimedSlots: Number(counts?.claimedSlots) || 0,
      openSlots: Number(counts?.openSlots) || 0,
      flaggedCount: flags.length,
    });
  }

  return summaries;
}

export async function getCycle(db: DB, id: string): Promise<CycleRow | null> {
  return db.prepare(`${CYCLE_SELECT} WHERE c.id = ? LIMIT 1`).bind(id).first<CycleRow>();
}

/** Kitaran aktif yang meliputi tarikh pemeriksaan tertentu. */
export async function findActiveCycleForDate(db: DB, date: string): Promise<CycleRow | null> {
  return db
    .prepare(
      `${CYCLE_SELECT}
       WHERE c.status = 'AKTIF' AND c.tarikh_mula <= ? AND c.tarikh_tamat >= ?
       ORDER BY c.tarikh_mula DESC LIMIT 1`
    )
    .bind(date, date)
    .first<CycleRow>();
}

/**
 * Kitaran yang meliputi tarikh tersebut tanpa mengira status (DRAF/AKTIF).
 * Digunakan untuk menyemak slot yang telah ditetapkan oleh pelan yang dikunci.
 */
export async function findCycleCoveringDate(db: DB, date: string): Promise<CycleRow | null> {
  return db
    .prepare(
      `${CYCLE_SELECT}
       WHERE c.status IN ('DRAF', 'AKTIF') AND c.tarikh_mula <= ? AND c.tarikh_tamat >= ?
       ORDER BY c.tarikh_mula DESC LIMIT 1`
    )
    .bind(date, date)
    .first<CycleRow>();
}

export interface CreateCycleInput {
  sessionId?: string | null;
  kod?: string | null;
  mode?: CycleMode;
  tarikhMula: string;
  tarikhTamat: string;
}

/** Mencipta kitaran (DRAF) bagi sesi tahun berkenaan. */
export async function createCycle(db: DB, input: CreateCycleInput): Promise<CycleRow> {
  const year = input.tarikhMula.slice(0, 4) || String(new Date().getFullYear());
  const sessionId =
    input.sessionId ??
    (
      await db
        .prepare('SELECT id FROM inspection_sessions WHERE tahun = ? LIMIT 1')
        .bind(Number(year))
        .first<{ id: string }>()
    )?.id ??
    `SESI-${year}`;

  const exists = await db
    .prepare('SELECT id FROM inspection_sessions WHERE id = ? LIMIT 1')
    .bind(sessionId)
    .first<{ id: string }>();

  if (!exists) {
    await db
      .prepare(
        `INSERT INTO inspection_sessions (id, tahun, tarikh_mula, tarikh_tamat, tarikh_pra_jkpak)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(sessionId, Number(year), input.tarikhMula, input.tarikhTamat, input.tarikhTamat)
      .run();
  }

  const id = `KIT-${year}-${Date.now().toString(36).toUpperCase()}`;
  const kod = input.kod?.trim() || `KIT/${year}/${Date.now().toString(36).toUpperCase().slice(-4)}`;

  await db
    .prepare(
      `INSERT INTO inspection_cycles (id, session_id, kod, mode, tarikh_mula, tarikh_tamat, status)
       VALUES (?, ?, ?, ?, ?, ?, 'DRAF')`
    )
    .bind(id, sessionId, kod, input.mode ?? 'SEHALA', input.tarikhMula, input.tarikhTamat)
    .run();

  return (await getCycle(db, id)) as CycleRow;
}

export interface GenerateResult {
  created: number;
  schedules: number;
  skipped: number;
}

/**
 * Menjana kolam penugasan bagi kitaran: dua slot (P1/P2) per jadual yang
 * bertindih dengan tempoh kitaran. Pegawai masih menuntut slot secara kendiri;
 * `inspector_id` kekal NULL sehingga dituntut.
 */
export async function generateCycleAssignments(
  db: DB,
  cycle: CycleRow,
  options: { departmentId?: string | null } = {}
): Promise<GenerateResult> {
  const params: unknown[] = [cycle.tarikhTamat, cycle.tarikhMula];
  let deptClause = '';

  if (options.departmentId) {
    deptClause = ' AND department_id = ?';
    params.push(options.departmentId);
  }

  const { results } = await db
    .prepare(
      `SELECT id, location_id, department_id
       FROM inspection_schedules
       WHERE tarikh_mula <= ? AND tarikh_tamat >= ?${deptClause}`
    )
    .bind(...params)
    .all<{ id: string; location_id: string; department_id: string }>();

  const schedules = results ?? [];
  let created = 0;
  let skipped = 0;

  for (const schedule of schedules) {
    for (const slot of [1, 2] as const) {
      const existing = await db
        .prepare(
          `SELECT id FROM inspection_assignments
           WHERE cycle_id = ? AND location_id = ? AND slot = ? LIMIT 1`
        )
        .bind(cycle.id, schedule.location_id, slot)
        .first<{ id: string }>();

      if (existing) {
        skipped += 1;
        continue;
      }

      await db
        .prepare(
          `INSERT INTO inspection_assignments
             (id, cycle_id, schedule_id, location_id, slot, status)
           VALUES (?, ?, ?, ?, ?, 'DITAWARKAN')`
        )
        .bind(
          `AG-${cycle.id.slice(-6)}-${Date.now().toString(36).toUpperCase()}-${slot}`,
          cycle.id,
          schedule.id,
          schedule.location_id,
          slot
        )
        .run();

      created += 1;
    }
  }

  return { created, schedules: schedules.length, skipped };
}

/**
 * Memulakan kitaran: status AKTIF + kunci snapshot pasangan timbal balik dan
 * keadaan penugasan semasa. Perubahan selepas ini perlu penugasan semula eksplisit.
 */
export async function startCycle(
  db: DB,
  cycle: CycleRow,
  createdById?: string | null
): Promise<{ snapshotId: string; pairs: number; assignments: number }> {
  const assignments = await listCycleAssignments(db, cycle.id);

  const payload = {
    cycle: {
      id: cycle.id,
      kod: cycle.kod,
      mode: cycle.mode,
      tarikhMula: cycle.tarikhMula,
      tarikhTamat: cycle.tarikhTamat,
    },
    startedAt: new Date().toISOString(),
    pairings:
      cycle.mode === 'TIMBAL_BALIK'
        ? await buildReciprocalPairs(db, assignments)
        : [],
    assignments: assignments.map((assignment) => ({
      assignmentId: assignment.id,
      locationId: assignment.locationId,
      slot: assignment.slot,
      inspectorId: assignment.inspectorId,
      status: assignment.status,
    })),
  };

  const snapshotId = `SNP-${Date.now().toString(36).toUpperCase()}`;

  await db
    .prepare(
      `INSERT INTO inspection_cycle_snapshots (id, cycle_id, payload, created_by_id)
       VALUES (?, ?, ?, ?)`
    )
    .bind(snapshotId, cycle.id, JSON.stringify(payload), createdById ?? null)
    .run();

  await db
    .prepare(
      `UPDATE inspection_cycles
       SET status = 'AKTIF', snapshot_at = datetime('now')
       WHERE id = ?`
    )
    .bind(cycle.id)
    .run();

  return {
    snapshotId,
    pairs: payload.pairings.length,
    assignments: assignments.length,
  };
}

export async function closeCycle(db: DB, id: string): Promise<void> {
  await db
    .prepare(
      `UPDATE inspection_cycles
       SET status = 'SELESAI'
       WHERE id = ?`
    )
    .bind(id)
    .run();
}

interface PairSource {
  departmentId: string | null;
  inspectorId: string | null;
}

/**
 * Pasangan timbal balik (A memeriksa B, B memeriksa A) berdasarkan jabatan
 * pemeriksa berbanding jabatan pemilik lokasi pada masa snapshot.
 */
async function buildReciprocalPairs(db: DB, assignments: AssignmentRowOut[]) {
  const officerDepartments = new Map<string, string | null>();

  for (const assignment of assignments) {
    if (!assignment.inspectorId || officerDepartments.has(assignment.inspectorId)) continue;
    const officer = await db
      .prepare('SELECT department_id AS dept FROM officers WHERE id = ? LIMIT 1')
      .bind(assignment.inspectorId)
      .first<{ dept: string }>();
    officerDepartments.set(assignment.inspectorId, officer?.dept ?? null);
  }

  const byPair = new Map<string, { fromDept: string; toDept: string; assignments: string[] }>();

  assignments.forEach((assignment) => {
    if (!assignment.inspectorId || !assignment.departmentId) return;
    const fromDept = officerDepartments.get(assignment.inspectorId);
    if (!fromDept) return;
    const key = `${fromDept}->${assignment.departmentId}`;
    const entry = byPair.get(key) ?? {
      fromDept,
      toDept: assignment.departmentId,
      assignments: [],
    };
    entry.assignments.push(assignment.id);
    byPair.set(key, entry);
  });

  return Array.from(byPair.entries())
    .filter(([, value]) => byPair.has(`${value.toDept}->${value.fromDept}`))
    .map(([key, value]) => ({ key, ...value }));
}

export async function listCycleAssignments(
  db: DB,
  cycleId: string
): Promise<AssignmentRowOut[]> {
  const { results } = await db
    .prepare(
      `SELECT
         a.id,
         a.cycle_id AS cycleId,
         a.schedule_id AS scheduleId,
         a.location_id AS locationId,
         l.kod_ruang AS kodRuang,
         l.nama AS locationName,
         l.department_id AS departmentId,
         a.slot,
         a.inspector_id AS inspectorId,
         o.nama AS inspectorName,
         o.emel AS inspectorEmail,
         a.status,
         a.claimed_at AS claimedAt
       FROM inspection_assignments a
       LEFT JOIN locations l ON l.id = a.location_id
       LEFT JOIN officers o ON o.id = a.inspector_id
       WHERE a.cycle_id = ?
       ORDER BY l.kod_ruang ASC, a.slot ASC`
    )
    .bind(cycleId)
    .all<AssignmentRowOut>();

  return results ?? [];
}

/**
 * Mengesan penugasan yang perlu tindakan: slot belum dituntut, lantikan pemeriksa
 * tamat, konflik penyelia/aset/penjaga, atau jabatan sama dalam mod timbal balik.
 */
export async function evaluateCycleFlags(db: DB, cycle: CycleRow): Promise<AssignmentFlag[]> {
  const assignments = await listCycleAssignments(db, cycle.id);
  const flags: AssignmentFlag[] = [];

  for (const assignment of assignments) {
    if (!assignment.inspectorId) {
      flags.push({
        assignmentId: assignment.id,
        code: 'NOT_CLAIMED',
        message: `Slot P${assignment.slot ?? '?'} bagi ${assignment.kodRuang ?? assignment.locationId} belum dituntut.`,
        severity: 'info',
      });
      continue;
    }

    const schedule = assignment.scheduleId
      ? await loadSchedulePolicyRow(db, assignment.scheduleId)
      : null;

    if (!schedule) continue;

    const officer = await db
      .prepare('SELECT department_id AS dept FROM officers WHERE id = ? LIMIT 1')
      .bind(assignment.inspectorId)
      .first<{ dept: string }>();

    const result = await evaluateInspectionEligibility(db, {
      officerId: assignment.inspectorId,
      officerDepartmentId: officer?.dept ?? '',
      schedule,
      enforceCrossInspection: cycle.mode === 'TIMBAL_BALIK',
    });

    if (!result.allowed) {
      flags.push({
        assignmentId: assignment.id,
        code: result.codes[0],
        message: `${assignment.kodRuang ?? assignment.locationId}: ${result.reasons[0]}`,
        severity: result.codes[0] === 'APPOINTMENT_EXPIRED' || result.codes[0] === 'NO_APPOINTMENT' ? 'critical' : 'warning',
      });
    }
  }

  return flags;
}

export interface ReassignInput {
  assignmentId: string;
  officerId: string;
  reason: string;
  note?: string | null;
  createdById?: string | null;
}

/** Penugasan semula eksplisit oleh pentadbir (direkod dalam jejak audit). */
export async function reassignCycleSlot(
  db: DB,
  cycle: CycleRow,
  input: ReassignInput
): Promise<{ assignment: AssignmentRowOut; denied: DenialCode[] }> {
  const assignment = await db
    .prepare(
      `SELECT id, schedule_id AS scheduleId, inspector_id AS inspectorId, location_id AS locationId, slot
       FROM inspection_assignments WHERE id = ? AND cycle_id = ? LIMIT 1`
    )
    .bind(input.assignmentId, cycle.id)
    .first<{
      id: string;
      scheduleId: string | null;
      inspectorId: string | null;
      locationId: string;
      slot: number | null;
    }>();

  if (!assignment) {
    throw new Error('Penugasan tidak dijumpai dalam kitaran ini');
  }

  const denied: DenialCode[] = [];

  if (assignment.scheduleId) {
    const schedule = await loadSchedulePolicyRow(db, assignment.scheduleId);
    const officer = await db
      .prepare('SELECT department_id AS dept FROM officers WHERE id = ? LIMIT 1')
      .bind(input.officerId)
      .first<{ dept: string }>();

    if (schedule) {
      const result = await evaluateInspectionEligibility(db, {
        officerId: input.officerId,
        officerDepartmentId: officer?.dept ?? '',
        schedule,
        enforceCrossInspection: cycle.mode === 'TIMBAL_BALIK',
      });
      denied.push(...result.codes);
    }

    if (assignment.slot) {
      const column = assignment.slot === 1 ? 'pemeriksa1_id' : 'pemeriksa2_id';
      await db
        .prepare(
          `UPDATE inspection_schedules SET ${column} = ?, updated_at = datetime('now') WHERE id = ?`
        )
        .bind(input.officerId, assignment.scheduleId)
        .run();
    }
  }

  await db
    .prepare(
      `UPDATE inspection_assignments
       SET inspector_id = ?, status = 'DITUNTUT', claimed_at = datetime('now')
       WHERE id = ?`
    )
    .bind(input.officerId, assignment.id)
    .run();

  await db
    .prepare(
      `INSERT INTO inspection_reassignments
         (id, assignment_id, cycle_id, from_officer_id, to_officer_id, reason, note, created_by_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      `RAS-${Date.now().toString(36).toUpperCase()}`,
      assignment.id,
      cycle.id,
      assignment.inspectorId,
      input.officerId,
      input.reason,
      input.note ?? null,
      input.createdById ?? null
    )
    .run();

  const assignments = await listCycleAssignments(db, cycle.id);
  return {
    assignment: assignments.find((item) => item.id === assignment.id) as AssignmentRowOut,
    denied,
  };
}

/** Pegawai yang layak bagi sesuatu jadual (senarai kolam) untuk cadangan penugasan. */
export async function eligibleInspectorsForSchedule(
  db: DB,
  scheduleId: string,
  date: string = todayIso()
): Promise<{ officerId: string; nama: string; emel: string; dept: string }[]> {
  const schedule = await loadSchedulePolicyRow(db, scheduleId);
  if (!schedule) return [];

  const { results } = await db
    .prepare(
      `SELECT DISTINCT o.id AS officerId, o.nama, o.emel, o.department_id AS dept
       FROM officers o
       JOIN role_assignments ra ON ra.officer_id = o.id
       WHERE ra.role_id = 'PEMERIKSA' AND ra.status = 'AKTIF'
         AND ra.valid_from <= ? AND (ra.valid_to IS NULL OR ra.valid_to >= ?)
       ORDER BY o.nama ASC`
    )
    .bind(date, date)
    .all<{ officerId: string; nama: string; emel: string; dept: string }>();

  const candidates = results ?? [];
  const eligible: { officerId: string; nama: string; emel: string; dept: string }[] = [];

  for (const candidate of candidates) {
    const result = await evaluateInspectionEligibility(db, {
      officerId: candidate.officerId,
      officerDepartmentId: candidate.dept,
      schedule,
    });
    if (result.allowed) eligible.push(candidate);
  }

  return eligible;
}

/**
 * Menyegerakkan penuntutan slot jadual ke semua kolam kitaran AKTIF yang
 * meliputi tarikh pemeriksaan (kitaran bertindih mungkin wujud).
 */
export async function syncClaimToCycle(
  db: DB,
  params: {
    scheduleId: string;
    locationId: string;
    slot: 1 | 2;
    officerId: string;
  }
): Promise<void> {
  const schedule = await db
    .prepare('SELECT tarikh_mula AS tarikhMula FROM inspection_schedules WHERE id = ? LIMIT 1')
    .bind(params.scheduleId)
    .first<{ tarikhMula: string }>();

  if (!schedule) return;

  const { results: cycles } = await db
    .prepare(
      `SELECT id FROM inspection_cycles
       WHERE status = 'AKTIF' AND tarikh_mula <= ? AND tarikh_tamat >= ?`
    )
    .bind(schedule.tarikhMula, schedule.tarikhMula)
    .all<{ id: string }>();

  for (const cycle of cycles ?? []) {
    await db
      .prepare(
        `UPDATE inspection_assignments
         SET inspector_id = ?, schedule_id = ?, status = 'DITUNTUT', claimed_at = datetime('now')
         WHERE cycle_id = ? AND location_id = ? AND slot = ?`
      )
      .bind(params.officerId, params.scheduleId, cycle.id, params.locationId, params.slot)
      .run();
  }
}

export { isActiveOn, listAssignmentsForOfficer, policyForCodes, summarizeInspectorAppointment };
export type { AssignmentRow as RoleAssignmentRow };
