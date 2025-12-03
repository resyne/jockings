import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prankId } = await req.json();
    
    if (!prankId) {
      throw new Error('prankId is required');
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get prank details
    const { data: prank, error: prankError } = await supabase
      .from('pranks')
      .select('*')
      .eq('id', prankId)
      .single();

    if (prankError || !prank) {
      throw new Error('Prank not found');
    }

    console.log('Initiating call for prank:', prank.id, 'to:', prank.victim_phone);

    // Build webhook URL with prank data
    const webhookUrl = `${SUPABASE_URL}/functions/v1/twilio-voice?prankId=${prankId}`;
    const statusCallbackUrl = `${SUPABASE_URL}/functions/v1/twilio-status`;

    // Initiate Twilio call
    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: prank.victim_phone,
          From: TWILIO_PHONE_NUMBER,
          Url: webhookUrl,
          StatusCallback: statusCallbackUrl,
          StatusCallbackEvent: 'initiated ringing answered completed',
          StatusCallbackMethod: 'POST',
          Record: 'true',
          RecordingStatusCallback: statusCallbackUrl,
          RecordingStatusCallbackEvent: 'completed',
          RecordingStatusCallbackMethod: 'POST',
          Timeout: '30',
        }).toString(),
      }
    );

    const twilioData = await twilioResponse.json();
    
    if (!twilioResponse.ok) {
      console.error('Twilio error:', twilioData);
      throw new Error(twilioData.message || 'Failed to initiate call');
    }

    console.log('Twilio call initiated:', twilioData.sid);

    // Update prank with call SID
    await supabase
      .from('pranks')
      .update({
        twilio_call_sid: twilioData.sid,
        call_status: 'initiated',
      })
      .eq('id', prankId);

    return new Response(
      JSON.stringify({ success: true, callSid: twilioData.sid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error initiating call:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
