import { Hono } from 'hono';
import { Bindings } from '../types';

export const aiRoute = new Hono<{ Bindings: Bindings }>()

  // 1. GENERATE PRA-JKPAK AUDIT JUSTIFICATION
  .post('/justify-asset', async (c) => {
    try {
      const { assetName, category, issue, ageYears } = await c.req.json();

      if (!assetName || !issue) {
        return c.json({ success: false, message: 'Nama aset dan isu kerosakan diperlukan' }, 400);
      }

      if (c.env.AI) {
        const response = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          prompt: `
          Sebagai Pegawai Pemeriksa Aset Kerajaan Malaysia (1PP AM 2.4) di Politeknik Kuching Sarawak:
          Aset: ${assetName}
          Kategori: ${category || 'Aset Alih'}
          Umur Aset: ${ageYears || '5'} tahun
          Kerosakan/Isu: ${issue}

          Sila sediakan dalam bahasa Melayu rasmi:
          1. Justifikasi kerosakan/tidak ekonomi dibaiki
          2. Syor tindakan pelupusan atau penyelenggaraan (cth: Musnah / Jualan Sisa / Pindahan)
          3. Implikasi pematuhan keselamatan jika terus digunakan
          Pastikan format ringkas dan padat untuk dimasukkan ke dalam Borang Pra-JKPAK.
          `,
          max_tokens: 500,
        });

        return c.json({
          success: true,
          model: '@cf/meta/llama-3.1-8b-instruct (Cloudflare Workers AI)',
          justification: response.response,
        });
      }

      // Offline / Local mock
      return c.json({
        success: true,
        model: 'Local Rule Engine',
        justification: `Aset "${assetName}" telah mengalami kerosakan komponen utama (${issue}) melebihi nilai pembaikan ekonomi (BER). Disyorkan untuk pelupusan melalui kaedah sebut harga sisa atau pelupusan secara musnah mengikut tatacara 1PP AM 2.6.`,
      });

    } catch (e: any) {
      return c.json({ success: false, message: 'Ralat Workers AI: ' + e.message }, 500);
    }
  })

  // 2. CHECK 1PP AM 2.4 COMPLIANCE
  .post('/check-compliance', async (c) => {
    try {
      const { totalLocations, completedLocations, crossDepartmentPairing } = await c.req.json();
      const coverageRate = totalLocations > 0 ? (completedLocations / totalLocations) * 100 : 0;
      const isFullCoverage = coverageRate >= 100;

      return c.json({
        success: true,
        data: {
          coverageRate: Math.round(coverageRate),
          isCompliant100Percent: isFullCoverage,
          status: isFullCoverage ? 'Patuh 100%' : 'Belum Mencapai Sasaran',
          recommendation: isFullCoverage 
            ? 'Pemeriksaan fizikal 100% selesai mengikut Para 24 1PP AM 2.4. Sedia untuk pembentangan JKPAK Suku Tahunan.'
            : `Kadar liputan semasa ${Math.round(coverageRate)}%. Masih berbaki ${totalLocations - completedLocations} lokasi untuk diselesaikan sebelum tarikh ambang Pra-JKPAK.`,
        },
      });
    } catch (e: any) {
      return c.json({ success: false, message: e.message }, 500);
    }
  });
