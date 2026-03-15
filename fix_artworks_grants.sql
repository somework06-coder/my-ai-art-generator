-- ============================================
-- FIX: Grant table-level permissions to Supabase roles
-- ============================================
-- RLS policies define WHO can do WHAT on which ROWS,
-- but without GRANT, the roles can't even ACCESS the table at all.
-- This is the missing piece causing "permission denied for table artworks".

-- 1. Grant full CRUD access to authenticated users (logged-in users)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artworks TO authenticated;

-- 2. Grant read-only access to anon role (optional, for public galleries later)
GRANT SELECT ON public.artworks TO anon;

-- 3. Also grant access to credit_transactions table
GRANT SELECT ON public.credit_transactions TO authenticated;

-- 4. Verify: Check that RLS is enabled (should already be from setup script)
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
