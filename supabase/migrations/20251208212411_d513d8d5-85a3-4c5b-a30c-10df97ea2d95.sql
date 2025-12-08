-- Create table for VAPI phone numbers (separate from Twilio)
CREATE TABLE public.vapi_phone_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number_id TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  friendly_name TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vapi_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Admins can manage VAPI phone numbers
CREATE POLICY "Admins can manage VAPI phone numbers"
ON public.vapi_phone_numbers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read active VAPI phone numbers
CREATE POLICY "Anyone can read active VAPI phone numbers"
ON public.vapi_phone_numbers
FOR SELECT
USING (is_active = true);

-- Trigger to ensure only one default
CREATE OR REPLACE FUNCTION public.ensure_single_default_vapi_phone()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.vapi_phone_numbers
    SET is_default = false
    WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_single_default_vapi_phone_trigger
BEFORE INSERT OR UPDATE ON public.vapi_phone_numbers
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_default_vapi_phone();

-- Add updated_at trigger
CREATE TRIGGER update_vapi_phone_numbers_updated_at
BEFORE UPDATE ON public.vapi_phone_numbers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();