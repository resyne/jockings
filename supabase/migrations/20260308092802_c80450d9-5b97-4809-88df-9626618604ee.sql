
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  message text NOT NULL,
  contact_email text,
  user_email text,
  user_id uuid,
  page_url text,
  user_agent text,
  status text NOT NULL DEFAULT 'open',
  admin_notes text,
  ai_response text,
  responded_at timestamptz,
  responded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage support tickets"
ON public.support_tickets
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert support tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Anon can insert support tickets"
ON public.support_tickets
FOR INSERT
TO anon
WITH CHECK (true);
