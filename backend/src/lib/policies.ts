import type { DB } from './db';
import { isActiveOn, listAssignmentsForOfficer, type AssignmentRow } from './roles';
import { conflictMessage, detectConflictCodes } from './conflicts';

export interface SchedulePolicyRow {
  id: string;
  locationId: string;
  departmentId: string;
  tarikhMula: string;
  tarikhTamat: string;
  pemeriksa1Id: string | null;
  pemeriksa2Id: string | null;
}

export interface AppointmentSummary {
  assignmentId: string;
  validFrom: string;
  validTo: string | null;
  activeToday: boolean;
  daysRemaining: number | null;
}

export type DenialCode =
  | 'NO_APPOINTMENT'
  | 'APPOINTMENT_EXPIRED'
  | 'PERIOD_NOT_COVERED'
  | 'SUPERVISOR_CONFLICT'
  | 'ASSET_OFFICER_CONFLICT'
  | 'CUSTODIAN_CONFLICT'
  | 'CROSS_DEPARTMENT_REQUIRED'
  | 'SLOT_TAKEN'
  | 'ALREADY_ASSIGNED';

export interface EligibilityResult {
  allowed: boolean;
  codes: DenialCode[];
  reasons: string[];
  appointment: AppointmentSummary | null;
  assignedSlot: 1 | 2 | null;
}

/** Polisi audit yang berkaitan dengan kod penolakan utama. */
export function policyForCodes(codes: DenialCode[]): string {
  if (
    codes.includes('NO_APPOINTMENT') ||
    codes.includes('APPOINTMENT_EXPIRED') ||
    codes.includes('PERIOD_NOT_COVERED')
  ) {
    return 'POL_INSPECTOR_APPOINTMENT_REQUIRED';
  }
  if (codes.includes('CROSS_DEPARTMENT_REQUIRED')) return 'POL_CROSS_INSPECTION_MANDATE';
  if (
    codes.includes('CUSTODIAN_CONFLICT') ||
    codes.includes('SUPERVISOR_CONFLICT') ||
    codes.includes('ASSET_OFFICER_CONFLICT')
  ) {
    return 'POL_CONFLICT_CUSTODIAN_GUARD';
  }
  if (codes.includes('SLOT_TAKEN') || codes.includes('ALREADY_ASSIGNED')) return 'POL_INSPECTION_SLOT';
  return 'POL_INSPECTION_ELIGIBILITY';
}

export const todayIso = () => new Date().toISOString().slice(0, 10);

export function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

/**
 * Ringkasan lantikan pemeriksa: lantikan aktif hari ini (jika ada) atau
 * lantikan terkini yang telah tamat — digunakan oleh UI untuk memberi amaran
 * tarikh luput sebelum pengguna cuba menuntut tugasan.
 */
export function summarizeInspectorAppointment(
  assignments: AssignmentRow[],
  date: string = todayIso()
): AppointmentSummary | null {
  const inspectorRoles = assignments
    .filter((assignment) => assignment.roleId === 'PEMERIKSA')
    .sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1));

  if (inspectorRoles.length === 0) return null;

  const active = inspectorRoles.find((assignment) => isActiveOn(assignment, date));
  const latest = active ?? inspectorRoles[0];

  return {
    assignmentId: latest.id,
    validFrom: latest.validFrom,
    validTo: latest.validTo,
    activeToday: Boolean(active),
    daysRemaining: latest.validTo ? daysBetween(date, latest.validTo) : null,
  };
}

export async function loadSchedulePolicyRow(db: DB, id: string): Promise<SchedulePolicyRow | null> {
  return db
    .prepare(
      `SELECT id, location_id AS locationId, department_id AS departmentId,
              tarikh_mula AS tarikhMula, tarikh_tamat AS tarikhTamat,
              pemeriksa1_id AS pemeriksa1Id, pemeriksa2_id AS pemeriksa2Id
       FROM inspection_schedules WHERE id = ? LIMIT 1`
    )
    .bind(id)
    .first<SchedulePolicyRow>();
}

export interface EligibilityInput {
  officerId: string;
  officerDepartmentId: string;
  schedule: SchedulePolicyRow;
  /** Slot yang ingin dituntut (1 atau 2). Semakan slot hanya dijalankan apabila diberi. */
  slot?: 1 | 2;
  /** Mod timbal balik: pemeriksa mesti dari jabatan berbeza. */
  enforceCrossInspection?: boolean;
  date?: string;
}

/**
 * Peraturan kelayakan pemeriksaan (PBAC), disemak pada pelayan:
 *  1. Lantikan PEGAWAI PEMERIKSA aktif pada tarikh rujukan dan meliputi tempoh pemeriksaan.
 *  2. Bukan Penyelia Lokasi bagi ruang itu (atau jabatan itu).
 *  3. Bukan Penolong Pegawai Aset bagi jabatan pemilik aset.
 *  4. Bukan pegawai penjaga ruang (KEW.PA-7).
 *  5. Mod pemeriksaan silang: jabatan pemeriksa mesti berbeza.
 *  6. Slot yang dituntut mesti kosong dan pegawai belum memegang slot lain.
 */
export async function evaluateInspectionEligibility(
  db: DB,
  input: EligibilityInput
): Promise<EligibilityResult> {
  const date = input.date ?? todayIso();
  const { schedule, officerId } = input;

  const codes: DenialCode[] = [];
  const reasons: string[] = [];
  const deny = (code: DenialCode, message: string) => {
    codes.push(code);
    reasons.push(message);
  };

  const assignments = await listAssignmentsForOfficer(db, officerId);
  const appointment = summarizeInspectorAppointment(assignments, date);
  const active = (assignment: AssignmentRow) => isActiveOn(assignment, date);

  const inspectorAssignment = assignments.find(
    (assignment) => assignment.roleId === 'PEMERIKSA' && active(assignment)
  );

  if (!inspectorAssignment) {
    if (appointment?.validTo && appointment.validTo < date) {
      deny(
        'APPOINTMENT_EXPIRED',
        `Lantikan Pegawai Pemeriksa anda telah tamat pada ${appointment.validTo}. Sila mohon pembaharuan lantikan sebelum menjalankan pemeriksaan.`
      );
    } else {
      deny(
        'NO_APPOINTMENT',
        'Anda belum dilantik sebagai Pegawai Pemeriksa. Hanya pegawai yang dilantik boleh melaksanakan pemeriksaan aset.'
      );
    }
  } else {
    const coversPeriod =
      inspectorAssignment.validFrom <= schedule.tarikhTamat &&
      (!inspectorAssignment.validTo || inspectorAssignment.validTo >= schedule.tarikhMula);

    if (!coversPeriod) {
      deny(
        'PERIOD_NOT_COVERED',
        `Lantikan pemeriksa anda (${inspectorAssignment.validFrom} hingga ${
          inspectorAssignment.validTo ?? 'kekal'
        }) tidak meliputi tarikh pemeriksaan ${schedule.tarikhMula}.`
      );
    }
  }

  const custodian = await db
    .prepare('SELECT 1 AS ok FROM location_custodians WHERE location_id = ? AND officer_id = ? LIMIT 1')
    .bind(schedule.locationId, officerId)
    .first<{ ok: number }>();

  // Konflik disemak merentas SEMUA peranan aktif (bukan jawatan utama sahaja),
  // supaya pegawai yang memegang PPAJ + Penyelia Lokasi + PP disekat dengan betul.
  for (const code of detectConflictCodes(
    assignments,
    {
      locationId: schedule.locationId,
      departmentId: schedule.departmentId,
      officerDepartmentId: input.officerDepartmentId,
      isCustodian: Boolean(custodian),
      enforceCrossInspection: input.enforceCrossInspection,
    },
    date
  )) {
    deny(code, conflictMessage(code));
  }

  const assignedSlot: 1 | 2 | null =
    schedule.pemeriksa1Id === officerId ? 1 : schedule.pemeriksa2Id === officerId ? 2 : null;

  if (input.slot) {
    const occupantId = input.slot === 1 ? schedule.pemeriksa1Id : schedule.pemeriksa2Id;

    if (occupantId && occupantId !== officerId) {
      // Slot yang dipegang pegawai tanpa lantikan pemeriksa aktif dianggap terbuka
      // (nama sementara dalam perancangan) dan boleh dituntut oleh pemeriksa bertauliah.
      const occupantAssignments = await listAssignmentsForOfficer(db, occupantId);
      const occupantAppointed = occupantAssignments.some(
        (assignment) => assignment.roleId === 'PEMERIKSA' && isActiveOn(assignment, date)
      );

      if (occupantAppointed) {
        deny('SLOT_TAKEN', `Slot Pemeriksa ${input.slot} telah dituntut oleh pegawai lain.`);
      }
    }

    if (assignedSlot && assignedSlot !== input.slot) {
      deny('ALREADY_ASSIGNED', `Anda sudah ditugaskan sebagai Pemeriksa ${assignedSlot} bagi jadual ini.`);
    }
  }

  return { allowed: reasons.length === 0, codes, reasons, appointment, assignedSlot };
}
