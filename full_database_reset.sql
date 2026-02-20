-- ==========================================
-- FULL DATABASE RESET & SETUP SCRIPT
-- WARNING: THIS WILL DELETE ALL DATA
-- ==========================================

-- 1. DROP EVERYTHING (CLEAN SLATE)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.deduct_credits(uuid, integer, text);
DROP FUNCTION IF EXISTS public.increment_credits(uuid, integer);

-- Drop tables in order of dependency (child first, then parent)
DROP TABLE IF EXISTS public.credit_transactions;
DROP TABLE IF EXISTS public.export_jobs;
DROP TABLE IF EXISTS public.artworks;
DROP TABLE IF EXISTS public.profiles;

-- ==========================================
-- 2. CREATE TABLES
-- ==========================================

-- Table: PROFILES
-- Linked to auth.users. Holds user specific app data.
CREATE TABLE public.profiles (
    id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    credits INTEGER DEFAULT 50 NOT NULL, -- New users get 50 credits
    is_admin BOOLEAN DEFAULT false, -- Super admin flag
    updated_at TIMESTAMP WITH TIME ZONE
);
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Policies
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Table: ARTWORKS
-- Stores generated shaders/art
CREATE TABLE public.artworks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    prompt TEXT,
    shader_code TEXT,
    params JSONB, -- Stores aspect_ratio, duration, etc.
    public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own artworks" ON public.artworks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own artworks" ON public.artworks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own artworks" ON public.artworks FOR DELETE USING (auth.uid() = user_id);

-- Table: EXPORT JOBS
-- Tracks video export status
CREATE TABLE public.export_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own jobs" ON public.export_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own jobs" ON public.export_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Table: CREDIT TRANSACTIONS
-- Tracks history of credit usage and top-ups
CREATE TABLE public.credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL, -- Negative for usage, Positive for top-up
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);


-- ==========================================
-- 3. FUNCTIONS & TRIGGERS
-- ==========================================

-- Function: Handle New User (Auto-create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, credits)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    50 -- Default credits
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: On Signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function: Deduct Credits
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
  SELECT credits, is_admin INTO current_credits, user_is_admin FROM public.profiles WHERE id = p_user_id;
  
  -- Admin Bypass: Always success, record 0 cost
  IF user_is_admin THEN
      INSERT INTO public.credit_transactions (user_id, amount, description)
      VALUES (p_user_id, 0, '[ADMIN] ' || p_description);
      RETURN TRUE;
  END IF;
  
  IF current_credits IS NULL OR current_credits < p_amount THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles 
  SET credits = credits - p_amount 
  WHERE id = p_user_id;

  INSERT INTO public.credit_transactions (user_id, amount, description)
  VALUES (p_user_id, -p_amount, p_description);

  RETURN TRUE;
END;
$$;

-- Function: Increment Credits
CREATE OR REPLACE FUNCTION increment_credits(
  p_user_id UUID, 
  p_amount INTEGER
) 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET credits = credits + p_amount 
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;
