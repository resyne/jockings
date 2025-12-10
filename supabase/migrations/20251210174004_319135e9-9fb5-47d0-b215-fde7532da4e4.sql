-- Drop the unique constraint on language and gender to allow multiple voices per language/gender
ALTER TABLE public.voice_settings DROP CONSTRAINT IF EXISTS voice_settings_language_gender_key;