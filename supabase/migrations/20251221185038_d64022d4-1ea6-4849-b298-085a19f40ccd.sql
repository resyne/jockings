-- Create table for AI Prank Checker rules
CREATE TABLE public.prank_content_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  block_message text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prank_content_rules ENABLE ROW LEVEL SECURITY;

-- Only admins can manage content rules
CREATE POLICY "Admins can manage content rules"
ON public.prank_content_rules
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_prank_content_rules_updated_at
BEFORE UPDATE ON public.prank_content_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default rules
INSERT INTO public.prank_content_rules (category, keywords, block_message) VALUES
('TRAUMA', ARRAY['morte', 'morto', 'morta', 'decesso', 'incidente', 'ospedale', 'ricovero', 'arresto', 'arrestato', 'suicidio', 'rapimento', 'rapito', 'malattia grave', 'cancro', 'tumore', 'incendio', 'esplosione', 'bomba'], 'Questo scherzo simula eventi traumatici o gravi che potrebbero causare forte stress psicologico. Non è consentito.'),
('SCAM', ARRAY['pagamento', 'bonifico', 'iban', 'carta di credito', 'otp', 'codice', 'password', 'pin', 'documenti', 'documento', 'soldi urgenti', 'versamento'], 'Questo scherzo potrebbe essere interpretato come una truffa. Richieste di denaro o dati personali non sono consentite.'),
('THREATS', ARRAY['minaccia', 'minaccio', 'conseguenze', 'ti faccio', 'ti succede', 'ti ammazzo', 'ti uccido', 'ti picchio', 'te la faccio pagare'], 'Questo scherzo contiene minacce o intimidazioni. Non è consentito.'),
('SENSITIVE', ARRAY['sangue', 'droga', 'violenza', 'stupro', 'abuso'], 'Questo scherzo contiene contenuti sensibili o potenzialmente traumatici. Non è consentito.');

-- Create app setting for AI checker enabled/disabled
INSERT INTO public.app_settings (key, value, description) VALUES
('ai_content_checker_enabled', 'true', 'Abilita/disabilita il controllo AI dei contenuti degli scherzi'),
('ai_content_checker_use_ai', 'true', 'Usa AI per analisi avanzata oltre alle keywords')
ON CONFLICT (key) DO NOTHING;