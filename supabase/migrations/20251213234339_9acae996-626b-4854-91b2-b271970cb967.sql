-- Fix: Restrict phone infrastructure tables to admin users only

-- 1. Update twilio_phone_numbers - drop authenticated policy, create admin-only
DROP POLICY IF EXISTS "Authenticated users can read active phone numbers" ON public.twilio_phone_numbers;

CREATE POLICY "Admins can read phone numbers" 
ON public.twilio_phone_numbers 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Update vapi_phone_numbers - drop authenticated policy, create admin-only
DROP POLICY IF EXISTS "Authenticated users can read active VAPI phone numbers" ON public.vapi_phone_numbers;

CREATE POLICY "Admins can read VAPI phone numbers" 
ON public.vapi_phone_numbers 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Update verified_caller_ids - drop authenticated policy, create admin-only
DROP POLICY IF EXISTS "Authenticated users can read active caller IDs" ON public.verified_caller_ids;

CREATE POLICY "Admins can read caller IDs" 
ON public.verified_caller_ids 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));