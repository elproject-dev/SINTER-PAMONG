-- ==========================================================
-- SCRIPT MIGRASI DATABASE UNTUK FITUR LAMPIRAN (TUGAS STAF)
-- Jalankan kode ini di Supabase Dashboard -> SQL Editor
-- ==========================================================

-- 1. Tambahkan kolom lampiran_url pada tabel tugas_staff (Jika belum ada)
ALTER TABLE public.tugas_staff
ADD COLUMN IF NOT EXISTS lampiran_url text;

-- 2. Buat Storage Bucket baru untuk lampiran tugas_staff
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tugas_staff_attachments', 'tugas_staff_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Kebijakan Keamanan (RLS) untuk Storage Bucket
-- Mengizinkan akses publik untuk membaca file lampiran
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'tugas_staff_attachments');

-- Mengizinkan pengguna terautentikasi (atau siapa saja saat RLS dimatikan) untuk mengunggah file
CREATE POLICY "Allow Uploads" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'tugas_staff_attachments');
