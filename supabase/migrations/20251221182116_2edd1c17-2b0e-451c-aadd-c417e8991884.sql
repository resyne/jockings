-- Add columns to track T&C and Privacy Policy acceptance
ALTER TABLE public.profiles
ADD COLUMN terms_accepted_at timestamp with time zone,
ADD COLUMN privacy_accepted_at timestamp with time zone,
ADD COLUMN terms_version text,
ADD COLUMN privacy_version text;