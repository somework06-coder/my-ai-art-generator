-- 1. Add 'credits' column to 'profiles' table
-- Default 50 credits for new users (Was 3)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 50 NOT NULL;

-- 2. Create 'credit_transactions' table to track usage history
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL, -- Negative for usage (e.g., -1), Positive for top-up (e.g., +10)
    description TEXT NOT NULL, -- e.g., "Generated Video 5s", "Top Up Pack A"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for 'credit_transactions'
-- User can ONLY view their OWN transactions
CREATE POLICY "Users can view their own transactions" 
ON public.credit_transactions FOR SELECT 
USING (auth.uid() = user_id);

-- Only Service Role (Backend) can INSERT/UPDATE transactions
-- (No policy for INSERT/UPDATE for anon/authenticated roles means they are denied by default)

-- 5. FUNCTION: Deduct Credits Safely
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID, 
  p_amount INTEGER, 
  p_description TEXT
) 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER -- Runs with admin privileges to bypass RLS for updates
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
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

-- 6. FUNCTION: Increment Credits (For Top Up)
CREATE OR REPLACE FUNCTION increment_credits(
  p_user_id UUID, 
  p_amount INTEGER
) 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Add credits
  UPDATE public.profiles 
  SET credits = credits + p_amount 
  WHERE id = p_user_id;

  -- Transaction log is handled by the API usually, but we could do it here too.
  -- For now, let's keep it simple and just update balance.
  -- The API inserts the transaction log separately to include external IDs.

  RETURN TRUE;
END;
$$;
