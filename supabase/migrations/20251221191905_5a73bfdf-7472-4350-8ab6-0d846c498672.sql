-- Table for blocked phone numbers (users who don't want to receive calls)
CREATE TABLE public.blocked_phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  blocked_at timestamp with time zone NOT NULL DEFAULT now(),
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table for abuse reports
CREATE TABLE public.abuse_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_phone text NOT NULL,
  call_date date NOT NULL,
  call_time time,
  prank_subject text,
  additional_details text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blocked_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abuse_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for blocked_phone_numbers
CREATE POLICY "Anyone can insert blocked numbers"
ON public.blocked_phone_numbers
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view blocked numbers"
ON public.blocked_phone_numbers
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage blocked numbers"
ON public.blocked_phone_numbers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for abuse_reports
CREATE POLICY "Anyone can submit abuse reports"
ON public.abuse_reports
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view abuse reports"
ON public.abuse_reports
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage abuse reports"
ON public.abuse_reports
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_abuse_reports_updated_at
BEFORE UPDATE ON public.abuse_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();