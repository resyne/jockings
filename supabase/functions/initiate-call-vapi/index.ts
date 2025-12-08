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
      supabase.from('app_settings').select('key, value').in('key', [
        'vapi_phone_number_id', 
        'vapi_assistant_id',
        'vapi_ai_provider',
        'vapi_ai_model',
        'vapi_temperature',
        'vapi_max_tokens',
        'vapi_voice_provider',
        'vapi_voice_id',
        'vapi_custom_voice_id',
        'vapi_transcriber_provider',
        'vapi_transcriber_model',
        'vapi_transcriber_language',
        'vapi_first_message',
        'vapi_silence_timeout',
        'vapi_max_duration',
        'vapi_background_sound',
        'vapi_backchanneling',
        'vapi_end_call_message',
      ])
    ]);

    const { data: prank, error: prankError } = prankResult;
    if (prankError || !prank) {
      throw new Error('Prank not found');
    }

    // Parse settings with defaults
    const settings: Record<string, string> = {
      vapi_ai_model: 'gpt-4o-mini',
      vapi_temperature: '0.7',
      vapi_max_tokens: '150',
      vapi_voice_provider: 'elevenlabs',
      vapi_voice_id: '21m00Tcm4TlvDq8ikWAM',
      vapi_transcriber_provider: 'deepgram',
      vapi_transcriber_model: 'nova-2',
      vapi_transcriber_language: 'it',
      vapi_first_message: 'Pronto?',
      vapi_silence_timeout: '30',
      vapi_max_duration: '300',
      vapi_background_sound: 'off',
      vapi_backchanneling: 'false',
      vapi_end_call_message: 'Arrivederci!',
    };
    
    settingsResult.data?.forEach((s: { key: string; value: string }) => {
      if (s.value) settings[s.key] = s.value;
    });

    const vapiPhoneNumberId = settings['vapi_phone_number_id'];
    const vapiAssistantId = settings['vapi_assistant_id'];

    if (!vapiPhoneNumberId) {
      throw new Error('VAPI Phone Number ID not configured');
    }

    console.log('Prank:', prank.id, 'Phone:', prank.victim_phone);
    console.log('VAPI Phone ID:', vapiPhoneNumberId, 'Assistant ID:', vapiAssistantId || 'dynamic');
    console.log('Settings:', JSON.stringify(settings, null, 2));

    // Build the system prompt
    const systemPrompt = buildVapiPrompt(prank);
    const greeting = getTimeBasedGreeting(prank.language);
    
    // Get first message - personalized with victim name
    const firstMessage = settings['vapi_first_message'] === 'Pronto?' 
      ? `${greeting}, parlo con ${prank.victim_first_name}?`
      : settings['vapi_first_message'].replace('{name}', prank.victim_first_name);

    // Get voice ID - use custom if set, otherwise configured, otherwise from prank
    let voiceId = settings['vapi_voice_id'];
    if (settings['vapi_voice_id'] === 'custom' && settings['vapi_custom_voice_id']) {
      voiceId = settings['vapi_custom_voice_id'];
    } else if (prank.elevenlabs_voice_id) {
      voiceId = prank.elevenlabs_voice_id;
    }

    // Prepare VAPI call request
    const vapiCallBody: any = {
      phoneNumberId: vapiPhoneNumberId,
      customer: {
        number: prank.victim_phone,
        name: `${prank.victim_first_name} ${prank.victim_last_name}`,
      },
    };

    // If we have a pre-configured assistant, use it with overrides
    if (vapiAssistantId) {
      vapiCallBody.assistantId = vapiAssistantId;
      vapiCallBody.assistantOverrides = {
        firstMessage,
        model: {
          messages: [{ role: 'system', content: systemPrompt }]
        }
      };
    } else {
      // Create dynamic assistant configuration with all settings
      const assistantConfig: any = {
        name: `Prank-${prankId}`,
        firstMessage,
        model: {
          provider: 'openai',
          model: settings['vapi_ai_model'],
          messages: [{ role: 'system', content: systemPrompt }],
          temperature: parseFloat(settings['vapi_temperature']),
          maxTokens: parseInt(settings['vapi_max_tokens']),
        },
        voice: {
          provider: settings['vapi_voice_provider'],
          voiceId,
        },
        transcriber: {
          provider: settings['vapi_transcriber_provider'],
          model: settings['vapi_transcriber_model'],
          language: settings['vapi_transcriber_language'] === 'multi' 
            ? undefined 
            : settings['vapi_transcriber_language'],
        },
        endCallFunctionEnabled: true,
        endCallMessage: settings['vapi_end_call_message'],
        recordingEnabled: true,
        silenceTimeoutSeconds: parseInt(settings['vapi_silence_timeout']),
        maxDurationSeconds: Math.min(parseInt(settings['vapi_max_duration']), prank.max_duration || 300),
      };

      // Add ElevenLabs-specific settings if using ElevenLabs
      if (settings['vapi_voice_provider'] === 'elevenlabs') {
        assistantConfig.voice.stability = 0.5;
        assistantConfig.voice.similarityBoost = 0.75;
      }

      // Add background sound if enabled
      if (settings['vapi_background_sound'] && settings['vapi_background_sound'] !== 'off') {
        assistantConfig.backgroundSound = settings['vapi_background_sound'];
      }

      // Add backchanneling if enabled
      if (settings['vapi_backchanneling'] === 'true') {
        assistantConfig.backchannelingEnabled = true;
      }

      vapiCallBody.assistant = assistantConfig;
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
