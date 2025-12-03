-- Add background sound fields to prank_presets
ALTER TABLE public.prank_presets
ADD COLUMN background_sound_prompt text,
ADD COLUMN background_sound_url text,
ADD COLUMN background_sound_enabled boolean DEFAULT false;