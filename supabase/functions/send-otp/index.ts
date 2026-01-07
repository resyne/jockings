// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm";

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
    const { phoneNumber } = await req.json();
    
    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
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

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`[send-otp] Checking if phone ${phoneNumber} is already used by another user`);

    // Check if this phone number is already verified by ANOTHER user
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, phone_verified')
      .eq('phone_number', phoneNumber)
      .eq('phone_verified', true)
      .neq('user_id', user.id)
      .maybeSingle();

    if (checkError) {
      console.error('[send-otp] Error checking existing phone:', checkError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify phone availability' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingProfile) {
      console.log(`[send-otp] Phone ${phoneNumber} already verified by user ${existingProfile.user_id}`);
      return new Response(
        JSON.stringify({ 
          error: 'Questo numero è già associato a un altro account. Effettua il login con l\'account esistente.',
          code: 'PHONE_ALREADY_USED'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log(`[send-otp] Generating OTP for user ${user.id}, phone: ${phoneNumber}`);

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        phone_number: phoneNumber,
        phone_verification_code: otp,
        phone_verification_expires_at: expiresAt.toISOString(),
        phone_verified: false,
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[send-otp] Failed to store OTP:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to store verification code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send SMS via Twilio
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !twilioPhone) {
      console.error('[send-otp] Missing Twilio credentials');
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const twilioAuth = btoa(`${accountSid}:${authToken}`);

    const smsBody = `Sarano: il tuo codice di verifica è ${otp}. Scade tra 10 minuti.`;

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phoneNumber,
        From: twilioPhone,
        Body: smsBody,
      }),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('[send-otp] Twilio error:', twilioData);
      return new Response(
        JSON.stringify({ error: 'Failed to send SMS', details: twilioData.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-otp] SMS sent successfully to ${phoneNumber}, SID: ${twilioData.sid}`);

    return new Response(
      JSON.stringify({ success: true, message: 'OTP sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-otp] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
