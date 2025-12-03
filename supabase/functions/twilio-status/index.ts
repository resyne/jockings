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
    const callStatus = formData.get('CallStatus') as string | null;
    const recordingUrl = formData.get('RecordingUrl') as string | null;
    const recordingSid = formData.get('RecordingSid') as string | null;
    const recordingStatus = formData.get('RecordingStatus') as string | null;
    const callDuration = formData.get('CallDuration') as string | null;

    console.log('Callback received:', { 
      callSid, 
      callStatus, 
      recordingUrl, 
      recordingSid,
      recordingStatus,
      callDuration 
    });

    if (!callSid) {
      throw new Error('CallSid is required');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Handle recording callback
    if (recordingStatus === 'completed' && recordingUrl) {
      console.log('Recording completed, saving URL:', recordingUrl);
      
      const { error } = await supabase
        .from('pranks')
        .update({
          recording_url: recordingUrl + '.mp3',
          call_status: 'recording_available',
        })
        .eq('twilio_call_sid', callSid);

      if (error) {
        console.error('Error saving recording URL:', error);
      } else {
        console.log('Recording URL saved successfully');
      }

      return new Response('', { status: 200, headers: corsHeaders });
    }

    // Handle call status callback
    if (callStatus) {
      const statusMap: Record<string, string> = {
        'queued': 'pending',
        'initiated': 'initiated',
        'ringing': 'ringing',
        'in-progress': 'in_progress',
        'completed': 'completed',
        'busy': 'busy',
        'no-answer': 'no_answer',
        'canceled': 'cancelled',
        'failed': 'failed',
      };

      const mappedStatus = statusMap[callStatus] || callStatus;

      // Don't overwrite recording_available status
      const { data: existingPrank } = await supabase
        .from('pranks')
        .select('call_status')
        .eq('twilio_call_sid', callSid)
        .maybeSingle();

      // Only update if not already completed with recording
      if (existingPrank?.call_status !== 'recording_available') {
        const { error } = await supabase
          .from('pranks')
          .update({ call_status: mappedStatus })
          .eq('twilio_call_sid', callSid);

        if (error) {
          console.error('Error updating prank status:', error);
        } else {
          console.log('Prank status updated to:', mappedStatus);
        }
      }
    }

    return new Response('', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Error processing callback:', error);
    return new Response('', { status: 200 });
  }
});
