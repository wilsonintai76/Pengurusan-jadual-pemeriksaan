-- Asrama/kamsis: satu lokasi (KEW.PA-7) boleh mempunyai beberapa jadual, satu bagi setiap aras.
ALTER TABLE inspection_schedules ADD COLUMN aras TEXT;
ALTER TABLE inspection_schedules ADD COLUMN kuantiti_aras INTEGER;
