-- Policy per permettere l'inserimento degli utilizzi dei codici promo (via service role)
CREATE POLICY "Service role can insert promo code uses"
ON public.promo_code_uses FOR INSERT
WITH CHECK (true);