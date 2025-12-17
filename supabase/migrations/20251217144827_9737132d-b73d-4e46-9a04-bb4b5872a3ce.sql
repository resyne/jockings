-- Allow admins to view all pranks
CREATE POLICY "Admins can view all pranks"
ON public.pranks
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));