-- Rename credits column to available_pranks
ALTER TABLE public.profiles RENAME COLUMN credits TO available_pranks;

-- Update default value to 0 (users start with no pranks)
ALTER TABLE public.profiles ALTER COLUMN available_pranks SET DEFAULT 0;