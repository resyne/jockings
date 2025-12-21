-- Add send_reveal_sms column to pranks table
ALTER TABLE public.pranks 
ADD COLUMN IF NOT EXISTS send_reveal_sms boolean DEFAULT false;

-- Add a comment describing the column
COMMENT ON COLUMN public.pranks.send_reveal_sms IS 'Whether to send a reveal SMS after the prank call ends';