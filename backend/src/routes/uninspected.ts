import { Hono } from 'hono';
import type { DB } from '../lib/db';
import { ensureSessionId } from '../lib/db';
import { getAuthUser, requireAuth, type AppEnv } from '../middleware/auth';
import { hasActiveRole } from '../lib/roles';
import { canManageLocation, loadManageScope } from '../lib/permissions';
import { recordAudit } from '../lib/audit';
import {
  kiraPadanan,
  normalisasiLabel,
  normalisasiNamaRuang,
  normalisasiTeks,
  padanLokasi,
  rujukanKosong,
  type RujukanPadanan,
} from '../lib/senaraiBelumPeriksa';

const MAKS_BARIS = 5000;
const SAIZ_KELOMPOK = 80;

interface BarisMasuk {
  label?: string;
  jenisAset?: string;
  pegawaiPenempatan?: string;
  bahagian?: string;
  lokasiSpa?: string;
  statusAset?: string;
}

interface BarisBersih extends Required<BarisMasuk> {
  label: string;
}

function bersihkanBaris(masuk: BarisMasuk[]): BarisBersih[] {
  const dilihat = new Set<string>();
  const hasil: BarisBersih[] = [];

  for (const item of masuk) {
    const label = normalisasiLabel(item?.label);
    if (!label || dilihat.has(label)) continue;
    dilihat.add(label);

    hasil.push({
      label,
      jenisAset: normalisasiTeks(item?.jenisAset),
      pegawaiPenempatan: normalisasiTeks(item?.pegawaiPenempatan),
      bahagian: normalisasiTeks(item?.bahagian),
      lokasiSpa: normalisasiTeks(item?.lokasiSpa),
      statusAset: normalisasiTeks(item?.statusAset),
    });
  }

  return hasil;
}

async function muatRujukan(db: DB, baris: BarisBersih[]): Promise<RujukanPadanan> {
  const rujukan = rujukanKosong();

  const alias = await db
    .prepare('SELECT nama_spa AS namaSpa, location_id AS locationId FROM spa_room_alias')
    .all<{ namaSpa: string; locationId: string }>();
  for (const row of alias.results ?? []) {
    rujukan.aliasKeLokasi.set(normalisasiNamaRuang(row.namaSpa), row.locationId);
  }

  const lokasi = await db
    .prepare('SELECT id, nama FROM locations')
    .all<{ id: string; nama: string }>();
  for (const row of lokasi.results ?? []) {
    rujukan.namaKeLokasi.set(normalisasiNamaRuang(row.nama), row.id);
  }

  const labelUnik = Array.from(new Set(baris.map((item) => item.label))).filter(Boolean);
  for (let i = 0; i < labelUnik.length; i += SAIZ_KELOMPOK) {
    const kelompok = labelUnik.slice(i, i + SAIZ_KELOMPOK);
    const penanda = kelompok.map(() => '?').join(',');
    const rows = await db
      .prepare(
        `SELECT no_siri_pendaftaran AS label, location_id AS locationId
           FROM assets
          WHERE UPPER(no_siri_pendaftaran) IN (${penanda})`
      )
      .bind(...kelompok)
      .all<{ label: string; locationId: string }>();
    for (const row of rows.results ?? []) {
      rujukan.labelKeLokasi.set(normalisasiLabel(row.label), row.locationId);
    }
  }

  return rujukan;
}

interface BarisDb {
  id: string;
  label: string;
  jenisAset: string | null;
  pegawaiPenempatan: string | null;
  bahagian: string | null;
  lokasiSpa: string | null;
  statusAset: string | null;
  locationId: string | null;
  padananKaedah: string | null;
  importId: string;
  lokasiPortal: string | null;
  kodRuang: string | null;
  updatedAt: string | null;
}

function mapBaris(row: BarisDb) {
  return {
    id: row.id,
    label: row.label,
    jenisAset: row.jenisAset ?? '',
    pegawaiPenempatan: row.pegawaiPenempatan ?? '',
    bahagian: row.bahagian ?? '',
    lokasiSpa: row.lokasiSpa ?? '',
    statusAset: row.statusAset ?? '',
    locationId: row.locationId,
    lokasiPortal: row.lokasiPortal,
    kodRuang: row.kodRuang,
    padananKaedah: row.padananKaedah,
    importId: row.importId,
    updatedAt: row.updatedAt,
  };
}

export const uninspectedRoute = new Hono<AppEnv>();

/** Muat naik (atau muat semula) senarai aset belum diperiksa daripada eksport SPA. */
uninspectedRoute.post('/import', async (c) => {
  const auth = getAuthUser(c);
  if (!auth) {
    return c.json(
      { success: false, code: 'UNAUTHENTICATED', message: 'Sesi tidak sah. Sila log masuk semula.' },
      401
    );
  }

  const scope = await loadManageScope(c.env.DB, auth.id);
  const pembantuAset = await hasActiveRole(c.env.DB, auth.id, 'PENOLONG_PEGAWAI_ASET');
  if (!scope.isAdmin && !pembantuAset) {
    await recordAudit(c.env.DB, {
      actorId: auth.id,
      actorName: auth.emel,
      actedAsRole: auth.role,
      action: 'uninspected:import',
      departmentId: auth.dept,
      decision: 'DENY',
      policyId: 'POL_UNINSPECTED_IMPORT',
      notes: 'Cubaan memuat naik senarai aset belum diperiksa tanpa peranan pengurusan aset.',
      reason: 'IMPORT_FORBIDDEN',
    });
    return c.json(
      {
        success: false,
        code: 'IMPORT_FORBIDDEN',
        message:
          'Akses ditolak: muat naik senarai aset belum diperiksa memerlukan Pentadbir Sistem atau Penolong Pegawai Aset.',
      },
      403
    );
  }

  let body: { namaFail?: string; baris?: BarisMasuk[] };
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { success: false, code: 'INVALID_BODY', message: 'Format permintaan tidak sah.' },
      400
    );
  }

  const masuk = Array.isArray(body?.baris) ? body.baris : null;
  if (!masuk) {
    return c.json(
      {
        success: false,
        code: 'INVALID_ROWS',
        message: 'Medan `baris` diperlukan (senarai aset hasil membaca fail).',
      },
      400
    );
  }
  if (masuk.length > MAKS_BARIS) {
    return c.json(
      {
        success: false,
        code: 'TOO_MANY_ROWS',
        message: `Maksimum ${MAKS_BARIS} baris bagi satu fail. Pecahkan fail mengikut folder.`,
      },
      413
    );
  }

  const baris = bersihkanBaris(masuk);
  if (!baris.length) {
    return c.json(
      { success: false, code: 'NO_ROWS', message: 'Tiada baris sah (lajur Label kosong atau berulang).' },
      400
    );
  }

  const tahun = new Date().getFullYear();
  const sessionId = await ensureSessionId(c.env.DB, `${tahun}-01-01`);
  const namaFail = normalisasiTeks(body?.namaFail) || 'senarai-aset-belum-periksa';
  const importId = `IMP-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

  const rujukan = await muatRujukan(c.env.DB, baris);
  const kiraan = kiraPadanan(baris, rujukan);

  const pernyataan = baris.map((item) => {
    const padanan = padanLokasi(item, rujukan);
    return c.env.DB.prepare(
      `INSERT INTO uninspected_assets
         (id, session_id, label, jenis_aset, pegawai_penempatan, bahagian, lokasi_spa, status_aset,
          location_id, padanan_kaedah, import_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(session_id, label) DO UPDATE SET
         jenis_aset = excluded.jenis_aset,
         pegawai_penempatan = excluded.pegawai_penempatan,
         bahagian = excluded.bahagian,
         lokasi_spa = excluded.lokasi_spa,
         status_aset = excluded.status_aset,
         location_id = CASE
           WHEN uninspected_assets.padanan_kaedah = 'MANUAL' THEN uninspected_assets.location_id
           ELSE excluded.location_id
         END,
         padanan_kaedah = CASE
           WHEN uninspected_assets.padanan_kaedah = 'MANUAL' THEN 'MANUAL'
           ELSE excluded.padanan_kaedah
         END,
         import_id = excluded.import_id,
         updated_at = datetime('now')`
    ).bind(
      `UA-${crypto.randomUUID()}`,
      sessionId,
      item.label,
      item.jenisAset,
      item.pegawaiPenempatan,
      item.bahagian,
      item.lokasiSpa,
      item.statusAset,
      padanan.locationId,
      padanan.kaedah,
      importId
    );
  });

  // Baris dimasukkan dahulu supaya kegagalan tidak meninggalkan rekod import kosong.
  for (let i = 0; i < pernyataan.length; i += 40) {
    await c.env.DB.batch(pernyataan.slice(i, i + 40));
  }

  await c.env.DB.prepare(
    `INSERT INTO uninspected_imports
       (id, session_id, nama_fail, jumlah_baris, jumlah_padan, jumlah_tidak_padan, dimuat_oleh)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(importId, sessionId, namaFail, kiraan.jumlahBaris, kiraan.padan, kiraan.belumPadan, auth.emel)
    .run();

  await recordAudit(c.env.DB, {
    actorId: auth.id,
    actorName: auth.emel,
    actedAsRole: auth.role,
    action: 'uninspected:import',
    departmentId: auth.dept,
    decision: 'PERMIT',
    policyId: 'POL_UNINSPECTED_IMPORT',
    resourceId: importId,
    notes: `Import ${namaFail}: ${kiraan.jumlahBaris} aset (${kiraan.padan} padan, ${kiraan.belumPadan} belum padan).`,
  });

  return c.json({
    success: true,
    message: `${kiraan.jumlahBaris} aset diimport — ${kiraan.padan} dipadankan, ${kiraan.belumPadan} belum dipadankan.`,
    data: { importId, sessionId, namaFail, tahun, ...kiraan },
  });
});

/** Ringkasan per lokasi (untuk badge Direktori Lokasi) + kumpulan ruang SPA belum dipadankan. */
uninspectedRoute.get('/summary', requireAuth, async (c) => {
  const auth = getAuthUser(c);
  if (!auth) {
    return c.json(
      { success: false, code: 'UNAUTHENTICATED', message: 'Sesi tidak sah. Sila log masuk semula.' },
      401
    );
  }

  const tahun = Number(c.req.query('tahun')) || new Date().getFullYear();
  const sessionId = `SESI-${tahun}`;

  const perLokasi = await c.env.DB.prepare(    `SELECT u.location_id AS locationId,
            l.nama AS lokasi,
            l.kod_ruang AS kodRuang,
            l.department_id AS jabatan,
            COUNT(*) AS bilangan
       FROM uninspected_assets u
       LEFT JOIN locations l ON l.id = u.location_id
      WHERE u.session_id = ?
      GROUP BY u.location_id`
  )
    .bind(sessionId)
    .all<{
      locationId: string | null;
      lokasi: string | null;
      kodRuang: string | null;
      jabatan: string | null;
      bilangan: number;
    }>();

  const statusJadual = await c.env.DB.prepare(
    `SELECT s.location_id AS locationId, st.nama AS status
       FROM inspection_schedules s
       JOIN inspection_statuses st ON st.id = s.status_id
      WHERE s.session_id = ?`
  )
    .bind(sessionId)
    .all<{ locationId: string; status: string }>();

  const petaStatus = new Map((statusJadual.results ?? []).map((row) => [row.locationId, row.status]));

  const lokasi = (perLokasi.results ?? [])
    .filter((row) => row.locationId)
    .map((row) => ({
      locationId: row.locationId as string,
      lokasi: row.lokasi ?? '',
      kodRuang: row.kodRuang ?? '',
      jabatan: row.jabatan ?? '',
      bilangan: Number(row.bilangan) || 0,
      statusJadual: petaStatus.get(row.locationId as string) ?? null,
    }))
    .sort((a, b) => b.bilangan - a.bilangan);

  const ruangSpa = await c.env.DB.prepare(
    `SELECT lokasi_spa AS lokasiSpa, MAX(bahagian) AS bahagian, COUNT(*) AS bilangan
       FROM uninspected_assets
      WHERE session_id = ? AND location_id IS NULL
      GROUP BY lokasi_spa
      ORDER BY COUNT(*) DESC`
  )
    .bind(sessionId)
    .all<{ lokasiSpa: string | null; bahagian: string | null; bilangan: number }>();

  const bilanganBelumPadan = (ruangSpa.results ?? []).reduce(
    (jumlah, item) => jumlah + Number(item.bilangan || 0),
    0
  );
  const bilanganBerlokasi = lokasi.reduce((jumlah, item) => jumlah + item.bilangan, 0);

  return c.json({
    success: true,
    data: {
      tahun,
      sessionId,
      jumlahAset: bilanganBerlokasi + bilanganBelumPadan,
      belumPadan: bilanganBelumPadan,
      jumlahRuang: lokasi.length,
      lokasi,
      ruangSpa: (ruangSpa.results ?? []).map((row) => ({
        lokasiSpa: row.lokasiSpa ?? '(tiada ruang)',
        bahagian: row.bahagian ?? '',
        bilangan: Number(row.bilangan) || 0,
      })),
    },
  });
});

/** Senarai aset belum diperiksa dengan tapisan. */
uninspectedRoute.get('/', requireAuth, async (c) => {
  const auth = getAuthUser(c);
  if (!auth) {
    return c.json(
      { success: false, code: 'UNAUTHENTICATED', message: 'Sesi tidak sah. Sila log masuk semula.' },
      401
    );
  }

  const tahun = Number(c.req.query('tahun')) || new Date().getFullYear();
  const sessionId = `SESI-${tahun}`;
  const syarat: string[] = ['u.session_id = ?'];
  const nilai: unknown[] = [sessionId];

  const locationId = c.req.query('locationId');
  if (locationId) {
    syarat.push('u.location_id = ?');
    nilai.push(locationId);
  }

  if (c.req.query('belumPadan') === '1') {
    syarat.push('u.location_id IS NULL');
  }

  const status = c.req.query('status');
  if (status) {
    syarat.push('u.status_aset = ?');
    nilai.push(status);
  }

  const carian = normalisasiTeks(c.req.query('q'));
  if (carian) {
    syarat.push(
      `(u.label LIKE ? OR u.jenis_aset LIKE ? OR u.pegawai_penempatan LIKE ? OR u.lokasi_spa LIKE ? OR u.bahagian LIKE ?)`
    );
    const corak = `%${carian}%`;
    nilai.push(corak, corak, corak, corak, corak);
  }

  const had = Math.min(Math.max(Number(c.req.query('had')) || 500, 1), 2000);

  const rows = await c.env.DB.prepare(
    `SELECT u.id, u.label, u.jenis_aset AS jenisAset, u.pegawai_penempatan AS pegawaiPenempatan,
            u.bahagian, u.lokasi_spa AS lokasiSpa, u.status_aset AS statusAset, u.location_id AS locationId,
            u.padanan_kaedah AS padananKaedah, u.import_id AS importId, u.updated_at AS updatedAt,
            l.nama AS lokasiPortal, l.kod_ruang AS kodRuang
       FROM uninspected_assets u
       LEFT JOIN locations l ON l.id = u.location_id
      WHERE ${syarat.join(' AND ')}
      ORDER BY u.lokasi_spa, u.label
      LIMIT ?`
  )
    .bind(...nilai, had)
    .all<BarisDb>();

  const data = (rows.results ?? []).map(mapBaris);

  return c.json({ success: true, total: data.length, data });
});

/** Sejarah import (audit ringkas untuk UI). */
uninspectedRoute.get('/imports', requireAuth, async (c) => {
  const auth = getAuthUser(c);
  if (!auth) {
    return c.json(
      { success: false, code: 'UNAUTHENTICATED', message: 'Sesi tidak sah. Sila log masuk semula.' },
      401
    );
  }

  const tahun = Number(c.req.query('tahun')) || new Date().getFullYear();
  const rows = await c.env.DB.prepare(
    `SELECT id, nama_fail AS namaFail, jumlah_baris AS jumlahBaris, jumlah_padan AS jumlahPadan,
            jumlah_tidak_padan AS jumlahTidakPadan, dimuat_oleh AS dimuatOleh, created_at AS createdAt
       FROM uninspected_imports
      WHERE session_id = ?
      ORDER BY created_at DESC
      LIMIT 50`
  )
    .bind(`SESI-${tahun}`)
    .all();

  return c.json({ success: true, data: rows.results ?? [] });
});

/** Padan secara manual satu aset kepada lokasi portal (dan kekalkan peta alias). */
uninspectedRoute.put('/:id/padankan', async (c) => {
  const auth = getAuthUser(c);
  if (!auth) {
    return c.json(
      { success: false, code: 'UNAUTHENTICATED', message: 'Sesi tidak sah. Sila log masuk semula.' },
      401
    );
  }

  const id = c.req.param('id');
  const body = await c.req.json<{ locationId?: string; simpanAlias?: boolean }>().catch(() => null);
  const locationId = normalisasiTeks(body?.locationId);
  if (!locationId) {
    return c.json(
      { success: false, code: 'INVALID_LOCATION', message: 'Medan `locationId` diperlukan.' },
      400
    );
  }

  const lokasi = await c.env.DB.prepare(
    'SELECT id, nama, department_id AS jabatan FROM locations WHERE id = ? LIMIT 1'
  )
    .bind(locationId)
    .first<{ id: string; nama: string; jabatan: string }>();
  if (!lokasi) {
    return c.json(
      { success: false, code: 'LOCATION_NOT_FOUND', message: 'Lokasi tidak dijumpai.' },
      404
    );
  }

  const scope = await loadManageScope(c.env.DB, auth.id);
  if (!canManageLocation(scope, { id: lokasi.id, jabatan: lokasi.jabatan })) {
    return c.json(
      {
        success: false,
        code: 'LOCATION_FORBIDDEN',
        message: 'Akses ditolak: anda hanya boleh memadankan kepada ruang dalam skop anda.',
      },
      403
    );
  }

  const baris = await c.env.DB.prepare(
    'SELECT id, lokasi_spa AS lokasiSpa FROM uninspected_assets WHERE id = ? LIMIT 1'
  )
    .bind(id)
    .first<{ id: string; lokasiSpa: string | null }>();
  if (!baris) {
    return c.json(
      { success: false, code: 'ROW_NOT_FOUND', message: 'Baris aset belum diperiksa tidak dijumpai.' },
      404
    );
  }

  await c.env.DB.prepare(
    `UPDATE uninspected_assets
        SET location_id = ?, padanan_kaedah = 'MANUAL', updated_at = datetime('now')
      WHERE id = ?`
  )
    .bind(lokasi.id, id)
    .run();

  // Padanan sebut harga ruang SPA yang sama: kemas kini baris lain + simpan alias kekal.
  const namaSpa = normalisasiTeks(baris.lokasiSpa);
  let dikemasKini = 1;
  if (body?.simpanAlias !== false && namaSpa) {
    await c.env.DB.prepare(
      `INSERT INTO spa_room_alias (nama_spa, location_id, created_by)
       VALUES (?, ?, ?)
       ON CONFLICT(nama_spa) DO UPDATE SET location_id = excluded.location_id, created_by = excluded.created_by`
    )
      .bind(normalisasiNamaRuang(namaSpa), lokasi.id, auth.emel)
      .run();

    const selebih = await c.env.DB.prepare(
      `UPDATE uninspected_assets
          SET location_id = ?, padanan_kaedah = 'ALIAS', updated_at = datetime('now')
        WHERE lokasi_spa = ?
          AND (padanan_kaedah IS NULL OR padanan_kaedah <> 'MANUAL')`
    )
      .bind(lokasi.id, namaSpa)
      .run();
    dikemasKini += selebih.meta?.changes ?? 0;
  }

  await recordAudit(c.env.DB, {
    actorId: auth.id,
    actorName: auth.emel,
    actedAsRole: auth.role,
    action: 'uninspected:padankan',
    departmentId: auth.dept,
    decision: 'PERMIT',
    policyId: 'POL_UNINSPECTED_IMPORT',
    resourceId: id,
    notes: `Padan aset ${id} (${namaSpa || 'tanpa ruang'}) kepada lokasi ${lokasi.id} (${lokasi.nama}).`,
  });

  return c.json({
    success: true,
    message: `${dikemasKini} baris dipadankan kepada ${lokasi.nama}.`,
    data: { dikemasKini, locationId: lokasi.id, alias: namaSpa || null },
  });
});

/** Buang satu batch import (rollback import tersilap). */
uninspectedRoute.delete('/imports/:id', async (c) => {
  const auth = getAuthUser(c);
  if (!auth) {
    return c.json(
      { success: false, code: 'UNAUTHENTICATED', message: 'Sesi tidak sah. Sila log masuk semula.' },
      401
    );
  }

  const scope = await loadManageScope(c.env.DB, auth.id);
  if (!scope.isAdmin) {
    return c.json(
      {
        success: false,
        code: 'FORBIDDEN',
        message: 'Akses ditolak: hanya Pentadbir Sistem boleh membuang batch import.',
      },
      403
    );
  }

  const importId = c.req.param('id');
  const hasil = await c.env.DB.prepare('DELETE FROM uninspected_assets WHERE import_id = ?')
    .bind(importId)
    .run();
  await c.env.DB.prepare('DELETE FROM uninspected_imports WHERE id = ?').bind(importId).run();

  await recordAudit(c.env.DB, {
    actorId: auth.id,
    actorName: auth.emel,
    actedAsRole: auth.role,
    action: 'uninspected:delete-import',
    departmentId: auth.dept,
    decision: 'PERMIT',
    policyId: 'POL_UNINSPECTED_IMPORT',
    resourceId: importId,
    notes: `Batch import ${importId} dibuang (${hasil.meta?.changes ?? 0} baris).`,
  });

  return c.json({
    success: true,
    message: `Batch ${importId} dibuang.`,
    data: { dibuang: hasil.meta?.changes ?? 0 },
  });
});
