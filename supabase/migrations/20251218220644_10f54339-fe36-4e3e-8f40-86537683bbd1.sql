-- Add VAPI phone number ID column to verified_caller_ids
-- This allows using the same caller IDs for both Twilio and VAPI calls
ALTER TABLE public.verified_caller_ids 
ADD COLUMN IF NOT EXISTS vapi_phone_number_id text;

-- Add comment explaining the field
COMMENT ON COLUMN public.verified_caller_ids.vapi_phone_number_id IS 'VAPI Dashboard phone number ID (format: PN...) - required for VAPI calls';