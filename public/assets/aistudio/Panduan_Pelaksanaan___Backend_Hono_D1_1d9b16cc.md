# Panduan Pelaksanaan e-JAS POLIKU: React + Hono + Cloudflare D1

Dokumen ini menyediakan panduan persediaan projek dari awal (*scratch*), skema pangkalan data D1, konfigurasi Cloudflare Workers/Pages, dan kod pelayan (*backend*) Hono RPC yang menguatkuasakan tatacara **1PP AM 2.4**.

---

## 1. Struktur Folder Projek (Monorepo Ringkas)

Projek ini menggabungkan pelayan Hono (*edge worker*) dan aplikasi frontend React di bawah satu repositori yang kemas:

```text
ejas-poliku/
├── d1/
│   ├── schema.sql              # Skema SQL pangkalan data Cloudflare D1
│   └── seed.sql                # Data permulaan jabatan & gandingan silang POLIKU
├── src/
│   ├── server/
│   │   ├── index.ts            # Pelayan Hono API & jenis RPC (AppType)
│   │   └── pbac.ts             # Enjin penilaian polisi PBAC di pelayan
│   └── client/
│       ├── App.tsx             # Frontend React (Aplikasi portal satu fail)
│       └── main.tsx            # Titik masuk React Vite
├── package.json
├── tsconfig.json
├── vite.config.ts
└── wrangler.jsonc              # Konfigurasi Cloudflare & D1 Binding
```

---

## 2. Langkah Permulaan Projek (Terminal CLI)

Jalankan arahan berikut di terminal untuk menyediakan persekitaran pembangunan:

```bash
# 1. Cipta folder projek
mkdir ejas-poliku && cd ejas-poliku
npm init -y

# 2. Pasang kebergantungan Backend & Cloudflare
npm install hono @hono/zod-validator zod
npm install -D wrangler @cloudflare/workers-types typescript

# 3. Pasang kebergantungan Frontend (React + Vite + Tailwind CSS)
npm install react react-dom
npm install -D @vitejs/plugin-react vite tailwindcss autoprefixer postcss @types/react @types/react-dom

# 4. Cipta pangkalan data Cloudflare D1
npx wrangler d1 create ejas-db-production
```

---

## 3. Konfigurasi Cloudflare (`wrangler.jsonc`)

Cipta fail `wrangler.jsonc` pada punca projek:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "ejas-poliku",
  "main": "src/server/index.ts",
  "compatibility_date": "2026-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./dist"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "ejas-db-production",
      "database_id": "MASUKKAN-DATABASE-ID-DARI-TERMINAL-WRANGLER"
    }
  ]
}
```

---

## 4. Skema Pangkalan Data Cloudflare D1 (`d1/schema.sql`)

Skema ini menyokong integriti rujukan pekeliling, mod silang, transaksi kunci tuntutan bilik (*locking*), serta log audit PBAC:

```sql
-- 1. Jadual Jabatan & Mod Gandingan Silang
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,               -- cth: 'JTMK', 'JKE', 'JKM', 'JKA', 'JP', 'JPA', 'JMSK', 'PENTADBIRAN'
    name TEXT NOT NULL,
    cross_partner_id TEXT,             -- Rakan silang rasmi
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Jadual Pengguna Berdaftar (@poliku.edu.my)
CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dept_id TEXT NOT NULL REFERENCES departments(id),
    roles TEXT NOT NULL DEFAULT '["pemeriksa"]', -- Format JSON: ["penyelaras", "pemeriksa", "admin"]
    grade TEXT DEFAULT 'DH41',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Jadual Takwim & Lokasi Pemeriksaan
CREATE TABLE IF NOT EXISTS inspection_schedules (
    id TEXT PRIMARY KEY,               -- cth: 'JAD-2026-JTMK-001'
    dept_id TEXT NOT NULL REFERENCES departments(id),
    location_name TEXT NOT NULL,       -- cth: 'Makmal Rangkaian 1'
    category TEXT NOT NULL,            -- 'Semua', 'Harta Modal Sahaja', 'ABR Sahaja'
    estimated_qty INTEGER NOT NULL DEFAULT 0,
    custodian_name TEXT NOT NULL,      -- Room Custodian (Disemak untuk halang konflik AM 2.4)
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    inspector_1_email TEXT REFERENCES users(email),
    inspector_1_name TEXT,
    inspector_2_email TEXT REFERENCES users(email),
    inspector_2_name TEXT,
    status TEXT NOT NULL DEFAULT 'Belum Mula', -- 'Belum Mula', 'Sedang Dijalankan', 'Selesai', 'Tertangguh'
    created_by TEXT NOT NULL REFERENCES users(email),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Jadual Laporan Penemuan & Kepatuhan Pekeliling (KEW.PA-11)
CREATE TABLE IF NOT EXISTS kewpa11_reports (
    id TEXT PRIMARY KEY,
    schedule_id TEXT UNIQUE NOT NULL REFERENCES inspection_schedules(id) ON DELETE CASCADE,
    qty_good INTEGER NOT NULL DEFAULT 0,
    qty_damaged INTEGER NOT NULL DEFAULT 0,
    qty_idle INTEGER NOT NULL DEFAULT 0,
    qty_missing INTEGER NOT NULL DEFAULT 0,
    
    -- Syarat Kerosakan (Wajib jika qty_damaged > 0)
    complaint_ref_no TEXT,
    complaint_date DATE,
    lo_number TEXT,
    maintenance_status TEXT,
    
    -- Syarat Aset Usang/Terbiar (Wajib jika qty_idle > 0)
    idle_reason_standard TEXT,
    idle_justification TEXT,
    idle_action_proposal TEXT,
    
    evidence_drive_url TEXT NOT NULL,
    inspector_remarks TEXT,
    submitted_by TEXT NOT NULL REFERENCES users(email),
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Jejak Audit Penilaian PBAC (Integriti Tatacara AM 2.4)
CREATE TABLE IF NOT EXISTS pbac_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,              -- 'schedule:claim', 'report:submit', dll.
    resource_id TEXT,
    decision TEXT NOT NULL,            -- 'PERMIT', 'DENY'
    policy_id TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- DATA PERMULAAN (SEED DATA POLIKU)
INSERT OR IGNORE INTO departments (id, name, cross_partner_id) VALUES
('JTMK', 'Jabatan Teknologi Maklumat & Komunikasi', 'JKE'),
('JKE', 'Jabatan Kejuruteraan Elektrik', 'JTMK'),
('JKM', 'Jabatan Kejuruteraan Mekanikal', 'JKA'),
('JKA', 'Jabatan Kejuruteraan Awam', 'JKM'),
('JP', 'Jabatan Perdagangan', 'JPA'),
('JPA', 'Jabatan Pengajian Am', 'JP'),
('JMSK', 'Jabatan Matematik, Sains & Komputer', 'PENTADBIRAN'),
('PENTADBIRAN', 'Pentadbiran & Unit Pengurusan Aset (UAP)', 'JMSK'),
('HAL EHWAL PELAJAR', 'Hal Ehwal Pelajar (JHEP)', 'PSA'),
('PSA', 'Perpustakaan (PSA)', 'HAL EHWAL PELAJAR'),
('CISEC', 'CISEC', 'ULPL'),
('ULPL', 'Unit Latihan & Pendidikan Lanjutan', 'CISEC');
```

Jalankan migrasi tempatan dan produksi menggunakan D1 CLI:

```bash
# Jalankan migrasi lokal (untuk pembangunan)
npx wrangler d1 execute ejas-db-production --local --file=./d1/schema.sql

# Jalankan migrasi ke Cloudflare sebenar
npx wrangler d1 execute ejas-db-production --remote --file=./d1/schema.sql
```

---

## 5. Pelayan Backend Hono RPC (`src/server/index.ts`)

Kod pelayan ini menggunakan Hono dengan jenis RPC dieksport (`AppType`), pematuhan domain `@poliku.edu.my`, dan transaksi ACID untuk menuntut slot bilik:

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

// ==================== MIDDLEWARE KESELAMATAN EMEL POLIKU ====================
app.use('/api/*', async (c, next) => {
  const userEmail = c.req.header('x-user-email');
  if (!userEmail || (!userEmail.endsWith('@poliku.edu.my') && !userEmail.endsWith('.gov.my'))) {
    return c.json({ success: false, message: 'Akses ditolak: Wajib menggunakan emel rasmi @poliku.edu.my' }, 403);
  }
  await next();
});

// ==================== ENDPOINTS & RPC ====================
const apiRoutes = app
  // 1. Dapatkan Senarai Takwim Jadual
  .get('/api/schedules', async (c) => {
    const { results } = await c.env.DB.prepare(`
      SELECT s.*, 
             k.qty_good, k.qty_damaged, k.qty_idle, k.qty_missing, 
             k.complaint_ref_no, k.lo_number, k.idle_reason_standard, k.idle_justification,
             k.evidence_drive_url
      FROM inspection_schedules s
      LEFT JOIN kewpa11_reports k ON s.id = k.schedule_id
      ORDER BY s.start_date ASC
    `).all();
    return c.json({ success: true, data: results });
  })

  // 2. Daftar Jadual Baru (Penyelaras Jabatan)
  .post(
    '/api/schedules',
    zValidator(
      'json',
      z.object({
        dept_id: z.string(),
        location_name: z.string(),
        category: z.string(),
        estimated_qty: z.number().min(1),
        custodian_name: z.string(),
        start_date: z.string(),
        end_date: z.string(),
        created_by: z.string().email(),
      })
    ),
    async (c) => {
      const body = c.req.valid('json');
      const id = `JAD-2026-${body.dept_id}-${Date.now().toString().slice(-4)}`;

      await c.env.DB.prepare(`
        INSERT INTO inspection_schedules (id, dept_id, location_name, category, estimated_qty, custodian_name, start_date, end_date, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        body.dept_id,
        body.location_name,
        body.category,
        body.estimated_qty,
        body.custodian_name,
        body.start_date,
        body.end_date,
        body.created_by
      ).run();

      return c.json({ success: true, id, message: 'Jadual berjaya didaftarkan' }, 201);
    }
  )

  // 3. Tuntut Slot Lokasi (ACID Transaction - Halang Race Conditions)
  .post(
    '/api/schedules/:id/claim',
    zValidator(
      'json',
      z.object({
        slot: z.union([z.literal(1), z.literal(2)]),
        inspector_name: z.string(),
        inspector_email: z.string().email(),
        inspector_dept: z.string(),
      })
    ),
    async (c) => {
      const scheduleId = c.req.param('id');
      const { slot, inspector_name, inspector_email, inspector_dept } = c.req.valid('json');

      // Semak rekod dan pastikan tiada konflik Penjaga Ruang (AM 2.4)
      const schedule: any = await c.env.DB.prepare(
        'SELECT * FROM inspection_schedules WHERE id = ?'
      ).bind(scheduleId).first();

      if (!schedule) return c.json({ success: false, message: 'Jadual tidak wujud' }, 404);

      if (schedule.custodian_name.toLowerCase().includes(inspector_name.toLowerCase())) {
        // Rekod audit cubaan perlanggaran PBAC
        await c.env.DB.prepare(`
          INSERT INTO pbac_audit_logs (user_email, action, resource_id, decision, policy_id, notes)
          VALUES (?, 'schedule:claim', ?, 'DENY', 'POL_CONFLICT_CUSTODIAN_GUARD', 'Pegawai adalah custodian bilik ini')
        `).bind(inspector_email, scheduleId).run();

        return c.json({ success: false, message: 'Integriti AM 2.4: Anda adalah Pegawai Penjaga Ruang bilik ini.' }, 403);
      }

      // Kunci baris menggunakan UPDATE bertransaksi
      const columnEmail = slot === 1 ? 'inspector_1_email' : 'inspector_2_email';
      const columnName = slot === 1 ? 'inspector_1_name' : 'inspector_2_name';

      const updateQuery = `
        UPDATE inspection_schedules 
        SET ${columnEmail} = ?, ${columnName} = ?, status = CASE WHEN status = 'Belum Mula' THEN 'Sedang Dijalankan' ELSE status END
        WHERE id = ? AND (${columnEmail} IS NULL OR ${columnEmail} = '')
      `;

      const result = await c.env.DB.prepare(updateQuery)
        .bind(inspector_email, `${inspector_name} (${inspector_dept})`, scheduleId)
        .run();

      if (result.meta.changes === 0) {
        return c.json({ success: false, message: 'Slot ini telah pun dituntut oleh pegawai lain.' }, 409);
      }

      return c.json({ success: true, message: `Berjaya menuntut slot Pemeriksa ${slot}` });
    }
  )

  // 4. Hantar Perakuan KEW.PA-11 & Laporan Pra-JKPAK (Statutory Compliance)
  .post(
    '/api/schedules/:id/kewpa11',
    zValidator(
      'json',
      z.object({
        qty_good: z.number().min(0),
        qty_damaged: z.number().min(0),
        qty_idle: z.number().min(0),
        qty_missing: z.number().min(0),
        complaint_ref_no: z.string().optional(),
        complaint_date: z.string().optional(),
        lo_number: z.string().optional(),
        maintenance_status: z.string().optional(),
        idle_reason_standard: z.string().optional(),
        idle_justification: z.string().optional(),
        idle_action_proposal: z.string().optional(),
        evidence_drive_url: z.string().url(),
        inspector_remarks: z.string().optional(),
        submitted_by: z.string().email(),
      })
    ),
    async (c) => {
      const scheduleId = c.req.param('id');
      const body = c.req.valid('json');

      // Validasi Pekeliling: Aset rosak wajib ada aduan & LO
      if (body.qty_damaged > 0 && (!body.complaint_ref_no || !body.lo_number)) {
        return c.json({ success: false, message: 'Pekeliling AM 2.4: Aset rosak wajib mempunyai No. Aduan & No. LO.' }, 400);
      }

      // Validasi Pekeliling: Aset usang wajib ada justifikasi
      if (body.qty_idle > 0 && (!body.idle_reason_standard || !body.idle_justification)) {
        return c.json({ success: false, message: 'Pekeliling AM 2.4: Aset usang wajib mempunyai sebab standard & justifikasi teknikal.' }, 400);
      }

      const reportId = `REP-${scheduleId}`;

      // Simpan laporan dan kemaskini status kepada 'Selesai'
      await c.env.DB.batch([
        c.env.DB.prepare(`
          INSERT INTO kewpa11_reports (
            id, schedule_id, qty_good, qty_damaged, qty_idle, qty_missing,
            complaint_ref_no, complaint_date, lo_number, maintenance_status,
            idle_reason_standard, idle_justification, idle_action_proposal,
            evidence_drive_url, inspector_remarks, submitted_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(schedule_id) DO UPDATE SET
            qty_good = excluded.qty_good,
            qty_damaged = excluded.qty_damaged,
            qty_idle = excluded.qty_idle,
            qty_missing = excluded.qty_missing,
            complaint_ref_no = excluded.complaint_ref_no,
            lo_number = excluded.lo_number,
            idle_reason_standard = excluded.idle_reason_standard,
            idle_justification = excluded.idle_justification,
            evidence_drive_url = excluded.evidence_drive_url
        `).bind(
          reportId, scheduleId, body.qty_good, body.qty_damaged, body.qty_idle, body.qty_missing,
          body.complaint_ref_no || null, body.complaint_date || null, body.lo_number || null, body.maintenance_status || null,
          body.idle_reason_standard || null, body.idle_justification || null, body.idle_action_proposal || null,
          body.evidence_drive_url, body.inspector_remarks || null, body.submitted_by
        ),
        c.env.DB.prepare("UPDATE inspection_schedules SET status = 'Selesai' WHERE id = ?").bind(scheduleId)
      ]);

      return c.json({ success: true, message: 'Laporan KEW.PA-11 & dapatan Pra-JKPAK berjaya disahkan' });
    }
  )

  // 5. Agregasi Kompilasi Pra-JKPAK untuk Ketua Pegawai Pemeriksa
  .get('/api/pra-jkpak/compilation', async (c) => {
    const { results } = await c.env.DB.prepare(`
      SELECT 
        s.dept_id,
        COUNT(s.id) as total_locations_inspected,
        SUM(k.qty_good) as total_good,
        SUM(k.qty_damaged) as total_damaged,
        SUM(k.qty_idle) as total_idle,
        SUM(k.qty_missing) as total_missing
      FROM inspection_schedules s
      INNER JOIN kewpa11_reports k ON s.id = k.schedule_id
      WHERE s.status = 'Selesai'
      GROUP BY s.dept_id
    `).all();

    return c.json({ success: true, data: results });
  });

export type AppType = typeof apiRoutes;
export default app;
```

---

## 6. Arahan Pelaksanaan & Penerbitan

```bash
# Uji secara tempatan (Local Full-stack)
npm run dev

# Terbitkan ke Cloudflare Workers & Pages
npm run build
npx wrangler deploy
```