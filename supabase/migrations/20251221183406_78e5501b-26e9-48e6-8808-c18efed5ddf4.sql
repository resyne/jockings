-- Create table to log prank disclaimer acceptances
CREATE TABLE public.prank_disclaimer_acceptances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  prank_id uuid NOT NULL REFERENCES public.pranks(id) ON DELETE CASCADE,
  accepted_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_hash text,
  disclaimer_version text NOT NULL DEFAULT '1.0',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prank_disclaimer_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can insert their own acceptances
CREATE POLICY "Users can insert their own acceptances"
ON public.prank_disclaimer_acceptances
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own acceptances
CREATE POLICY "Users can view their own acceptances"
ON public.prank_disclaimer_acceptances
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all acceptances
CREATE POLICY "Admins can view all acceptances"
ON public.prank_disclaimer_acceptances
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));