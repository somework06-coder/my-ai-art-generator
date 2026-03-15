-- Migration: Add full_name column to profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT '';

COMMENT ON COLUMN public.profiles.full_name IS 'Display name set during signup.';
