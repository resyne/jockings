-- Add sample audio URL field to voice_settings
ALTER TABLE public.voice_settings 
ADD COLUMN IF NOT EXISTS sample_audio_url TEXT;