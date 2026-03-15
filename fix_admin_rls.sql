-- fix_admin_rls.sql
-- Run this in the Supabase SQL Editor to grant Admin users the ability to read all data

-- 1. Create a secure function to check if the current user is an admin 
-- (This avoids infinite recursion in RLS policies)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Add an RLS Policy to allow admins to view ALL topup_orders
DROP POLICY IF EXISTS "Admins can view all orders" ON public.topup_orders;
CREATE POLICY "Admins can view all orders" 
ON public.topup_orders 
FOR SELECT 
USING ( public.is_admin() );

-- 3. Add an RLS Policy to allow admins to view ALL credit_transactions
-- (If credit_transactions has RLS enabled)
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.credit_transactions;
CREATE POLICY "Admins can view all transactions" 
ON public.credit_transactions 
FOR SELECT 
USING ( public.is_admin() );

-- 4. Add an RLS Policy to allow admins to view ALL profiles
-- (If profiles restricts viewing other people's profiles)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING ( public.is_admin() );

-- Force refresh the schema cache for the API (fixes the 400 error for is_admin column)
NOTIFY pgrst, 'reload schema';
