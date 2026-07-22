-- Tambahkan kolom score ke tabel laporan_tugas
ALTER TABLE public.laporan_tugas 
ADD COLUMN IF NOT EXISTS score smallint;

-- Optional: Tambahkan komentar tabel untuk dokumentasi
COMMENT ON COLUMN public.laporan_tugas.score IS 'Nilai skor laporan (1-5 Bintang) dari Admin';

-- Reload schema cache agar terbaca di postgrest API
NOTIFY pgrst, 'reload schema';
