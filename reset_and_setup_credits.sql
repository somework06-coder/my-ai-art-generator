-- ==========================================
-- RESET SECTION (HATI-HATI: MENGHAPUS DATA)
-- ==========================================

-- 1. Hapus Function (RPC) supaya tidak error saat drop table
DROP FUNCTION IF EXISTS public.deduct_credits(uuid, integer, text);
DROP FUNCTION IF EXISTS public.increment_credits(uuid, integer);

-- 2. Hapus Table Transaksi
DROP TABLE IF EXISTS public.credit_transactions;

-- 3. Hapus Kolom Credits di Profiles (Opsional, uncomment jika ingin reset saldo user jadi 0/null dulu)
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS credits;


-- ==========================================
-- SETUP SECTION (DATA BARU)
-- ==========================================

-- 1. Tambah Kolom 'credits' ke table 'profiles' (Default 50)
-- Jika kolom sudah ada, perintah ini tidak akan error (IF NOT EXISTS),
-- TAPI jika ingin memaksa reset default value, kita alter lagi.
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 50 NOT NULL;

-- Pastikan default value benar-benar 50 (jika sebelumnya 3)
ALTER TABLE public.profiles 
ALTER COLUMN credits SET DEFAULT 50;

-- (Opsional) Update user lama yg credits-nya masih null atau 3 menjadi 50?
-- UPDATE public.profiles SET credits = 50 WHERE credits < 50;


-- 2. Buat Table 'credit_transactions'
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL, -- Negatif = Pakai, Positif = Topup
    description TEXT NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS (Security)
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Policy: User cuma bisa lihat transaksinya sendiri
-- (Hapus dulu policy lama jika ada biar ga duplikat error)
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.credit_transactions;

CREATE POLICY "Users can view their own transactions" 
ON public.credit_transactions FOR SELECT 
USING (auth.uid() = user_id);


-- 5. FUNCTION: Potong Kredit (Deduct)
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID, 
  p_amount INTEGER, 
  p_description TEXT
) 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- Cek saldo
  SELECT credits INTO current_credits FROM public.profiles WHERE id = p_user_id;
  
  -- Jika user tidak ada atau saldo kurang
  IF current_credits IS NULL OR current_credits < p_amount THEN
    RETURN FALSE;
  END IF;

  -- 1. Potong saldo
  UPDATE public.profiles 
  SET credits = credits - p_amount 
  WHERE id = p_user_id;

  -- 2. Catat transaksi (Simpan sebagai negatif)
  INSERT INTO public.credit_transactions (user_id, amount, description)
  VALUES (p_user_id, -p_amount, p_description);

  RETURN TRUE;
END;
$$;

-- 6. FUNCTION: Tambah Kredit (Top Up)
CREATE OR REPLACE FUNCTION increment_credits(
  p_user_id UUID, 
  p_amount INTEGER
) 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Tambah saldo
  UPDATE public.profiles 
  SET credits = credits + p_amount 
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;
