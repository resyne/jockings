-- Fix encryption function - pgp_sym_encrypt expects text, not bytea
DROP FUNCTION IF EXISTS public.encrypt_victim_data(text);

CREATE OR REPLACE FUNCTION public.encrypt_victim_data(plain_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  encryption_key text := 'sarano_victim_data_encryption_key_v1';
BEGIN
  IF plain_text IS NULL OR plain_text = '' THEN
    RETURN plain_text;
  END IF;
  -- pgp_sym_encrypt expects (text, text), returns bytea
  RETURN encode(
    extensions.pgp_sym_encrypt(plain_text, encryption_key),
    'base64'
  );
END;
$$;