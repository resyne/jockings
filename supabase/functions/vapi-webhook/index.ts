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
    const url = new URL(req.url);
    const prankId = url.searchParams.get('prankId');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    console.log('VAPI webhook received:', JSON.stringify(body, null, 2));

    const { message } = body;

    if (!message) {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    const messageType = message.type;

    // Map VAPI status to our call status
    let callStatus: string | null = null;
    let recordingUrl: string | null = null;

    switch (messageType) {
      case 'status-update':
        const status = message.status;
        if (status === 'ringing') {
          callStatus = 'ringing';
        } else if (status === 'in-progress') {
          callStatus = 'in_progress';
        } else if (status === 'ended') {
          callStatus = message.endedReason === 'hangup' ? 'completed' : 'failed';
        }
        break;

      case 'end-of-call-report':
        callStatus = 'completed';
        // Check for recording URL
        if (message.recordingUrl) {
          recordingUrl = message.recordingUrl;
        }
        if (message.artifact?.recordingUrl) {
          recordingUrl = message.artifact.recordingUrl;
        }
        break;

      case 'transcript':
        // Could store conversation transcript if needed
        console.log('Transcript update:', message.transcript);
        break;
    }

    // Update prank if we have a status change
    if (prankId && callStatus) {
      const updateData: Record<string, any> = { call_status: callStatus };
      
      if (recordingUrl) {
        updateData.recording_url = recordingUrl;
        updateData.call_status = 'recording_available';
      }

      const { error } = await supabase
        .from('pranks')
        .update(updateData)
        .eq('id', prankId);

      if (error) {
        console.error('Error updating prank:', error);
      } else {
        console.log('Prank updated:', prankId, 'Status:', callStatus);
      }
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('VAPI webhook error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
