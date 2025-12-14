-- Grant EXECUTE permission on decrypt_victim_data to authenticated users
-- This is safe because the function is SECURITY DEFINER and has built-in encryption key protection
GRANT EXECUTE ON FUNCTION public.decrypt_victim_data(text) TO authenticated;