# Portal Pengurusan & Pemeriksaan Aset Alih Politeknik Kuching Sarawak (POLIKU)

Sistem pengurusan dan audit fizikal aset alih kerajaan (KEW.PA) berpandukan Pekeliling Perbendaharaan Malaysia (Tatacara Pengurusan Aset Alih Kerajaan).

## Seni Bina Sistem (Architecture)

- **Frontend**: React 19 (Vite SPA) dengan Tailwind CSS, Leaflet & OpenStreetMap, Lucide Icons
- **Backend Framework**: [Hono](https://hono.dev) + End-to-end type safety Hono RPC
- **Database**: Cloudflare D1 (Serverless SQLite, schema normalized to **3NF**)
- **State & Session Cache**: Cloudflare KV (`KV`)
- **Document & Media Storage**: Cloudflare R2 (`R2_BUCKET`)
- **AI Engine (100% Cloudflare Workers AI)**:
  - Document OCR / Multimodal: `@cf/meta/llama-3.2-11b-vision-instruct`
  - Extraction & Text Parsing: `@cf/meta/llama-3.1-8b-instruct`
  - *Free Tier: 10,000 Neurons / day*

### Penghuraian KEW.PA-7 (`POST /api/kewpa7/extract`)

Saluran paip tiga lapis — AI hanya digunakan apabila perlu:

1. PDF disimpan ke R2 (`kewpa7/…`) dan didaftarkan dalam `kewpa7_documents`.
2. **Teks PDF dibaca secara tempatan dengan pdf.js** ([`unpdf`](https://github.com/unjs/unpdf), berjalan dalam Worker) — percuma, pantas, deterministik. Tiada panggilan AI untuk PDF berteks.
3. **Heuristik regex** ([`backend/src/lib/kewpa7Text.ts`](backend/src/lib/kewpa7Text.ts)) menghurai Bahagian/Lokasi/Kod Lokasi, pegawai bertanggungjawab dan senarai aset.
4. Jika pdf.js gagal atau PDF tiada lapisan teks (imbasan/gambar), teks diambil melalui `AI.toMarkdown()` (Workers AI).
5. Jika heuristik gagal, `@cf/meta/llama-3.1-8b-instruct` menstruktur teks tersebut kepada JSON.
6. Jika semua gagal, respons `422 AI_STRUCTURE_FAILED` / `NO_TEXT` memulangkan `textLength` dan `diagnostic`.

Medan `source` pada respons menunjukkan lapisan yang digunakan, contoh
`pdf.js (tempatan) | Heuristik teks | R2 Storage` atau `Workers AI toMarkdown | @cf/meta/llama-3.1-8b-instruct | R2 Storage`.

**Pegawai Bertanggungjawab** bagi setiap lokasi dipilih daripada **Direktori Pegawai** (julat ikut jabatan, jawatan diisi automatik) dan boleh dibiarkan kosong sehingga lantikan Penyelia Lokasi bagi ruang tersebut ditetapkan dalam Direktori Pegawai. Lokasi tanpa pegawai dipaparkan sebagai *Belum Dilantik*.

### Borang & jadual lokasi (`Direktori Lokasi`)

Kod ruang sebenarnya ialah **kod lokasi KEW.PA-7** penuh (`130101 / BGN / JKM1 / 01 / B09`) dan disimpan sedemikian dalam `locations.kod_ruang` (kunci unik). [`lib/kodLokasi.ts`](lib/kodLokasi.ts) memecahkan segmennya: kod ruang / kategori / **bangunan** / **aras** / bilik.

| Medan | Sumber |
|---|---|
| Kod Lokasi KEW.PA-7 | Teks penuh; menampal kod penuh mengisi Bangunan (`JKM1`) dan Aras (`01` → `Aras 1`) automatik |
| Nama Lokasi | Daripada KEW.PA-7 atau taip manual |
| Bangunan / Blok, Aras / Tingkat | Satu-satunya medan fizikal yang disunting — kategori ruang **tidak** ditanya |
| Pegawai Penjaga | Dropdown **Direktori Pegawai**; jawatan/emel/telefon baca-sahaja. Menyimpan ruang turut mencipta/menyelaraskan lantikan `PENYELIA_LOKASI` (skop `LOCATION`) |
| Bilangan aset | Baca-sahaja — `COUNT(assets)` bagi lokasi |
| Status pemeriksaan | Baca-sahaja — ditetapkan oleh jadual pemeriksaan |

Senarai aset KEW.PA-7 menyimpan **No. Siri Pendaftaran, Keterangan, Status Fizikal** sahaja (tarikh penempatan tidak lagi dikumpul).

### Pegawai Bertanggungjawab daripada KEW.PA-7

`parseKewpa7Officers()` membaca pegawai daripada blok tandatangan borang:

- `(a) Disediakan oleh :` dan `(b) Disahkan oleh :` — dua lajur bersebelahan, jadi **satu baris teks
  boleh mengandungi dua pegawai** (`Nama : X Jawatan : Y Nama : Z Jawatan : W`); kedua-duanya diambil.
- Label nama lain (`Pegawai Bertanggungjawab:`, `Penyelia Lokasi`, `Nama Pegawai`, …) turut disokong.
- Penanda `Tandatangan`, `Nama`, `Jawatan`, `Disahkan/Disediakan` tidak boleh menjadi nama.
- Apabila kedua-dua blok wujud dan dua nama dijumpai, **(b) Disahkan oleh** dianggap Penyelia Lokasi
  dan didahulukan; pengguna boleh memadam nama yang tidak berkaitan sebelum menyimpan.

Medan bahagian borang dipetakan secara berlabel (`Label : nilai`), jadi **`Kod Lokasi` tidak akan mengisi
medan `Lokasi`**. Empat bentuk teks PDF disokong: bertitik tindih (`Lokasi : X`), **tanpa titik bertindih**
(`Lokasi  X`), nilai pada baris berikutnya, dan beberapa medan dimampatkan dalam satu baris.
Jika label `Lokasi` tetap tidak dijumpai, nama ruang diambil daripada baris bukan-label dalam blok kepala
borang (dengan senarai hitam tajuk seperti *Senarai Aset*, *Metadata*, *Page*).

**Diagnostik kegagalan:** bila `bahagian`/`lokasi`/`kodLokasi` kosong, respons memulangkan `missingFields`
dan `textPreview` (800 aksara teks PDF), dan borang memaparkan kotak merah dengan teks itu. Teks penuh
(3000 aksara) disimpan dalam `kewpa7_documents.extracted_json` di bawah kunci `_textSample` untuk siasatan.
Struktur `AI.toMarkdown()` ialah `# nama.pdf` → `## Metadata` → `## Contents` → `### Page 1` → kandungan;
baris metadata (`- PDFFormatVersion=…`) ditapis sebelum penghuraian.

| Medan KEW.PA-7 | Medan borang |
|---|---|
| `Bahagian :` | Bahagian (Jabatan / Unit) |
| `Lokasi :` | Lokasi |
| `Kod Lokasi :` | Kod Lokasi KEW.PA-7 |

Di borang muat naik:

| Keadaan | Tingkah laku |
|---|---|
| Nama ada dalam Direktori Pegawai | Dipadankan automatik (id, jawatan, emel, telefon) |
| Nama tiada dalam direktori | Ditanda **`NEW:<nama>`** — dipaparkan sebagai *"akan didaftarkan sebagai pengguna"* |
| Menyimpan borang | Pegawai `NEW:` **didaftarkan automatik** (`POST /api/officers`) dengan nama pengguna & kata laluan sementara, kemudian dijadikan Penyelia Lokasi ruang itu |
| Selepas simpan | Kredensial dipaparkan **sekali sahaja** dalam panel pengesahan sebelum modal ditutup |

Pendaftaran menggunakan jabatan yang dipilih dalam borang (`Jabatan Carta Organisasi`) dan jawatan
yang diekstrak (contoh `PPAJ` → `PENOLONG_PEGAWAI_ASET`); jawatan tidak dikenali jatuh kepada
`Pensyarah / Pegawai Akademik`.

Jadual direktori memaparkan **Kod Lokasi**, Nama & Bangunan/Aras, Jabatan, **Penyelia Lokasi**, **Bil. Aset**, Status dan Tindakan. Lajur Kategori Ruang dibuang (penapis kategori dikekalkan) kerana kategori sudah terwakili oleh kod lokasi.

**Butang KEW.PA-7 pada baris** = muat turun **CSV** senarai aset ruang itu (bukan PDF):
`Bil, No. Siri Pendaftaran, Keterangan Aset` — tiga lajur sahaja, mencukupi untuk **Daftar Pemeriksaan**
dalam Sistem Pengurusan Aset Alih. Sumber
`GET /api/locations/:id/assets`; pembina CSV di [`lib/assetCsv.ts`](lib/assetCsv.ts) (BOM UTF-8 supaya Excel
membaca aksara dengan betul). Mengemas kini ruang dibuat melalui butang pensel
(**Kemaskini Maklumat Lokasi** → muat naik KEW.PA-7), yang turut menyimpan semula senarai aset.

**Bilangan aset** menjadi nyata kerana senarai aset KEW.PA-7 disimpan ke jadual `assets` melalui `PUT /api/locations/:id/assets` setiap kali borang KEW.PA-7 disimpan.

**Pegawai dilantik** disegerakkan **dua hala** dengan Direktori Pegawai — pilih yang mana-mana dahulu, kedua-duanya akan konsisten:

| Tindakan | Kesan |
|---|---|
| Daftar/kemaskini lokasi → pilih Pegawai Penjaga | Lantikan `PENYELIA_LOKASI` (skop `LOCATION`) dicipta; penjaga lama yang diganti **ditamatkan** (`[Diganti]`) |
| Tambah lantikan `PENYELIA_LOKASI` di Peranan & Lantikan | `v_locations_full` memaparkan pegawai itu sebagai **Pegawai Penjaga Ruang** |
| Tukar penjaga berulang kali | Idempoten — tiada lantikan bertindih |
| Padam lokasi | Lantikan ruang itu **ditamatkan** (`[Lokasi dipadam]`), sejarah kekal |

Selepas setiap mutasi (lantikan, lokasi, muat naik KEW.PA-7) aplikasi memuat semula direktori pegawai **dan** lokasi (`reloadFromD1`), jadi kedua-dua skrin tidak boleh menunjukkan keadaan lapuk.

### Satu sumber kebenaran untuk peranan

`role_assignments` ialah satu-satunya sumber kebenaran. Lajur `officers.peranan` hanyalah pilihan manual
dan **tidak boleh** memaparkan peranan yang tiada lantikan aktif:

- `resolveDisplayRole(roles, preferred)` — label dipaparkan hanya jika lantikan aktif menyokongnya;
  jika tidak, `derivePrimaryRole()` memilih mengikut keutamaan tetap
  (`PENTADBIR_SISTEM` → `KETUA_JABATAN` → … → `PEMERIKSA`). Diuji dalam
  [`backend/src/lib/roles.test.ts`](backend/src/lib/roles.test.ts).
- Dipakai pada `GET /api/officers` dan profil sesi (`/api/auth/login`, `/api/auth/me`), jadi label lapuk
  (cth. *Penyelia Lokasi* bagi ruang yang telah dipadam) tidak boleh muncul semula.
- `GET /api/officers` sentiasa dimuat semula apabila borang dibuka (tiada cache modul), supaya perubahan
  lantikan tidak meninggalkan label lama pada dropdown.
- Lantikan skop `LOCATION` ditolak `400 UNKNOWN_LOCATION` jika ruang tidak wujud; borang lantikan
  memaparkan amaran apabila belum ada lokasi berdaftar.

### Peranan & skop jabatan

| Tindakan | Pentadbir Sistem | KJ/KU, PPAJ/PPAU | Penyelia Lokasi |
|---|---|---|---|
| Daftar lokasi baharu | Semua jabatan | Jabatan sendiri sahaja | Tidak (`403 DEPARTMENT_FORBIDDEN`) |
| Kemaskini lokasi (termasuk penjaga & aset KEW.PA-7) | Semua jabatan | Jabatan sendiri sahaja | **Ruang yang diselia sahaja** |
| Padam lokasi | Ya | Tidak | Tidak |
| Daftar pegawai baharu (akaun + kredensial) | Ya | Tidak (`403`) | Tidak (`403`) |
| Daftar pegawai ke direktori sahaja (tanpa akaun) | Ya | **Jabatan sendiri sahaja** (`POST /api/officers/directory`) | Tidak |
| Lantikan (Peranan & Lantikan) | Ya | Tidak | Tidak |

Skop ditentukan oleh lantikan aktif `role_assignments` melalui
[`backend/src/lib/permissions.ts`](backend/src/lib/permissions.ts) dan disemak di pelayan, bukan hanya di UI:
lantikan skop `DEPARTMENT` memberi `departmentIds`, lantikan `PENYELIA_LOKASI` skop `LOCATION` memberi
`locationIds`. Menyimpan lokasi sedia ada memerlukan **salah satu** skop tersebut; mendaftar lokasi baharu
memerlukan skop jabatan. Padam lokasi dikunci kepada `scope.isAdmin`.

UI menyembunyikan tindakan yang tidak dibenarkan menggunakan
[`lib/manageScope.ts`](lib/manageScope.ts) (logik sama, sisi pelanggan): butang **Daftar Lokasi Baru**
dinyahdayakan tanpa skop jabatan, ikon pensel hanya muncul bagi ruang yang boleh dikemaskini oleh pengguna,
dan ikon tong sampah hanya untuk Pentadbir Sistem.

Bila PPAJ/PPAU menyimpan KEW.PA-7, nama pegawai yang tiada dalam direktori didaftarkan **tanpa akaun**;
Pentadbir Sistem menjana kata laluan kemudian.

### Muat naik semula = timpa data ruang (upsert ikut kod lokasi)

PPAJ/PPAU mengemas kini ruang dengan memuat naik KEW.PA-7 baharu. `POST /api/locations` melakukan
**upsert** berdasarkan `kod_ruang` (dinormalkan: huruf besar, ruang diabaikan):

| Keadaan | Tingkah laku |
|---|---|
| Kod belum wujud | Cipta ruang baharu |
| Kod sudah wujud | **Kemaskini** ruang itu — `id` dikekalkan, nama/bangunan/aras/jabatan **ditimpa** |
| Senarai aset | **Diganti sepenuhnya** (`PUT /api/locations/:id/assets`, padam + tulis semula) |
| Penyelia | Diselaraskan: yang tiada dalam PDF baharu **ditamatkan** (`[Diganti]`), bukan dipadam |
| Dokumen KEW.PA-7 | Setiap muat naik disimpan sebagai versi; `PUT /api/kewpa7/documents/link` memautkannya kepada lokasi |

Borang memaparkan banner **"Ruang ini sudah wujud … data aset & penyelia akan ditimpa"** apabila kod
sepadan (respons `extract` memulangkan `matchedLocation`), dan butang simpan bertukar kepada
**Kemaskini Ruang (Timpa Data Lama)**.

Jadual Pemeriksaan tidak lagi menyimpan penjaga/bilangan aset sendiri: ruang dipilih daripada
Direktori Lokasi dan nilai tersebut dipaparkan baca-sahaja.

## Sumber Data (Tiada Data Contoh)

Sistem ini **tidak mengandungi data contoh/mock**. Semua rekod operasi (pegawai, lokasi, jadual pemeriksaan, aset, log audit, dokumen KEW.PA-7) dibaca dan disimpan melalui API Hono ke Cloudflare D1, dan bermula kosong sehingga pengguna mendaftarkannya melalui UI.

Yang kekal disemai dalam `backend/schema.sql` hanyalah **data rujukan sistem** yang diperlukan untuk integriti rujukan (foreign key):

- `departments` — carta organisasi & pasangan pemeriksaan silang PBAC
- `buildings`, `room_categories`, `inspection_statuses`, `asset_categories` — jadual rujukan 3NF

## Halaman Utama Awam & Log Masuk

Pengguna yang belum mempunyai sesi dibuka dengan halaman utama (`components/LandingPage.tsx`) yang mengandungi hero ringkasan portal, kad **log masuk nama pengguna + kata laluan**, ringkasan ciri, aliran kerja dan rujukan KEW.PA. Selepas log masuk, aplikasi memaparkan shell portal seperti biasa (sidebar + tab).

### Aliran log masuk

1. **Nama pengguna** ialah e-mel rasmi pegawai (`nama.pegawai@poliku.edu.my`) atau bahagian sebelum `@` (`nama.pegawai`).
2. Pengesahan berlaku pada **Worker** (`POST /api/auth/login`), bukan di pelayar. Kata laluan disimpan sebagai hash **PBKDF2-SHA256** bergaram dalam jadual `officer_credentials`; hanya hash dan garam disimpan.
3. Sesi menggunakan **token HS256 bertandatangan** (8 jam) yang dihantar sebagai `Authorization: Bearer <token>`. Token disimpan dalam `localStorage` (`ejas_auth_token`) dan setiap tulisan ke API disahkan oleh middleware `requireAuth` (`backend/src/middleware/auth.ts`).
4. **Tiada pendaftaran sendiri.** `POST /api/auth/register` dan `/activate` memulangkan `403 SELF_REGISTRATION_DISABLED`. Akaun hanya dicipta oleh `PENTADBIR_SISTEM` melalui **Direktori Pegawai → Daftar Pegawai Baru** (`POST /api/officers`, `requireRole('PENTADBIR_SISTEM')`).
5. Semasa pendaftaran, Worker menjana **nama pengguna** daripada nama penuh (`lib/credentials.ts` → `mohd.fadzli`, `mohd.fadzli2`, …) dan **kata laluan sementara 14 aksara** (huruf besar/kecil, digit, simbol; tanpa aksara mengelirukan). Kredensial dipaparkan **sekali sahaja** kepada pentadbir untuk diserahkan kepada pegawai.
6. Kata laluan boleh dijana semula oleh pentadbir melalui **Kad Profil Pegawai → Jana Kata Laluan** (`POST /api/officers/:id/credentials`); kata laluan lama terus tidak sah.
7. **Tukar kata laluan wajib**: pendaftaran/pengesahan semula menetapkan `credential_flags.must_change = 1`. Semasa log masuk, Worker memulangkan `mustChangePassword: true`; UI memaparkan tetingkap **Tukar Kata Laluan Sementara** yang tidak boleh ditutup. Worker turut menyekat semua tulisan API (`403 PASSWORD_CHANGE_REQUIRED`) kecuali `POST /api/auth/password` sehingga kata laluan ditukar.
8. Kata laluan boleh ditukar bila-bila masa melalui **Profil → Tukar Kata Laluan** (`POST /api/auth/password`).
9. Butang **Teruskan sebagai pelawat** membenarkan akses baca-sahaja (`GET` kekal terbuka); sebarang tindakan yang menulis data akan membawa kembali ke halaman log masuk.

### Konfigurasi rahsia token (WAJIB)

Token ditandatangan menggunakan `JWT_SECRET` (minimum 16 aksara). Tanpa rahsia ini Worker memulangkan
`503 AUTH_NOT_CONFIGURED` untuk semua tulisan.

```bash
# Pengeluaran (Cloudflare)
npx wrangler secret put JWT_SECRET --config backend/wrangler.jsonc

# Pembangunan tempatan: buat fail backend/.dev.vars (tidak di-commit)
JWT_SECRET="<32 bait rawak>"
AUTH_ITERATIONS="25000"   # pilihan; lalai 25,000 demi had CPU Workers Free
```

`AUTH_ITERATIONS` boleh dinaikkan (cth. 100000) jika worker menggunakan had CPU yang lebih tinggi.

## PBAC: Peranan & Lantikan (Role Assignments)

Peranan **tidak** disimpan sebagai atribut tetap pengguna. Satu pegawai boleh memegang beberapa
peranan serentak, setiap satu dengan skop dan tempoh sendiri (`role_assignments`).

| Jadual | Kandungan |
|---|---|
| `roles` + `role_category` | Kamus peranan dua dimensi: **JAWATAN** — `KETUA_JABATAN`, `KETUA_PROGRAM`, `PEGAWAI_ASET`, `PENOLONG_PEGAWAI_ASET`, `PENYELIA_LOKASI`, `PENSYARAH`; **LANTIKAN** — `PEMERIKSA` (24 bulan), `PENTADBIR_SISTEM` |
| `role_assignments` | Satu baris per lantikan: `officer_id`, `role_id`, `scope_type` (`GLOBAL`/`DEPARTMENT`/`LOCATION`), `scope_id`, `valid_from`, `valid_to`, `status` |
| `inspection_cycles` | Kitaran pemeriksaan dengan `mode` (`SEHALA` / `TIMBAL_BALIK`) dan `snapshot_at` |
| `inspection_assignments` | Kolam lokasi layak bagi setiap kitaran; `inspector_id` diisi apabila slot dituntut |

### Peraturan lantikan

- **Tempoh (tenure):** `PEMERIKSA` lalai **24 bulan** (`valid_to = valid_from + 24 bulan`); peranan lain
  `NULL` (sehingga ditamatkan).
- **Semakan aktif** menggunakan tarikh rujukan, bukan `now()`:
  `valid_from <= :date AND (valid_to IS NULL OR valid_to >= :date) AND status = 'AKTIF'`.
- **Pembaharuan = baris baharu.** Menamatkan lantikan tidak memadam rekod (`status = 'DITAMATKAN'`),
  jadi sejarah kekal untuk audit.
- **Migrasi automatik:** semasa migrasi, `officers.peranan` disalin ke `role_assignments` dengan id
  deterministik (`RA-MIG-<officer>-<role>`), termasuk Penyelia yang diskop ke ruang daripada `location_custodians`.

### Endpoint

| Laluan | Kebenaran |
|---|---|
| `GET /api/roles` | Awam |
| `GET /api/role-assignments?officerId=\|email=\|roleId=\|status=` | Awam |
| `POST /api/role-assignments` | Perlu token + peranan `PENTADBIR_SISTEM` |
| `PUT /api/role-assignments/:id` (`{"action":"end"}` / `{"action":"renew"}`) | Perlu token + peranan `PENTADBIR_SISTEM` |

> Lantikan baharu bagi pegawai yang didaftarkan melalui UI dicipta secara automatik
> (`assignDefaultRoleForOfficer`). Peranan berskop `LOCATION` bermula dengan skop jabatan sehingga
> pentadbir menetapkan ruang sebenar.

## Pelaksanaan Tugasan Pemeriksaan (PBAC Enforcement)

### Pendaftaran jadual: ruang + siri sahaja (3 sukuan)

PPAJ/PPAU hanya memilih **ruang jabatan sendiri** dan **Siri 1/2/3**. Medan lain diurus oleh pihak lain:

| Perkara | Siapa yang isi | Nota |
|---|---|---|
| Ruang + Siri | PPAJ/PPAU (atau Pentadbir Sistem) | `POST /api/schedules` menerima `{ lokasiId, siri, catatan? }` sahaja |
| Tarikh mula/tamat | **Penyelia Lokasi** ruang itu (atau pentadbir) | Lalai = bulan siri dalam takwim; `PUT /api/schedules/:id` disekat `403 DATE_FORBIDDEN` bagi peranan lain dan `400 OUT_OF_SIRI_WINDOW` jika tarikh keluar julat siri |
| Pegawai pemeriksa | **Pemeriksa sendiri** (self-assign) | Slot `pemeriksa1_id`/`pemeriksa2_id` kekal `NULL` sehingga `POST /api/schedules/:id/claim`. Status jadual bertukar ke **Sedang Dijalankan** hanya apabila **kedua-dua** slot dituntut. |
| KEW.PA-11 | Pemeriksa | Dimuat naik ke **Cloudflare R2** (`POST /api/storage/upload`, `kewpa11_r2_key`); status jadual bertukar ke **Selesai** secara automatik pada pelayan |

**Paparan laporan:** mengisi/mengubah laporan KEW.PA-11 hanya untuk **Pegawai Pemeriksa yang ditugaskan**
(atau Pentadbir Sistem, disemak di Worker melalui `POL_INSPECTION_TASK_ASSIGNMENT`). Pengguna lain yang
menekan butang KEW.PA-11 mendapat paparan **baca-sahaja** — pecahan status A–F, rekod dokumen Ada/Tiada
beserta no. rujukan, cadangan pemeriksa, tarikh hantar, dan pautan **PDF di R2** (jika sudah dimuat naik).
| Kategori aset | Sistem | sentiasa `Semua (Harta Modal & Aset Bernilai Rendah)` |

Paparan senarai jadual turut membantu pemeriksa:

- **GPS lokasi** — koordinat ruang (daripada Direktori Lokasi) dipaparkan di bawah nama penyelia dan
  boleh diklik untuk membuka Google Maps; "GPS belum ditetapkan" jika ruang tiada koordinat.
- **Senarai pegawai bertanggungjawab** — semua pegawai dalam `location_custodians` ruang itu dipaparkan
  bertindan (nama + telefon) selaras Direktori Lokasi; jika tiada custodian, Penyelia Lokasi daripada
  lantikan `PENYELIA_LOKASI` digunakan sebagai sandaran.
- **CSV Aset** di lajur *Kategori & Kuantiti* — memuat turun senarai aset ruang
  (`Bil, No. Siri Pendaftaran, Keterangan Aset`) daripada `GET /api/locations/:id/assets`, supaya
  pemeriksa boleh memilih aset untuk **Daftar Pemeriksaan** tanpa membuka Direktori Lokasi.
- **Cetak Jadual** — membuka **pratonton dalam SPA** (bukan tab baharu) bagi dokumen KEW.PA-10
  (Bil, No. Rujukan, Jabatan & Lokasi, **Siri**, Kategori & Unit, Tarikh Rancangan, Pemeriksa, Status)
  dengan butang **Cetak**; CSS cetakan menyembunyikan chrome modal supaya dokumen tidak terpotong.
  Butang *Cetak Kertas Pembentangan* dalam Kompilasi Pra-JKPAK menggunakan pratonton yang sama.
- **Tugasan Saya** — penapis dengan **dua kiraan berasingan**: *Pemeriksaan* (jadual yang saya menjadi
  Pemeriksa 1/2) dan *Penyeliaan* (jadual bagi ruang yang saya selia). Penyeliaan merangkumi **mana-mana**
  pegawai dalam `location_custodians` ruang itu, bukan hanya penyelia utama. Padanan menggunakan **e-mel**
  (nama hanya sandaran apabila medan e-mel pada jadual kosong). Logik di
  [`lib/tugasanSaya.ts`](lib/tugasanSaya.ts) (diuji); `penjagaSenarai` pada `v_schedules_full` membawa
  `nama||telefon||emel` untuk tujuan ini.

Kekangan yang dikuatkuasakan:

- **Satu ruang = satu jadual per sesi** — indeks unik `(session_id, location_id)`; cubaan kedua
  dipulangkan `409 ALREADY_SCHEDULED` bersama siri/kod sedia ada. UI hanya menyenaraikan ruang yang
  belum dijadualkan.
- **Tarikh mesti dalam siri**: julat siri = sebulan penuh bulan takwim
  (`Tempoh Pemeriksaan Sukuan N` → bulan dalam catatan/tarikh), lalai Mac/Jun/September. Semasa daftar,
  `tarikh_mula`/`tarikh_tamat` diisi dengan julat penuh bulan itu; Penyelia Lokasi boleh
  melaraskannya **dalam julat yang sama sahaja** (`400 OUT_OF_SIRI_WINDOW` jika keluar).
  Logik dikongsi: [`backend/src/lib/takwimSiri.ts`](backend/src/lib/takwimSiri.ts) dan
  [`lib/siriPemeriksaan.ts`](lib/siriPemeriksaan.ts) (kedua-duanya diuji).
- `siri` mesti 1, 2 atau 3 (`400 INVALID_SIRI`); bulan setiap siri dibaca daripada takwim
  (`Tempoh Pemeriksaan Sukuan N`), dengan lalai Mac/Jun/September.
- Borang memaparkan **anggaran sasaran**: bilangan ruang jabatan, ruang siri semasa yang sudah
  dijadualkan, baki ruang dan sasaran akhir **100%**; siri yang paling sedikit ruang dicadangkan
  secara lalai ([`lib/siriPemeriksaan.ts`](lib/siriPemeriksaan.ts)).
- Skop jabatan disemak: PPAJ/KJ hanya untuk ruang jabatannya (`403 DEPARTMENT_FORBIDDEN`).

Migrasi `backend/migrations/2026-10-30-schedule-siri.sql` (dijalankan automatik oleh
`scripts/deploy.mjs` apabila lajur `siri` belum wujud) membina semula jadual dengan
`tarikh_mula`, `tarikh_tamat`, `pemeriksa1_id` dan `pemeriksa2_id` boleh `NULL`.

### Peraturan pelaksanaan

| Tindakan | Syarat (disemak pada Worker) |
|---|---|
| Tuntut slot pemeriksa (`POST /api/schedules/:id/claim`) | Lantikan `PEMERIKSA` aktif hari ini **dan** meliputi tempoh pemeriksaan |
| | Bukan Penyelia Lokasi ruang/jabatan itu, bukan Penolong Pegawai Aset jabatan itu, bukan penjaga ruang (KEW.PA-7) |
| | Mod silang (`enforceCrossInspection`) → jabatan pemeriksa mesti berbeza |
| | Slot belum dipegang pemeriksa bertauliah lain; pegawai belum memegang slot lain |
| Kemas kini laporan / KEW.PA-11 (`PUT /api/schedules/:id`) | Mesti pemeriksa yang ditugaskan bagi jadual itu **dan** lantikan masih aktif || Tukar nama pemeriksa pada jadual | Hanya melalui tuntutan slot atau oleh `PENTADBIR_SISTEM` |

### Jawatan vs Lantikan (dua dimensi)

| Dimensi | Maksud | Kardinaliti | Tempoh | Disimpan di |
|---|---|---|---|---|
| **Jawatan** | Jawatan hakiki mengikut carta organisasi (HR) | 1 pegawai = **1** | Kekal (`valid_to = NULL`) sehingga ditukar | `officers.peranan` + `role_assignments` |
| **Lantikan** | Kuasa bertempoh yang diberi oleh Pengelola | 1 pegawai = **0…n** | Ada `valid_from`/`valid_to` | `role_assignments` |

**Jawatan:** `Ketua Jabatan / Unit (KJ/KU)`, `Ketua Program (KP)`, `Pegawai Aset (PA)`,
`Penolong Pegawai Aset Jabatan/Unit (PPAJ/PPAU)`, `Penyelia Lokasi (PL)`,
`Pensyarah / Pegawai Akademik` (lalai bagi staf akademik tanpa jawatan pentadbiran).

**Lantikan:** `Pegawai Pemeriksa (PP)` — 24 bulan; `Pentadbir Sistem` — global.

Tiga invarian yang menghalang kekeliruan:

1. **Jawatan bukan akses.** Jawatan hanya *input* kepada polisi konflik
   (`ASSET_OFFICER_CONFLICT`, `SUPERVISES_LOCATION`).
2. **Hanya lantikan memberi akses.** Semua gerbang tindakan menyemak `role_assignments`
   yang sah pada tarikh berkenaan — bukan `officers.peranan`.
3. **PP ialah lantikan, bukan jawatan.** `POST /api/officers` menolak `PEMERIKSA` dengan
   `400 APPOINTMENT_REQUIRED`; lantikan dibuat melalui *Peranan & Lantikan*.

### Pegawai berbilang peranan (contoh PPAJ + Penyelia Lokasi + Pemeriksa)

Satu pegawai boleh memegang **lebih daripada satu** peranan serentak. Kesemuanya disimpan sebagai baris
berasingan dalam `role_assignments`; `officers.peranan` hanya menyimpan **jawatan utama** untuk paparan.

| # | Peranan | Kategori | Skop | Tempoh |
|---|---|---|---|---|
| 1 | `PENOLONG_PEGAWAI_ASET` | JAWATAN (utama) | `DEPARTMENT` = JTMK | kekal |
| 2 | `PENYELIA_LOKASI` | JAWATAN | `LOCATION` = MK-01 (satu baris per ruang) | kekal |
| 3 | `PENYELIA_LOKASI` | JAWATAN | `LOCATION` = MK-02 | kekal |
| 4 | `PEMERIKSA` | LANTIKAN | `GLOBAL` | 24 bulan |

Cara menetapkan:

1. **Peranan & Lantikan → Tambah Peranan** — pilih peranan (berkumpulan Jawatan / Lantikan), skop
   (`DEPARTMENT` atau `LOCATION`), dan tempoh. Untuk peranan jawatan, tandakan
   *"Jadikan jawatan utama"* supaya `officers.peranan` diselaraskan.
2. **Direktori Pegawai** — lajur jawatan memaparkan lencana `+ N` bagi peranan tambahan
   (contoh `+ PL MK-01`, `+ PP`); kad profil menyenaraikan semua peranan dengan skop & tarikh luput.
3. **Jadikan Utama** — butang pada kad profil (atau `PUT /api/officers/:id/primary-role`) menukar
   jawatan utama; ia memerlukan lantikan aktif bagi peranan itu (`409 ASSIGNMENT_REQUIRED`).

Kesan kepada pemeriksaan (dikira oleh `lib/conflicts.ts`, merentas **semua** peranan aktif):

- PPAJ bagi JTMK → `ASSET_OFFICER_CONFLICT` untuk semua ruang JTMK.
- Penyelia Lokasi MK-01/MK-02 → `SUPERVISOR_CONFLICT` untuk ruang tersebut sahaja.
- Penjaga ruang KEW.PA-7 → `CUSTODIAN_CONFLICT`.
- Ruang jabatan pasangan yang tidak diselia → dibenarkan.
Contoh gabungan: `Pensyarah + PP` → boleh memeriksa; `PPAJ/PPAU + PP` → boleh memeriksa tetapi
tersekat pada jabatan sendiri; `Penyelia Lokasi + PP` → tersekat pada lokasi sendiri;
`Ketua Jabatan` tanpa PP → tidak memeriksa tetapi boleh mengesahkan laporan.

### Tarikh luput lantikan

- Lantikan `PEMERIKSA` lalai **24 bulan**. Selepas tamat, tuntutan slot dan penghantaran laporan
  ditolak dengan mesej yang menyatakan tarikh tamat, cth.
  `Lantikan Pegawai Pemeriksa anda telah tamat pada 2028-10-29. Sila mohon pembaharuan lantikan…`
- Pembaharuan dibuat oleh pentadbir melalui `PUT /api/role-assignments/:id` (`{"action":"renew"}`) —
  baris baharu dicipta, baris lama ditutup (sejarah kekal).
- `GET /api/auth/me` memulangkan `appointment` (`validTo`, `daysRemaining`, `activeToday`) untuk
  amaran awal dalam UI (modal tuntutan memaparkan baki hari dan menyahdayakan butang jika tamat).

### Kod penolakan

`NO_APPOINTMENT`, `APPOINTMENT_EXPIRED`, `PERIOD_NOT_COVERED`, `SUPERVISOR_CONFLICT`,
`ASSET_OFFICER_CONFLICT`, `CUSTODIAN_CONFLICT`, `CROSS_DEPARTMENT_REQUIRED`, `SLOT_TAKEN`,
`ALREADY_ASSIGNED` — dipulangkan dalam `codes[]` bersama `reasons[]`, dan direkodkan ke
`pbac_audit_logs` (PERMIT/DENY + `actedAsRole` + `reason`).

## Skrin Pentadbir: Direktori Pegawai (termasuk Peranan & Lantikan)

**Semua pengurusan pengguna dan lantikan berada dalam satu skrin: *Direktori Pegawai***, dengan

dua sub-tab — *Jadual Direktori Pegawai (CRUD)* dan *Peranan & Lantikan*.

Matriks gandingan silang (⇄) kini berada di **Kitaran Pemeriksaan → Mod Pemeriksaan (⇄)**
(`components/CrossPairMatrix.tsx`), dibaca daripada `departments.crossPartnerId` — bukan senarai
berkod keras. Kitaran Pemeriksaan mempunyai dua sub-tab: *Kitaran & Pelan* (operasi kitaran) dan
*Mod Pemeriksaan (⇄)* (rujukan gandingan jabatan).

Sub-tab **Peranan & Lantikan** (`components/PerananLantikanSection.tsx`) memaparkan semua lantikan
(pegawai, peranan, skop, tempoh, baki hari, status) dengan penapis carian/peranan/status.

- Warna status: **AKTIF** (hijau), **LUPUT** (kuning — lantikan melepasi `valid_to` tetapi belum
  ditamatkan), **DITAMATKAN** (merah).
- **Tambah Lantikan** (`components/modals/AppointmentModal.tsx`): pilih pegawai → peranan → skop
  (mengikut `scope_type` peranan: Global/Jabatan/Lokasi) → tarikh mula/tamat. Kosongkan tarikh tamat
  untuk menggunakan tempoh lalai (24 bulan bagi `PEMERIKSA`).
- **Perbaharui** mencipta baris baharu dan menutup baris lama; **Tamatkan** mengekalkan rekod sejarah.
- Butang pengurusan hanya dipaparkan kepada pemegang `PENTADBIR_SISTEM`; Worker tetap menolak (403)
  sebarang cubaan daripada peranan lain.

## Kitaran Pemeriksaan (Cycles)

Tab **Kitaran Pemeriksaan** (`components/KitaranSection.tsx`) mengurus kitaran dan kolam penugasan.

| Jadual | Kegunaan |
|---|---|
| `inspection_cycles` | Kitaran per sesi: `mode` (`SEHALA`/`TIMBAL_BALIK`), tempoh, status (`DRAF`/`AKTIF`/`SELESAI`), `snapshot_at` |
| `inspection_assignments` | Kolam: satu baris per `(cycle, location, slot)`; `inspector_id` diisi apabila dituntut |
| `inspection_cycle_snapshots` | Payload JSON pasangan timbal balik yang dikunci semasa kitaran dimulakan |
| `inspection_reassignments` | Jejak penugasan semula eksplisit (pegawai asal → baharu, sebab) |

### Aliran kerja

1. **Cipta kitaran** — kod, mod, tarikh mula/tamat (status `DRAF`).
2. **Jana Kolam** — 2 slot (P1/P2) bagi setiap jadual yang bertindih dengan tempoh kitaran. Satu pasangan
   slot per lokasi: dua jadual bagi ruang yang sama dalam kitaran yang sama berkongsi slot (indeks unik
   `ux_assign_slot`).
3. **Tuntutan** — pegawai bertauliah menuntut slot melalui butang *Tuntut Lokasi* di bar atas; kejayaan menyegerakkan
   `inspector_id`, `status = DITUNTUT`, `claimed_at`, `schedule_id` ke kolam kitaran aktif.
4. **Mulakan** — mengunci snapshot (termasuk pasangan timbal balik bagi mod `TIMBAL_BALIK`).
5. **Tugas Semula** — pentadbir memilih pegawai layak + sebab; rekod disimpan ke
   `inspection_reassignments` dan jejak audit (`cycle:reassign`). Jika pegawai tidak layak, respons
   memulangkan `codes[]` dan kitaran menandakan flag kritikal (tiada perubahan senyap).
6. **Tutup** — status `SELESAI`; penjanaan dan penugasan semula disekat.

### Flag automatik

`evaluateCycleFlags` menyemak setiap slot yang dituntut dengan peraturan sama seperti tuntutan slot:

- `NOT_CLAIMED` (info) — slot belum dituntut
- `APPOINTMENT_EXPIRED` / `NO_APPOINTMENT` (critical) — lantikan tamat atau tiada
- `SUPERVISOR_CONFLICT`, `ASSET_OFFICER_CONFLICT`, `CUSTODIAN_CONFLICT`, `CROSS_DEPARTMENT_REQUIRED` (warning)

### Idempotensi migrasi

Backfill `officers.peranan → role_assignments`:

- melangkau pegawai yang sudah mempunyai lantikan **AKTIF** bagi peranan yang sama (tiada pendua walaupun
  migrasi dijalankan berulang kali);
- mengecualikan pegawai pemegang tempat beremel auto (`peg-…@poliku.edu.my`) dan menutup lantikan
  sedia ada milik pegawai tersebut.

### Status fizikal aset A–F (KEW.PA-11)

| Kod | Status | Rekod sokongan bila > 0 |
|---|---|---|
| A | Sedang Digunakan | **Dikira automatik** = `kuantiti aset ruang − (B+C+D+E+F)`; medan baca-sahaja |
| B | Tidak Digunakan | Cip sebab piawai (tiada dalam silibus, aset lapuk, melebihi keperluan, ralat perolehan, tidak ekonomik dibaiki) - tiada dokumen |
| C | Perlu Pembaikan | Toggle **Ada / Tiada laporan kerosakan** (+ no. rujukan jika ada) |
| D | Sedang Diselenggara | Toggle **Ada / Tiada LPO / pesanan kerja** (+ no. rujukan) |
| E | Pinjaman | Toggle **Ada / Tiada borang pinjaman** (+ no. rujukan) |
| F | Hilang | Toggle **Ada / Tiada laporan polis** (+ no. rujukan) |

Bilangan A sentiasa diselaraskan: klien mengira semula pada setiap perubahan dan Worker mengira semula
daripada `COUNT(assets)` ruang itu sebelum menyimpan (`pecahan.A` yang dihantar pelanggan diabaikan).
Pecahan penuh disimpan sebagai JSON dalam `inspection_reports.pecahan_status` / `justifikasi_status`
(migrasi `backend/migrations/2026-10-30-kewpa11-pecahan.sql`), manakala lajur warisan untuk kompilasi
Pra-JKPAK dipetakan: `baik = A + E`, `rosak = C + D`, `usang = B`, `hilang = F`.

## Pemisahan Tugas & Notifikasi Luput

### Pengesahan dapatan (separation of duties)

`POST /api/schedules/:id/verify` mengesahkan dapatan pemeriksaan dan menyimpan `disahkan_oleh_id` +
`tarikh_pengesahan`. `evaluateVerification` (`backend/src/lib/verification.ts`) menolak pengesahan jika:

| Kod | Maksud |
|---|---|
| `NOT_VERIFIER_APPOINTED` | Tiada lantikan aktif `KETUA_JABATAN`, `PENTADBIR_SISTEM` atau `PEMERIKSA` |
| `SELF_VERIFICATION` | Pegawai ialah Pemeriksa 1/2 bagi jadual itu |
| `SUPERVISES_LOCATION` | Penyelia Lokasi bagi ruang/jabatan tersebut |
| `ASSET_OFFICER_SAME_DEPT` | Penolong Pegawai Aset jabatan pemilik aset |
| `CUSTODIAN_OF_LOCATION` | Penjaga ruang (KEW.PA-7) |
| `NOT_COMPLETED` | Jadual belum berstatus *Selesai* |

Penolakan direkod sebagai `DENY` dalam jejak audit dengan `POL_SEPARATION_OF_DUTIES` dan kod sebabnya.

### Notifikasi luput lantikan

| Komponen | Peranan |
|---|---|
| `tenure_notices` | Notifikasi `LUPUT_60_HARI` / `TAMAT`; unik pada `(assignment_id, jenis)` supaya tidak berulang |
| Cron Trigger `0 1 * * *` | Handler `scheduled` dalam `backend/src/index.ts` menjalankan `scanTenureNotices` setiap hari (01:00 UTC) |
| `POST /api/notices/scan` | Imbasan manual oleh pentadbir (butang *Imbas Semula (60 hari)*) |
| `GET /api/notices?scope=all` | Pegawai melihat notifikasi sendiri; `scope=all` hanya untuk `PENTADBIR_SISTEM` |
| `POST /api/notices/:id/read` | Tanda dibaca (hanya notifikasi sendiri, atau pentadbir) |

Skrin **Peranan & Lantikan** memaparkan sepanduk notifikasi belum dibaca dengan butang imbasan semula dan
tanda dibaca.

## Penjana Mod Pemeriksaan (Pairing Unit + Agihan LPT)

Mod pemeriksaan **dikira per pasangan unit**, bukan ditetapkan untuk seluruh kitaran. `inspection_cycles.mode`
kekal sebagai nilai lalai/fallback. Logik tulen berada dalam
[backend/src/lib/pairing.ts](backend/src/lib/pairing.ts) (tiada I/O, tiada `Date.now()`, tiada rawak) dengan
23 ujian unit dalam `pairing.test.ts`.

### Formula

1. **Kumpulan** — `G_u = floor(P_u / 2)`; unit ganjil mengikut polisi `SIMPANAN` (ahli simpanan) atau `TIGA`.
   Unit dengan `G_u = 0` terus ke sehala.
2. **Ujian keseimbangan** — `W(u→v) = A_v / G_u`, lulus jika kedua-dua arah `≤ Q × 1.25` **dan**
   `|W(u→v) − W(v→u)| / max(W) ≤ τ`.
3. **Pasangan** — unit disusun mengikut aset menurun, jiran bersebelahan (1-2, 3-4, …); unit baki jatuh sehala.
4. **Agihan LPT** — lokasi terbesar dahulu kepada kumpulan layak dengan beban terendah; lokasi melebihi
   `1.5 × Q` dipecah antara beberapa kumpulan. Konflik disemak **peringkat kumpulan** (semua ahli mesti bebas:
   penyelia lokasi/jabatan, PPA jabatan, penjaga ruang).
5. **Sehala** — pool semua kumpulan tanpa pasangan; kumpulan dari unit lain diutamakan apabila beban sama.

### Endpoint

| Laluan | Kegunaan |
|---|---|
| `GET /api/cycles/:id/params` · `PUT` | Baca/kemas kini `Q`, `τ`, `1.25`, `1.5`, polisi unit ganjil (audit `cycle:params`) |
| `GET /api/cycles/:id/plan` | Pratonton penuh — **tiada penulisan**: unit, kumpulan, keputusan `W`, agihan, liputan, senarai tidak teragih, cadangan `Q` |
| `POST /api/cycles/:id/lock` | Kunci pelan berversi: `inspector_groups`, `group_members`, `unit_pairings`, `group_targets`, jadual + slot `DITETAPKAN`, snapshot. Gagal → gulung balik penuh |

### Jadual

`cycle_parameters`, `cycle_unit_stats`, `inspector_groups`, `group_members`, `unit_pairings`, `group_targets`
(semua `IF NOT EXISTS`; parameter disimpan per kitaran supaya admin boleh melaras tanpa ubah kod).

### Peraturan tambahan

- **Slot ditetapkan kumpulan tidak boleh dituntut**: `POST /api/schedules/:id/claim` memulangkan
  `409 SLOT_RESERVED_BY_GROUP` jika slot itu milik kumpulan lain (semakan merentas semua kitaran
  `DRAF`/`AKTIF` yang meliputi tarikh jadual).
- **Kitaran bertindih disekat** (`409 CYCLE_OVERLAP`) kerana ia menjadikan penugasan slot kabur.
- **Kunci semula** menaikkan `plan_version` dan **mengekalkan** lokasi yang jadualnya sudah `Selesai`
  (`preservedTargets`), selaras dengan keperluan jana semula separa.
- Jika `assets` kosong bagi sesuatu unit, `A_u` jatuh kepada jumlah `inspection_schedules` bagi unit itu.

### Ujian

`npm test` — 23 kes: keseimbangan, beban berlebihan, ketidakseimbangan, unit ganjil (SIMPANAN/TIGA),
`G=0`, pemecahan lokasi besar, agihan LPT seimbang, dan determinisme (dua larian dengan susunan input
berbeza menghasilkan output identik).

## Pengurusan Jabatan / Unit (Direktori Organisasi)
Direktori jabatan mengikut carta organisasi Politeknik. Hanya pemegang `PENTADBIR_SISTEM` boleh mengubahnya;
`GET /api/departments` kekal terbuka untuk pelawat.

| Laluan | Kebenaran | Nota |
|---|---|---|
| `GET /api/departments` | Awam | Senarai + `totalLokasi` + `totalAset` (jumlah aset KEW.PA-7 semua ruang jabatan) |
| `GET /api/departments/:id/usage` | `PENTADBIR_SISTEM` | Kiraan rujukan (pegawai, lokasi, aset, jadual, statistik kitaran, rekod audit) + `canDelete` — digunakan UI sebelum amaran padam |
| `POST /api/departments` | `PENTADBIR_SISTEM` | Kod jabatan (2–16 aksara, huruf besar/nombor/sengkang), nama, pasangan silang, KJ, PPA |
| `PUT /api/departments/:id` | `PENTADBIR_SISTEM` | Kod **tidak boleh diubah** (kunci rujukan); nama/pasangan/KJ/PPA boleh |
| `DELETE /api/departments/:id` | `PENTADBIR_SISTEM` | Disekat `409 IN_USE` jika masih dirujuk (pegawai, lokasi, jadual, statistik kitaran, rekod audit) |

**Kesan padam vs edit jabatan** (tiada `CASCADE` ke pegawai/lokasi/jadual):

| Tindakan | Kesan kepada pegawai / lokasi / jadual |
|---|---|
| **Padam** (semua rujukan = 0) | Pasangan silang jabatan lain dilepaskan (`cross_partner_id = NULL`), kemudian baris `departments` dipadam. Tiada rekod lain disentuh kerana ia sudah tiada rujukan. |
| **Padam** (ada rujukan) | Ditolak `409` — mesej menyenaraikan kiraan. UI menyemak `GET /:id/usage` dahulu dan memaparkan amaran penuh. Tiada data berubah. |
| **Edit nama** | Hanya paparan. `department_id` pada pegawai/lokasi/jadual tidak berubah → semua kekal terikat. |
| **Edit kod** | Tidak dibenarkan — kod ialah kunci rujukan (FK) bagi pegawai, lokasi, jadual, statistik kitaran dan audit. |
| **Edit pasangan silang** | Mempengaruhi penjanaan kitaran/pasangan pemeriksaan silang **akan datang**; jadual sedia ada kekal. |
| **Edit KJ / PPAJ** | Hanya nilai sandaran paparan — lantikan aktif dalam `role_assignments` mengatasinya. |

Peraturan:

- **Pasangan silang** mesti jabatan sedia ada dan bukan jabatan sendiri. Jika jabatan pasangan belum
  mempunyai pasangan, ia diisi automatik (gandingan dua hala).
- **Unit `SISTEM`** ialah unit bukan operasi (`department_settings.is_operational = 0`) untuk akaun pentadbir:
  ia tidak muncul dalam pilihan pasangan silang, dikecualikan daripada penjanaan kitaran/pasangan, tidak
  boleh dipadam, dan **disembunyikan daripada Direktori Jabatan** (API masih memulangkannya dengan
  `isOperational: 0` untuk tujuan pentadbiran). `PENTADBIRAN` kekal sebagai unit operasi sebenar (pemilik aset).
- **Pendaftaran pegawai disahkan di Worker** (`lib/departments.ts`): peranan `Pentadbir Sistem` sentiasa
  diletakkan dalam unit `SISTEM` walaupun klien menghantar jabatan lain, dan unit bukan operasi menolak
  pendaftaran pegawai operasi (`400 NON_OPERATIONAL_UNIT`).
- **Pemadaman** melepaskan `cross_partner_id` jabatan lain terlebih dahulu; jika masih dirujuk, operasi
  dibatalkan dan senarai penyekat dipulangkan dalam mesej.
- **Jejak audit** bagi create/update/delete direkod di bawah jabatan *pelaku* (`resourceId` = jabatan sasaran),
  supaya jabatan baharu boleh dipadam semula jika tersilap cipta tanpa melanggar FK audit.
- **Benih jabatan adalah bootstrap sahaja**: `schema.sql` hanya mengisi 11 jabatan rujukan apabila jadual
  `departments` kosong. Selepas direktori diuruskan pentadbir, deploy berikutnya **tidak** menambah semula
  baris yang telah dipadam.
- UI: butang **Tambah Jabatan**, **Edit** dan **Padam** pada tab *Direktori Jabatan* hanya kelihatan kepada
  pentadbir (`components/DirektoriJabatanSection.tsx`, borang dalam `components/modals/DepartmentModal.tsx`).

## Mengosongkan Data Ujian (Sebelum Go-Live)

Sebelum memasukkan data sebenar, buang data operasi ujian sambil mengekalkan akaun pentadbir dan jadual
rujukan. **Buat sandaran dahulu** — operasi ini tidak boleh dibatalkan:

```bash
# 1. Sandaran penuh D1 (fail SQL tempatan)
npx wrangler d1 export poliku-aset-d1 --remote --config backend/wrangler.jsonc --output backup-d1.sql

# 2. Padam data operasi (contoh: ikut turutan FK)
npx wrangler d1 execute poliku-aset-d1 --remote --config backend/wrangler.jsonc --file=backend/cleanup.sql
```

Turutan padam yang selamat:

1. `tenure_notices` → `inspection_reassignments` → `inspection_cycle_snapshots`
2. `group_targets` → `group_members` → `inspector_groups` → `unit_pairings` → `cycle_unit_stats` → `cycle_parameters`
3. `inspection_assignments` → `inspection_cycles`
4. `inspection_reports` → `inspection_schedules` → `inspection_sessions`
5. `location_custodians` → `assets` → `kewpa7_documents` → `locations`
6. `pbac_audit_logs` → `officer_credentials` → `role_assignments` → `officers` (kecuali superadmin)
7. `UPDATE departments SET cross_partner_id = NULL` → `DELETE FROM departments WHERE id <> 'PENTADBIRAN'`

**Kekalkan:**
- `departments` baris `PENTADBIRAN` — akaun `superadmin` merujuknya (FK); jabatan lain boleh ditambah semula.
- Jadual rujukan: `roles`, `buildings`, `room_categories`, `inspection_statuses`, `asset_categories`.
- Akaun permit: pegawai `superadmin@poliku.edu.my` + lantikan `PENTADBIR_SISTEM`.

> Selepas pembersihan, `npm run d1:migrate:local` / `--remote` boleh dijalankan semula bila-bila masa —
> skema adalah idempotent dan hanya akan menyemai semula jadual rujukan, bukan data operasi.











## Menjalankan Sistem Secara Tempatan (Local Development)

### 1. Pemasangan Pakej
```bash
npm install
```

### 2. Konfigurasi Fail `.env.local`
Salin fail `.env.example` ke `.env.local` dan masukkan kredensial Cloudflare jika ingin menggunakan Workers AI secara terus:
```bash
CLOUDFLARE_ACCOUNT_ID="your_cloudflare_account_id"
CLOUDFLARE_API_TOKEN="your_cloudflare_api_token"
VITE_API_URL="http://localhost:8787"
```

### 3. Jalankan Pengkalan Data Tempatan D1 (3NF Schema Migration)
```bash
npm run d1:migrate:local
```

### 4. Jalankan Pelayan Cloudflare Worker (Hono Backend)
```bash
npm run worker:dev
```

### 5. Jalankan Frontend
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di pelayar anda.

### 6. Bina untuk Pengeluaran (Production Build)
```bash
npm run build
npm run preview
```
Hasil binaan statik dijana di dalam folder `dist/`, manakala `npm run preview` menyediakan semakan tempatan.

> Laluan API tempatan (`/api/schedules`, `/api/kewpa7/extract`) disediakan oleh middleware pelayan Vite semasa `npm run dev` dan `npm run preview`. Untuk pengeluaran, gunakan backend Hono Cloudflare Worker melalui `VITE_API_URL`.

## Penerbitan ke Cloudflare (Versioned Deploy)

Setiap penerbitan menaikkan nombor binaan secara automatik dan ditandakan sebagai *version* Cloudflare, supaya setiap deploy boleh dikenal pasti dan dipulihkan.

| Perkara | Nilai |
|---|---|
| Akaun Cloudflare | `wilson@poliku.edu.my` |
| Frontend (Workers Static Assets) | https://portal-aset-poliku.wilson-b6f.workers.dev |
| Backend (Hono Worker) | https://portal-aset-poliku-backend.wilson-b6f.workers.dev |
| D1 | `poliku-aset-d1` |
| KV | `poliku-settings-kv` |
| R2 | `poliku-aset-documents` |

### Arahan
```bash
npm run deploy           # migrasi D1 + deploy backend + build & deploy frontend
npm run deploy:backend   # migrasi D1 + deploy backend sahaja
npm run deploy:frontend  # build & deploy frontend sahaja
```
Flag tambahan: `node scripts/deploy.mjs --skip-migrate` untuk melangkau migrasi skema.

### Takwim Perancangan Tahunan (Tetapan)

`annual_calendar` menyimpan **banyak tarikh bagi satu sesi** — menggantikan medan tunggal
*"Tarikh Sasaran Mesyuarat Pra-JKPAK Bil. 1/{tahun}"*:

| Laluan | Kebenaran | Nota |
|---|---|---|
| `GET /api/calendar?tahun=2026` | Awam | Senarai perkara takwim bagi tahun tersebut, tersusun mengikut tarikh |
| `POST /api/calendar` | `PENTADBIR_SISTEM` | `{ tahun, tarikh, tajuk, kategori, catatan }` |
| `PUT /api/calendar/:id` | `PENTADBIR_SISTEM` | Kemas kini mana-mana medan |
| `DELETE /api/calendar/:id` | `PENTADBIR_SISTEM` | Padam perkara |

Kategori: `MESYUARAT_PRA_JKPAK`, `MESYUARAT_JKPAK`, `PEMERIKSAAN`, `LAIN`. Lencana **Seterusnya** mengambil
kedua-dua kategori mesyuarat.

Setiap baris mempunyai dua tindakan: **pensel** (kemaskini — borang diisi semula, butang bertukar kepada
**Simpan**, ada **Batal suntingan**) dan **tong sampah** (padam, dengan pengesahan). Kedua-duanya menggunakan
`PUT`/`DELETE /api/calendar/:id` yang berasingan daripada pendaftaran baharu.

**Tempoh pemeriksaan = 3 sukuan.** Bila kategori `PEMERIKSAAN` dipilih, borang memaparkan panel hijau
**Jana 3 Sukuan** dengan pemilih bulan bagi setiap sukuan (lalai Mac, Jun, September). Satu entri dijana
bagi setiap sukuan pada hari pertama bulan itu, bertajuk `Tempoh Pemeriksaan Sukuan N/<tahun>` dengan
catatan `Sepanjang <bulan> <tahun>` — pembina di [`lib/takwimSukuan.ts`](lib/takwimSukuan.ts) dan diuji.
UI dalam **Tetapan → 1. Konfigurasi Sesi &
Takwim** ([AnnualCalendarEditor.tsx](./components/AnnualCalendarEditor.tsx)) memaparkan jadual
tahun semasa, lencana **Seterusnya** (mesyuarat akan datang), dan borang tambah/padam.
Medan `tarikhMulaSesi`, `tarikhTamatSesi` dan `tarikhPraJkpak` dikekalkan sebagai rujukan.

Borang tambah/padam **hanya dipaparkan** kepada pemegang lantikan aktif `PENTADBIR_SISTEM`; pengguna lain
tidak boleh membuka menu **Tetapan** sama sekali (item nav disembunyikan, dan laluan `tetapan` memaparkan
kad *Akses Ditolak*). `PUT /api/settings` juga dikunci `requireRole('PENTADBIR_SISTEM')`, manakala
`GET /api/settings` kekal awam kerana tahun sesi diperlukan sebelum log masuk. Pengesanan di UI
menggunakan lantikan (`lib/manageScope.ts`), bukan teks label peranan, supaya tidak tersasar apabila label
jawatan berubah.

Takwim yang sama dipaparkan **baca-sahaja untuk semua pengguna** (termasuk pelawat) pada tab **Utama**
melalui [`components/TakwimSesiCard.tsx`](components/TakwimSesiCard.tsx) — jadual Tarikh / Perkara /
Kategori / Catatan, lencana **Seterusnya**, dan nota kosong yang menyatakan Pentadbir Sistem akan
mengumumkan tarikh. Sumbernya `GET /api/calendar?tahun=<sesiTahun>`.

### Cara Versioning Berfungsi
1. `version.json` menyimpan pembilang binaan (`{ "build": 1 }`) dan dinaikkan pada setiap `npm run deploy`.
2. Versi penuh = `<versi package.json>+build.<N>` — cth. `0.1.0+build.1`.
3. Versi yang sama digunakan sebagai **tag version Cloudflare** (`v0.1.0-build.1`) pada kedua-dua worker:
   ```bash
   npx wrangler versions list --config wrangler.jsonc
   npx wrangler deployments list --config backend/wrangler.jsonc
   ```
4. Versi dipaparkan pada *footer* aplikasi dan boleh disemak tanpa membuka UI:
   `https://portal-aset-poliku.wilson-b6f.workers.dev/version.json`

> `npm run build` (tanpa deploy) menggunakan `VITE_API_URL` daripada `.env.production`. Jika backend dialihkan ke akaun/subdomain lain, kemas kini fail tersebut (atau tetapkan `VITE_API_URL` sebelum deploy).

> **Selepas deploy pertama:** tetapkan rahsia token sekali sahaja —
> `npx wrangler secret put JWT_SECRET --config backend/wrangler.jsonc`. Tanpa `JWT_SECRET`, Worker menolak
> semua tulisan API dengan `503 AUTH_NOT_CONFIGURED` dan pengguna tidak boleh log masuk.



