-- Add phone verification fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone_verification_code TEXT,
ADD COLUMN IF NOT EXISTS phone_verification_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_prank_used BOOLEAN DEFAULT FALSE;

-- Index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number);

-- Update RLS policy to allow users to update their own phone verification fields
CREATE POLICY "Users can update own phone verification"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);