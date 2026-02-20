-- ==========================================
-- FINAL PERMISSION FIX (GRANT + RLS)
-- ==========================================

-- 1. Ensure public schema access
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Grant Table Permissions explicitly
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO anon; -- Optional: if you want public profiles later

-- 3. Reset RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop stale policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 4. Re-create Simple Policies
-- Allow users to read THEIR OWN profile
CREATE POLICY "Enable read access for users based on ID" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Allow users to update THEIR OWN profile
CREATE POLICY "Enable update access for users based on ID" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Allow users to insert THEIR OWN profile
CREATE POLICY "Enable insert access for users based on ID" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 5. Verify grants
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'profiles';
