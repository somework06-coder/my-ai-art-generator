-- SQL Script untuk Membersihkan Database (Rollback ke Kondisi Awal MVP)
-- Jalankan kode ini di Supabase > SQL Editor 

-- 1. Hapus Tabel Export Jobs (karena fitur antrean VPS dibatalkan)
DROP TABLE IF EXISTS public.export_jobs CASCADE;

-- 2. Hapus Kolom 'render_tier' dari tabel profiles (kembali ke state awal)
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS render_tier;

-- 3. Hapus (Matikan) Row Level Security & Policies di tabel Artworks 
-- (Kembali longgar agar sesuai dengan kode versi lama yang melakukan insert anonim)
ALTER TABLE public.artworks DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own AND legacy artworks" ON public.artworks;
DROP POLICY IF EXISTS "Users can insert their own artworks" ON public.artworks;
DROP POLICY IF EXISTS "Users can view their own artworks" ON public.artworks;
DROP POLICY IF EXISTS "Users can update their own artworks" ON public.artworks;
DROP POLICY IF EXISTS "Users can delete their own artworks" ON public.artworks;
