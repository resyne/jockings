-- Add conversation_history field to pranks table
ALTER TABLE public.pranks 
ADD COLUMN conversation_history JSONB DEFAULT '[]'::jsonb;