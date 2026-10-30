import type { DB } from './db';
import { isActiveOn, listAssignmentsForOfficer } from './roles';
import { todayIso } from './policies';

export type VerificationDenial =
  | 'NOT_VERIFIER_APPOINTED'
  | 'SELF_VERIFICATION'
  | 'SUPERVISES_LOCATION'
  | 'ASSET_OFFICER_SAME_DEPT'
  | 'CUSTODIAN_OF_LOCATION'
  | 'NOT_COMPLETED';

export interface VerificationResult {
  allowed: boolean;
  codes: VerificationDenial[];
  reasons: string[];
}

export interface VerificationContext {
  scheduleId: string;
  locationId: string;
  departmentId: string;
  statusId: string;
  pemeriksa1Id: string | null;
  pemeriksa2Id: string | null;
}

/**
 * Pemisahan tugas pada pengesahan dapatan pemeriksaan:
 *  - pengesah mesti memegang lantikan aktif (KETUA_JABATAN / PENTADBIR_SISTEM / PEMERIKSA);
 *  - tidak boleh mengesahkan dapatan sendiri;
 *  - tidak boleh menyelia ruang/jabatan yang disahkan;
 *  - bukan penjaga ruang atau Penolong Pegawai Aset jabatan tersebut;
 *  - jadual mesti berstatus Selesai.
 */
export async function evaluateVerification(
  db: DB,
  officerId: string,
  context: VerificationContext,
  date: string = todayIso()
): Promise<VerificationResult> {
  const codes: VerificationDenial[] = [];
  const reasons: string[] = [];
  const deny = (code: VerificationDenial, message: string) => {
    codes.push(code);
    reasons.push(message);
  };

  const assignments = await listAssignmentsForOfficer(db, officerId);
  const active = (roleId: string) =>
    assignments.some((assignment) => assignment.roleId === roleId && isActiveOn(assignment, date));

  const canVerify = active('KETUA_JABATAN') || active('PENTADBIR_SISTEM') || active('PEMERIKSA');
  if (!canVerify) {
    deny(
      'NOT_VERIFIER_APPOINTED',
      'Anda tiada lantikan aktif sebagai Ketua Jabatan, Pentadbir Sistem atau Pegawai Pemeriksa untuk mengesahkan dapatan.'
    );
  }

  if (context.pemeriksa1Id === officerId || context.pemeriksa2Id === officerId) {
    deny('SELF_VERIFICATION', 'Anda pemeriksa bagi jadual ini — dapatan sendiri tidak boleh disahkan sendiri.');
  }

  const supervises = assignments.some(
    (assignment) =>
      assignment.roleId === 'PENYELIA_LOKASI' &&
      isActiveOn(assignment, date) &&
      ((assignment.scopeType === 'LOCATION' && assignment.scopeId === context.locationId) ||
        (assignment.scopeType === 'DEPARTMENT' && assignment.scopeId === context.departmentId))
  );
  if (supervises) {
    deny('SUPERVISES_LOCATION', 'Anda menyelia lokasi/jabatan aset ini — pengesahan perlu pegawai bebas.');
  }

  const isAssetOfficer = assignments.some(
    (assignment) =>
      assignment.roleId === 'PENOLONG_PEGAWAI_ASET' &&
      isActiveOn(assignment, date) &&
      assignment.scopeType === 'DEPARTMENT' &&
      assignment.scopeId === context.departmentId
  );
  if (isAssetOfficer) {
    deny(
      'ASSET_OFFICER_SAME_DEPT',
      'Anda Penolong Pegawai Aset bagi jabatan ini — pemisahan tugas diperlukan pada pengesahan.'
    );
  }

  const custodian = await db
    .prepare('SELECT 1 AS ok FROM location_custodians WHERE location_id = ? AND officer_id = ? LIMIT 1')
    .bind(context.locationId, officerId)
    .first<{ ok: number }>();
  if (custodian) {
    deny('CUSTODIAN_OF_LOCATION', 'Anda penjaga ruang ini — pengesahan dapatan mesti dibuat pegawai lain.');
  }

  if (context.statusId !== 'SELESAI') {
    deny('NOT_COMPLETED', 'Hanya jadual berstatus Selesai boleh disahkan.');
  }

  return { allowed: reasons.length === 0, codes, reasons };
}
