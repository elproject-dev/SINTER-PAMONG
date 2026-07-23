-- Create table for Buku Saku (Media Tugas)
CREATE TABLE IF NOT EXISTS public.media_buku_saku (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judul TEXT NOT NULL,
    deskripsi TEXT,
    file_url TEXT NOT NULL,
    uploader_id UUID REFERENCES public.profil_pengguna(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES public.profil_pengguna(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.media_buku_saku ENABLE ROW LEVEL SECURITY;

-- Policies for media_buku_saku
-- Anyone authenticated can read
CREATE POLICY "Buku saku can be viewed by all authenticated users" 
ON public.media_buku_saku FOR SELECT 
TO authenticated 
USING (true);

-- Anyone authenticated can insert
CREATE POLICY "Buku saku can be created by authenticated users" 
ON public.media_buku_saku FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Uploader or Admin can delete
CREATE POLICY "Buku saku can be deleted by uploader or admin" 
ON public.media_buku_saku FOR DELETE 
TO authenticated 
USING (
    auth.uid() = uploader_id OR 
    EXISTS (SELECT 1 FROM public.profil_pengguna WHERE id = auth.uid() AND role = 'admin')
);

-- Uploader or Admin can update
CREATE POLICY "Buku saku can be updated by uploader or admin" 
ON public.media_buku_saku FOR UPDATE 
TO authenticated 
USING (
    auth.uid() = uploader_id OR 
    EXISTS (SELECT 1 FROM public.profil_pengguna WHERE id = auth.uid() AND role = 'admin')
);

-- Create storage bucket for Buku Saku
INSERT INTO storage.buckets (id, name, public) 
VALUES ('buku_saku_media', 'buku_saku_media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for buku_saku_media
CREATE POLICY "Buku saku media is publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'buku_saku_media');

CREATE POLICY "Authenticated users can upload buku saku media" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'buku_saku_media');

CREATE POLICY "Authenticated users can update buku saku media" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'buku_saku_media');

CREATE POLICY "Authenticated users can delete buku saku media" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'buku_saku_media');
