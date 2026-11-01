import { Hono } from 'hono';
import {
  closeCycle,
  createCycle,
  eligibleInspectorsForSchedule,
  evaluateCycleFlags,
  generateCycleAssignments,
  getCycle,
  listCycleAssignments,
  listCycles,
  reassignCycleSlot,
  startCycle,
  type CycleMode,
} from '../lib/cycles';
import { getAuthUser, requireRole, type AppEnv } from '../middleware/auth';
import { recordAudit } from '../lib/audit';
import {
  getCycleParams,
  lockPlan,
  PlanBlockedError,
  previewPlan,
  updateCycleParams,
} from '../lib/planning';

const VALID_MODES: CycleMode[] = ['SEHALA', 'TIMBAL_BALIK'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const cyclesRoute = new Hono<AppEnv>()

  // 1. SENARAI KITARAN (terbuka — bacaan sahaja)
  .get('/', async (c) => {
    try {
      const data = await listCycles(c.env.DB);
      return c.json({ success: true, total: data.length, data });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat mendapatkan kitaran: ' + e.message }, 500);
    }
  })

  // 2. BUTIRAN KITARAN + PENUGASAN + FLAG
  .get('/:id', async (c) => {
    try {
      const cycle = await getCycle(c.env.DB, c.req.param('id'));
      if (!cycle) {
        return c.json({ success: false, code: 'NOT_FOUND', message: 'Kitaran tidak dijumpai.' }, 404);
      }

      const [assignments, flags] = await Promise.all([
        listCycleAssignments(c.env.DB, cycle.id),
        evaluateCycleFlags(c.env.DB, cycle),
      ]);

      return c.json({ success: true, data: { cycle, assignments, flags } });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat mendapatkan butiran kitaran: ' + e.message }, 500);
    }
  })

  // 9. PARAMETER PELAN (Q, τ, 1.25, 1.5)
  .get('/:id/params', async (c) => {
    try {
      const cycle = await getCycle(c.env.DB, c.req.param('id'));
      if (!cycle) {
        return c.json({ success: false, code: 'NOT_FOUND', message: 'Kitaran tidak dijumpai.' }, 404);
      }
      return c.json({ success: true, data: await getCycleParams(c.env.DB, cycle.id) });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat mendapatkan parameter: ' + e.message }, 500);
    }
  })

  .put('/:id/params', requireRole('PENTADBIR_SISTEM'), async (c) => {
    try {
      const cycle = await getCycle(c.env.DB, c.req.param('id'));
      if (!cycle) {
        return c.json({ success: false, code: 'NOT_FOUND', message: 'Kitaran tidak dijumpai.' }, 404);
      }

      const body = await c.req.json().catch(() => ({}));
      const updated = await updateCycleParams(c.env.DB, cycle.id, {
        quota: body?.quota === undefined ? undefined : Number(body.quota),
        tolerance: body?.tolerance === undefined ? undefined : Number(body.tolerance),
        overload: body?.overload === undefined ? undefined : Number(body.overload),
        split: body?.split === undefined ? undefined : Number(body.split),
        oddPolicy: body?.oddPolicy,
      });

      const auth = getAuthUser(c);
      await recordAudit(c.env.DB, {
        actorId: auth?.id ?? null,
        actorName: auth?.emel ?? 'sistem',
        actedAsRole: auth?.role ?? 'Pentadbir Sistem',
        action: 'cycle:params',
        departmentId: auth?.dept ?? 'PENTADBIRAN',
        decision: 'PERMIT',
        policyId: 'POL_INSPECTION_CYCLE',
        resourceId: cycle.id,
        notes: `Parameter pelan dikemas kini: Q=${updated.quota}, τ=${updated.tolerance}, beban=${updated.overload}, pecah=${updated.split}, ganjil=${updated.oddPolicy}.`,
      });

      return c.json({ success: true, message: 'Parameter pelan dikemas kini.', data: updated });
    } catch (e: any) {
      return c.json({ success: false, code: 'INVALID_INPUT', message: e.message }, 400);
    }
  })

  // 10. PRATONTON PELAN (tiada penulisan)
  .get('/:id/plan', async (c) => {
    try {
      const cycle = await getCycle(c.env.DB, c.req.param('id'));
      if (!cycle) {
        return c.json({ success: false, code: 'NOT_FOUND', message: 'Kitaran tidak dijumpai.' }, 404);
      }

      const plan = await previewPlan(c.env.DB, cycle);
      return c.json({ success: true, data: plan });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat menjana pratonton pelan: ' + e.message }, 500);
    }
  })

  // 11. KUNCI PELAN (snapshot berversi)
  .post('/:id/lock', requireRole('PENTADBIR_SISTEM'), async (c) => {
    try {
      const cycle = await getCycle(c.env.DB, c.req.param('id'));
      if (!cycle) {
        return c.json({ success: false, code: 'NOT_FOUND', message: 'Kitaran tidak dijumpai.' }, 404);
      }
      if (cycle.status === 'SELESAI') {
        return c.json({ success: false, code: 'CYCLE_CLOSED', message: 'Kitaran telah ditutup.' }, 409);
      }

      const auth = getAuthUser(c);
      const result = await lockPlan(c.env.DB, cycle, auth?.id ?? null);

      await recordAudit(c.env.DB, {
        actorId: auth?.id ?? null,
        actorName: auth?.emel ?? 'sistem',
        actedAsRole: auth?.role ?? 'Pentadbir Sistem',
        action: 'cycle:lock_plan',
        departmentId: auth?.dept ?? 'PENTADBIRAN',
        decision: 'PERMIT',
        policyId: 'POL_INSPECTION_CYCLE',
        resourceId: cycle.id,
        notes: `Pelan v${result.planVersion} dikunci: ${result.groups} kumpulan, ${result.pairings} pasangan, ${result.targets} sasaran, ${result.schedulesCreated} jadual baharu, ${result.preservedTargets} lokasi selesai dikekalkan.`,
      });

      return c.json({
        success: true,
        message: `Pelan v${result.planVersion} dikunci.`,
        data: result,
      });
    } catch (e: any) {
      if (e instanceof PlanBlockedError) {
        const auth = getAuthUser(c);
        await recordAudit(c.env.DB, {
          actorId: auth?.id ?? null,
          actorName: auth?.emel ?? 'sistem',
          actedAsRole: auth?.role ?? 'Pentadbir Sistem',
          action: 'cycle:lock_plan',
          departmentId: auth?.dept ?? 'PENTADBIRAN',
          decision: 'DENY',
          policyId: 'POL_INSPECTION_CYCLE',
          resourceId: c.req.param('id'),
          notes: `Kunci pelan ditolak: ${e.blockers.join(' | ')}`,
          reason: 'PLAN_BLOCKED',
        });
        return c.json(
          {
            success: false,
            code: 'PLAN_BLOCKED',
            message: `Pelan tidak boleh dikunci: ${e.blockers[0]}`,
            data: { blockers: e.blockers },
          },
          422
        );
      }
      return c.json({ success: false, message: 'Ralat mengunci pelan: ' + e.message }, 500);
    }
  })

  // 12. PEGAWAI LAYAK BAGI JADUAL (cadangan penugasan)
  .get('/:id/eligible', async (c) => {
    try {
      const cycle = await getCycle(c.env.DB, c.req.param('id'));
      if (!cycle) {
        return c.json({ success: false, code: 'NOT_FOUND', message: 'Kitaran tidak dijumpai.' }, 404);
      }

      const scheduleId = c.req.query('scheduleId');
      if (!scheduleId) {
        return c.json(
          { success: false, code: 'INVALID_INPUT', message: 'Parameter scheduleId diperlukan.' },
          400
        );
      }

      const data = await eligibleInspectorsForSchedule(c.env.DB, scheduleId);
      return c.json({ success: true, total: data.length, data });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat mendapatkan pegawai layak: ' + e.message }, 500);
    }
  })

  // 4. CIPTA KITARAN (pentadbir sistem)
  .post('/', requireRole('PENTADBIR_SISTEM'), async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const tarikhMula = String(body?.tarikhMula ?? '').trim();
      const tarikhTamat = String(body?.tarikhTamat ?? '').trim();
      const mode = String(body?.mode ?? 'SEHALA').toUpperCase() as CycleMode;

      if (!DATE_PATTERN.test(tarikhMula) || !DATE_PATTERN.test(tarikhTamat)) {
        return c.json(
          { success: false, code: 'INVALID_INPUT', message: 'Tarikh mula/tamat mesti format YYYY-MM-DD.' },
          400
        );
      }
      if (tarikhTamat < tarikhMula) {
        return c.json(
          { success: false, code: 'INVALID_INPUT', message: 'Tarikh tamat mesti selepas tarikh mula.' },
          400
        );
      }
      if (!VALID_MODES.includes(mode)) {
        return c.json(
          { success: false, code: 'INVALID_MODE', message: "Mod mesti 'SEHALA' atau 'TIMBAL_BALIK'." },
          400
        );
      }

      // Elak kitaran bertindih (DRAF/AKTIF) kerana ia menjadikan penugasan slot kabur.
      const overlap = await c.env.DB.prepare(
        `SELECT kod FROM inspection_cycles
         WHERE status IN ('DRAF', 'AKTIF')
           AND tarikh_mula <= ? AND tarikh_tamat >= ?
         LIMIT 1`
      )
        .bind(tarikhTamat, tarikhMula)
        .first<{ kod: string }>();

      if (overlap) {
        return c.json(
          {
            success: false,
            code: 'CYCLE_OVERLAP',
            message: `Tarikh kitaran bertindih dengan kitaran sedia ada (${overlap.kod}). Tutup atau ubah tarikh kitaran tersebut dahulu.`,
          },
          409
        );
      }

      const cycle = await createCycle(c.env.DB, {
        sessionId: body?.sessionId ?? null,
        kod: body?.kod ?? null,
        mode,
        tarikhMula,
        tarikhTamat,
      });

      const auth = getAuthUser(c);
      await recordAudit(c.env.DB, {
        actorId: auth?.id ?? null,
        actorName: auth?.emel ?? 'sistem',
        actedAsRole: auth?.role ?? 'Pentadbir Sistem',
        action: 'cycle:create',
        departmentId: auth?.dept ?? 'PENTADBIRAN',
        decision: 'PERMIT',
        policyId: 'POL_INSPECTION_CYCLE',
        resourceId: cycle.id,
        notes: `Kitaran ${cycle.kod} (${cycle.mode}) ${cycle.tarikhMula} hingga ${cycle.tarikhTamat} dicipta.`,
      });

      return c.json({ success: true, message: 'Kitaran pemeriksaan dicipta.', data: cycle }, 201);
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat mencipta kitaran: ' + e.message }, 500);
    }
  })

  // 5. JANA PENUGASAN (kolam lokasi layak)
  .post('/:id/generate', requireRole('PENTADBIR_SISTEM'), async (c) => {
    try {
      const cycle = await getCycle(c.env.DB, c.req.param('id'));
      if (!cycle) {
        return c.json({ success: false, code: 'NOT_FOUND', message: 'Kitaran tidak dijumpai.' }, 404);
      }
      if (cycle.status === 'SELESAI') {
        return c.json(
          { success: false, code: 'CYCLE_CLOSED', message: 'Kitaran telah ditutup; penjanaan tidak dibenarkan.' },
          409
        );
      }

      const body = await c.req.json().catch(() => ({}));
      const result = await generateCycleAssignments(c.env.DB, cycle, {
        departmentId: body?.departmentId ?? null,
      });

      const auth = getAuthUser(c);
      await recordAudit(c.env.DB, {
        actorId: auth?.id ?? null,
        actorName: auth?.emel ?? 'sistem',
        actedAsRole: auth?.role ?? 'Pentadbir Sistem',
        action: 'cycle:generate',
        departmentId: auth?.dept ?? 'PENTADBIRAN',
        decision: 'PERMIT',
        policyId: 'POL_INSPECTION_CYCLE',
        resourceId: cycle.id,
        notes: `Penjanaan kolam: ${result.created} penugasan baharu daripada ${result.schedules} jadual.`,
      });

      return c.json({
        success: true,
        message: `${result.created} penugasan baharu dijana (${result.skipped} sedia ada dilangkau).`,
        data: result,
      });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat menjana penugasan: ' + e.message }, 500);
    }
  })

  // 6. MULAKAN KITARAN (kunci snapshot timbal balik)
  .post('/:id/start', requireRole('PENTADBIR_SISTEM'), async (c) => {
    try {
      const cycle = await getCycle(c.env.DB, c.req.param('id'));
      if (!cycle) {
        return c.json({ success: false, code: 'NOT_FOUND', message: 'Kitaran tidak dijumpai.' }, 404);
      }
      if (cycle.status === 'AKTIF') {
        return c.json({ success: false, code: 'ALREADY_ACTIVE', message: 'Kitaran sudah aktif.' }, 409);
      }
      if (cycle.status === 'SELESAI') {
        return c.json({ success: false, code: 'CYCLE_CLOSED', message: 'Kitaran telah ditutup.' }, 409);
      }

      const assignments = await listCycleAssignments(c.env.DB, cycle.id);
      if (assignments.length === 0) {
        return c.json(
          {
            success: false,
            code: 'NO_ASSIGNMENTS',
            message: 'Jana penugasan terlebih dahulu sebelum memulakan kitaran.',
          },
          409
        );
      }

      const auth = getAuthUser(c);
      const result = await startCycle(c.env.DB, cycle, auth?.id ?? null);

      await recordAudit(c.env.DB, {
        actorId: auth?.id ?? null,
        actorName: auth?.emel ?? 'sistem',
        actedAsRole: auth?.role ?? 'Pentadbir Sistem',
        action: 'cycle:start',
        departmentId: auth?.dept ?? 'PENTADBIRAN',
        decision: 'PERMIT',
        policyId: cycle.mode === 'TIMBAL_BALIK' ? 'POL_CROSS_INSPECTION_MANDATE' : 'POL_INSPECTION_CYCLE',
        resourceId: cycle.id,
        notes: `Kitaran ${cycle.kod} dimulakan; snapshot ${result.snapshotId} dengan ${result.pairs} pasangan timbal balik dikunci.`,
      });

      return c.json({
        success: true,
        message: `Kitaran dimulakan. ${result.pairs} pasangan timbal balik dikunci dalam snapshot.`,
        data: { snapshotId: result.snapshotId, pairs: result.pairs, assignments: result.assignments },
      });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat memulakan kitaran: ' + e.message }, 500);
    }
  })

  // 7. TUTUP KITARAN
  .post('/:id/close', requireRole('PENTADBIR_SISTEM'), async (c) => {
    try {
      const cycle = await getCycle(c.env.DB, c.req.param('id'));
      if (!cycle) {
        return c.json({ success: false, code: 'NOT_FOUND', message: 'Kitaran tidak dijumpai.' }, 404);
      }

      await closeCycle(c.env.DB, cycle.id);

      const auth = getAuthUser(c);
      await recordAudit(c.env.DB, {
        actorId: auth?.id ?? null,
        actorName: auth?.emel ?? 'sistem',
        actedAsRole: auth?.role ?? 'Pentadbir Sistem',
        action: 'cycle:close',
        departmentId: auth?.dept ?? 'PENTADBIRAN',
        decision: 'PERMIT',
        policyId: 'POL_INSPECTION_CYCLE',
        resourceId: cycle.id,
        notes: `Kitaran ${cycle.kod} ditutup.`,
      });

      return c.json({ success: true, message: 'Kitaran ditutup.', data: await getCycle(c.env.DB, cycle.id) });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat menutup kitaran: ' + e.message }, 500);
    }
  })

  // 8. PENUGASAN SEMULA SLOT (eksplisit, direkod)
  .post('/:id/reassign', requireRole('PENTADBIR_SISTEM'), async (c) => {
    try {
      const cycle = await getCycle(c.env.DB, c.req.param('id'));
      if (!cycle) {
        return c.json({ success: false, code: 'NOT_FOUND', message: 'Kitaran tidak dijumpai.' }, 404);
      }
      if (cycle.status === 'SELESAI') {
        return c.json({ success: false, code: 'CYCLE_CLOSED', message: 'Kitaran telah ditutup.' }, 409);
      }

      const body = await c.req.json().catch(() => ({}));
      const assignmentId = String(body?.assignmentId ?? '').trim();
      const officerId = String(body?.officerId ?? '').trim();
      const reason = String(body?.reason ?? '').trim();

      if (!assignmentId || !officerId) {
        return c.json(
          { success: false, code: 'INVALID_INPUT', message: 'assignmentId dan officerId diperlukan.' },
          400
        );
      }
      if (!reason) {
        return c.json(
          { success: false, code: 'INVALID_INPUT', message: 'Sebab penugasan semula wajib dinyatakan.' },
          400
        );
      }

      const auth = getAuthUser(c);
      const result = await reassignCycleSlot(c.env.DB, cycle, {
        assignmentId,
        officerId,
        reason,
        note: body?.note ?? null,
        createdById: auth?.id ?? null,
      });

      await recordAudit(c.env.DB, {
        actorId: auth?.id ?? null,
        actorName: auth?.emel ?? 'sistem',
        actedAsRole: auth?.role ?? 'Pentadbir Sistem',
        action: 'cycle:reassign',
        departmentId: auth?.dept ?? 'PENTADBIRAN',
        decision: result.denied.length ? 'DENY' : 'PERMIT',
        policyId: 'POL_INSPECTION_REASSIGNMENT',
        resourceId: assignmentId,
        notes: `Penugasan semula slot ${result.assignment.slot} bagi ${result.assignment.kodRuang ?? result.assignment.locationId}: ${reason}`,
        reason: result.denied[0] ?? null,
      });

      return c.json({
        success: true,
        message: result.denied.length
          ? 'Penugasan disimpan, tetapi pegawai ini mempunyai isu kelayakan — semak flag kitaran.'
          : 'Penugasan semula berjaya direkod.',
        data: result.assignment,
        codes: result.denied,
      });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat penugasan semula: ' + e.message }, 500);
    }
  });
