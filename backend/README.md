# Cloudflare Workers Backend: Portal Pengurusan Aset Alih POLIKU

Backend serverless berprestasi tinggi berasaskan **Cloudflare Edge (Free Tier)** menggunakan rangka kerja **Hono v4** dan **Hono RPC**.

---

## 🛠️ Seni Bina Teknologi (Cloudflare Free Tier)

| Komponen Cloudflare | Peranan & Spesifikasi | Had Pelan Percuma (Free Tier) |
|---|---|---|
| **Cloudflare D1** | Pangkalan data SQL Serverless (SQLite) untuk rekod lokasi, jadual 1PP AM 2.4, pegawai & log audit PBAC. | 5M bacaan/hari, 100k tulisan/hari, 5GB simpanan |
| **Cloudflare KV** | Storan *Key-Value* berkecepatan ultra tinggi di pinggir (*edge*) untuk tetapan sesi dan amaran audit. | 100k bacaan/hari, 1k tulisan/hari, 1GB data |
| **Cloudflare R2** | Storan fail/objek serasi S3 untuk arkib borang KEW.PA-7, KEW.PA-10, & KEW.PA-11 bertandatangan ($0 bayaran egress!). | 10 GB simpanan, 1M muat naik (Class A), 10M muat turun (Class B) |
| **Workers AI** | Model LLM/Vision terbuka (`@cf/meta/llama-3.1-8b-instruct`) untuk pengekstrakan borang & justifikasi kerosakan aset. | 10,000 Neurons/hari percuma |
| **Hono + Hono RPC** | Rangka kerja Web moden ultra-pantas dengan keselamatan jenis hujung-ke-hujung (*End-to-End Type Safety*). | Bebas lesen (Open Source) |

---

## 🚀 Panduan Persediaan & Pelaksanaan Cloudflare

### Langkah 1: Log Masuk Cloudflare
```bash
npx wrangler login
```

### Langkah 2: Cipta Sumber Cloudflare (Sekali Sahaja)

1. **Cipta Pangkalan Data D1**:
   ```bash
   npx wrangler d1 create poliku-aset-d1
   ```
   *Salin `database_id` yang tertera dan masukkan ke dalam `backend/wrangler.jsonc`.*

2. **Jalankan Skema SQL ke D1**:
   * Untuk persekitaran tempatan (Local):
     ```bash
     npm run d1:migrate:local
     ```
   * Untuk persekitaran awan Cloudflare (Production):
     ```bash
     npm run d1:migrate
     ```

3. **Cipta Ruang Nama Cloudflare KV**:
   ```bash
   npx wrangler kv namespace create poliku-settings-kv
   ```
   *Salin `id` ruang nama KV ke dalam `backend/wrangler.jsonc`.*

4. **Cipta Baldi Cloudflare R2**:
   ```bash
   npx wrangler r2 bucket create poliku-aset-documents
   ```

---

## 💻 Pembangunan Tempatan (Local Development)

Jalankan pelayan Cloudflare Worker secara tempatan:
```bash
npm run worker:dev
```
Pelayan tempatan akan aktif pada: `http://localhost:8787`

---

## 🔗 Hono RPC Client (Integrasi Frontend)

Di bahagian frontend ([lib/apiClient.ts](file:///d:/portal-pengurusan-pemeriksaan-aset-alih-poliku/lib/apiClient.ts)), klien Hono RPC diimport dengan jenis `AppType`:

```typescript
import { apiClient, backendApi } from '@/lib/apiClient';

// Panggilan jenis-selamat (Type-safe RPC) dengan auto-complete penuh:
const response = await apiClient.api.locations.$get({ query: { dept: 'JTMK' } });
const { data } = await response.json();

// Tambah lokasi dengan koordinat GPS ke Cloudflare D1:
await apiClient.api.locations.$post({
  json: {
    kodRuang: 'MAK-JTMK-03',
    nama: 'Makmal AI & Edge Computing',
    jabatan: 'JTMK',
    penjaga: 'En. Wilson Intai',
    latitude: 1.621810,
    longitude: 110.324100
  }
});
```

---

## 🚢 Penerbitan ke Cloudflare Production

Sumber Cloudflare (D1, KV, R2) telah dicipta di bawah akaun **wilson@poliku.edu.my** dan ID-nya sudah dikonfigurasikan dalam `backend/wrangler.jsonc`.

```bash
npm run worker:deploy   # bersamaan `npm run deploy:backend` (versioned)
```

Setiap deploy menaikkan nombor binaan dalam `version.json` dan menandakan versi Cloudflare sebagai `v<versi>-build.<N>`. Untuk deploy penuh (backend + frontend), gunakan `npm run deploy` daripada root projek.
