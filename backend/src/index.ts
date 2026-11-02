import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Bindings } from './types';
import { locationsRoute } from './routes/locations';
import { schedulesRoute } from './routes/schedules';
import { kewpa7Route } from './routes/kewpa7';
import { settingsRoute } from './routes/settings';
import { storageRoute } from './routes/storage';
import { aiRoute } from './routes/ai';
import { departmentsRoute } from './routes/departments';
import { officersRoute } from './routes/officers';
import { auditRoute } from './routes/audit';
import { authRoute } from './routes/auth';
import { rolesRoute, roleAssignmentsRoute } from './routes/roles';
import { cyclesRoute } from './routes/cycles';
import { noticesRoute } from './routes/notices';
import { calendarRoute } from './routes/calendar';
import { requireAuth, getAuthUser, type AppEnv } from './middleware/auth';
import { scanTenureNotices } from './lib/notices';
import { mustChangePassword } from './lib/credentials';

const app = new Hono<AppEnv>();

// Global Middleware
app.use('*', logger());

// Respons API membawa data pegawai/sesi: jangan benarkan pelayar atau proksi menyimpannya.
app.use('/api/*', async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store');
});
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
  maxAge: 86400,
}));

// Health Check & Cloudflare Edge Status
app.get('/', (c) => {
  return c.json({
    service: 'Portal Pengurusan Aset Alih & Inspect-Able POLIKU Backend',
    version: '1.0.0',
    platform: 'Cloudflare Workers (Edge Serverless)',
    stack: {
      framework: 'Hono v4 + Hono RPC',
      database: 'Cloudflare D1 (SQLite)',
      cache: 'Cloudflare KV (Edge Storage)',
      storage: 'Cloudflare R2 (S3-compatible)',
      ai: 'Cloudflare Workers AI (@cf/meta/llama-3.1-8b-instruct)',
    },
    status: 'ONLINE',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => c.json({ status: 'ok', time: Date.now() }));

// Laluan awam yang menulis data tetapi tidak memerlukan token (log masuk / daftar).
const PUBLIC_MUTATION_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/activate',
  '/api/auth/register',
]);

// PBAC: semua tulisan ke API mesti datang daripada sesi pegawai yang sah.
// GET yang membawa data pegawai/lokasi/jadual juga memerlukan sesi; rujukan awam
// (jabatan, peranan, kalendar, tetapan landing) kekal terbuka.
const PROTECTED_READ_PREFIXES = [
  '/api/officers',
  '/api/role-assignments',
  '/api/locations',
  '/api/schedules',
  '/api/cycles',
  '/api/kewpa7',
];

app.use('/api/*', async (c, next) => {
  const method = c.req.method.toUpperCase();
  const path = new URL(c.req.url).pathname;
  if (method === 'OPTIONS') return next();
  if (method === 'GET' || method === 'HEAD') {
    const protectedRead = PROTECTED_READ_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));
    return protectedRead ? requireAuth(c, next) : next();
  }
  if (PUBLIC_MUTATION_PATHS.has(path)) return next();
  return requireAuth(c, next);
});

// Statistik agregat (tiada data peribadi) untuk halaman landing sebelum log masuk.
app.get('/api/public/stats', async (c) => {
  const count = async (table: string) =>
    (await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>())?.n ?? 0;
  const [jabatan, lokasi, jadual, pegawai] = await Promise.all([
    count('departments'),
    count('locations'),
    count('inspection_schedules'),
    count('officers'),
  ]);
  return c.json({ success: true, data: { jabatan, lokasi, jadual, pegawai } });
});

/**
 * Kata laluan sementara (dijana pentadbir) mesti ditukar sebelum apa-apa tindakan
 * lain dibenarkan — menghalang pegawai menggunakan portal tanpa menukar kredensial.
 */
const PASSWORD_CHANGE_ALLOWED = new Set(['/api/auth/password', '/api/auth/me', '/api/auth/login']);

app.use('/api/*', async (c, next) => {
  const method = c.req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();

  const path = new URL(c.req.url).pathname;
  if (PASSWORD_CHANGE_ALLOWED.has(path)) return next();

  const auth = getAuthUser(c);
  if (!auth) return next();

  if (await mustChangePassword(c.env.DB, auth.id)) {
    return c.json(
      {
        success: false,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Sila tukar kata laluan sementara anda sebelum meneruskan.',
      },
      403
    );
  }

  return next();
});

// Mount Sub-routes for Hono RPC End-to-End Type Safety
const routes = app
  .route('/api/auth', authRoute)
  .route('/api/roles', rolesRoute)
  .route('/api/role-assignments', roleAssignmentsRoute)
  .route('/api/cycles', cyclesRoute)
  .route('/api/notices', noticesRoute)
  .route('/api/calendar', calendarRoute)
  .route('/api/locations', locationsRoute)
  .route('/api/schedules', schedulesRoute)
  .route('/api/departments', departmentsRoute)
  .route('/api/officers', officersRoute)
  .route('/api/audit-logs', auditRoute)
  .route('/api/kewpa7', kewpa7Route)
  .route('/api/settings', settingsRoute)
  .route('/api/storage', storageRoute)
  .route('/api/ai', aiRoute);

// EXPORT Hono RPC Type Definition for Frontend Type-Safe Consumption
export type AppType = typeof routes;

/**
 * Cron Trigger harian: imbasan lantikan yang akan luput dalam 60 hari atau
 * sudah tamat, menghasilkan notifikasi untuk pentadbir & pegawai berkenaan.
 */
async function handleScheduled(env: Bindings) {
  try {
    const result = await scanTenureNotices(env.DB);
    console.log(
      `[cron] Imbasan lantikan selesai: ${result.created} notifikasi baharu daripada ${result.scanned} lantikan.`
    );
  } catch (error) {
    console.error('[cron] Imbasan lantikan gagal:', error);
  }
}

export default {
  fetch: app.fetch,
  scheduled: async (
    _controller: { scheduledTime: number; cron: string },
    env: Bindings,
    _ctx: { waitUntil(promise: Promise<unknown>): void }
  ) => {
    await handleScheduled(env);
  },
};
