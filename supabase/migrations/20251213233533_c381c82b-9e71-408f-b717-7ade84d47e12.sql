-- Fix: Restrict phone number tables to authenticated users only

-- 1. Drop overly permissive policies on twilio_phone_numbers
DROP POLICY IF EXISTS "Anyone can read active phone numbers" ON public.twilio_phone_numbers;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can read active phone numbers" 
ON public.twilio_phone_numbers 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

-- 2. Drop overly permissive policies on vapi_phone_numbers
DROP POLICY IF EXISTS "Anyone can read active VAPI phone numbers" ON public.vapi_phone_numbers;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can read active VAPI phone numbers" 
ON public.vapi_phone_numbers 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

-- 3. Drop overly permissive policies on verified_caller_ids
DROP POLICY IF EXISTS "Anyone can read active caller IDs" ON public.verified_caller_ids;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can read active caller IDs" 
ON public.verified_caller_ids 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);