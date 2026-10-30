import { Hono } from 'hono';
import { requireRole, type AppEnv } from '../middleware/auth';

const KATEGORI = new Set(['MESYUARAT_PRA_JKPAK', 'MESYUARAT_JKPAK', 'PEMERIKSAAN', 'LAIN']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface CalendarRow {
  id: string;
  tahun: number;
  tarikh: string;
  tajuk: string;
  kategori: string;
  catatan: string | null;
}

const normalizeKategori = (value: unknown): string => {
  const kategori = String(value ?? 'LAIN').trim().toUpperCase();
  return KATEGORI.has(kategori) ? kategori : 'LAIN';
};

/**
 * Takwim perancangan tahunan (Tetapan). Satu sesi boleh mempunyai banyak tarikh
 * — contohnya Mesyuarat Pra-JKPAK Bil. 1, Bil. 2, … serta tempoh pemeriksaan.
 */
export const calendarRoute = new Hono<AppEnv>()

  .get('/', async (c) => {
    try {
      const tahun = Number(c.req.query('tahun') ?? '');
      const statement = Number.isFinite(tahun) && tahun > 2000
        ? c.env.DB.prepare(
            `SELECT id, tahun, tarikh, tajuk, kategori, catatan
             FROM annual_calendar WHERE tahun = ? ORDER BY tarikh ASC`
          ).bind(tahun)
        : c.env.DB.prepare(
            `SELECT id, tahun, tarikh, tajuk, kategori, catatan
             FROM annual_calendar ORDER BY tahun DESC, tarikh ASC`
          );

      const { results } = await statement.all<CalendarRow>();
      return c.json({ success: true, total: (results ?? []).length, data: results ?? [] });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat mendapatkan takwim: ' + e.message }, 500);
    }
  })

  .post('/', requireRole('PENTADBIR_SISTEM'), async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const tahun = Number(body?.tahun);
      const tarikh = String(body?.tarikh ?? '').trim();
      const tajuk = String(body?.tajuk ?? '').trim();

      if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) {
        return c.json(
          { success: false, code: 'INVALID_YEAR', message: 'Tahun takwim tidak sah.' },
          400
        );
      }
      if (!DATE_PATTERN.test(tarikh)) {
        return c.json(
          { success: false, code: 'INVALID_DATE', message: 'Tarikh mesti dalam format YYYY-MM-DD.' },
          400
        );
      }
      if (!tajuk) {
        return c.json(
          { success: false, code: 'INVALID_TITLE', message: 'Tajuk perkara wajib diisi.' },
          400
        );
      }

      const id = `CAL-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 5)
        .toUpperCase()}`;

      await c.env.DB.prepare(
        `INSERT INTO annual_calendar (id, tahun, tarikh, tajuk, kategori, catatan)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(id, tahun, tarikh, tajuk, normalizeKategori(body?.kategori), body?.catatan ?? null)
        .run();

      const saved = await c.env.DB.prepare(
        `SELECT id, tahun, tarikh, tajuk, kategori, catatan FROM annual_calendar WHERE id = ?`
      )
        .bind(id)
        .first<CalendarRow>();

      return c.json({ success: true, message: 'Perkara takwim ditambah.', data: saved }, 201);
    } catch (e: any) {
      const duplicate = /UNIQUE/i.test(e.message);
      return c.json(
        {
          success: false,
          code: duplicate ? 'DUPLICATE_ITEM' : 'CREATE_FAILED',
          message: duplicate
            ? 'Perkara yang sama pada tarikh itu sudah wujud dalam takwim.'
            : 'Ralat menambah takwim: ' + e.message,
        },
        duplicate ? 409 : 500
      );
    }
  })

  .put('/:id', requireRole('PENTADBIR_SISTEM'), async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json().catch(() => ({}));

      const existing = await c.env.DB.prepare(
        'SELECT id FROM annual_calendar WHERE id = ? LIMIT 1'
      )
        .bind(id)
        .first<{ id: string }>();
      if (!existing) {
        return c.json({ success: false, message: 'Perkara takwim tidak dijumpai.' }, 404);
      }

      const sets: string[] = [];
      const params: unknown[] = [];
      const set = (column: string, value: unknown) => {
        sets.push(`${column} = ?`);
        params.push(value);
      };

      if (body?.tahun !== undefined) {
        const tahun = Number(body.tahun);
        if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) {
          return c.json({ success: false, code: 'INVALID_YEAR', message: 'Tahun tidak sah.' }, 400);
        }
        set('tahun', tahun);
      }
      if (body?.tarikh !== undefined) {
        const tarikh = String(body.tarikh).trim();
        if (!DATE_PATTERN.test(tarikh)) {
          return c.json(
            { success: false, code: 'INVALID_DATE', message: 'Tarikh tidak sah.' },
            400
          );
        }
        set('tarikh', tarikh);
      }
      if (body?.tajuk !== undefined) {
        const tajuk = String(body.tajuk).trim();
        if (!tajuk) {
          return c.json({ success: false, code: 'INVALID_TITLE', message: 'Tajuk wajib diisi.' }, 400);
        }
        set('tajuk', tajuk);
      }
      if (body?.kategori !== undefined) set('kategori', normalizeKategori(body.kategori));
      if (body?.catatan !== undefined) set('catatan', body.catatan ?? null);

      if (sets.length > 0) {
        await c.env.DB.prepare(
          `UPDATE annual_calendar SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`
        )
          .bind(...params, id)
          .run();
      }

      const saved = await c.env.DB.prepare(
        `SELECT id, tahun, tarikh, tajuk, kategori, catatan FROM annual_calendar WHERE id = ?`
      )
        .bind(id)
        .first<CalendarRow>();

      return c.json({ success: true, message: 'Perkara takwim dikemas kini.', data: saved });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat mengemas kini takwim: ' + e.message }, 500);
    }
  })

  .delete('/:id', requireRole('PENTADBIR_SISTEM'), async (c) => {
    try {
      const id = c.req.param('id');
      const result = await c.env.DB.prepare('DELETE FROM annual_calendar WHERE id = ?')
        .bind(id)
        .run();

      if (!result.meta.changes) {
        return c.json({ success: false, message: 'Perkara takwim tidak dijumpai.' }, 404);
      }
      return c.json({ success: true, message: 'Perkara takwim dipadam.' });
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat memadam takwim: ' + e.message }, 500);
    }
  });
