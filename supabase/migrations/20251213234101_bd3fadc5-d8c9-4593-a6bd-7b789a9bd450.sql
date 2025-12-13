-- Fix: Restrict voice_settings to authenticated users only

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Anyone can read voice settings" ON public.voice_settings;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can read voice settings" 
ON public.voice_settings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);