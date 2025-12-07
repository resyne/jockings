-- Add column to track if caller ID should be anonymous
ALTER TABLE public.twilio_phone_numbers 
ADD COLUMN caller_id_anonymous boolean DEFAULT false;