import { Hono } from 'hono';
import { Bindings } from '../types';

export const storageRoute = new Hono<{ Bindings: Bindings }>()

  // 1. UPLOAD FILE TO CLOUDFLARE R2
  .post('/upload', async (c) => {
    try {
      const formData = await c.req.formData();
      const file = formData.get('file') as File | null;
      const category = (formData.get('category') as string) || 'documents';

      if (!file) {
        return c.json({ success: false, message: 'Tiada fail dimuat naik' }, 400);
      }

      const timestamp = Date.now();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const r2Key = `${category}/${timestamp}_${cleanFileName}`;

      const arrayBuffer = await file.arrayBuffer();

      // Put object into Cloudflare R2 bucket
      await c.env.R2_BUCKET.put(r2Key, arrayBuffer, {
        httpMetadata: {
          contentType: file.type || 'application/pdf',
        },
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          size: file.size.toString(),
        },
      });

      return c.json({
        success: true,
        message: 'Fail berjaya disimpan ke Cloudflare R2',
        data: {
          key: r2Key,
          fileName: file.name,
          size: file.size,
          contentType: file.type,
          url: `/api/storage/file/${encodeURIComponent(r2Key)}`,
        },
      }, 201);
    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat memuat naik fail ke R2: ' + e.message }, 500);
    }
  })

  // 2. GET FILE FROM CLOUDFLARE R2 (Stream binary)
  .get('/file/:key', async (c) => {
    const key = decodeURIComponent(c.req.param('key'));
    try {
      const object = await c.env.R2_BUCKET.get(key);

      if (!object) {
        return c.json({ success: false, message: 'Fail tidak dijumpai di Cloudflare R2' }, 404);
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers as any);
      headers.set('etag', object.httpEtag);
      headers.set('Cache-Control', 'public, max-age=31536000');

      return new Response(object.body as any, { headers });
    } catch (e: any) {
      return c.json({ success: false, message: e.message }, 500);
    }
  })

  // 3. DELETE FILE FROM CLOUDFLARE R2
  .delete('/file/:key', async (c) => {
    const key = decodeURIComponent(c.req.param('key'));
    try {
      await c.env.R2_BUCKET.delete(key);
      return c.json({ success: true, message: `Fail ${key} berjaya dipadam dari Cloudflare R2` });
    } catch (e: any) {
      return c.json({ success: false, message: e.message }, 500);
    }
  });
