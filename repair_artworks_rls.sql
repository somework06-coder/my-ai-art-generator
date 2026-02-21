-- Fix for auto-save mechanism: Ensure that authenticated users can insert their own artwork generations
-- If you are seeing shaders disappear on reload, run this script in the Supabase SQL Editor.

-- Enable Row Level Security (just in case it was disabled)
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;

-- 1. Create INSERT policy
CREATE POLICY "Users can insert their own artworks" 
ON public.artworks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 2. Ensure SELECT policy exists
CREATE POLICY "Users can view their own artworks" 
ON public.artworks FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Ensure UPDATE policy exists
CREATE POLICY "Users can update their own artworks" 
ON public.artworks FOR UPDATE 
USING (auth.uid() = user_id);

-- 4. Ensure DELETE policy exists
CREATE POLICY "Users can delete their own artworks"
ON public.artworks FOR DELETE
USING (auth.uid() = user_id);
