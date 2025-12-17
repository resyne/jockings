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
    const { prankId, callId } = await req.json();
    
    if (!prankId && !callId) {
      throw new Error('prankId or callId is required');
    }

    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let vapiCallId = callId;

    // If we have prankId but not callId, fetch it from the database
    if (prankId && !callId) {
      const { data: prank, error: prankError } = await supabase
        .from('pranks')
        .select('twilio_call_sid')
        .eq('id', prankId)
        .single();

      if (prankError || !prank) {
        console.error('Prank fetch error:', prankError);
        throw new Error('Prank not found');
      }

      vapiCallId = prank.twilio_call_sid;
    }

    if (!vapiCallId) {
      // If no call ID exists, the call never started - just update status and return success
      console.log('No VAPI call ID found - call never started, updating status to cancelled');
      
      if (prankId) {
        await supabase
          .from('pranks')
          .update({ call_status: 'cancelled' })
          .eq('id', prankId);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Prank cancelled (call never started)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('=== ENDING VAPI CALL ===');
    console.log('Call ID:', vapiCallId);

    // Call VAPI API to delete/end the call
    const vapiResponse = await fetch(`https://api.vapi.ai/call/${vapiCallId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const vapiData = await vapiResponse.json();

    if (!vapiResponse.ok) {
      console.error('VAPI API Error:', vapiData);
      // Don't throw error if call is already ended
      if (vapiData.message?.includes('not found') || vapiData.message?.includes('already ended')) {
        console.log('Call already ended or not found');
      } else {
        throw new Error(vapiData.message || vapiData.error || JSON.stringify(vapiData));
      }
    }

    console.log('=== VAPI CALL ENDED ===');
    console.log('Response:', vapiData);

    // Update prank status
    if (prankId) {
      const { error: updateError } = await supabase
        .from('pranks')
        .update({
          call_status: 'completed',
        })
        .eq('id', prankId);

      if (updateError) {
        console.error('Failed to update prank status:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Call ended successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('=== END CALL ERROR ===');
    console.error('Error:', error.message);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
