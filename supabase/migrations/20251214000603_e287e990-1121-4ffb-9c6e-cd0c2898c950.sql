-- Enable RLS on the pranks_decrypted view
ALTER VIEW public.pranks_decrypted SET (security_barrier = true);

-- For views, we need to ensure the underlying table's RLS is respected
-- The security_invoker was already set, but let's also add explicit policies

-- First, let's recreate the view with proper security settings
DROP VIEW IF EXISTS public.pranks_decrypted;

CREATE VIEW public.pranks_decrypted 
WITH (security_barrier = true, security_invoker = true) AS
SELECT 
  id,
  user_id,
  public.decrypt_victim_data(victim_phone) as victim_phone,
  public.decrypt_victim_data(victim_first_name) as victim_first_name,
  public.decrypt_victim_data(victim_last_name) as victim_last_name,
  prank_theme,
  voice_gender,
  voice_provider,
  elevenlabs_voice_id,
  elevenlabs_stability,
  elevenlabs_similarity,
  elevenlabs_style,
  elevenlabs_speed,
  language,
  personality_tone,
  max_duration,
  creativity_level,
  send_recording,
  call_status,
  recording_url,
  scheduled_at,
  created_at,
  updated_at,
  twilio_call_sid,
  conversation_history,
  pregenerated_greeting_url,
  pregenerated_background_url
FROM public.pranks;

-- Grant access to authenticated users (view will respect pranks table RLS)
GRANT SELECT ON public.pranks_decrypted TO authenticated;

-- Add comment explaining security model
COMMENT ON VIEW public.pranks_decrypted IS 'Decrypted view of pranks table. Uses security_invoker=true to inherit RLS policies from pranks table. Users can only see their own decrypted prank data.';