-- Add policy to allow service role to update pranks (for webhook updates)
-- This ensures that when the webhook (using service_role) updates a prank,
-- the Realtime subscription can see the changes
CREATE POLICY "Service role can update pranks" 
ON public.pranks 
FOR UPDATE 
TO service_role
USING (true)
WITH CHECK (true);

-- Also add SELECT for service role to ensure full access
CREATE POLICY "Service role can view pranks" 
ON public.pranks 
FOR SELECT 
TO service_role
USING (true);