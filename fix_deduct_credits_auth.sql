-- fix_deduct_credits_auth.sql
-- This script adds an auth.uid() check to the deduct_credits function
-- ensuring users can only deduct their own credits.

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
  -- SECURITY: Ensure caller can only deduct their OWN credits
  -- auth.uid() returns the UUID of the currently authenticated user
  IF p_user_id != auth.uid() THEN
    RETURN FALSE;
  END IF;

  -- Check current balance
  SELECT credits INTO current_credits FROM public.profiles WHERE id = p_user_id;
  
  -- If user doesn't exist or not enough credits
  IF current_credits IS NULL OR current_credits < p_amount THEN
    RETURN FALSE;
  END IF;

  -- 1. Deduct credits
  UPDATE public.profiles 
  SET credits = credits - p_amount 
  WHERE id = p_user_id;

  -- 2. Record transaction (Store negative amount for deduction)
  INSERT INTO public.credit_transactions (user_id, amount, description)
  VALUES (p_user_id, -p_amount, p_description);

  RETURN TRUE;
END;
$$;
