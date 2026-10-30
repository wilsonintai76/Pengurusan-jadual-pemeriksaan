-- =============================================================================
-- Migrasi: pecahan status fizikal aset A–F untuk KEW.PA-11
-- =============================================================================
-- Dijalankan SEKALI oleh `scripts/deploy.mjs` apabila lajur `pecahan_status`
-- belum wujud pada `inspection_reports`. Lajur warisan (bil_elok/bil_rosak/
-- bil_usang/bil_hilang) dikekalkan untuk kompilasi Pra-JKPAK.

ALTER TABLE inspection_reports ADD COLUMN pecahan_status TEXT;
ALTER TABLE inspection_reports ADD COLUMN justifikasi_status TEXT;
