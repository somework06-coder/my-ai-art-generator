-- FORCE ADMIN UPDATE SCRIPT
-- GANTI 'YOUR_EMAIL@HERE.COM' dengan email Anda yang persis!

WITH updated_rows AS (
    UPDATE public.profiles
    SET 
        is_admin = true, 
        credits = 999999
    WHERE email = 'YOUR_EMAIL@HERE.COM' -- <--- PASTIKAN INI BENAR
    RETURNING *
)
SELECT * FROM updated_rows;

-- Kalau hasilnya "Success" tapi "No rows returned", berarti EMAIL SALAH / TIDAK DITEMUKAN di tabel profiles.
-- Kalau muncul data user, berarti BERHASIL.
