-- Create table for verified caller IDs
CREATE TABLE public.verified_caller_ids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE,
  friendly_name TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.verified_caller_ids ENABLE ROW LEVEL SECURITY;

-- Only admins can manage verified caller IDs
CREATE POLICY "Admins can manage verified caller IDs"
ON public.verified_caller_ids
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read active caller IDs (needed for call initiation)
CREATE POLICY "Anyone can read active caller IDs"
ON public.verified_caller_ids
FOR SELECT
USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_verified_caller_ids_updated_at
BEFORE UPDATE ON public.verified_caller_ids
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure only one default caller ID
CREATE OR REPLACE FUNCTION public.ensure_single_default_caller_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.verified_caller_ids
    SET is_default = false
    WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER ensure_single_default_caller_id_trigger
BEFORE INSERT OR UPDATE ON public.verified_caller_ids
FOR EACH ROW
WHEN (NEW.is_default = true)
EXECUTE FUNCTION public.ensure_single_default_caller_id();