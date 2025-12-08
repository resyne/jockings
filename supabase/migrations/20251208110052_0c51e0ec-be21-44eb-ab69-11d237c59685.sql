-- Add columns to store pre-generated audio URLs for faster call startup
ALTER TABLE public.pranks 
ADD COLUMN IF NOT EXISTS pregenerated_greeting_url text,
ADD COLUMN IF NOT EXISTS pregenerated_background_url text;