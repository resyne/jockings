-- Add voice_name and notes columns to voice_settings table
ALTER TABLE public.voice_settings 
ADD COLUMN IF NOT EXISTS voice_name text,
ADD COLUMN IF NOT EXISTS notes text;