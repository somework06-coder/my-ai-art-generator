-- fix_profiles_created_at.sql
-- Run this in the Supabase SQL Editor to add the missing created_at column and fix the User table query

-- 1. Add created_at to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 2. Force refresh the schema cache for the API (fixes the 400 "column created_at does not exist" error)
NOTIFY pgrst, 'reload schema';
