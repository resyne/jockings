-- Create a view that automatically decrypts victim data for authorized users
CREATE OR REPLACE VIEW public.pranks_decrypted AS
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

-- Enable RLS on the view (views inherit from underlying table RLS)
-- Grant access to authenticated users
GRANT SELECT ON public.pranks_decrypted TO authenticated;

-- Add security invoker for the view to respect RLS
ALTER VIEW public.pranks_decrypted SET (security_invoker = on);