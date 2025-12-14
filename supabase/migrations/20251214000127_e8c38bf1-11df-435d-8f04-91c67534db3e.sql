-- Step 1: Update all existing rows to have encrypted data in _encrypted columns
UPDATE public.pranks
SET 
  victim_phone_encrypted = COALESCE(victim_phone_encrypted, public.encrypt_victim_data(victim_phone)),
  victim_first_name_encrypted = COALESCE(victim_first_name_encrypted, public.encrypt_victim_data(victim_first_name)),
  victim_last_name_encrypted = COALESCE(victim_last_name_encrypted, public.encrypt_victim_data(victim_last_name))
WHERE victim_phone_encrypted IS NULL 
   OR victim_first_name_encrypted IS NULL 
   OR victim_last_name_encrypted IS NULL;

-- Step 2: Drop the trigger and function for auto-encryption (no longer needed)
DROP TRIGGER IF EXISTS encrypt_victim_data_on_insert ON public.pranks;
DROP FUNCTION IF EXISTS public.encrypt_victim_data_on_insert();

-- Step 3: Drop the plaintext columns
ALTER TABLE public.pranks DROP COLUMN IF EXISTS victim_phone;
ALTER TABLE public.pranks DROP COLUMN IF EXISTS victim_first_name;
ALTER TABLE public.pranks DROP COLUMN IF EXISTS victim_last_name;

-- Step 4: Rename encrypted columns to primary names
ALTER TABLE public.pranks RENAME COLUMN victim_phone_encrypted TO victim_phone;
ALTER TABLE public.pranks RENAME COLUMN victim_first_name_encrypted TO victim_first_name;
ALTER TABLE public.pranks RENAME COLUMN victim_last_name_encrypted TO victim_last_name;

-- Step 5: Add NOT NULL constraints to the encrypted columns
ALTER TABLE public.pranks ALTER COLUMN victim_phone SET NOT NULL;
ALTER TABLE public.pranks ALTER COLUMN victim_first_name SET NOT NULL;
ALTER TABLE public.pranks ALTER COLUMN victim_last_name SET NOT NULL;