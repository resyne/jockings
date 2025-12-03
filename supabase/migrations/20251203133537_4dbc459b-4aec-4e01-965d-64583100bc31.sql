-- Add voice_provider column to pranks table
ALTER TABLE public.pranks 
ADD COLUMN voice_provider TEXT NOT NULL DEFAULT 'openai';

-- Add a comment for documentation
COMMENT ON COLUMN public.pranks.voice_provider IS 'Voice provider: openai (Polly) or elevenlabs';