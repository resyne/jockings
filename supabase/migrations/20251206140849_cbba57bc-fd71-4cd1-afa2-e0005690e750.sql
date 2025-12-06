-- Create table for managing Twilio phone numbers
CREATE TABLE public.twilio_phone_numbers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number text NOT NULL UNIQUE,
    country_code text NOT NULL,
    country_name text NOT NULL,
    friendly_name text,
    is_active boolean DEFAULT true,
    max_concurrent_calls integer DEFAULT 1,
    current_calls integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.twilio_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Admin can manage phone numbers
CREATE POLICY "Admins can manage phone numbers"
ON public.twilio_phone_numbers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read active phone numbers (needed for call routing)
CREATE POLICY "Anyone can read active phone numbers"
ON public.twilio_phone_numbers
FOR SELECT
USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_twilio_phone_numbers_updated_at
BEFORE UPDATE ON public.twilio_phone_numbers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create call queue table for managing concurrent calls
CREATE TABLE public.call_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    prank_id uuid REFERENCES public.pranks(id) ON DELETE CASCADE NOT NULL,
    phone_number_id uuid REFERENCES public.twilio_phone_numbers(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'queued',
    position integer,
    scheduled_for timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_queue ENABLE ROW LEVEL SECURITY;

-- Admins can manage queue
CREATE POLICY "Admins can manage call queue"
ON public.call_queue
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own queue entries
CREATE POLICY "Users can view their own queue entries"
ON public.call_queue
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.pranks 
        WHERE pranks.id = call_queue.prank_id 
        AND pranks.user_id = auth.uid()
    )
);

-- Create trigger for updated_at
CREATE TRIGGER update_call_queue_updated_at
BEFORE UPDATE ON public.call_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();