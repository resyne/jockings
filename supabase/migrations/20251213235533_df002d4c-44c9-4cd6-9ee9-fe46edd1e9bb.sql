-- Fix: Restrict app_settings table to admin users only

-- Drop the overly permissive policy that allows public/service role read access
DROP POLICY IF EXISTS "Service role can read settings" ON public.app_settings;

-- Create admin-only read policy
CREATE POLICY "Admins can read settings" 
ON public.app_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));