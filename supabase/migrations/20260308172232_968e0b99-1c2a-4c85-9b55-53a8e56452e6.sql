ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS card_verified boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;