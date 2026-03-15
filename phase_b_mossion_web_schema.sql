-- phase_b_mossion_web_schema.sql
-- This script prepares the Supabase database for the new Mossion Web (Vercel) application.
-- It adds the topup_orders table and an is_admin flag.

---------------------------------------------------------
-- 1. ADD ADMIN FLAG TO PROFILES
---------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Example to make yourself an admin (replace with your actual email if needed, 
-- or you can manually tick this box in Supabase dashboard)
-- UPDATE public.profiles SET is_admin = true WHERE id = 'your-uuid-here';

---------------------------------------------------------
-- 2. CREATE topup_orders TABLE
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.topup_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pack_name TEXT NOT NULL,          -- 'starter' | 'pro' | 'mega'
  credits INTEGER NOT NULL,         -- 200 | 500 | 1000
  amount_idr INTEGER NOT NULL,      -- 20000 | 35000 | 50000
  status TEXT DEFAULT 'pending',    -- 'pending' | 'paid' | 'failed' | 'expired'
  payment_method TEXT,              -- 'midtrans' | 'manual'
  payment_id TEXT,                  -- External payment gateway reference
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ
);

---------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) FOR topup_orders
---------------------------------------------------------
ALTER TABLE public.topup_orders ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own orders
CREATE POLICY "Users can view own orders" 
ON public.topup_orders 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own orders (when purchasing)
CREATE POLICY "Users can create own orders" 
ON public.topup_orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Note: Updates to order status (e.g. from 'pending' to 'paid') 
-- should only be done via secure Server/Edge Functions using Service Role Key, 
-- NOT directly by the client, to prevent users from marking their own orders as paid.
