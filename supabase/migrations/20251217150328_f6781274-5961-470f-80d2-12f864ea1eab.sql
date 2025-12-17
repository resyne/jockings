-- Create voice settings audit log table
CREATE TABLE public.voice_settings_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  setting_key TEXT NOT NULL, -- e.g., 'elevenlabs_model', 'vapi_ai_model', etc.
  old_value TEXT,
  new_value TEXT,
  details JSONB -- additional context
);

-- Enable RLS
ALTER TABLE public.voice_settings_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read voice settings audit logs"
ON public.voice_settings_audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert audit logs
CREATE POLICY "Admins can insert voice settings audit logs"
ON public.voice_settings_audit_log
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_voice_settings_audit_log_created_at ON public.voice_settings_audit_log(created_at DESC);
CREATE INDEX idx_voice_settings_audit_log_setting_key ON public.voice_settings_audit_log(setting_key);