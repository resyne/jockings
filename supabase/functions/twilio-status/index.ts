import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get phoneNumberId and callerIdId from URL params
    const url = new URL(req.url);
    const phoneNumberId = url.searchParams.get('phoneNumberId');
    const callerIdId = url.searchParams.get('callerIdId');

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
      callDuration,
      phoneNumberId,
      callerIdId
    });

    if (!callSid) {
      throw new Error('CallSid is required');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check if call is ending (completed, busy, no-answer, canceled, failed)
    const endStatuses = ['completed', 'busy', 'no-answer', 'canceled', 'failed'];
    const isCallEnding = callStatus && endStatuses.includes(callStatus);
    
    // Also consider recording completed as call ending (backup mechanism)
    const isRecordingComplete = recordingStatus === 'completed';

    // Decrement current_calls for the phone number when call ends
    if ((isCallEnding || isRecordingComplete) && phoneNumberId) {
      console.log('Call ending, decrementing current_calls for phone:', phoneNumberId);
      
      const { data: phoneData, error: phoneError } = await supabase
        .from('twilio_phone_numbers')
        .select('current_calls')
        .eq('id', phoneNumberId)
        .single();

      if (!phoneError && phoneData && phoneData.current_calls > 0) {
        const { error: updateError } = await supabase
          .from('twilio_phone_numbers')
          .update({ current_calls: Math.max(0, phoneData.current_calls - 1) })
          .eq('id', phoneNumberId);

        if (updateError) {
          console.error('Error decrementing current_calls:', updateError);
        } else {
          console.log('Decremented current_calls for phone:', phoneNumberId);
        }
      }
    }

    // Decrement current_calls for the caller ID when call ends
    if ((isCallEnding || isRecordingComplete) && callerIdId) {
      console.log('Call ending, decrementing current_calls for caller ID:', callerIdId);
      
      const { data: callerIdData, error: callerIdError } = await supabase
        .from('verified_caller_ids')
        .select('current_calls')
        .eq('id', callerIdId)
        .single();

      if (!callerIdError && callerIdData && callerIdData.current_calls > 0) {
        const { error: updateError } = await supabase
          .from('verified_caller_ids')
          .update({ current_calls: Math.max(0, callerIdData.current_calls - 1) })
          .eq('id', callerIdId);

        if (updateError) {
          console.error('Error decrementing caller ID current_calls:', updateError);
        } else {
          console.log('Decremented current_calls for caller ID:', callerIdId);
        }
      }
    }

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
