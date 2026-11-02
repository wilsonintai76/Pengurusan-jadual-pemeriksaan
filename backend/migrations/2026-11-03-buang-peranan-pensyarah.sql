-- ---------------------------------------------------------------------------
-- Buang peranan PENSYARAH ("Pensyarah / Pegawai Akademik").
--
-- Konsep "jawatan hakiki" telah dibuang: pegawai didaftar sebagai staf dan hanya
-- memegang peranan yang benar-benar memberi kuasa (KJ/KU, KP, PA, PPAJ/PPAU,
-- Penyelia Lokasi, Pegawai Pemeriksa, Pentadbir Sistem). Label lama "Pensyarah /
-- Pegawai Akademik" tidak memberi apa-apa kuasa, jadi lantikannya ditutup dan
-- peranan itu dibuang daripada kamus `roles`.
--
-- Idempotent: selamat dijalankan berulang kali.
-- ---------------------------------------------------------------------------

-- 1. Tutup lantikan PENSYARAH yang masih aktif (rekod sejarah dikekalkan).
UPDATE role_assignments
SET status = 'DITAMATKAN', valid_to = date('now'), updated_at = datetime('now')
WHERE role_id = 'PENSYARAH' AND status = 'AKTIF';

-- 2. Padam lantikan PENSYARAH (peranan tidak lagi wujud dalam kamus).
DELETE FROM role_assignments WHERE role_id = 'PENSYARAH';

-- 3. Buang daripada kamus peranan & kategori.
DELETE FROM role_category WHERE role_id = 'PENSYARAH';
DELETE FROM roles WHERE id = 'PENSYARAH';
