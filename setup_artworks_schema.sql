-- 1. Create the artworks table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.artworks (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    prompt TEXT,
    fragment_code TEXT NOT NULL,
    aspect_ratio TEXT DEFAULT '16:9',
    duration INTEGER DEFAULT 10,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Turn on Row Level Security
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies just in case they are malformed
DROP POLICY IF EXISTS "Users can insert their own artworks" ON public.artworks;
DROP POLICY IF EXISTS "Users can view their own artworks" ON public.artworks;
DROP POLICY IF EXISTS "Users can update their own artworks" ON public.artworks;
DROP POLICY IF EXISTS "Users can delete their own artworks" ON public.artworks;
DROP POLICY IF EXISTS "Users can view their own AND legacy artworks" ON public.artworks;

-- 4. Recreate strict but correct RLS Policies
CREATE POLICY "Users can insert their own artworks" 
ON public.artworks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own artworks" 
ON public.artworks FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own artworks" 
ON public.artworks FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own artworks"
ON public.artworks FOR DELETE
USING (auth.uid() = user_id);
