import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get appropriate greeting based on time of day (Italy timezone)
const getTimeBasedGreeting = (language: string): string => {
  const now = new Date();
  const italyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  const hour = italyTime.getHours();
  
  if (language === 'Italian' || language === 'Italiano') {
    return hour >= 6 && hour < 18 ? 'buongiorno' : 'buonasera';
  } else {
    if (hour >= 6 && hour < 12) return 'good morning';
    if (hour >= 12 && hour < 18) return 'good afternoon';
    return 'good evening';
  }
};

// Build system prompt for VAPI assistant
const buildVapiPrompt = (prank: any): string => {
  const isItalian = prank.language === 'Italiano';
  const isMale = prank.voice_gender === 'male';
  const greeting = getTimeBasedGreeting(prank.language);

  const toneMap: Record<string, string> = {
    'enthusiastic': 'Entusiasta! Usa esclamazioni come "fantastico!", "incredibile!". Ridi facilmente.',
    'serious': 'Serio e formale. Usa "mi permetta", "la informo che". Parla come un funzionario.',
    'angry': 'Irritato e impaziente. Usa "ma insomma!", "possibile che...". Alza il tono.',
    'confused': 'Confuso, perdi il filo. Usa "aspetti... come dicevo?", "scusi, mi sono perso".',
    'mysterious': 'Misterioso e criptico. Usa "non posso dire di più...", "ci sono segreti...".',
    'friendly': 'Amichevole e caloroso. Usa "caro mio", "tesoro". Fai domande personali.',
  };

  const tone = toneMap[prank.personality_tone] || toneMap['friendly'];
  const lang = isItalian ? 'italiano' : 'English';
  const gender = isMale ? 'uomo' : 'donna';

  return `Sei un AI che fa scherzi telefonici. Stai chiamando ${prank.victim_first_name} ${prank.victim_last_name}.

SCENARIO: ${prank.prank_theme}

Sei ${gender}. Parla SOLO in ${lang}. Inizia con "${greeting}".
Personalità: ${tone}

REGOLE IMPORTANTI:
- Risposte brevi, max 1-2 frasi
- Mai rivelare che è uno scherzo
- Usa nomi realistici quando ti presenti (NO Mario Rossi)
- Resta nel personaggio
- Reagisci naturalmente a quello che dice l'interlocutore`;
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

    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('=== VAPI CALL INITIATION ===');

    // Fetch prank and VAPI settings
    const [prankResult, settingsResult] = await Promise.all([
      supabase.from('pranks').select('*').eq('id', prankId).single(),
      supabase.from('app_settings').select('key, value').in('key', ['vapi_phone_number_id', 'vapi_assistant_id'])
    ]);

    const { data: prank, error: prankError } = prankResult;
    if (prankError || !prank) {
      throw new Error('Prank not found');
    }

    // Parse settings
    const settings: Record<string, string> = {};
    settingsResult.data?.forEach((s: { key: string; value: string }) => {
      settings[s.key] = s.value;
    });

    const vapiPhoneNumberId = settings['vapi_phone_number_id'];
    const vapiAssistantId = settings['vapi_assistant_id'];

    if (!vapiPhoneNumberId) {
      throw new Error('VAPI Phone Number ID not configured');
    }

    console.log('Prank:', prank.id, 'Phone:', prank.victim_phone);
    console.log('VAPI Phone ID:', vapiPhoneNumberId, 'Assistant ID:', vapiAssistantId || 'dynamic');

    // Build the system prompt
    const systemPrompt = buildVapiPrompt(prank);

    // Prepare VAPI call request
    const vapiCallBody: any = {
      phoneNumberId: vapiPhoneNumberId,
      customer: {
        number: prank.victim_phone,
        name: `${prank.victim_first_name} ${prank.victim_last_name}`,
      },
    };

    // If we have a pre-configured assistant, use it
    if (vapiAssistantId) {
      vapiCallBody.assistantId = vapiAssistantId;
      // Override the prompt
      vapiCallBody.assistantOverrides = {
        firstMessage: `${getTimeBasedGreeting(prank.language)}, parlo con ${prank.victim_first_name}?`,
        model: {
          messages: [{ role: 'system', content: systemPrompt }]
        }
      };
    } else {
      // Create dynamic assistant configuration
      vapiCallBody.assistant = {
        name: `Prank-${prankId}`,
        firstMessage: `${getTimeBasedGreeting(prank.language)}, parlo con ${prank.victim_first_name}?`,
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: systemPrompt }],
          temperature: 0.8,
          maxTokens: 100,
        },
        voice: {
          provider: 'elevenlabs',
          voiceId: prank.elevenlabs_voice_id || (prank.voice_gender === 'male' ? 'onwK4e9ZLuTAKqWW03F9' : 'EXAVITQu4vr4xnSDxMaL'),
          stability: 0.5,
          similarityBoost: 0.75,
        },
        transcriber: {
          provider: 'deepgram',
          model: 'nova-2',
          language: prank.language === 'Italiano' ? 'it' : 'en',
        },
        endCallFunctionEnabled: true,
        recordingEnabled: true,
        silenceTimeoutSeconds: 30,
        maxDurationSeconds: prank.max_duration || 120,
      };
    }

    console.log('Calling VAPI API...');

    // Initiate VAPI call
    const vapiResponse = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vapiCallBody),
    });

    const vapiData = await vapiResponse.json();

    if (!vapiResponse.ok) {
      console.error('VAPI error:', vapiData);
      throw new Error(vapiData.message || vapiData.error || 'VAPI call failed');
    }

    console.log('VAPI call initiated:', vapiData.id);

    // Update prank with VAPI call ID
    await supabase
      .from('pranks')
      .update({
        call_status: 'initiated',
        twilio_call_sid: vapiData.id, // Using twilio_call_sid to store VAPI call ID for compatibility
      })
      .eq('id', prankId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        callId: vapiData.id,
        provider: 'vapi',
        message: 'VAPI call initiated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('VAPI call error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
