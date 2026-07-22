-- ==========================================================
-- MIGRASI: Fitur Selfie pada Absensi
-- Jalankan kode ini di Supabase Dashboard -> SQL Editor
-- ==========================================================

-- 1. Tambahkan kolom selfie_url pada tabel data_absensi
ALTER TABLE public.data_absensi ADD COLUMN IF NOT EXISTS selfie_url TEXT;

-- 2. Buat bucket 'selfie_absensi' untuk menyimpan foto selfie
INSERT INTO storage.buckets (id, name, public)
VALUES ('selfie_absensi', 'selfie_absensi', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Policy: siapa saja bisa membaca file dari bucket
CREATE POLICY "Public Read selfie_absensi"
ON storage.objects FOR SELECT
USING (bucket_id = 'selfie_absensi');

-- 4. Policy: siapa saja bisa mengunggah file ke bucket
CREATE POLICY "Public Insert selfie_absensi"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'selfie_absensi');
