-- Add ElevenLabs voice settings columns
ALTER TABLE public.pranks 
ADD COLUMN elevenlabs_stability NUMERIC(3,2) DEFAULT 0.5,
ADD COLUMN elevenlabs_similarity NUMERIC(3,2) DEFAULT 0.75,
ADD COLUMN elevenlabs_style NUMERIC(3,2) DEFAULT 0.0,
ADD COLUMN elevenlabs_speed NUMERIC(3,2) DEFAULT 1.0;

COMMENT ON COLUMN public.pranks.elevenlabs_stability IS 'ElevenLabs stability setting (0-1)';
COMMENT ON COLUMN public.pranks.elevenlabs_similarity IS 'ElevenLabs similarity boost (0-1)';
COMMENT ON COLUMN public.pranks.elevenlabs_style IS 'ElevenLabs style exaggeration (0-1)';
COMMENT ON COLUMN public.pranks.elevenlabs_speed IS 'ElevenLabs speech speed (0.5-2.0)';