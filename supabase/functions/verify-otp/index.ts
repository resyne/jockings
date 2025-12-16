import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { otp } = await req.json();
    
    if (!otp) {
      return new Response(
        JSON.stringify({ error: 'OTP is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-otp] Verifying OTP for user ${user.id}`);

    // Get profile with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('phone_verification_code, phone_verification_expires_at, phone_verified')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('[verify-otp] Profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already verified
    if (profile.phone_verified) {
      return new Response(
        JSON.stringify({ success: true, message: 'Phone already verified' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if OTP expired
    const expiresAt = new Date(profile.phone_verification_expires_at);
    if (new Date() > expiresAt) {
      console.log('[verify-otp] OTP expired');
      return new Response(
        JSON.stringify({ error: 'Codice scaduto. Richiedi un nuovo codice.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify OTP
    if (profile.phone_verification_code !== otp) {
      console.log('[verify-otp] Invalid OTP');
      return new Response(
        JSON.stringify({ error: 'Codice non valido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark as verified and clear OTP
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        phone_verified: true,
        phone_verification_code: null,
        phone_verification_expires_at: null,
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[verify-otp] Failed to update profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify phone' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-otp] Phone verified successfully for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Phone verified successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verify-otp] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
