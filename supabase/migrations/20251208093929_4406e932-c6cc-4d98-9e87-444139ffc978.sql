-- Add current_calls and max_concurrent_calls to verified_caller_ids
ALTER TABLE public.verified_caller_ids 
ADD COLUMN current_calls INTEGER DEFAULT 0,
ADD COLUMN max_concurrent_calls INTEGER DEFAULT 1;