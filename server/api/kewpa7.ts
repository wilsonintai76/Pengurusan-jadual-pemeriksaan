import type { ApiEnv } from './env.ts';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

// Helper function to extract text via pdf.js & regex rules (Fast Tier 1)
async function extractWithPdfJsAndRegex(buffer: Buffer) {
  try {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const parsed = await extractText(pdf, { mergePages: true });
    const text = Array.isArray(parsed.text) ? parsed.text.join('\n') : String(parsed.text ?? '');

    if (!text || text.trim().length < 40) {
      return null; // Empty or scanned PDF image, fall back to AI
    }

    // Regex extraction rules for KEW.PA-7
    const bahagianMatch = text.match(/Bahagian\s*[:/]\s*(.+)/i) || text.match(/(JABATAN\s+[A-Z\s]+)/i);
    const lokasiMatch = text.match(/Lokasi\s*[:/]\s*(.+)/i) || text.match(/((?:BENGKEL|MAKMAL|BILIK|STOR|STUDIO)\s+[A-Z0-9\-_\s]+)/i);
    const kodLokasiMatch = text.match(/Kod\s*Lokasi\s*[:/]\s*(.+)/i) || text.match(/(\d{6}\s*\/\s*[A-Z0-9/\s-]+)/i);

    // Extract responsible officers
    const officerMatches: { id: string; nama: string; jawatan: string }[] = [];
    const officerLines = text.split('\n').filter((line: string) => 
      line.includes('Disahkan oleh') || line.includes('Pegawai') || line.includes('PPPT') || line.includes('HO YOONG') || line.includes('Wilson')
    );

    officerLines.forEach((line: string, idx: number) => {
      const cleaned = line.replace(/(Disahkan oleh|Disediakan oleh|Pegawai Bertanggungjawab|Jawatan|Tarikh|:)/gi, '').trim();
      if (cleaned.length > 3 && !cleaned.includes('KEW.PA-7') && !cleaned.includes('BORANG')) {
        officerMatches.push({
          id: `OFF-${idx + 1}`,
          nama: cleaned,
          jawatan: 'Penolong Pegawai Aset / Pengesah'
        });
      }
    });

    // Extract asset items
    const assetLines = text.split('\n');
    const extractedAssets: any[] = [];
    const siriRegex = /((?:KPT|KKM|JPA|POLIKU)\/[A-Z0-9/-]+)/i;

    assetLines.forEach((line: string) => {
      const match = line.match(siriRegex);
      if (match) {
        const noSiri = match[1];
        const desc = line.replace(siriRegex, '').replace(/^\d+\s*/, '').trim();
        extractedAssets.push({
          bil: extractedAssets.length + 1,
          noSiriPendaftaran: noSiri,
          keteranganAset: desc || 'Aset Alih Kerajaan',
          tarikhPenempatan: '',
          statusFizikal: 'Baik'
        });
      }
    });

    if (lokasiMatch && (extractedAssets.length > 0 || officerMatches.length > 0)) {
      return {
        bahagian: bahagianMatch ? bahagianMatch[1].trim() : '',
        lokasi: lokasiMatch ? lokasiMatch[1].trim() : '',
        kodLokasi: kodLokasiMatch ? kodLokasiMatch[1].trim() : '',
        pegawaiBertanggungjawabList: officerMatches,
        senaraiAset: extractedAssets,
      };
    }
  } catch (e) {
    console.warn('pdf-parse regex extraction failed, falling back to Gemini AI:', e);
  }
  return null;
}

export async function handleKewpa7Extract(
  request: Request,
  env: ApiEnv
): Promise<Response> {
  try {
    const cfAccountId = env.CLOUDFLARE_ACCOUNT_ID;
    const cfApiToken = env.CLOUDFLARE_API_TOKEN;
    const backendUrl = env.BACKEND_URL;

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return jsonResponse(
        { success: false, message: 'Tiada fail dimuat naik.' },
        400
      );
    }

    const fileName = file.name.toLowerCase();

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // TIER 1: Fast deterministic extraction via pdf-parse & regex rules
    if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
      const regexData = await extractWithPdfJsAndRegex(buffer);
      if (regexData) {
        return jsonResponse({
          success: true,
          source: 'PDF.js / Regex Engine (Fast Tier 1)',
          data: regexData,
        });
      }
    }

    // TIER 2: Cloudflare Workers AI (Llama 3.2 Vision / Llama 3.1 8B Instruct)
    if (cfAccountId && cfApiToken) {
      try {
        const base64Data = buffer.toString('base64');
        const mimeType = file.type || 'application/pdf';

        const prompt = `Anda adalah sistem AI Pengekstrak Dokumen Rasmi Kerajaan Malaysia (KEW.PA-7 Senarai Aset Alih).
Sila ekstrak maklumat berikut daripada dokumen KEW.PA-7 dan pulangkan format JSON SAHAJA:
{
  "bahagian": "string (cth: JABATAN KEJURUTERAAN MEKANIKAL)",
  "lokasi": "string (cth: BENGKEL HI-TECH)",
  "kodLokasi": "string (cth: 130101 / BGN / JKM1 / 01 / B09)",
  "pegawaiBertanggungjawabList": [
    { "id": "OFF-1", "nama": "string (Nama Pegawai Bertanggungjawab / Pengesah)", "jawatan": "string (cth: PPPT / Pegawai Bengkel)" }
  ],
  "senaraiAset": [
    {
      "bil": 1,
      "noSiriPendaftaran": "string (cth: KPT/PKS/H/07/13)",
      "keteranganAset": "string (Deskripsi penuh aset)",
      "tarikhPenempatan": "string (dd/mm/yyyy)",
      "statusFizikal": "Baik",
      "kategori": "Harta Modal"
    }
  ]
}
PENTING: Pulangkan RAW JSON sahaja tanpa markdown formatting.`;

        // Call Cloudflare Workers AI Vision / Text endpoint (Free Tier: 10,000 Neurons/day)
        const isImage = mimeType.startsWith('image/');
        const model = isImage 
          ? '@cf/meta/llama-3.2-11b-vision-instruct' 
          : '@cf/meta/llama-3.1-8b-instruct';

        const cfAiResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${model}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${cfApiToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(
              isImage
                ? {
                    image: [...new Uint8Array(buffer)],
                    prompt: prompt,
                  }
                : {
                    messages: [
                      { role: 'system', content: 'You are a Malaysian government KEW.PA-7 document parser that outputs raw JSON only.' },
                      { role: 'user', content: prompt }
                    ]
                  }
            ),
          }
        );

        if (cfAiResponse.ok) {
          const aiResult = await cfAiResponse.json();
          const rawResponseText = aiResult.result?.response || aiResult.result?.description || '';
          const cleanedJson = rawResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanedJson);

          return jsonResponse({
            success: true,
            source: `Cloudflare Workers AI (${model}) (Tier 2)`,
            data: parsed,
          });
        }
      } catch (cfAiError) {
        console.error('Cloudflare Workers AI Extraction Error:', cfAiError);
      }
    } else if (backendUrl) {
      // Delegate to Hono Cloudflare Worker backend
      try {
        const delegateForm = new FormData();
        delegateForm.append('file', file);
        const resp = await fetch(`${backendUrl}/api/kewpa7/extract`, {
          method: 'POST',
          body: delegateForm,
        });
        if (resp.ok) {
          const resJson = await resp.json();
          return jsonResponse(resJson);
        }
      } catch (delegateError) {
        console.error('Hono backend Kewpa7 delegation failed:', delegateError);
      }
    }

    return jsonResponse(
      {
        success: false,
        message:
          'Pengekstrakan automatik gagal. Sila pastikan fail KEW.PA-7 mengandungi teks yang boleh dibaca atau isi maklumat secara manual.',
      },
      422
    );

  } catch (err: any) {
    console.error('KEW.PA-7 Extraction Route Error:', err);
    return jsonResponse(
      { success: false, message: 'Ralat semasa memproses fail KEW.PA-7: ' + err.message },
      500
    );
  }
}
