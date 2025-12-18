-- Create a table to track processed payment sessions
CREATE TABLE public.processed_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  pranks_added integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.processed_payments ENABLE ROW LEVEL SECURITY;

-- Only admins can view all, users can view their own
CREATE POLICY "Users can view their own processed payments"
ON public.processed_payments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all processed payments"
ON public.processed_payments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_processed_payments_session_id ON public.processed_payments(session_id);