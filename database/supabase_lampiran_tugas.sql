-- ==========================================================
-- SCRIPT MIGRASI DATABASE UNTUK FITUR UPDATE LAMPIRAN BERKALA
-- Jalankan kode ini di Supabase Dashboard -> SQL Editor
-- ==========================================================

-- 1. Buat tabel lampiran_tugas untuk menyimpan multiple lampiran per laporan tugas
CREATE TABLE IF NOT EXISTS public.lampiran_tugas (
  id uuid default gen_random_uuid() primary key,
  report_id uuid references public.penilaian_tugas(id) on delete cascade not null,
  user_id uuid not null,
  link text not null,
  catatan text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Disable RLS (sesuai pola existing)
ALTER TABLE public.lampiran_tugas DISABLE ROW LEVEL SECURITY;

-- 3. Reload schema cache agar terbaca di postgrest API
NOTIFY pgrst, 'reload schema';
