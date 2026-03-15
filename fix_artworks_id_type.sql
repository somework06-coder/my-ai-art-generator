-- Fix: Change artworks.id from UUID to TEXT
-- The frontend generates IDs like "art_1772326807232_urm7k7idg" which are NOT valid UUIDs.
-- We need to change the column type to TEXT to match.

-- Step 1: Drop the primary key constraint
ALTER TABLE public.artworks DROP CONSTRAINT IF EXISTS artworks_pkey;

-- Step 2: Change column type from UUID to TEXT
ALTER TABLE public.artworks ALTER COLUMN id SET DATA TYPE TEXT;

-- Step 3: Recreate the primary key
ALTER TABLE public.artworks ADD PRIMARY KEY (id);

-- Step 4: Verify the fix
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'artworks' AND table_schema = 'public'
ORDER BY ordinal_position;
