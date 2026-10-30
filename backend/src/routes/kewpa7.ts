import { Hono } from 'hono';
import { Bindings } from '../types';
import { parseKewpa7Text } from '../lib/kewpa7Text';

/** Ambil objek JSON pertama daripada output model (buang blok kod / teks tambahan). */
function parseStructuredJson(raw: unknown): any | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;

  const withoutFences = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const first = withoutFences.indexOf('{');
  const last = withoutFences.lastIndexOf('}');
  if (first === -1 || last <= first) return null;

  try {
    const parsed = JSON.parse(withoutFences.slice(first, last + 1));
    // Bentuk minimum yang berguna untuk pratonton KEW.PA-7.
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.senaraiAset)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const kewpa7Route = new Hono<{ Bindings: Bindings }>()

  // 1. EXTRACT KEW.PA-7 USING WORKERS AI & SAVE TO R2 + D1
  .post('/extract', async (c) => {
    try {
      const formData = await c.req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return c.json({ success: false, message: 'Tiada fail KEW.PA-7 dimuat naik' }, 400);
      }

      const arrayBuffer = await file.arrayBuffer();

      // Step A: Save PDF into Cloudflare R2
      const r2Key = `kewpa7/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
      if (c.env.R2_BUCKET) {
        await c.env.R2_BUCKET.put(r2Key, arrayBuffer, {
          httpMetadata: { contentType: file.type || 'application/pdf' },
          customMetadata: { originalName: file.name, uploadedAt: new Date().toISOString() },
        });
      }

      let extractedData: any = null;
      let aiModelUsed = 'Tiada';
      let extractedText = '';
      let aiError = '';
      let textSource = '';

      // Step B0: Ekstrak teks PDF secara TEMPATAN menggunakan pdf.js (unpdf).
      // Percuma, pantas, dan deterministik — tiada panggilan AI untuk PDF berteks.
      if (!extractedText) {
        try {
          const { extractText, getDocumentProxy } = await import('unpdf');
          const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
          const { text } = await extractText(pdf, { mergePages: true });
          const localText = (Array.isArray(text) ? text.join('\n') : String(text ?? '')).trim();
          if (localText) {
            extractedText = localText;
            textSource = 'pdf.js (tempatan)';
          }
        } catch (localError) {
          aiError = 'pdf.js: ' + (localError as Error).message;
          console.warn('pdf.js gagal mengekstrak teks:', localError);
        }
      }

      // Step B1: Sandaran — tukar PDF kepada teks melalui Workers AI (document-to-markdown).
      // Digunakan apabila pdf.js gagal atau PDF tiada lapisan teks (imbasan/gambar).
      const ai = c.env.AI as unknown as {
        toMarkdown?: (docs: Array<{ name: string; blob: Blob }>) => Promise<
          Array<{ data?: string }>
        >;
        run?: (model: string, input: Record<string, unknown>) => Promise<any>;
      } | undefined;

      if (!extractedText && ai && typeof ai.toMarkdown === 'function') {
        try {
          const converted = await ai.toMarkdown([
            { name: file.name, blob: new Blob([arrayBuffer], { type: 'application/pdf' }) },
          ]);
          extractedText = (converted?.[0]?.data ?? '').trim();
          if (extractedText) textSource = 'Workers AI toMarkdown';
        } catch (convertError) {
          aiError = 'toMarkdown: ' + (convertError as Error).message;
          console.warn('Gagal menukar PDF kepada teks:', convertError);
        }
      }

      // Step B2: Heuristik teks diutamakan (deterministik, pantas, tanpa kos AI).
      if (extractedText) {
        const heuristic = parseKewpa7Text(extractedText);
        if (heuristic) {
          extractedData = heuristic;
          aiModelUsed = 'Heuristik teks';
        }
      }

      // Step B3: Jika heuristik gagal, strukturkan teks dengan Workers AI.
      if (!extractedData && ai && typeof ai.run === 'function' && extractedText) {
        aiModelUsed = '@cf/meta/llama-3.1-8b-instruct';
        const prompt = `
Anda mengekstrak borang KEW.PA-7 (Senarai Aset Alih) Politeknik Kuching Sarawak.
Kembalikan JSON SAHAJA (tiada penjelasan, tiada blok kod) mengikut bentuk:
{"bahagian":"...","lokasi":"...","kodLokasi":"...","pegawaiBertanggungjawabList":[{"id":"OFF-1","nama":"...","jawatan":"..."}],"senaraiAset":[{"bil":1,"noSiriPendaftaran":"...","keteranganAset":"...","tarikhPenempatan":"dd/mm/yyyy","statusFizikal":"Baik"}]}

Kandungan borang:
${extractedText.slice(0, 12000)}
`;

        try {
          const aiResponse = await ai.run(aiModelUsed, { prompt, max_tokens: 2000 });
          extractedData = parseStructuredJson(aiResponse?.response);
          if (!extractedData) aiError = 'Model memulangkan teks yang bukan JSON sah.';
        } catch (aiErr) {
          aiError = 'AI: ' + (aiErr as Error).message;
          console.warn('Workers AI extraction gagal:', aiErr);
        }
      }

      if (!extractedData) {
        return c.json(
          {
            success: false,
            code: extractedText ? 'AI_STRUCTURE_FAILED' : 'NO_TEXT',
            message: extractedText
              ? 'Teks PDF berjaya dibaca tetapi struktur KEW.PA-7 tidak dapat dikenal pasti. Sila isi maklumat secara manual.'
              : 'PDF ini tidak mengandungi teks yang boleh dibaca (mungkin imbasan/gambar). Sila guna PDF berteks atau isi maklumat secara manual.',
            hint: 'Muat naik semula atau gunakan butang "Isi Manual".',
            textLength: extractedText.length,
            diagnostic: aiError || undefined,
          },
          422
        );
      }

      // Step C: Record in Cloudflare D1
      if (c.env.DB) {
        try {
          await c.env.DB.prepare(`
            INSERT INTO kewpa7_documents (id, r2_file_key, file_name, file_size, extracted_json, ai_model_used)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            `K7-${Date.now()}`,
            r2Key,
            file.name,
            file.size,
            JSON.stringify({ ...extractedData, _textSample: extractedText.slice(0, 3000) }),
            aiModelUsed
          ).run();
        } catch (dbErr) {
          console.warn('Could not record into D1:', dbErr);
        }
      }

      // Medan teras yang gagal dihurai → sertakan cuplikan teks PDF untuk siasatan
      // supaya pentadbir boleh lihat susunan teks sebenar (bukan meneka).
      const missingFields = ['bahagian', 'lokasi', 'kodLokasi'].filter(
        (field) => !String((extractedData as Record<string, unknown>)?.[field] ?? '').trim()
      );

      // Kod lokasi ialah kunci unik — beritahu UI jika muat naik ini menimpa ruang sedia ada.
      const code = String(extractedData?.kodLokasi ?? '').trim();
      let matchedLocation: { id: string; kodRuang: string; nama: string; jabatan: string } | null = null;

      if (code) {
        matchedLocation = await c.env.DB.prepare(
          `SELECT id, kod_ruang AS kodRuang, nama, department_id AS jabatan
             FROM locations
            WHERE REPLACE(UPPER(kod_ruang), ' ', '') = REPLACE(UPPER(?), ' ', '')
            LIMIT 1`
        )
          .bind(code)
          .first<{ id: string; kodRuang: string; nama: string; jabatan: string }>();
      }

      return c.json({
        success: true,
        source: `${textSource || 'Tiada teks'} | ${aiModelUsed} | R2 Storage`,
        r2Key,
        data: extractedData,
        matchedLocation: matchedLocation ?? undefined,
        missingFields,
        textPreview: missingFields.length ? extractedText.slice(0, 800) : undefined,
      });

    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat memproses KEW.PA-7: ' + e.message }, 500);
    }
  })

  // 2b. PAUTKAN DOKUMEN KEW.PA-7 DENGAN LOKASI (sejarah versi per ruang)
  .put('/documents/link', async (c) => {
    try {
      const body = await c.req.json();
      const r2Key = String(body?.r2Key ?? '').trim();
      const locationId = String(body?.locationId ?? '').trim();

      if (!r2Key || !locationId) {
        return c.json({ success: false, message: 'r2Key dan locationId diperlukan.' }, 400);
      }

      const result = await c.env.DB.prepare(
        'UPDATE kewpa7_documents SET location_id = ? WHERE r2_file_key = ?'
      )
        .bind(locationId, r2Key)
        .run();

      return c.json({
        success: true,
        message: 'Dokumen KEW.PA-7 dipautkan kepada lokasi.',
        data: { linked: result.meta?.changes ?? 0 },
      });
    } catch (e: any) {
      return c.json({ success: false, message: 'Gagal memautkan dokumen: ' + e.message }, 500);
    }
  })

  // 2. LIST STORED KEW.PA-7 DOCUMENTS (FROM D1)
  .get('/documents', async (c) => {
    try {
      const { results } = await c.env.DB.prepare(
        'SELECT id, r2_file_key, file_name, file_size, ai_model_used, created_at FROM kewpa7_documents ORDER BY created_at DESC'
      ).all();

      return c.json({ success: true, data: results });
    } catch (e: any) {
      return c.json({ success: false, message: e.message }, 500);
    }
  });
