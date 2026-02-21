-- Migration: Add render_tier to profiles
-- This column dictates whether a user renders videos locally (regular) or on the VPS (super)

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS render_tier text DEFAULT 'regular'::text;

-- Restrict to valid enum-like text values
ALTER TABLE public.profiles
ADD CONSTRAINT valid_render_tier CHECK (render_tier IN ('regular', 'super'));

COMMENT ON COLUMN public.profiles.render_tier IS 'Determines video rendering pathway: regular (client-side) or super (VPS).';
