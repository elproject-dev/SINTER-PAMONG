-- ==========================================================
-- SCRIPT MIGRASI DATABASE UNTUK BUCKET BARU
-- Jalankan kode ini di Supabase Dashboard -> SQL Editor
-- ==========================================================

-- 1. Buat bucket baru 'media_tugas' jika belum ada
insert into storage.buckets (id, name, public)
values ('media_tugas', 'media_tugas', true)
on conflict (id) do nothing;

-- 2. Buat kebijakan (policy) agar siapa saja bisa membaca file dari bucket
create policy "Public Read Access for media_tugas"
on storage.objects for select
using ( bucket_id = 'media_tugas' );

-- 3. Buat kebijakan (policy) agar siapa saja bisa mengunggah file ke bucket
create policy "Public Insert Access for media_tugas"
on storage.objects for insert
with check ( bucket_id = 'media_tugas' );
