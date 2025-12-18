-- Clean up duplicate verified phone numbers
-- Keep only the first user for each phone number

-- Reset second user for +393383156161
UPDATE public.profiles 
SET phone_verified = false, 
    phone_number = NULL,
    phone_verification_code = NULL,
    phone_verification_expires_at = NULL
WHERE user_id = 'd78ee102-f714-4096-8d7d-2ab9f758afce';

-- Reset second user for +393893135885
UPDATE public.profiles 
SET phone_verified = false, 
    phone_number = NULL,
    phone_verification_code = NULL,
    phone_verification_expires_at = NULL
WHERE user_id = '42552a2f-4b8e-4f92-96a9-303f97eea9dd';

-- Now create the unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_number_verified 
ON public.profiles (phone_number) 
WHERE phone_verified = true AND phone_number IS NOT NULL;