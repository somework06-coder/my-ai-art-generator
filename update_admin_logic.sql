-- 1. Tambahkan kolom 'is_admin' jika belum ada
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Update Function 'deduct_credits' supaya Admin GRATIS
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
  user_is_admin BOOLEAN;
BEGIN
  -- Ambil data credits & is_admin
  SELECT credits, is_admin INTO current_credits, user_is_admin FROM public.profiles WHERE id = p_user_id;
  
  -- Admin Bypass: Selalu berhasil, catat transaksi 0 rupiah/credit
  IF user_is_admin THEN
      INSERT INTO public.credit_transactions (user_id, amount, description)
      VALUES (p_user_id, 0, '[ADMIN] ' || p_description);
      RETURN TRUE;
  END IF;
  
  -- Cek saldo normal
  IF current_credits IS NULL OR current_credits < p_amount THEN
    RETURN FALSE;
  END IF;

  -- Potong saldo normal
  UPDATE public.profiles 
  SET credits = credits - p_amount 
  WHERE id = p_user_id;

  INSERT INTO public.credit_transactions (user_id, amount, description)
  VALUES (p_user_id, -p_amount, p_description);

  RETURN TRUE;
END;
$$;
