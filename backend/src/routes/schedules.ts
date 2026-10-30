import { Hono } from 'hono';
import type { ScheduleRecord } from '../types';
import type { DB } from '../lib/db';
import {
  ensureOfficerId,
  ensureSessionId,
  resolveAssetCategoryId,
  resolveStatusId,
} from '../lib/db';
import { getAuthUser, type AppEnv } from '../middleware/auth';
import { hasActiveRole, listAssignmentsForOfficer } from '../lib/roles';
import { canManageDepartment, canManageLocation, loadManageScope } from '../lib/permissions';
import {
  evaluateInspectionEligibility,
  loadSchedulePolicyRow,
  policyForCodes,
  summarizeInspectorAppointment,
} from '../lib/policies';
import { recordAudit } from '../lib/audit';
import { syncClaimToCycle } from '../lib/cycles';
import { findReservedSlot } from '../lib/planning';
import { evaluateVerification } from '../lib/verification';

interface ScheduleRow {
  id: string;
  kod: string;
  siri: number | null;
  jabatan: string;
  lokasi: string;
  kodRuang: string;
  kategori: string;
  kuantiti: number;
  tarikhMula: string;
  tarikhTamat: string;
  pemeriksa1: string;
  pemeriksa1Email: string | null;
  pemeriksa2: string;
  pemeriksa2Email: string | null;
  penjaga: string;
  status: string;
  catatan: string | null;
  kewpa11DocKey: string | null;
  createdBy: string | null;
  createdAt: string | null;
  bilElok: number | null;
  bilRosak: number | null;
  bilUsang: number | null;
  bilHilang: number | null;
  syorTindakan: string | null;
  tarikhPengesahan: string | null;
}

function mapSchedule(row: ScheduleRow): ScheduleRecord {
  const hasReport = row.bilElok !== null && row.bilElok !== undefined;

  return {
    id: row.id,
    kod: row.kod,
    siri: Number(row.siri) || 1,
    kodRuang: row.kodRuang,
    jabatan: row.jabatan,
    lokasi: row.lokasi,
    kategori: row.kategori as ScheduleRecord['kategori'],
    kuantiti: Number(row.kuantiti) || 0,
    tarikhMula: row.tarikhMula,
    tarikhTamat: row.tarikhTamat,
    pemeriksa1: row.pemeriksa1,
    pemeriksa1Email: row.pemeriksa1Email ?? undefined,
    pemeriksa2: row.pemeriksa2,
    pemeriksa2Email: row.pemeriksa2Email ?? undefined,
    penjaga: row.penjaga,
    status: row.status as ScheduleRecord['status'],
    catatan: row.catatan ?? undefined,
    kewpa11DocKey: row.kewpa11DocKey ?? undefined,
    laporanPraJkpak: hasReport
      ? {
          baik: Number(row.bilElok) || 0,
          rosak: Number(row.bilRosak) || 0,
          usang: Number(row.bilUsang) || 0,
          hilang: Number(row.bilHilang) || 0,
          cadangan: row.syorTindakan ?? undefined,
          tarikhHantar: row.tarikhPengesahan ?? undefined,
        }
      : undefined,
    createdBy: row.createdBy ?? undefined,
    createdAt: row.createdAt ?? undefined,
  };
}

async function findScheduleRow(db: DB, id: string): Promise<ScheduleRow | null> {
  return db
    .prepare('SELECT * FROM v_schedules_full WHERE id = ? LIMIT 1')
    .bind(id)
    .first<ScheduleRow>();
}

export const schedulesRoute = new Hono<AppEnv>()

  // 1. GET ALL SCHEDULES
  .get('/', async (c) => {
    const dept = c.req.query('dept');
    const status = c.req.query('status');

    try {
      const clauses: string[] = [];
      const params: unknown[] = [];

      if (dept && dept !== 'SEMUA') {
        clauses.push('jabatan = ?');
        params.push(dept);
      }

      if (status && status !== 'SEMUA') {
        clauses.push('status = ?');
        params.push(status);
      }

      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const { results } = await c.env.DB.prepare(
        `SELECT * FROM v_schedules_full ${where} ORDER BY tarikhMula ASC`
      )
        .bind(...params)
        .all<ScheduleRow>();

      const schedules = (results ?? []).map(mapSchedule);

      return c.json({
        success: true,
        total: schedules.length,
        data: schedules,
      });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat mendapatkan jadual: ' + e.message }, 500);
    }
  })

  // 1b. TUNTUT SLOT PEMERIKSA (PBAC: hanya lantikan pemeriksa yang aktif)
  .post('/:id/claim', async (c) => {
    const id = c.req.param('id');
    const auth = getAuthUser(c);

    if (!auth) {
      return c.json(
        { success: false, code: 'UNAUTHENTICATED', message: 'Sesi tidak sah. Sila log masuk.' },
        401
      );
    }

    try {
      const body = await c.req.json().catch(() => ({}));
      const slot: 1 | 2 = Number(body?.slot) === 2 ? 2 : 1;

      const schedule = await loadSchedulePolicyRow(c.env.DB, id);
      if (!schedule) {
        return c.json(
          { success: false, code: 'NOT_FOUND', message: 'Jadual pemeriksaan tidak dijumpai.' },
          404
        );
      }

      const settings = (await c.env.KV.get('system_settings', 'json')) as {
        enforceCrossInspection?: boolean;
      } | null;

      // Slot yang telah ditetapkan kepada kumpulan lain tidak boleh dituntut
      // (semakan merentas semua kitaran DRAF/AKTIF yang meliputi tarikh jadual).
      const reserved = await findReservedSlot(
        c.env.DB,
        schedule.locationId,
        slot,
        auth.id,
        schedule.tarikhMula
      );

      if (reserved) {
        await recordAudit(c.env.DB, {
          actorId: auth.id,
          actorName: auth.emel,
          actedAsRole: auth.role,
          action: 'schedule:claim',
          departmentId: schedule.departmentId,
          decision: 'DENY',
          policyId: 'POL_INSPECTION_GROUP_ASSIGNMENT',
          resourceId: id,
          notes: `Slot P${slot} bagi ${schedule.locationId} telah ditetapkan kepada kumpulan pemeriksa lain dalam kitaran ${reserved.cycleId}.`,
          reason: 'SLOT_RESERVED_BY_GROUP',
        });

        return c.json(
          {
            success: false,
            code: 'SLOT_RESERVED_BY_GROUP',
            message:
              'Slot ini telah ditetapkan kepada kumpulan pemeriksa oleh Pentadbir Sistem. Hubungi pentadbir untuk penugasan semula.',
          },
          409
        );
      }

      const result = await evaluateInspectionEligibility(c.env.DB, {
        officerId: auth.id,
        officerDepartmentId: auth.dept,
        schedule,
        slot,
        enforceCrossInspection: settings?.enforceCrossInspection ?? true,
      });

      if (!result.allowed) {
        await recordAudit(c.env.DB, {
          actorId: auth.id,
          actorName: auth.emel,
          actedAsRole: auth.role,
          action: 'schedule:claim',
          departmentId: schedule.departmentId,
          decision: 'DENY',
          policyId: policyForCodes(result.codes),
          resourceId: id,
          notes: result.reasons.join(' '),
          reason: result.codes[0] ?? null,
        });

        return c.json(
          {
            success: false,
            code: 'INELIGIBLE',
            message: result.reasons[0],
            reasons: result.reasons,
            codes: result.codes,
          },
          403
        );
      }

      const column = slot === 1 ? 'pemeriksa1_id' : 'pemeriksa2_id';
      const runningStatusId = await resolveStatusId(c.env.DB, 'Sedang Dijalankan');

      await c.env.DB.prepare(
        `UPDATE inspection_schedules
         SET ${column} = ?,
             status_id = CASE WHEN status_id = 'BELUM_MULA' THEN ? ELSE status_id END,
             updated_at = datetime('now')
         WHERE id = ?`
      )
        .bind(auth.id, runningStatusId, id)
        .run();

      // Segerakkan tuntutan ke kolam kitaran aktif (jika jadual berada dalam kitaran).
      await syncClaimToCycle(c.env.DB, {
        scheduleId: id,
        locationId: schedule.locationId,
        slot,
        officerId: auth.id,
      });

      await recordAudit(c.env.DB, {
        actorId: auth.id,
        actorName: auth.emel,
        actedAsRole: auth.role,
        action: 'schedule:claim',
        departmentId: schedule.departmentId,
        decision: 'PERMIT',
        policyId: 'POL_INSPECTION_ELIGIBILITY',
        resourceId: id,
        notes: `Slot Pemeriksa ${slot} dituntut oleh ${auth.nama} (${auth.dept}). Lantikan aktif sehingga ${
          result.appointment?.validTo ?? 'kekal'
        }.`,
      });

      const saved = await findScheduleRow(c.env.DB, id);

      return c.json({
        success: true,
        message: `Slot Pemeriksa ${slot} berjaya dituntut.`,
        data: saved ? mapSchedule(saved) : null,
        appointment: result.appointment,
      });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat menuntut slot: ' + e.message }, 500);
    }
  })

  // 2. CREATE NEW SCHEDULE
  .post('/', async (c) => {
    try {
      const body = await c.req.json();
      const auth = getAuthUser(c);
      if (!auth) {
        return c.json(
          { success: false, code: 'UNAUTHENTICATED', message: 'Sesi tidak sah. Sila log masuk.' },
          401
        );
      }

      const lokasiRef = String(body.lokasiId ?? body.lokasi ?? '').trim();
      const siri = Number(body.siri);

      if (!lokasiRef) {
        return c.json({ success: false, code: 'INVALID_INPUT', message: 'Sila pilih lokasi ruang.' }, 400);
      }
      if (!Number.isInteger(siri) || siri < 1 || siri > 3) {
        return c.json(
          { success: false, code: 'INVALID_SIRI', message: 'Siri pemeriksaan mesti 1, 2 atau 3.' },
          400
        );
      }

      const location = await c.env.DB.prepare(
        `SELECT id, department_id AS departmentId, nama
           FROM locations
          WHERE id = ? OR nama = ? COLLATE NOCASE OR kod_ruang = ? COLLATE NOCASE
          LIMIT 1`
      )
        .bind(lokasiRef, lokasiRef, lokasiRef)
        .first<{ id: string; departmentId: string; nama: string }>();

      if (!location) {
        return c.json(
          {
            success: false,
            code: 'UNKNOWN_LOCATION',
            message: `Lokasi '${lokasiRef}' tidak dijumpai dalam direktori ruang.`,
          },
          400
        );
      }

      // PPAJ/PPAU (dan KJ/KU) hanya boleh menjadualkan ruang jabatan sendiri.
      const scope = await loadManageScope(c.env.DB, auth.id);
      if (!canManageDepartment(scope, location.departmentId)) {
        await recordAudit(c.env.DB, {
          actorId: auth.id,
          actorName: auth.emel,
          actedAsRole: auth.role,
          action: 'schedule:create',
          departmentId: location.departmentId,
          decision: 'DENY',
          policyId: 'POL_DEPARTMENT_SCOPE',
          resourceId: location.id,
          notes: 'Cubaan menjadualkan ruang di luar jabatan/unit sendiri.',
          reason: 'DEPARTMENT_FORBIDDEN',
        });

        return c.json(
          {
            success: false,
            code: 'DEPARTMENT_FORBIDDEN',
            message: 'Akses ditolak: anda hanya boleh mendaftar jadual bagi ruang jabatan/unit anda sendiri.',
          },
          403
        );
      }

      const year = new Date().getFullYear();
      const sessionId = await ensureSessionId(c.env.DB, `${year}-01-01`);

      // Satu ruang = satu jadual per sesi (Siri 1, 2 ATAU 3 sahaja).
      const existing = await c.env.DB.prepare(
        `SELECT s.id, s.kod, s.siri
           FROM inspection_schedules s
           JOIN inspection_sessions ss ON ss.id = s.session_id
          WHERE ss.tahun = ? AND s.location_id = ?
          LIMIT 1`
      )
        .bind(year, location.id)
        .first<{ id: string; kod: string; siri: number }>();

      if (existing) {
        return c.json(
          {
            success: false,
            code: 'ALREADY_SCHEDULED',
            message: `Ruang ${location.nama} sudah dijadualkan dalam Siri ${existing.siri} (${existing.kod}). Setiap ruang diperiksa sekali sahaja setiap sesi.`,
            data: existing,
          },
          409
        );
      }

      const assetCategoryId = await resolveAssetCategoryId(c.env.DB, 'Semua');
      const statusId = await resolveStatusId(c.env.DB, 'Belum Mula');
      const id = `JAD-${year}-${Date.now().toString(36).toUpperCase()}`;

      const countRow = await c.env.DB.prepare(
        'SELECT COUNT(*) AS total FROM inspection_schedules WHERE department_id = ? AND session_id = ?'
      )
        .bind(location.departmentId, sessionId)
        .first<{ total: number }>();
      const kod = `JAD/${location.departmentId}/${year}/${String(
        (Number(countRow?.total) || 0) + 1
      ).padStart(2, '0')}`;

      // Tarikh dan pemeriksa dikosongkan: tarikh ditetapkan Penyelia Lokasi,
      // pemeriksa menuntut slot sendiri (self-assign).
      await c.env.DB.prepare(
        `INSERT INTO inspection_schedules (
           id, session_id, kod, location_id, department_id, asset_category_id, siri,
           tarikh_mula, tarikh_tamat, pemeriksa1_id, pemeriksa2_id, status_id,
           catatan, created_by_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, ?)`
      )
        .bind(
          id,
          sessionId,
          kod,
          location.id,
          location.departmentId,
          assetCategoryId,
          siri,
          statusId,
          body.catatan || null,
          auth.id
        )
        .run();

      await recordAudit(c.env.DB, {
        actorId: auth.id,
        actorName: auth.emel,
        actedAsRole: auth.role,
        action: 'schedule:create',
        departmentId: location.departmentId,
        decision: 'PERMIT',
        policyId: 'POL_INSPECTION_TASK_ASSIGNMENT',
        resourceId: id,
        notes: `Jadual ${kod} (Siri ${siri}) bagi ${location.nama} didaftarkan.`,
      });

      const saved = await findScheduleRow(c.env.DB, id);

      return c.json(
        {
          success: true,
          message: `Jadual Siri ${siri} bagi ${location.nama} berjaya didaftarkan.`,
          data: saved ? mapSchedule(saved) : { id, kod },
        },
        201
      );
    } catch (e: any) {
      const duplicate = /UNIQUE/i.test(e.message);
      return c.json(
        {
          success: false,
          code: duplicate ? 'ALREADY_SCHEDULED' : 'CREATE_FAILED',
          message: duplicate
            ? 'Ruang ini sudah mempunyai jadual dalam sesi semasa.'
            : e.message,
        },
        duplicate ? 409 : 500
      );
    }
  })

  // 3. UPDATE SCHEDULE STATUS / INSPECTORS / REPORT
  .put('/:id', async (c) => {
    const id = c.req.param('id');

    try {
      const body = await c.req.json();

      const current = await c.env.DB.prepare(
        `SELECT id, department_id, location_id, tarikh_mula, tarikh_tamat, pemeriksa1_id, pemeriksa2_id
         FROM inspection_schedules WHERE id = ?`
      )
        .bind(id)
        .first<{
          id: string;
          department_id: string;
          location_id: string;
          tarikh_mula: string | null;
          tarikh_tamat: string | null;
          pemeriksa1_id: string | null;
          pemeriksa2_id: string | null;
        }>();

      if (!current) {
        return c.json({ success: false, message: 'Jadual tidak dijumpai' }, 404);
      }

      const auth = getAuthUser(c);
      const isAdmin = auth ? await hasActiveRole(c.env.DB, auth.id, 'PENTADBIR_SISTEM') : false;

      // Tarikh pemeriksaan ditetapkan oleh Penyelia Lokasi bagi ruang itu (atau pentadbir).
      const changesDates = body.tarikhMula !== undefined || body.tarikhTamat !== undefined;
      if (changesDates) {
        if (!isAdmin) {
          const scope = auth
            ? await loadManageScope(c.env.DB, auth.id)
            : { isAdmin: false, canManage: false, departmentIds: [], locationIds: [] };

          if (
            !auth ||
            !canManageLocation(scope, {
              id: current.location_id,
              departmentId: current.department_id,
            })
          ) {
            return c.json(
              {
                success: false,
                code: 'DATE_FORBIDDEN',
                message:
                  'Akses ditolak: hanya Penyelia Lokasi bagi ruang ini (atau Pentadbir Sistem) boleh menetapkan tarikh pemeriksaan.',
              },
              403
            );
          }
        }

        const mula = body.tarikhMula ?? current.tarikh_mula ?? '';
        const tamat = body.tarikhTamat ?? current.tarikh_tamat ?? '';

        if (!mula || !tamat) {
          return c.json(
            {
              success: false,
              code: 'INVALID_DATE',
              message: 'Tarikh mula dan tarikh tamat pemeriksaan perlu diisi serentak.',
            },
            400
          );
        }
        if (tamat < mula) {
          return c.json(
            {
              success: false,
              code: 'INVALID_DATE',
              message: 'Tarikh tamat tidak boleh lebih awal daripada tarikh mula.',
            },
            400
          );
        }
      }

      // PBAC: penetapan pemeriksa hanya melalui endpoint tuntutan slot (atau pentadbir).
      const changesInspectors =
        body.pemeriksa1 !== undefined ||
        body.pemeriksa1Email !== undefined ||
        body.pemeriksa2 !== undefined ||
        body.pemeriksa2Email !== undefined;

      if (changesInspectors && !isAdmin) {
        return c.json(
          {
            success: false,
            code: 'USE_CLAIM_ENDPOINT',
            message:
              'Penetapan pemeriksa hanya dibenarkan melalui tuntutan slot (POST /api/schedules/:id/claim) atau oleh Pentadbir Sistem.',
          },
          403
        );
      }

      // PBAC: hanya pemeriksa yang ditugaskan (dan lantikan masih aktif) boleh mengemas kini laporan.
      const changesReport =
        body.status !== undefined ||
        body.laporanPraJkpak !== undefined ||
        body.kewpa11DocKey !== undefined;

      if (changesReport && !isAdmin) {
        const isAssignedInspector =
          Boolean(auth) &&
          (current.pemeriksa1_id === auth?.id || current.pemeriksa2_id === auth?.id);

        if (!isAssignedInspector || !auth) {
          await recordAudit(c.env.DB, {
            actorId: auth?.id ?? null,
            actorName: auth?.emel ?? 'tidak-dikenali',
            actedAsRole: auth?.role ?? 'Tiada',
            action: 'schedule:report_update',
            departmentId: current.department_id,
            decision: 'DENY',
            policyId: 'POL_INSPECTION_TASK_ASSIGNMENT',
            resourceId: id,
            notes: 'Pegawai bukan pemeriksa yang ditugaskan bagi jadual ini.',
            reason: 'NOT_ASSIGNED_INSPECTOR',
          });

          return c.json(
            {
              success: false,
              code: 'NOT_ASSIGNED_INSPECTOR',
              message:
                'Hanya pemeriksa yang ditugaskan bagi jadual ini boleh mengemas kini laporan pemeriksaan.',
            },
            403
          );
        }

        const assignments = await listAssignmentsForOfficer(c.env.DB, auth.id);
        const appointment = summarizeInspectorAppointment(assignments);

        if (!appointment?.activeToday) {
          await recordAudit(c.env.DB, {
            actorId: auth.id,
            actorName: auth.emel,
            actedAsRole: auth.role,
            action: 'schedule:report_update',
            departmentId: current.department_id,
            decision: 'DENY',
            policyId: 'POL_INSPECTOR_APPOINTMENT_REQUIRED',
            resourceId: id,
            notes: appointment?.validTo
              ? `Lantikan pemeriksa tamat pada ${appointment.validTo}.`
              : 'Tiada lantikan pemeriksa aktif.',
            reason: appointment ? 'APPOINTMENT_EXPIRED' : 'NO_APPOINTMENT',
          });

          return c.json(
            {
              success: false,
              code: 'APPOINTMENT_INACTIVE',
              message: appointment?.validTo
                ? `Lantikan pemeriksa anda telah tamat pada ${appointment.validTo}. Sila mohon pembaharuan lantikan.`
                : 'Tiada lantikan Pegawai Pemeriksa yang aktif bagi akaun anda.',
            },
            403
          );
        }
      }

      const assignments: string[] = [];
      const params: unknown[] = [];
      const set = (column: string, value: unknown) => {
        assignments.push(`${column} = ?`);
        params.push(value);
      };

      if (body.tarikhMula !== undefined) set('tarikh_mula', body.tarikhMula);
      if (body.tarikhTamat !== undefined) set('tarikh_tamat', body.tarikhTamat);
      if (body.catatan !== undefined) set('catatan', body.catatan || null);
      if (body.kewpa11DocKey !== undefined) set('kewpa11_r2_key', body.kewpa11DocKey || null);
      if (body.status !== undefined) set('status_id', await resolveStatusId(c.env.DB, body.status));

      if (body.pemeriksa1 !== undefined || body.pemeriksa1Email !== undefined) {
        const officerId = await ensureOfficerId(
          c.env.DB,
          { nama: body.pemeriksa1, emel: body.pemeriksa1Email },
          current.department_id
        );
        if (officerId) set('pemeriksa1_id', officerId);
      }

      if (body.pemeriksa2 !== undefined || body.pemeriksa2Email !== undefined) {
        const officerId = await ensureOfficerId(
          c.env.DB,
          { nama: body.pemeriksa2, emel: body.pemeriksa2Email },
          current.department_id
        );
        if (officerId) set('pemeriksa2_id', officerId);
      }

      if (assignments.length > 0) {
        await c.env.DB.prepare(
          `UPDATE inspection_schedules SET ${assignments.join(', ')}, updated_at = datetime('now') WHERE id = ?`
        )
          .bind(...params, id)
          .run();
      }

      if (body.laporanPraJkpak) {
        const report = body.laporanPraJkpak;
        const baik = Number(report.baik) || 0;
        const rosak = Number(report.rosak) || 0;
        const usang = Number(report.usang) || 0;
        const hilang = Number(report.hilang) || 0;

        await c.env.DB.prepare(
          `INSERT INTO inspection_reports (
            id, schedule_id, kuantiti_diperiksa, bil_elok, bil_rosak, bil_usang, bil_hilang,
            justifikasi_kerosakan, syor_tindakan, tarikh_pengesahan
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(schedule_id) DO UPDATE SET
            kuantiti_diperiksa = excluded.kuantiti_diperiksa,
            bil_elok = excluded.bil_elok,
            bil_rosak = excluded.bil_rosak,
            bil_usang = excluded.bil_usang,
            bil_hilang = excluded.bil_hilang,
            justifikasi_kerosakan = excluded.justifikasi_kerosakan,
            syor_tindakan = excluded.syor_tindakan,
            tarikh_pengesahan = excluded.tarikh_pengesahan`
        )
          .bind(
            `REP-${id}`,
            id,
            baik + rosak + usang + hilang,
            baik,
            rosak,
            usang,
            hilang,
            report.justifikasiTidakDigunakan || report.cadangan || null,
            report.syorTindakanUsang || report.cadangan || null,
            report.tarikhHantar || null
          )
          .run();
      }

      const saved = await findScheduleRow(c.env.DB, id);

      return c.json({
        success: true,
        message: 'Jadual berjaya dikemaskini',
        data: saved ? mapSchedule(saved) : undefined,
      });
    } catch (e: any) {
      return c.json({ success: false, message: e.message }, 500);
    }
  })

  // 3b. SAHKAN DAPATAN PEMERIKSAAN (pemisahan tugas)
  .post('/:id/verify', async (c) => {
    const id = c.req.param('id');
    const auth = getAuthUser(c);

    if (!auth) {
      return c.json(
        { success: false, code: 'UNAUTHENTICATED', message: 'Sesi tidak sah. Sila log masuk.' },
        401
      );
    }

    try {
      const row = await c.env.DB.prepare(
        `SELECT id, location_id AS locationId, department_id AS departmentId, status_id AS statusId,
                pemeriksa1_id AS pemeriksa1Id, pemeriksa2_id AS pemeriksa2Id
         FROM inspection_schedules WHERE id = ? LIMIT 1`
      )
        .bind(id)
        .first<{
          id: string;
          locationId: string;
          departmentId: string;
          statusId: string;
          pemeriksa1Id: string | null;
          pemeriksa2Id: string | null;
        }>();

      if (!row) {
        return c.json({ success: false, code: 'NOT_FOUND', message: 'Jadual tidak dijumpai.' }, 404);
      }

      const result = await evaluateVerification(c.env.DB, auth.id, {
        scheduleId: row.id,
        locationId: row.locationId,
        departmentId: row.departmentId,
        statusId: row.statusId,
        pemeriksa1Id: row.pemeriksa1Id,
        pemeriksa2Id: row.pemeriksa2Id,
      });

      if (!result.allowed) {
        await recordAudit(c.env.DB, {
          actorId: auth.id,
          actorName: auth.emel,
          actedAsRole: auth.role,
          action: 'report:verify',
          departmentId: row.departmentId,
          decision: 'DENY',
          policyId: 'POL_SEPARATION_OF_DUTIES',
          resourceId: id,
          notes: result.reasons.join(' '),
          reason: result.codes[0] ?? null,
        });

        return c.json(
          {
            success: false,
            code: 'VERIFICATION_DENIED',
            message: result.reasons[0],
            reasons: result.reasons,
            codes: result.codes,
          },
          403
        );
      }

      const verificationDate = new Date().toISOString().slice(0, 10);

      await c.env.DB.prepare(
        `INSERT INTO inspection_reports
           (id, schedule_id, kuantiti_diperiksa, bil_elok, bil_rosak, bil_usang, bil_hilang,
            disahkan_oleh_id, tarikh_pengesahan)
         VALUES (?, ?, 0, 0, 0, 0, 0, ?, ?)
         ON CONFLICT(schedule_id) DO UPDATE SET
           disahkan_oleh_id = excluded.disahkan_oleh_id,
           tarikh_pengesahan = excluded.tarikh_pengesahan`
      )
        .bind(`REP-${id}`, id, auth.id, verificationDate)
        .run();

      await recordAudit(c.env.DB, {
        actorId: auth.id,
        actorName: auth.emel,
        actedAsRole: auth.role,
        action: 'report:verify',
        departmentId: row.departmentId,
        decision: 'PERMIT',
        policyId: 'POL_SEPARATION_OF_DUTIES',
        resourceId: id,
        notes: `Dapatan pemeriksaan disahkan oleh ${auth.nama} (${auth.role}) pada ${verificationDate}.`,
      });

      const saved = await findScheduleRow(c.env.DB, id);

      return c.json({
        success: true,
        message: 'Dapatan pemeriksaan disahkan.',
        data: saved ? mapSchedule(saved) : null,
        verifiedBy: { id: auth.id, nama: auth.nama, tarikh: verificationDate },
      });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat pengesahan dapatan: ' + e.message }, 500);
    }
  })

  // 4. DELETE SCHEDULE
  .delete('/:id', async (c) => {
    const id = c.req.param('id');

    try {
      const existing = await c.env.DB.prepare('SELECT id FROM inspection_schedules WHERE id = ?')
        .bind(id)
        .first<{ id: string }>();

      if (!existing) {
        return c.json({ success: false, message: 'Jadual tidak dijumpai' }, 404);
      }

      await c.env.DB.prepare('DELETE FROM inspection_reports WHERE schedule_id = ?').bind(id).run();
      await c.env.DB.prepare('DELETE FROM inspection_schedules WHERE id = ?').bind(id).run();

      return c.json({ success: true, message: 'Jadual berjaya dipadam' });
    } catch (e: any) {
      return c.json({ success: false, message: e.message }, 500);
    }
  });
