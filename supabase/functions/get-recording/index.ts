import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recordingUrl } = await req.json();
    
    if (!recordingUrl) {
      throw new Error('recordingUrl is required');
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }

    console.log('Fetching recording from:', recordingUrl);

    // Fetch the recording with Twilio authentication
    const response = await fetch(recordingUrl, {
      headers: {
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      },
    });

    if (!response.ok) {
      console.error('Twilio response error:', response.status, response.statusText);
      throw new Error(`Failed to fetch recording: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    
    console.log('Recording fetched successfully, size:', audioBuffer.byteLength);

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="recording.mp3"',
      },
    });

  } catch (error: unknown) {
    console.error('Error fetching recording:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
