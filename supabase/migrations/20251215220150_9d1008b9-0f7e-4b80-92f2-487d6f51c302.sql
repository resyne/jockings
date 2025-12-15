-- Add rating column to voice_settings for marking best voices
ALTER TABLE public.voice_settings 
ADD COLUMN rating integer DEFAULT 0 CHECK (rating >= 0 AND rating <= 5);