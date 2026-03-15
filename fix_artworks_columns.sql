-- Fix: Add missing columns to existing artworks table
-- The table was created before our full schema, so it's missing some columns.

-- Add fragment_code column (stores the GLSL shader code)
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS fragment_code TEXT;

-- Add aspect_ratio column
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS aspect_ratio TEXT DEFAULT '16:9';

-- Add duration column
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 10;

-- Add metadata column (for stock site keywords, description, etc.)
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add prompt column (in case it's missing)
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS prompt TEXT;

-- Verify: list all columns
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'artworks' AND table_schema = 'public'
ORDER BY ordinal_position;
