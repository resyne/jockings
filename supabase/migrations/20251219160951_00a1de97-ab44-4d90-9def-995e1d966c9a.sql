-- Tabella per i codici promozionali
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_percentage integer NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  description text,
  is_active boolean DEFAULT true,
  max_uses integer, -- NULL = illimitato
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabella per tracciare gli utilizzi (one-time per utente)
CREATE TABLE public.promo_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  used_at timestamp with time zone DEFAULT now(),
  session_id text, -- Stripe checkout session
  UNIQUE(promo_code_id, user_id) -- Un utente può usare un codice una sola volta
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_uses ENABLE ROW LEVEL SECURITY;

-- Policies per promo_codes
CREATE POLICY "Admins can manage promo codes"
ON public.promo_codes FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read active promo codes"
ON public.promo_codes FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Policies per promo_code_uses
CREATE POLICY "Admins can view all promo code uses"
ON public.promo_code_uses FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own promo code uses"
ON public.promo_code_uses FOR SELECT
USING (auth.uid() = user_id);

-- Trigger per updated_at
CREATE TRIGGER update_promo_codes_updated_at
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();