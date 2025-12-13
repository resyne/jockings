-- Drop the partially created functions to recreate them properly
DROP FUNCTION IF EXISTS encrypt_victim_data(text);
DROP FUNCTION IF EXISTS decrypt_victim_data(text);
DROP FUNCTION IF EXISTS get_encryption_key();

-- Create encryption function using extensions schema for pgcrypto
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
  RETURN encode(
    extensions.pgp_sym_encrypt(plain_text::bytea, encryption_key),
    'base64'
  );
END;
$$;

-- Create decryption function
CREATE OR REPLACE FUNCTION public.decrypt_victim_data(encrypted_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  encryption_key text := 'sarano_victim_data_encryption_key_v1';
BEGIN
  IF encrypted_text IS NULL OR encrypted_text = '' THEN
    RETURN encrypted_text;
  END IF;
  BEGIN
    RETURN convert_from(
      extensions.pgp_sym_decrypt(
        decode(encrypted_text, 'base64'),
        encryption_key
      ),
      'UTF8'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Return original if decryption fails (for legacy unencrypted data)
    RETURN encrypted_text;
  END;
END;
$$;

-- Add encrypted columns for victim data
ALTER TABLE public.pranks 
ADD COLUMN IF NOT EXISTS victim_phone_encrypted text,
ADD COLUMN IF NOT EXISTS victim_first_name_encrypted text,
ADD COLUMN IF NOT EXISTS victim_last_name_encrypted text;

-- Create trigger to auto-encrypt on insert/update
CREATE OR REPLACE FUNCTION public.encrypt_victim_data_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Encrypt the victim data
  NEW.victim_phone_encrypted := public.encrypt_victim_data(NEW.victim_phone);
  NEW.victim_first_name_encrypted := public.encrypt_victim_data(NEW.victim_first_name);
  NEW.victim_last_name_encrypted := public.encrypt_victim_data(NEW.victim_last_name);
  RETURN NEW;
END;
$$;

-- Create trigger for insert and update
DROP TRIGGER IF EXISTS encrypt_victim_data_on_insert ON public.pranks;
CREATE TRIGGER encrypt_victim_data_on_insert
  BEFORE INSERT OR UPDATE ON public.pranks
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_victim_data_trigger();