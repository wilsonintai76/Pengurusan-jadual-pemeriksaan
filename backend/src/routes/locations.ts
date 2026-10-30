import { Hono } from 'hono';
import type { Bindings, LocationRecord, PegawaiBertanggungjawab } from '../types';
import type { DB, OfficerInput } from '../lib/db';
import { getAuthUser, requireRole } from '../middleware/auth';
import { canManageDepartment, canManageLocation, loadManageScope } from '../lib/permissions';
import {
  ensureBuildingId,
  ensureOfficerId,
  resolveAssetCategoryId,
  resolveDepartmentId,
  resolveRoomCategoryId,
  resolveStatusId,
} from '../lib/db';

const DEFAULT_LATITUDE = 1.621425;
const DEFAULT_LONGITUDE = 110.32358;

interface LocationRow {
  id: string;
  kodRuang: string;
  nama: string;
  jabatan: string;
  namaJabatan: string;
  kategoriRuang: string;
  bangunan: string;
  aras: string;
  latitude: number;
  longitude: number;
  statusPemeriksaan: string;
  tarikhTerakhirDiperiksa: string | null;
  anggaranAset: number;
  penjaga: string;
  penjagaJawatan: string | null;
  penjagaEmel: string | null;
  penjagaTel: string | null;
  jadualId: string | null;
  kewpa7TerkiniId: string | null;
  tarikhKemaskiniKewpa7: string | null;
}

interface CustodianRow {
  location_id: string;
  id: string;
  nama: string;
  jawatan: string | null;
  emel: string | null;
  tel: string | null;
}

const CUSTODIAN_SELECT = `
  SELECT lc.location_id, o.id, o.nama, o.jawatan, o.emel, o.telefon AS tel
  FROM location_custodians lc
  JOIN officers o ON o.id = lc.officer_id
`;

function mapOfficer(row: CustodianRow): PegawaiBertanggungjawab {
  return {
    id: row.id,
    nama: row.nama,
    jawatan: row.jawatan ?? undefined,
    emel: row.emel ?? undefined,
    tel: row.tel ?? undefined,
  };
}

function mapLocation(row: LocationRow, officers: PegawaiBertanggungjawab[]): LocationRecord {
  // Pegawai penjaga boleh datang daripada lantikan PENYELIA_LOKASI (Direktori Pegawai)
  // walaupun tiada baris location_custodians — pastikan ia kelihatan dalam borang.
  const assignedOfficers =
    officers.length > 0
      ? officers
      : row.penjaga && row.penjaga !== 'Belum Dilantik'
        ? [
            {
              id: '',
              nama: row.penjaga,
              jawatan: row.penjagaJawatan ?? undefined,
              emel: row.penjagaEmel ?? undefined,
              tel: row.penjagaTel ?? undefined,
            },
          ]
        : [];

  return {
    id: row.id,
    kodRuang: row.kodRuang,
    nama: row.nama,
    jabatan: row.jabatan,
    kategoriRuang: row.kategoriRuang,
    bangunan: row.bangunan,
    aras: row.aras,
    penjaga: row.penjaga,
    penjagaJawatan: row.penjagaJawatan ?? undefined,
    penjagaEmel: row.penjagaEmel ?? undefined,
    penjagaTel: row.penjagaTel ?? undefined,
    anggaranAset: Number(row.anggaranAset) || 0,
    statusPemeriksaan: row.statusPemeriksaan as LocationRecord['statusPemeriksaan'],
    tarikhTerakhirDiperiksa: row.tarikhTerakhirDiperiksa ?? undefined,
    jadualId: row.jadualId ?? undefined,
    kewpa7TerkiniId: row.kewpa7TerkiniId ?? undefined,
    tarikhKemaskiniKewpa7: row.tarikhKemaskiniKewpa7 ?? undefined,
    latitude: Number(row.latitude) || DEFAULT_LATITUDE,
    longitude: Number(row.longitude) || DEFAULT_LONGITUDE,
    pegawaiBertanggungjawabList: assignedOfficers,
  };
}

function custodianInputs(body: Record<string, any>): OfficerInput[] {
  if (Array.isArray(body.pegawaiBertanggungjawabList) && body.pegawaiBertanggungjawabList.length > 0) {
    return body.pegawaiBertanggungjawabList;
  }
  if (body.penjaga) {
    return [
      {
        nama: body.penjaga,
        jawatan: body.penjagaJawatan,
        emel: body.penjagaEmel,
        tel: body.penjagaTel,
      },
    ];
  }
  return [];
}

async function syncCustodians(
  db: DB,
  locationId: string,
  departmentId: string,
  inputs: OfficerInput[]
): Promise<void> {
  await db.prepare('DELETE FROM location_custodians WHERE location_id = ?').bind(locationId).run();

  const officerIds: string[] = [];
  let index = 0;
  for (const input of inputs) {
    const officerId = await ensureOfficerId(db, input, departmentId);
    if (!officerId) continue;

    index += 1;
    await db
      .prepare(
        `INSERT OR IGNORE INTO location_custodians (id, location_id, officer_id, jenis_penjaga)
         VALUES (?, ?, ?, ?)`
      )
      .bind(
        `LC-${locationId}-${index}`,
        locationId,
        officerId,
        index === 1 ? 'Pegawai Bertanggungjawab Utama' : 'Pembantu'
      )
      .run();

    if (!officerIds.includes(officerId)) officerIds.push(officerId);
  }

  // Lantikan PENYELIA_LOKASI bagi ruang ini diselaraskan dengan senarai penjaga:
  // yang tiada lagi dalam senarai ditamatkan (sejarah kekal), yang baharu ditambah.
  const keepClause = officerIds.length ? `AND officer_id NOT IN (${officerIds.map(() => '?').join(',')})` : '';
  await db
    .prepare(
      `UPDATE role_assignments
          SET status = 'DITAMATKAN',
              valid_to = COALESCE(valid_to, date('now')),
              notes = TRIM(COALESCE(notes, '') || ' [Diganti]'),
              updated_at = datetime('now')
        WHERE scope_type = 'LOCATION' AND scope_id = ? AND role_id = 'PENYELIA_LOKASI'
          AND status = 'AKTIF' ${keepClause}`
    )
    .bind(locationId, ...officerIds)
    .run();

  for (const officerId of officerIds) {
    const existing = await db
      .prepare(
        `SELECT id FROM role_assignments
          WHERE scope_type = 'LOCATION' AND scope_id = ? AND role_id = 'PENYELIA_LOKASI'
            AND officer_id = ? AND status = 'AKTIF'
          LIMIT 1`
      )
      .bind(locationId, officerId)
      .first<{ id: string }>();

    if (existing) continue;

    await db
      .prepare(
        `INSERT INTO role_assignments (id, officer_id, role_id, scope_type, scope_id, valid_from, status)
         VALUES (?, ?, 'PENYELIA_LOKASI', 'LOCATION', ?, date('now'), 'AKTIF')`
      )
      .bind(`RA-LOC-${locationId}-${Date.now().toString(36).toUpperCase()}`, officerId, locationId)
      .run();
  }
}

export const locationsRoute = new Hono<{ Bindings: Bindings }>()

  // 1. GET ALL LOCATIONS (Filtered by Dept / Status / Search)
  .get('/', async (c) => {
    const dept = c.req.query('dept');
    const status = c.req.query('status');
    const search = c.req.query('q');

    try {
      const clauses: string[] = [];
      const params: unknown[] = [];

      if (dept && dept !== 'SEMUA') {
        clauses.push('jabatan = ?');
        params.push(dept);
      }

      if (status && status !== 'SEMUA') {
        clauses.push('statusPemeriksaan = ?');
        params.push(status);
      }

      if (search) {
        clauses.push('(kodRuang LIKE ? OR nama LIKE ? OR bangunan LIKE ? OR penjaga LIKE ?)');
        const wildcard = `%${search}%`;
        params.push(wildcard, wildcard, wildcard, wildcard);
      }

      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const { results } = await c.env.DB.prepare(
        `SELECT * FROM v_locations_full ${where} ORDER BY kodRuang ASC`
      )
        .bind(...params)
        .all<LocationRow>();

      const { results: custodianRows } = await c.env.DB.prepare(CUSTODIAN_SELECT).all<CustodianRow>();
      const officersByLocation = new Map<string, PegawaiBertanggungjawab[]>();

      for (const row of custodianRows ?? []) {
        const list = officersByLocation.get(row.location_id) ?? [];
        list.push(mapOfficer(row));
        officersByLocation.set(row.location_id, list);
      }

      const locations = (results ?? []).map((row) =>
        mapLocation(row, officersByLocation.get(row.id) ?? [])
      );

      return c.json({
        success: true,
        total: locations.length,
        data: locations,
      });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat mendapatkan senarai lokasi: ' + e.message }, 500);
    }
  })

  // 2. GET SINGLE LOCATION BY ID OR ROOM CODE
  .get('/:id', async (c) => {
    const id = c.req.param('id');

    try {
      const row = await c.env.DB.prepare(
        'SELECT * FROM v_locations_full WHERE id = ? OR kodRuang = ? LIMIT 1'
      )
        .bind(id, id)
        .first<LocationRow>();

      if (!row) {
        return c.json({ success: false, message: 'Lokasi tidak dijumpai' }, 404);
      }

      const { results: custodianRows } = await c.env.DB.prepare(
        `${CUSTODIAN_SELECT} WHERE lc.location_id = ?`
      )
        .bind(row.id)
        .all<CustodianRow>();

      return c.json({
        success: true,
        data: mapLocation(row, (custodianRows ?? []).map(mapOfficer)),
      });
    } catch (e: any) {
      return c.json({ success: false, message: e.message }, 500);
    }
  })

  // 3. CREATE NEW LOCATION WITH GPS COORDINATES
  .post('/', async (c) => {
    try {
      const body = await c.req.json();
      const inputs = custodianInputs(body);

      if (!body.kodRuang || !body.nama || !body.jabatan) {
        return c.json(
          { success: false, message: 'Kod Ruang, Nama dan Jabatan wajib diisi' },
          400
        );
      }

      const departmentId = await resolveDepartmentId(c.env.DB, body.jabatan);
      if (!departmentId) {
        return c.json({ success: false, message: `Jabatan '${body.jabatan}' tidak dijumpai` }, 400);
      }

      // PPAJ/PPAU (dan KJ/KU, Penyelia Lokasi) hanya boleh mendaftar lokasi bagi
      // jabatan/unit sendiri; Pentadbir Sistem tidak terhad.
      const auth = getAuthUser(c);
      if (!auth) {
        return c.json(
          { success: false, code: 'UNAUTHENTICATED', message: 'Sesi tidak sah. Sila log masuk semula.' },
          401
        );
      }

      const scope = await loadManageScope(c.env.DB, auth.id);
      if (!scope.canManage) {
        return c.json(
          {
            success: false,
            code: 'FORBIDDEN',
            message:
              'Akses ditolak: hanya Ketua Jabatan, Penolong Pegawai Aset atau Penyelia Lokasi boleh mengurus lokasi.',
          },
          403
        );
      }

      const latitude = typeof body.latitude === 'number' ? body.latitude : DEFAULT_LATITUDE;
      const longitude = typeof body.longitude === 'number' ? body.longitude : DEFAULT_LONGITUDE;

      const buildingId = await ensureBuildingId(c.env.DB, body.bangunan, latitude, longitude);
      const categoryId = await resolveRoomCategoryId(c.env.DB, body.kategoriRuang);
      const statusId = await resolveStatusId(c.env.DB, body.statusPemeriksaan);

      // Kod lokasi ialah kunci unik. Muat naik semula KEW.PA-7 dengan kod yang sama
      // menimpa rekod sedia ada (aset + penyelia), bukan mencipta ruang pendua.
      const normalisedCode = String(body.kodRuang).replace(/\s+/g, ' ').trim();
      const existing = await c.env.DB.prepare(
        `SELECT id, department_id FROM locations
          WHERE REPLACE(UPPER(kod_ruang), ' ', '') = REPLACE(UPPER(?), ' ', '')
          LIMIT 1`
      )
        .bind(normalisedCode)
        .first<{ id: string; department_id: string }>();

      if (existing) {
        // Kemaskini ruang sedia ada: Penyelia Lokasi ruang itu juga dibenarkan.
        if (
          !canManageLocation(scope, { id: existing.id, departmentId: existing.department_id }) ||
          !canManageDepartment(scope, departmentId)
        ) {
          return c.json(
            {
              success: false,
              code: 'DEPARTMENT_FORBIDDEN',
              message:
                'Akses ditolak: anda hanya boleh mengemas kini ruang yang anda selia atau jabatan/unit anda sendiri.',
            },
            403
          );
        }
      } else if (!canManageDepartment(scope, departmentId)) {
        // Cipta ruang baharu: memerlukan skop jabatan (KJ/KU, PPAJ/PPAU, Pentadbir Sistem).
        return c.json(
          {
            success: false,
            code: 'DEPARTMENT_FORBIDDEN',
            message: `Anda hanya boleh mendaftar lokasi baharu bagi jabatan/unit anda sendiri (${scope.departmentIds.join(', ') || '-'}).`,
          },
          403
        );
      }

      const id = existing?.id || body.id || `LOK-${Date.now().toString(36).toUpperCase()}`;

      if (existing) {
        await c.env.DB.prepare(
          `UPDATE locations
              SET kod_ruang = ?, nama = ?, department_id = ?, building_id = ?, aras = ?,
                  category_id = ?, latitude = ?, longitude = ?, updated_at = datetime('now')
            WHERE id = ?`
        )
          .bind(
            normalisedCode,
            body.nama,
            departmentId,
            buildingId,
            body.aras || 'Aras 1',
            categoryId,
            latitude,
            longitude,
            id
          )
          .run();
      } else {
        await c.env.DB.prepare(
          `INSERT INTO locations (
            id, kod_ruang, nama, department_id, building_id, aras, category_id,
            status_id, tarikh_terakhir_diperiksa, latitude, longitude
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            normalisedCode,
            body.nama,
            departmentId,
            buildingId,
            body.aras || 'Aras 1',
            categoryId,
            statusId,
            body.tarikhTerakhirDiperiksa || null,
            latitude,
            longitude
          )
          .run();
      }

      await syncCustodians(c.env.DB, id, departmentId, inputs);

      const row = await c.env.DB.prepare('SELECT * FROM v_locations_full WHERE id = ?')
        .bind(id)
        .first<LocationRow>();
      const { results: custodianRows } = await c.env.DB.prepare(
        `${CUSTODIAN_SELECT} WHERE lc.location_id = ?`
      )
        .bind(id)
        .all<CustodianRow>();

      return c.json(
        {
          success: true,
          replaced: Boolean(existing),
          message: existing
            ? 'Ruang sedia ada dikemaskini (data lama ditimpa).'
            : 'Lokasi berjaya didaftarkan ke Cloudflare D1',
          data: row ? mapLocation(row, (custodianRows ?? []).map(mapOfficer)) : { id },
        },
        201
      );
    } catch (e: any) {
      const duplicate = /UNIQUE/i.test(e.message);
      return c.json(
        {
          success: false,
          message: duplicate ? 'Kod ruang telah wujud' : 'Gagal mendaftar lokasi: ' + e.message,
        },
        duplicate ? 409 : 500
      );
    }
  })

  // 3b. SENARAI ASET KEW.PA-7 BAGI RUANG (untuk CSV Daftar Pemeriksaan)
  .get('/:id/assets', async (c) => {
    const id = c.req.param('id');

    try {
      const location = await c.env.DB.prepare(
        'SELECT id, kod_ruang AS kodRuang, nama, department_id AS jabatan FROM locations WHERE id = ? OR kod_ruang = ? LIMIT 1'
      )
        .bind(id, id)
        .first<{ id: string; kodRuang: string; nama: string; jabatan: string }>();

      if (!location) {
        return c.json({ success: false, message: 'Lokasi tidak dijumpai' }, 404);
      }

      const { results } = await c.env.DB.prepare(
        `SELECT no_siri_pendaftaran AS noSiriPendaftaran, keterangan, status_fizikal AS statusFizikal
           FROM assets
          WHERE location_id = ?
          ORDER BY no_siri_pendaftaran ASC`
      )
        .bind(location.id)
        .all<{ noSiriPendaftaran: string; keterangan: string; statusFizikal: string }>();

      return c.json({
        success: true,
        location,
        total: (results ?? []).length,
        data: results ?? [],
      });
    } catch (e: any) {
      return c.json({ success: false, message: 'Gagal mendapatkan aset: ' + e.message }, 500);
    }
  })

  // 4. UPDATE LOCATION
  .put('/:id', async (c) => {
    const id = c.req.param('id');

    try {
      const body = await c.req.json();

      const current = await c.env.DB.prepare('SELECT * FROM locations WHERE id = ?')
        .bind(id)
        .first<{ id: string; department_id: string; latitude: number; longitude: number }>();

      if (!current) {
        return c.json({ success: false, message: 'Lokasi tidak dijumpai' }, 404);
      }

      // Semak skop jabatan sebelum sebarang perubahan.
      const auth = getAuthUser(c);
      if (!auth) {
        return c.json(
          { success: false, code: 'UNAUTHENTICATED', message: 'Sesi tidak sah. Sila log masuk semula.' },
          401
        );
      }

      const scope = await loadManageScope(c.env.DB, auth.id);
      if (!scope.canManage || !canManageLocation(scope, { id, departmentId: current.department_id })) {
        return c.json(
          {
            success: false,
            code: 'DEPARTMENT_FORBIDDEN',
            message:
              'Akses ditolak: anda hanya boleh mengemas kini ruang yang anda selia atau jabatan/unit anda sendiri.',
          },
          403
        );
      }

      const latitude =
        typeof body.latitude === 'number' ? body.latitude : Number(current.latitude) || DEFAULT_LATITUDE;
      const longitude =
        typeof body.longitude === 'number'
          ? body.longitude
          : Number(current.longitude) || DEFAULT_LONGITUDE;

      const assignments: string[] = [];
      const params: unknown[] = [];
      const set = (column: string, value: unknown) => {
        assignments.push(`${column} = ?`);
        params.push(value);
      };

      if (body.kodRuang !== undefined) set('kod_ruang', body.kodRuang);
      if (body.nama !== undefined) set('nama', body.nama);
      if (body.aras !== undefined) set('aras', body.aras);
      if (body.tarikhTerakhirDiperiksa !== undefined) {
        set('tarikh_terakhir_diperiksa', body.tarikhTerakhirDiperiksa || null);
      }
      if (body.latitude !== undefined || body.longitude !== undefined) {
        set('latitude', latitude);
        set('longitude', longitude);
      }

      let departmentId = current.department_id;

      if (body.jabatan !== undefined) {
        const resolved = await resolveDepartmentId(c.env.DB, body.jabatan);
        if (!resolved) {
          return c.json({ success: false, message: `Jabatan '${body.jabatan}' tidak dijumpai` }, 400);
        }
        if (!canManageDepartment(scope, resolved)) {
          return c.json(
            {
              success: false,
              code: 'DEPARTMENT_FORBIDDEN',
              message: 'Akses ditolak: lokasi tidak boleh dipindahkan ke jabatan di luar skop anda.',
            },
            403
          );
        }
        departmentId = resolved;
        set('department_id', resolved);
      }

      if (body.bangunan !== undefined) {
        set('building_id', await ensureBuildingId(c.env.DB, body.bangunan, latitude, longitude));
      }

      if (body.kategoriRuang !== undefined) {
        set('category_id', await resolveRoomCategoryId(c.env.DB, body.kategoriRuang));
      }

      if (body.statusPemeriksaan !== undefined) {
        set('status_id', await resolveStatusId(c.env.DB, body.statusPemeriksaan));
      }

      if (assignments.length > 0) {
        await c.env.DB.prepare(
          `UPDATE locations SET ${assignments.join(', ')}, updated_at = datetime('now') WHERE id = ?`
        )
          .bind(...params, id)
          .run();
      }

      if (body.pegawaiBertanggungjawabList !== undefined || body.penjaga !== undefined) {
        await syncCustodians(c.env.DB, id, departmentId, custodianInputs(body));
      }

      const row = await c.env.DB.prepare('SELECT * FROM v_locations_full WHERE id = ?')
        .bind(id)
        .first<LocationRow>();
      const { results: custodianRows } = await c.env.DB.prepare(
        `${CUSTODIAN_SELECT} WHERE lc.location_id = ?`
      )
        .bind(id)
        .all<CustodianRow>();

      return c.json({
        success: true,
        message: 'Maklumat lokasi berjaya dikemaskini di Cloudflare D1',
        data: row ? mapLocation(row, (custodianRows ?? []).map(mapOfficer)) : undefined,
      });
    } catch (e: any) {
      const duplicate = /UNIQUE/i.test(e.message);
      return c.json(
        {
          success: false,
          message: duplicate ? 'Kod ruang telah wujud' : e.message,
        },
        duplicate ? 409 : 500
      );
    }
  })

  // 5. REPLACE ASSET LIST FOR A LOCATION (hasil ekstrak KEW.PA-7)
  .put('/:id/assets', async (c) => {
    const id = c.req.param('id');

    try {
      const body = await c.req.json();
      const items: Array<Record<string, unknown>> = Array.isArray(body?.assets) ? body.assets : [];

      const existing = await c.env.DB.prepare('SELECT id FROM locations WHERE id = ?')
        .bind(id)
        .first<{ id: string }>();

      if (!existing) {
        return c.json({ success: false, message: 'Lokasi tidak dijumpai' }, 404);
      }

      await c.env.DB.prepare('DELETE FROM assets WHERE location_id = ?').bind(id).run();

      let saved = 0;
      for (const item of items) {
        const noSiri = String(item.noSiriPendaftaran ?? '').trim();
        if (!noSiri) continue;

        saved += 1;
        const kategoriId = await resolveAssetCategoryId(c.env.DB, String(item.kategori ?? ''));
        await c.env.DB.prepare(
          `INSERT OR REPLACE INTO assets
             (id, no_siri_pendaftaran, keterangan, kategori_id, location_id, tarikh_penempatan, status_fizikal)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            `AST-${id}-${saved}`,
            noSiri,
            String(item.keteranganAset ?? 'Aset alih'),
            kategoriId,
            id,
            item.tarikhPenempatan ? String(item.tarikhPenempatan) : null,
            String(item.statusFizikal ?? 'Baik')
          )
          .run();
      }

      return c.json({
        success: true,
        message: `${saved} aset KEW.PA-7 disimpan bagi lokasi ${id}`,
        data: { count: saved },
      });
    } catch (e: any) {
      return c.json({ success: false, message: 'Gagal menyimpan aset: ' + e.message }, 500);
    }
  })

  // 6. DELETE LOCATION
  .delete('/:id', async (c) => {
    const id = c.req.param('id');

    try {
      const existing = await c.env.DB.prepare('SELECT id FROM locations WHERE id = ?')
        .bind(id)
        .first<{ id: string }>();

      if (!existing) {
        return c.json({ success: false, message: 'Lokasi tidak dijumpai' }, 404);
      }

      const auth = getAuthUser(c);
      if (!auth) {
        return c.json(
          { success: false, code: 'UNAUTHENTICATED', message: 'Sesi tidak sah. Sila log masuk semula.' },
          401
        );
      }

      // Pemadaman lokasi kekal hak Pentadbir Sistem sahaja (Penyelia Lokasi hanya boleh kemaskini).
      const scope = await loadManageScope(c.env.DB, auth.id);
      if (!scope.isAdmin) {
        return c.json(
          {
            success: false,
            code: 'DEPARTMENT_FORBIDDEN',
            message: 'Akses ditolak: hanya Pentadbir Sistem boleh memadam lokasi.',
          },
          403
        );
      }

      // Semak rujukan yang menghalang pemadaman SEBELUM memadam baris tanggungan,
      // supaya kegagalan tidak meninggalkan custodian/lantikan yang tergantung.
      const referenced = await c.env.DB.prepare(
        'SELECT COUNT(*) AS jumlah FROM inspection_schedules WHERE location_id = ?'
      )
        .bind(id)
        .first<{ jumlah: number }>();

      if (Number(referenced?.jumlah ?? 0) > 0) {
        return c.json(
          {
            success: false,
            message: 'Lokasi tidak boleh dipadam kerana masih dirujuk oleh jadual pemeriksaan',
          },
          409
        );
      }

      // Aset KEW.PA-7 kepunyaan ruang ini dipadam bersama lokasi.
      await c.env.DB.prepare('DELETE FROM assets WHERE location_id = ?').bind(id).run();
      await c.env.DB.prepare('UPDATE kewpa7_documents SET location_id = NULL WHERE location_id = ?')
        .bind(id)
        .run();
      await c.env.DB.prepare('DELETE FROM location_custodians WHERE location_id = ?').bind(id).run();
      // Lantikan Penyelia Lokasi tidak dipadam — ditamatkan supaya sejarah jawatan pegawai kekal.
      await c.env.DB.prepare(
        `UPDATE role_assignments
            SET status = 'DITAMATKAN',
                valid_to = COALESCE(valid_to, date('now')),
                notes = TRIM(COALESCE(notes, '') || ' [Lokasi dipadam]'),
                updated_at = datetime('now')
          WHERE scope_type = 'LOCATION' AND scope_id = ? AND status = 'AKTIF'`
      )
        .bind(id)
        .run();
      await c.env.DB.prepare('DELETE FROM locations WHERE id = ?').bind(id).run();

      return c.json({
        success: true,
        message: `Lokasi ${id} berjaya dipadam dari Cloudflare D1`,
      });
    } catch (e: any) {
      const referenced = /FOREIGN KEY/i.test(e.message);
      return c.json(
        {
          success: false,
          message: referenced
            ? 'Lokasi tidak boleh dipadam kerana masih dirujuk oleh aset atau jadual pemeriksaan'
            : e.message,
        },
        referenced ? 409 : 500
      );
    }
  });
