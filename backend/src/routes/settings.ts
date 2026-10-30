import { Hono } from 'hono';
import { requireRole, type AppEnv } from '../middleware/auth';
import { Bindings, SystemSettingsRecord } from '../types';

// Neutral baseline: no fabricated session dates. Year is resolved per request
// because Cloudflare Workers freezes Date at module evaluation time.
const defaultSettings = (): SystemSettingsRecord => ({
  sesiTahun: String(new Date().getFullYear()),
  tarikhMulaSesi: '',
  tarikhTamatSesi: '',
  tarikhPraJkpak: '',
  ambangAmaranHari: 14,
  sasaranLiputanPeratus: 100,
  minimumPegawaiPemeriksa: 2,
  enforceCrossInspection: true,
  enforceCustodianGuard: true,
  enforceMaintenanceJustification: true,
  namaInstitusi: 'Politeknik Kuching Sarawak',
});

const KV_SETTINGS_KEY = 'system_settings';

export const settingsRoute = new Hono<AppEnv>()

  // 1. GET SETTINGS (From Cloudflare KV) — awam: sesi/tahun diperlukan sebelum log masuk.
  .get('/', async (c) => {
    try {
      const kvData = await c.env.KV.get(KV_SETTINGS_KEY, 'json');
      const baseline = defaultSettings();
      const settings = kvData ? { ...baseline, ...(kvData as object) } : baseline;

      return c.json({
        success: true,
        source: kvData ? 'Cloudflare KV (Edge Cache)' : 'System Defaults',
        data: settings,
      });
    } catch (e: any) {
      return c.json({ success: true, source: 'Fallback', data: defaultSettings() });
    }
  })

  // 2. UPDATE SETTINGS (Into Cloudflare KV) — Pentadbir Sistem sahaja.
  .put('/', requireRole('PENTADBIR_SISTEM'), async (c) => {
    try {
      const body = await c.req.json();
      const merged: SystemSettingsRecord = {
        ...defaultSettings(),
        ...body,
      };

      // Store in Cloudflare KV
      await c.env.KV.put(KV_SETTINGS_KEY, JSON.stringify(merged));

      return c.json({
        success: true,
        message: 'Tetapan sistem berjaya disimpan ke Cloudflare KV',
        data: merged,
      });
    } catch (e: any) {
      return c.json({ success: false, message: 'Gagal mengemaskini KV: ' + e.message }, 500);
    }
  });
