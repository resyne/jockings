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
    return hour >= 6 && hour < 18 ? 'Buongiorno' : 'Buonasera';
  } else {
    if (hour >= 6 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 18) return 'Good afternoon';
    return 'Good evening';
  }
};

// Build dynamic first message - CRITICAL for prank effectiveness
const buildFirstMessage = (prank: any, greeting: string): string => {
  const isItalian = prank.language === 'Italiano';
  
  // The first message must be immediate and personalized
  if (isItalian) {
    return `${greeting}! Parlo con ${prank.victim_first_name}?`;
  } else {
    return `${greeting}! Am I speaking with ${prank.victim_first_name}?`;
  }
};

// Build system prompt for VAPI transient assistant - FULLY DYNAMIC
const buildSystemPrompt = (prank: any): string => {
  const isItalian = prank.language === 'Italiano';
  const isMale = prank.voice_gender === 'male';
  const greeting = getTimeBasedGreeting(prank.language);

  // Personality tone descriptions
  const toneMapIT: Record<string, string> = {
    'enthusiastic': 'Entusiasta e pieno di energia! Usa esclamazioni come "fantastico!", "incredibile!", "meraviglioso!". Ridi facilmente e trasmetti gioia.',
    'serious': 'Serio, formale e professionale. Usa espressioni come "mi permetta di informarla", "la informo che", "come da regolamento". Parla come un funzionario statale.',
    'angry': 'Irritato e impaziente. Usa espressioni come "ma insomma!", "possibile che...", "mi sta prendendo in giro?". Alza il tono quando non ottieni risposte.',
    'confused': 'Confuso e smemorato. Perdi il filo del discorso. Usa "aspetti... come dicevo?", "scusi, mi sono perso", "ah sì, ecco...". Fai domande a caso.',
    'mysterious': 'Misterioso e criptico. Parla a bassa voce. Usa "non posso dire di più...", "ci sono cose che non sa...", "faccia attenzione...". Fai pause drammatiche.',
    'friendly': 'Amichevole e caloroso. Usa "caro mio", "tesoro", "carissimo/a". Fai domande personali sulla famiglia, sul lavoro. Ridi spesso.',
  };

  const toneMapEN: Record<string, string> = {
    'enthusiastic': 'Enthusiastic and full of energy! Use expressions like "fantastic!", "amazing!", "wonderful!". Laugh easily and transmit joy.',
    'serious': 'Serious, formal and professional. Use expressions like "I must inform you", "according to regulations", "as per protocol". Speak like a government official.',
    'angry': 'Irritated and impatient. Use expressions like "excuse me?!", "are you kidding me?", "this is unacceptable!". Raise your tone when you dont get answers.',
    'confused': 'Confused and forgetful. Lose track of the conversation. Use "wait... what was I saying?", "sorry, I got lost", "oh yes, right...". Ask random questions.',
    'mysterious': 'Mysterious and cryptic. Speak in a low voice. Use "I cannot say more...", "there are things you dont know...", "be careful...". Make dramatic pauses.',
    'friendly': 'Friendly and warm. Use "my friend", "dear", "buddy". Ask personal questions about family, work. Laugh often.',
  };

  const toneMap = isItalian ? toneMapIT : toneMapEN;
  const tone = toneMap[prank.personality_tone] || toneMap['friendly'];
  const lang = isItalian ? 'italiano' : 'English';
  const genderDesc = isItalian 
    ? (isMale ? 'un uomo' : 'una donna')
    : (isMale ? 'a man' : 'a woman');

  if (isItalian) {
    return `Sei ${genderDesc} che sta facendo uno scherzo telefonico a ${prank.victim_first_name} ${prank.victim_last_name}.

SCENARIO DELLO SCHERZO:
${prank.prank_theme}

PERSONALITÀ E TONO:
${tone}

REGOLE FONDAMENTALI:
1. Parla SOLO in italiano
2. Risposte BREVI: massimo 1-2 frasi per turno
3. NON rivelare MAI che è uno scherzo
4. Quando ti presenti, usa nomi italiani realistici (es. Marco Bianchi, Giulia Ferri) - MAI "Mario Rossi"
5. Resta SEMPRE nel personaggio, qualunque cosa dica l'interlocutore
6. Se dicono "numero sbagliato", insisti che riconosci la voce
7. Se si arrabbiano, mantieni la calma ma resta nel ruolo
8. Reagisci naturalmente a quello che dice, non seguire uno script rigido
9. Usa espressioni e modi di dire italiani autentici
10. La priorità è mantenere la conversazione credibile e divertente

IMPORTANTE: I primi 3 secondi sono cruciali. La prima impressione determina il successo dello scherzo.`;
  } else {
    return `You are ${genderDesc} making a prank phone call to ${prank.victim_first_name} ${prank.victim_last_name}.

PRANK SCENARIO:
${prank.prank_theme}

PERSONALITY AND TONE:
${tone}

FUNDAMENTAL RULES:
1. Speak ONLY in English
2. Keep responses SHORT: maximum 1-2 sentences per turn
3. NEVER reveal that this is a prank
4. When introducing yourself, use realistic names (e.g., John Smith, Sarah Miller) - NEVER obviously fake names
5. ALWAYS stay in character, no matter what the person says
6. If they say "wrong number", insist you recognize their voice
7. If they get angry, stay calm but remain in character
8. React naturally to what they say, dont follow a rigid script
9. Use authentic expressions and idioms
10. Priority is keeping the conversation believable and entertaining

IMPORTANT: The first 3 seconds are crucial. First impression determines the success of the prank.`;
  }
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

    console.log('=== VAPI TRANSIENT ASSISTANT CALL ===');

    // Fetch prank, VAPI settings, and voice presets in parallel
    const [prankResult, settingsResult, presetsResult] = await Promise.all([
      supabase.from('pranks').select('*').eq('id', prankId).single(),
      supabase.from('app_settings').select('key, value').in('key', [
        'vapi_phone_number_id',
        'vapi_ai_model',
        'vapi_temperature',
        'vapi_max_tokens',
        'vapi_voice_provider',
        'vapi_voice_id',
        'vapi_custom_voice_id',
        'vapi_transcriber_provider',
        'vapi_transcriber_model',
        'vapi_silence_timeout',
        'vapi_max_duration',
        'vapi_background_sound',
        'vapi_backchanneling',
        'vapi_end_call_message',
      ]),
      supabase.from('app_settings').select('value').eq('key', 'vapi_voice_presets').single()
    ]);

    const { data: prank, error: prankError } = prankResult;
    if (prankError || !prank) {
      console.error('Prank fetch error:', prankError);
      throw new Error('Prank not found');
    }

    // Parse settings with defaults optimized for prank calls
    const settings: Record<string, string> = {
      vapi_ai_model: 'gpt-4o',
      vapi_temperature: '1.0', // High temperature for creative, unpredictable responses
      vapi_max_tokens: '150',
      vapi_voice_provider: '11labs', // VAPI uses "11labs" not "elevenlabs"
      vapi_voice_id: 'onwK4e9ZLuTAKqWW03F9', // Default Italian male voice
      vapi_transcriber_provider: 'deepgram',
      vapi_transcriber_model: 'nova-2',
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

    if (!vapiPhoneNumberId) {
      throw new Error('VAPI Phone Number ID not configured. Go to Admin > Voices to set it up.');
    }

    console.log('Prank ID:', prank.id);
    console.log('Victim:', prank.victim_first_name, prank.victim_last_name);
    console.log('Phone:', prank.victim_phone);
    console.log('Theme:', prank.prank_theme);
    console.log('Language:', prank.language);
    console.log('Voice Gender:', prank.voice_gender);
    console.log('Personality:', prank.personality_tone);
    console.log('VAPI Phone Number ID:', vapiPhoneNumberId);

    // === BUILD DYNAMIC CONTENT ===
    const greeting = getTimeBasedGreeting(prank.language);
    const systemPrompt = buildSystemPrompt(prank);
    const firstMessage = buildFirstMessage(prank, greeting);
    const transcriberLanguage = prank.language === 'Italiano' ? 'it' : 'en';
    const endCallMessage = prank.language === 'Italiano' ? 'Arrivederci!' : 'Goodbye!';

    // Get voice settings - prioritize saved presets by language/gender
    let voiceId = settings['vapi_voice_id'];
    let voiceProvider = settings['vapi_voice_provider'];
    
    // Check for matching voice preset based on prank language and gender
    const voicePresets = presetsResult.data?.value ? JSON.parse(presetsResult.data.value) : [];
    const prankLanguage = prank.language === 'Italiano' ? 'Italiano' : 'English';
    const prankGender = prank.voice_gender;
    
    const matchingPreset = voicePresets.find((preset: any) => 
      preset.language === prankLanguage && preset.gender === prankGender
    );
    
    if (matchingPreset) {
      // Use the preset voice settings
      voiceId = matchingPreset.voiceId;
      voiceProvider = matchingPreset.voiceProvider;
      console.log('=== USING VOICE PRESET ===');
      console.log('Preset Label:', matchingPreset.label);
      console.log('Preset Voice ID:', voiceId);
      console.log('Preset Provider:', voiceProvider);
    } else if (prank.elevenlabs_voice_id) {
      // Fallback to prank-specific voice
      voiceId = prank.elevenlabs_voice_id;
    } else if (settings['vapi_voice_id'] === 'custom' && settings['vapi_custom_voice_id']) {
      // Fallback to custom voice from admin settings
      voiceId = settings['vapi_custom_voice_id'];
    }

    // Map voice provider to VAPI format
    if (voiceProvider === 'elevenlabs') {
      voiceProvider = '11labs'; // VAPI uses "11labs"
    }

    console.log('=== DYNAMIC CONTENT ===');
    console.log('First Message:', firstMessage);
    console.log('Voice Provider:', voiceProvider);
    console.log('Voice ID:', voiceId);
    console.log('Transcriber Language:', transcriberLanguage);
    console.log('System Prompt Length:', systemPrompt.length, 'chars');

    // === BUILD VAPI TRANSIENT ASSISTANT REQUEST ===
    // We ALWAYS use transient assistant (no assistantId) for dynamic prank generation
    const vapiCallBody: any = {
      phoneNumberId: vapiPhoneNumberId,
      customer: {
        number: prank.victim_phone,
        name: `${prank.victim_first_name} ${prank.victim_last_name}`,
        numberE164CheckEnabled: false,
      },
      // TRANSIENT ASSISTANT - configured entirely at runtime
      assistant: {
        // Dynamic first message - CRITICAL for prank success
        firstMessage: firstMessage,
        
        // AI Model configuration
        model: {
          provider: 'openai',
          model: settings['vapi_ai_model'],
          systemPrompt: systemPrompt, // DIRECT systemPrompt, not messages array
          temperature: parseFloat(settings['vapi_temperature']),
          maxTokens: parseInt(settings['vapi_max_tokens']),
        },
        
        // Voice configuration - can vary per prank
        voice: {
          provider: voiceProvider,
          voiceId: voiceId,
          stability: 0.4, // Lower stability = more expressive, better for pranks
          similarityBoost: 0.75,
          fillerInjectionEnabled: true, // Natural filler words like "uhm", "eh"
        },
        
        // Transcriber configuration
        transcriber: {
          provider: settings['vapi_transcriber_provider'],
          model: settings['vapi_transcriber_model'],
          language: transcriberLanguage,
        },
        
        // Call behavior settings
        silenceTimeoutSeconds: parseInt(settings['vapi_silence_timeout']),
        maxDurationSeconds: Math.min(
          parseInt(settings['vapi_max_duration']), 
          prank.max_duration || 300
        ),
        endCallMessage: endCallMessage,
        endCallFunctionEnabled: true,
        recordingEnabled: true,
      },
    };

    // Add background sound if enabled (office, convention, etc.)
    if (settings['vapi_background_sound'] && settings['vapi_background_sound'] !== 'off') {
      vapiCallBody.assistant.backgroundSound = settings['vapi_background_sound'];
    }

    // Add backchanneling if enabled (natural "mhm", "ok" responses)
    if (settings['vapi_backchanneling'] === 'true') {
      vapiCallBody.assistant.backchannelingEnabled = true;
    }

    console.log('=== VAPI REQUEST ===');
    console.log('Request Body:', JSON.stringify(vapiCallBody, null, 2));

    // === CALL VAPI API ===
    const vapiResponse = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vapiCallBody),
    });

    const vapiData = await vapiResponse.json();

    if (!vapiResponse.ok) {
      console.error('VAPI API Error:', vapiData);
      throw new Error(vapiData.message || vapiData.error || JSON.stringify(vapiData));
    }

    console.log('=== VAPI CALL INITIATED ===');
    console.log('Call ID:', vapiData.id);
    console.log('Status:', vapiData.status);

    // Update prank with VAPI call ID
    const { error: updateError } = await supabase
      .from('pranks')
      .update({
        call_status: 'initiated',
        twilio_call_sid: vapiData.id, // Store VAPI call ID for tracking
      })
      .eq('id', prankId);

    if (updateError) {
      console.error('Failed to update prank status:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        callId: vapiData.id,
        provider: 'vapi',
        firstMessage: firstMessage,
        message: 'VAPI call initiated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('=== VAPI CALL ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});