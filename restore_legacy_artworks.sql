-- Fix for Old Artworks Disappearing
-- If you had artworks generated BEFORE the Row Level Security (RLS) fix, 
-- they might have been saved without a `user_id`. The previous strict policy hid them.
-- Run this script to allow you to see your older, anonymous artworks.

-- 1. Drop the strict viewing policy
DROP POLICY IF EXISTS "Users can view their own artworks" ON public.artworks;

-- 2. Create a new, forgiving viewing policy. 
-- This allows you to see artworks that belong to you OR artworks that have no owner (legacy).
CREATE POLICY "Users can view their own AND legacy artworks" 
ON public.artworks FOR SELECT 
USING (
    auth.uid() = user_id OR user_id IS NULL
);

-- Note: We only relax the SELECT (viewing) policy. 
-- INSERT, UPDATE, and DELETE remain strictly locked to the owner for security.
