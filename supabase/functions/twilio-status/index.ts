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
    const formData = await req.formData();
    
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const recordingUrl = formData.get('RecordingUrl') as string | null;
    const callDuration = formData.get('CallDuration') as string | null;

    console.log('Status callback received:', { callSid, callStatus, recordingUrl, callDuration });

    if (!callSid) {
      throw new Error('CallSid is required');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Map Twilio status to our status
    const statusMap: Record<string, string> = {
      'queued': 'pending',
      'initiated': 'initiated',
      'ringing': 'ringing',
      'in-progress': 'in_progress',
      'completed': 'completed',
      'busy': 'failed',
      'no-answer': 'failed',
      'canceled': 'failed',
      'failed': 'failed',
    };

    const mappedStatus = statusMap[callStatus] || callStatus;

    // Update prank status
    const updateData: Record<string, any> = {
      call_status: mappedStatus,
    };

    // If recording URL is available, add it
    if (recordingUrl) {
      // Twilio recording URLs need .mp3 extension
      updateData.recording_url = recordingUrl + '.mp3';
    }

    const { error } = await supabase
      .from('pranks')
      .update(updateData)
      .eq('twilio_call_sid', callSid);

    if (error) {
      console.error('Error updating prank status:', error);
    } else {
      console.log('Prank status updated to:', mappedStatus);
    }

    // Return empty response for Twilio
    return new Response('', {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error('Error processing status callback:', error);
    return new Response('', { status: 200 });
  }
});
