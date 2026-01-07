// @ts-nocheck
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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find scheduled pranks that are due
    const now = new Date().toISOString();
    const { data: pranks, error } = await supabase
      .from('pranks')
      .select('id')
      .eq('call_status', 'scheduled')
      .lte('scheduled_at', now);

    if (error) throw error;

    console.log(`Found ${pranks?.length || 0} scheduled pranks to process`);

    // Always use VAPI (Twilio functions kept as backup but not used)
    const edgeFunction = 'initiate-call-vapi';
    console.log(`Using VAPI for scheduled pranks`);

    // Process each prank
    for (const prank of pranks || []) {
      console.log(`Processing scheduled prank: ${prank.id} with ${edgeFunction}`);
      
      // Call the correct edge function based on provider
      const { error: callError } = await supabase.functions.invoke(edgeFunction, {
        body: { prankId: prank.id }
      });

      if (callError) {
        console.error(`Error initiating call for prank ${prank.id}:`, callError);
      }
    }

    return new Response(JSON.stringify({ processed: pranks?.length || 0, provider: 'vapi' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error processing scheduled pranks:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
