-- Create table for Jadwal Guru
CREATE TABLE IF NOT EXISTS public.jadwal_guru (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judul TEXT NOT NULL,
    deskripsi TEXT,
    file_url TEXT NOT NULL,
    uploader_id UUID REFERENCES public.profil_pengguna(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES public.profil_pengguna(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.jadwal_guru ENABLE ROW LEVEL SECURITY;

-- Policies for jadwal_guru
-- Anyone authenticated can read
CREATE POLICY "Jadwal guru can be viewed by all authenticated users" 
ON public.jadwal_guru FOR SELECT 
TO authenticated 
USING (true);

-- Anyone authenticated can insert
CREATE POLICY "Jadwal guru can be created by authenticated users" 
ON public.jadwal_guru FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Uploader or Admin can delete
CREATE POLICY "Jadwal guru can be deleted by uploader or admin" 
ON public.jadwal_guru FOR DELETE 
TO authenticated 
USING (
    auth.uid() = uploader_id OR 
    EXISTS (SELECT 1 FROM public.profil_pengguna WHERE id = auth.uid() AND role = 'admin')
);

-- Uploader or Admin can update
CREATE POLICY "Jadwal guru can be updated by uploader or admin" 
ON public.jadwal_guru FOR UPDATE 
TO authenticated 
USING (
    auth.uid() = uploader_id OR 
    EXISTS (SELECT 1 FROM public.profil_pengguna WHERE id = auth.uid() AND role = 'admin')
);

-- Create storage bucket for Jadwal Guru
INSERT INTO storage.buckets (id, name, public) 
VALUES ('jadwal_guru_media', 'jadwal_guru_media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for jadwal_guru_media
CREATE POLICY "Jadwal guru media is publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'jadwal_guru_media');

CREATE POLICY "Authenticated users can upload jadwal guru media" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'jadwal_guru_media');

CREATE POLICY "Authenticated users can update jadwal guru media" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'jadwal_guru_media');

CREATE POLICY "Authenticated users can delete jadwal guru media" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'jadwal_guru_media');
