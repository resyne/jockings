-- Enable RLS directly on the pranks_decrypted view
ALTER VIEW public.pranks_decrypted OWNER TO postgres;

-- For PostgreSQL views, we need to create a security definer function that checks ownership
-- and use it in the view, OR convert to a table with RLS

-- Better approach: Create a function that returns decrypted pranks for the current user only
CREATE OR REPLACE FUNCTION public.get_user_pranks_decrypted()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  victim_phone text,
  victim_first_name text,
  victim_last_name text,
  prank_theme text,
  voice_gender text,
  voice_provider text,
  elevenlabs_voice_id text,
  elevenlabs_stability numeric,
  elevenlabs_similarity numeric,
  elevenlabs_style numeric,
  elevenlabs_speed numeric,
  language text,
  personality_tone text,
  max_duration integer,
  creativity_level integer,
  send_recording boolean,
  call_status text,
  recording_url text,
  scheduled_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  twilio_call_sid text,
  conversation_history jsonb,
  pregenerated_greeting_url text,
  pregenerated_background_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    public.decrypt_victim_data(p.victim_phone) as victim_phone,
    public.decrypt_victim_data(p.victim_first_name) as victim_first_name,
    public.decrypt_victim_data(p.victim_last_name) as victim_last_name,
    p.prank_theme,
    p.voice_gender,
    p.voice_provider,
    p.elevenlabs_voice_id,
    p.elevenlabs_stability,
    p.elevenlabs_similarity,
    p.elevenlabs_style,
    p.elevenlabs_speed,
    p.language,
    p.personality_tone,
    p.max_duration,
    p.creativity_level,
    p.send_recording,
    p.call_status,
    p.recording_url,
    p.scheduled_at,
    p.created_at,
    p.updated_at,
    p.twilio_call_sid,
    p.conversation_history,
    p.pregenerated_greeting_url,
    p.pregenerated_background_url
  FROM public.pranks p
  WHERE p.user_id = auth.uid()
$$;

-- Drop and recreate the view to use a WHERE clause that restricts by user
DROP VIEW IF EXISTS public.pranks_decrypted;

CREATE VIEW public.pranks_decrypted 
WITH (security_barrier = true) AS
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
FROM public.pranks
WHERE user_id = auth.uid();

-- Grant access
GRANT SELECT ON public.pranks_decrypted TO authenticated;

-- Add comment
COMMENT ON VIEW public.pranks_decrypted IS 'Decrypted view of pranks table with built-in user filtering. Only returns pranks for the authenticated user.';