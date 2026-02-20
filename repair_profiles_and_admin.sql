-- ==========================================
-- REPAIR SCRIPT: SYNC PROFILES & SET ADMIN
-- ==========================================

-- 1. Insert missing profiles for users who exist in auth.users but not in public.profiles
INSERT INTO public.profiles (id, email, full_name, avatar_url, credits)
SELECT 
    id, 
    email, 
    raw_user_meta_data->>'full_name', 
    raw_user_meta_data->>'avatar_url',
    50 -- Default credits for recovered accounts
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 2. Set Admin Privileges (REPLACE 'YOUR_ADMIN_EMAIL' below!)
-- This updats the specific user to be an admin and gives them unlimited credits (effectively)
UPDATE public.profiles
SET is_admin = true, credits = 999999
WHERE email = 'YOUR_ADMIN_EMAIL_HERE'; -- <--- GANTI EMAIL INI DENGAN EMAIL ADMIN ANDA!

-- 3. Verify
SELECT * FROM public.profiles WHERE is_admin = true;
