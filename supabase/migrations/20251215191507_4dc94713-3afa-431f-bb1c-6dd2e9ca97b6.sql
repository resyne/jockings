-- Add new columns for enhanced prank setup
ALTER TABLE public.pranks 
ADD COLUMN victim_gender text DEFAULT 'male',
ADD COLUMN real_detail text;

-- Add comment for documentation
COMMENT ON COLUMN public.pranks.victim_gender IS 'Gender of the victim for Italian grammatical agreement (male/female)';
COMMENT ON COLUMN public.pranks.real_detail IS 'Optional real detail about the victim to make the prank more believable';