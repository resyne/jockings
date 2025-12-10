-- Add description column to voice_settings for user-visible description
ALTER TABLE public.voice_settings 
ADD COLUMN description text;