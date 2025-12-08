import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map language to preferred country codes
const LANGUAGE_TO_COUNTRY_PRIORITY: Record<string, string[]> = {
  'Italiano': ['IT', 'CH', 'AT'], // Italian prefers Italian numbers, then Swiss, Austrian
  'English': ['US', 'GB', 'CA'],  // English prefers US, then UK, Canadian
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
    const TWILIO_PHONE_NUMBER_FALLBACK = Deno.env.get('TWILIO_PHONE_NUMBER'); // Fallback
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Run all queries in parallel for faster startup
    const [prankResult, phoneNumbersResult, callerIdsResult] = await Promise.all([
      supabase.from('pranks').select('*').eq('id', prankId).single(),
      supabase.from('twilio_phone_numbers').select('*').eq('is_active', true),
      supabase.from('verified_caller_ids').select('*').eq('is_active', true).order('is_default', { ascending: false })
    ]);

    const { data: prank, error: prankError } = prankResult;
    const { data: phoneNumbers, error: phoneError } = phoneNumbersResult;
    const { data: allVerifiedCallerIds, error: callerIdError } = callerIdsResult;

    if (prankError || !prank) {
      throw new Error('Prank not found');
    }

    if (phoneError) console.error('Error fetching phone numbers:', phoneError);
    if (callerIdError) console.error('Error fetching verified caller IDs:', callerIdError);

    console.log('Initiating call for prank:', prank.id, 'to:', prank.victim_phone, 'language:', prank.language);

    // Select the best caller ID (default first, then any with capacity)
    let selectedCallerId: string | null = null;
    let selectedCallerIdRecord: { id: string; phone_number: string; current_calls: number } | null = null;

    if (allVerifiedCallerIds && allVerifiedCallerIds.length > 0) {
      console.log('Available verified caller IDs:', allVerifiedCallerIds.length);
      
      // Find caller ID with capacity (current_calls < max_concurrent_calls)
      const availableCallerId = allVerifiedCallerIds.find(
        c => c.current_calls < c.max_concurrent_calls
      );

      if (availableCallerId) {
        selectedCallerId = availableCallerId.phone_number;
        selectedCallerIdRecord = availableCallerId;
        console.log('Selected caller ID:', selectedCallerId, 'is_default:', availableCallerId.is_default, 'current_calls:', availableCallerId.current_calls);

        // Increment current_calls for the selected caller ID
        const { error: updateCallerIdError } = await supabase
          .from('verified_caller_ids')
          .update({ current_calls: availableCallerId.current_calls + 1 })
          .eq('id', availableCallerId.id);

        if (updateCallerIdError) {
          console.error('Error updating caller ID current_calls:', updateCallerIdError);
        }
      } else {
        console.log('No caller IDs with available capacity');
      }
    } else {
      console.log('No verified caller IDs configured');
    }

    // Select the best phone number based on language
    let selectedPhoneNumber = TWILIO_PHONE_NUMBER_FALLBACK;
    let selectedPhoneId: string | null = null;

    if (phoneNumbers && phoneNumbers.length > 0) {
      const preferredCountries = LANGUAGE_TO_COUNTRY_PRIORITY[prank.language] || ['US', 'GB'];
      
      console.log('Available phone numbers:', phoneNumbers.length);
      console.log('Preferred countries for language', prank.language, ':', preferredCountries);

      // Find a number that matches preferred countries and has capacity
      let bestMatch = null;
      
      for (const countryCode of preferredCountries) {
        const matchingNumbers = phoneNumbers.filter(
          p => p.country_code === countryCode && p.current_calls < p.max_concurrent_calls
        );
        
        if (matchingNumbers.length > 0) {
          // Pick the one with the least current calls
          bestMatch = matchingNumbers.reduce((a, b) => 
            a.current_calls < b.current_calls ? a : b
          );
          break;
        }
      }

      // If no preferred match, pick any available number with capacity
      if (!bestMatch) {
        const availableNumbers = phoneNumbers.filter(
          p => p.current_calls < p.max_concurrent_calls
        );
        if (availableNumbers.length > 0) {
          bestMatch = availableNumbers.reduce((a, b) => 
            a.current_calls < b.current_calls ? a : b
          );
        }
      }

      if (bestMatch) {
        selectedPhoneNumber = bestMatch.phone_number;
        selectedPhoneId = bestMatch.id;
        console.log('Selected phone number:', selectedPhoneNumber, 'from country:', bestMatch.country_name);

        // Increment current_calls for the selected number
        const { error: updatePhoneError } = await supabase
          .from('twilio_phone_numbers')
          .update({ current_calls: bestMatch.current_calls + 1 })
          .eq('id', bestMatch.id);

        if (updatePhoneError) {
          console.error('Error updating phone number current_calls:', updatePhoneError);
        }
      } else {
        console.log('No available numbers with capacity, using fallback:', TWILIO_PHONE_NUMBER_FALLBACK);
      }
    } else {
      console.log('No phone numbers in database, using fallback:', TWILIO_PHONE_NUMBER_FALLBACK);
    }

    if (!selectedPhoneNumber) {
      throw new Error('No phone number available for calls');
    }

    // Use verified caller ID if available, otherwise use the phone number
    const callerIdToUse = selectedCallerId || selectedPhoneNumber;
    console.log('Using caller ID:', callerIdToUse);

    // Build webhook URL with prank data
    const webhookUrl = `${SUPABASE_URL}/functions/v1/twilio-voice?prankId=${prankId}`;
    const callerIdParam = selectedCallerIdRecord ? `&callerIdId=${selectedCallerIdRecord.id}` : '';
    const statusCallbackUrl = `${SUPABASE_URL}/functions/v1/twilio-status?phoneNumberId=${selectedPhoneId || ''}${callerIdParam}`;

    // Build call parameters
    const callParams: Record<string, string> = {
      To: prank.victim_phone,
      From: callerIdToUse,
      Url: webhookUrl,
      StatusCallback: statusCallbackUrl,
      StatusCallbackEvent: 'initiated ringing answered completed',
      StatusCallbackMethod: 'POST',
      Record: 'true',
      RecordingStatusCallback: statusCallbackUrl,
      RecordingStatusCallbackEvent: 'completed',
      RecordingStatusCallbackMethod: 'POST',
      Timeout: '30',
    };

    // Initiate Twilio call
    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(callParams).toString(),
      }
    );

    const twilioData = await twilioResponse.json();
    
    if (!twilioResponse.ok) {
      console.error('Twilio error:', twilioData);
      
      // If call failed and we incremented the counter, decrement it back
      if (selectedPhoneId) {
        const { data: phoneData } = await supabase
          .from('twilio_phone_numbers')
          .select('current_calls')
          .eq('id', selectedPhoneId)
          .single();
        
        if (phoneData) {
          await supabase
            .from('twilio_phone_numbers')
            .update({ current_calls: Math.max(0, phoneData.current_calls - 1) })
            .eq('id', selectedPhoneId);
        }
      }
      
      throw new Error(twilioData.message || 'Failed to initiate call');
    }

    console.log('Twilio call initiated:', twilioData.sid, 'from:', selectedPhoneNumber);

    // Update prank with call SID
    const { error: updateError } = await supabase
      .from('pranks')
      .update({
        twilio_call_sid: twilioData.sid,
        call_status: 'initiated',
      })
      .eq('id', prankId);

    if (updateError) {
      console.error('Error updating prank with call SID:', updateError);
    } else {
      console.log('Prank updated with call SID:', twilioData.sid);
    }

    return new Response(
      JSON.stringify({ success: true, callSid: twilioData.sid, fromNumber: selectedPhoneNumber }),
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
