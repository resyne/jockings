-- Add column for custom ElevenLabs voice selection
ALTER TABLE public.pranks 
ADD COLUMN elevenlabs_voice_id TEXT DEFAULT NULL;