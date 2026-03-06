ALTER TABLE public.pranks ADD COLUMN reveal_sms_scheduled_at timestamp with time zone DEFAULT null;
ALTER TABLE public.pranks ADD COLUMN reveal_sms_sent boolean DEFAULT false;