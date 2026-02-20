-- CHECK USER IDENTITY LINKAGE
-- Run this check if you suspect your Profile ID does not match your Auth ID.

SELECT 
    au.id AS auth_id,
    au.email AS auth_email,
    pp.id AS profile_id,
    pp.email AS profile_email,
    pp.credits,
    pp.is_admin
FROM auth.users au
LEFT JOIN public.profiles pp ON au.id = pp.id
WHERE au.email = 'YOUR_EMAIL@HERE.COM'; -- <--- GANTI INPUT EMAIL ANDA
