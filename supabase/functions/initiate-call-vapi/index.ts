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
// Now uses configurable template from settings
const buildFirstMessage = (prank: any, greeting: string, templateIT: string | null, templateEN: string | null): string => {
  const isItalian = prank.language === 'Italiano';
  const victimName = `${prank.victim_first_name} ${prank.victim_last_name}`;
  
  // Use template from settings if available, otherwise use default
  let template = isItalian ? templateIT : templateEN;
  
  // Default templates if not configured
  if (!template) {
    template = isItalian 
      ? `{{GREETING}}! Parlo con {{VICTIM_NAME}}?`
      : `{{GREETING}}! Am I speaking with {{VICTIM_NAME}}?`;
  }
  
  // Replace placeholders
  return template
    .replace(/\{\{GREETING\}\}/g, greeting)
    .replace(/\{\{VICTIM_NAME\}\}/g, victimName)
    .replace(/\{\{VICTIM_FIRST_NAME\}\}/g, prank.victim_first_name)
    .replace(/\{\{PRANK_THEME\}\}/g, prank.prank_theme);
};

// Build system prompt for VAPI transient assistant - uses template from settings
const buildSystemPrompt = (prank: any, templateIT: string | null, templateEN: string | null): string => {
  const isItalian = prank.language === 'Italiano';
  const isMale = prank.voice_gender === 'male';
  const isVictimMale = prank.victim_gender === 'male';

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
  const genderDesc = isItalian 
    ? (isMale ? 'un uomo' : 'una donna')
    : (isMale ? 'a man' : 'a woman');
  const victimGenderDesc = isItalian
    ? (isVictimMale ? 'maschio' : 'femmina')
    : (isVictimMale ? 'male' : 'female');
  const victimName = `${prank.victim_first_name} ${prank.victim_last_name}`;
  const realDetail = prank.real_detail || '';

  // Use template from settings if available, otherwise use default
  let template = isItalian ? templateIT : templateEN;
  
  // Default templates if not configured
  if (!template) {
    if (isItalian) {
      template = `Sei {{GENDER}} che sta facendo uno scherzo telefonico a {{VICTIM_NAME}} ({{VICTIM_GENDER}}).

SCENARIO DELLO SCHERZO:
{{PRANK_THEME}}

{{REAL_DETAIL_SECTION}}

PERSONALITÀ E TONO:
{{PERSONALITY_TONE}}

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
10. IMPORTANTE: Usa la grammatica corretta per il sesso della vittima (es. se è maschio: "caro", "gentile signore"; se è femmina: "cara", "gentile signora")
11. La priorità è mantenere la conversazione credibile e divertente

IMPORTANTE: I primi 3 secondi sono cruciali. La prima impressione determina il successo dello scherzo.`;
    } else {
      template = `You are {{GENDER}} making a prank phone call to {{VICTIM_NAME}} ({{VICTIM_GENDER}}).

PRANK SCENARIO:
{{PRANK_THEME}}

{{REAL_DETAIL_SECTION}}

PERSONALITY AND TONE:
{{PERSONALITY_TONE}}

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
  }

  // Build real detail section if provided
  const realDetailSection = realDetail 
    ? (isItalian 
        ? `DETTAGLIO REALE SULLA VITTIMA (usa questo per rendere lo scherzo più credibile):\n${realDetail}`
        : `REAL DETAIL ABOUT THE VICTIM (use this to make the prank more believable):\n${realDetail}`)
    : '';

  // Replace placeholders
  return template
    .replace(/\{\{GENDER\}\}/g, genderDesc)
    .replace(/\{\{VICTIM_NAME\}\}/g, victimName)
    .replace(/\{\{VICTIM_GENDER\}\}/g, victimGenderDesc)
    .replace(/\{\{PRANK_THEME\}\}/g, prank.prank_theme)
    .replace(/\{\{REAL_DETAIL\}\}/g, realDetail)
    .replace(/\{\{REAL_DETAIL_SECTION\}\}/g, realDetailSection)
    .replace(/\{\{PERSONALITY_TONE\}\}/g, tone);
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

    // Fetch prank details first
    const { data: prank, error: prankError } = await supabase
      .from('pranks')
      .select('*')
      .eq('id', prankId)
      .single();

    if (prankError || !prank) {
      console.error('Prank fetch error:', prankError);
      throw new Error('Prank not found');
    }

    // Now fetch settings, voice_settings (based on prank's elevenlabs_voice_id), and VAPI phone in parallel
    const prankLanguage = prank.language === 'Italiano' ? 'Italiano' : 'English';
    const prankGender = prank.voice_gender;

    // Build voice settings query - use prank's voice_id if available, otherwise fallback to language/gender
    const voiceSettingsQuery = prank.elevenlabs_voice_id
      ? supabase
          .from('voice_settings')
          .select('*')
          .eq('elevenlabs_voice_id', prank.elevenlabs_voice_id)
          .eq('is_active', true)
          .maybeSingle()
      : supabase
          .from('voice_settings')
          .select('*')
          .eq('language', prankLanguage)
          .eq('gender', prankGender)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

    const [settingsResult, voiceSettingsResult, vapiPhoneResult] = await Promise.all([
      supabase.from('app_settings').select('key, value').in('key', [
        'vapi_phone_number_id',
        'vapi_ai_provider',
        'vapi_ai_model',
        'vapi_temperature',
        'vapi_max_tokens',
        'vapi_voice_provider',
        'vapi_voice_id',
        'vapi_custom_voice_id',
        'vapi_filler_injection_enabled',
        'vapi_recording_enabled',
        'vapi_transcript_enabled',
        'vapi_transcriber_provider',
        'vapi_transcriber_model',
        'vapi_transcriber_language',
        'vapi_silence_timeout',
        'vapi_max_duration',
        'vapi_background_sound',
        'vapi_backchanneling',
        'vapi_end_call_message',
        'vapi_system_prompt_it',
        'vapi_system_prompt_en',
        'vapi_first_message_it',
        'vapi_first_message_en',
        'elevenlabs_model',
        // ElevenLabs voice fine-tuning from admin panel
        'vapi_voice_stability',
        'vapi_voice_similarity_boost',
        'vapi_voice_style',
        'vapi_voice_speed',
        'vapi_voice_speaker_boost',
        // Background denoising
        'vapi_background_denoising',
      ]),
      voiceSettingsQuery,
      supabase.from('vapi_phone_numbers').select('*').eq('is_default', true).eq('is_active', true).single()
    ]);

    // Parse settings with defaults optimized for prank calls
    const settings: Record<string, string> = {
      vapi_ai_provider: 'openai', // Default provider
      vapi_ai_model: 'gpt-4o-mini', // Default model
      vapi_temperature: '1.0', // High temperature for creative, unpredictable responses
      vapi_max_tokens: '150',
      vapi_voice_provider: '11labs', // VAPI uses "11labs" not "elevenlabs"
      vapi_voice_id: 'onwK4e9ZLuTAKqWW03F9', // Default Italian male voice
      vapi_filler_injection_enabled: 'true',
      vapi_recording_enabled: 'true',
      vapi_transcript_enabled: 'true',
      vapi_transcriber_provider: 'deepgram',
      vapi_transcriber_model: 'nova-2', // Default (multi-language)
      vapi_transcriber_language: 'it', // Default (used for Deepgram models)
      vapi_silence_timeout: '30',
      vapi_max_duration: '300',
      vapi_background_sound: 'off',
      vapi_backchanneling: 'false',
      vapi_end_call_message: 'Arrivederci!',
      elevenlabs_model: 'eleven_turbo_v2_5', // Default ElevenLabs TTS model
    };
    
    settingsResult.data?.forEach((s: { key: string; value: string }) => {
      if (s.value) settings[s.key] = s.value;
    });

    // Get VAPI Phone Number ID - VAPI API requires the actual phone_number_id from VAPI Dashboard
    // This is the "PN..." format ID that VAPI provides, NOT a UUID
    // Despite the VAPI error message saying "must be a UUID", VAPI actually expects their phone number ID
    let vapiPhoneNumberId = vapiPhoneResult.data?.phone_number_id;
    
    console.log('Phone from table:', vapiPhoneResult.data?.phone_number);
    
    // If no default phone found in table, fall back to app_settings (legacy)
    if (!vapiPhoneNumberId) {
      vapiPhoneNumberId = settings['vapi_phone_number_id'];
    }

    if (!vapiPhoneNumberId) {
      throw new Error('VAPI Phone Number ID not configured. Go to Admin > Voices to set it up.');
    }

    console.log('Prank ID:', prank.id);
    console.log('Victim:', prank.victim_first_name, prank.victim_last_name);
    console.log('Phone:', prank.victim_phone);
    console.log('Theme:', prank.prank_theme);
    console.log('Language:', prankLanguage);
    console.log('Voice Gender:', prankGender);
    console.log('Personality:', prank.personality_tone);
    console.log('VAPI Phone Number ID:', vapiPhoneNumberId);

    // === BUILD DYNAMIC CONTENT ===
    const greeting = getTimeBasedGreeting(prank.language);
    const systemPromptTemplateIT = settings['vapi_system_prompt_it'] || null;
    const systemPromptTemplateEN = settings['vapi_system_prompt_en'] || null;
    const firstMessageTemplateIT = settings['vapi_first_message_it'] || null;
    const firstMessageTemplateEN = settings['vapi_first_message_en'] || null;
    const systemPrompt = buildSystemPrompt(prank, systemPromptTemplateIT, systemPromptTemplateEN);
    const firstMessage = buildFirstMessage(prank, greeting, firstMessageTemplateIT, firstMessageTemplateEN);

    // VAPI transcriber configuration is provider/model-specific.
    // Deepgram expects locale codes (it, en, en-US, ...), not language names.
    const normalizeVapiTranscriberConfig = (
      provider: string,
      model: string,
      languageValue: string | undefined,
      prankLang: string
    ): { model: string; language: string } => {
      const fallbackLanguage = prankLang === 'Italiano' ? 'it' : 'en-US';
      let language = (languageValue || fallbackLanguage).trim();

      // Accept some human-friendly values (in case they got stored)
      const lower = language.toLowerCase();
      if (lower === 'italiano' || lower === 'italian') language = 'it';
      if (lower === 'english') language = 'en';

      let normalizedModel = (model || '').trim();
      if (!normalizedModel && provider === 'deepgram') normalizedModel = 'nova-2';

      if (provider === 'deepgram') {
        // For Deepgram models, avoid "Multilingual" strings.
        if (['multi', 'multilingual', 'auto'].includes(lower)) {
          language = fallbackLanguage;
        }

        // VAPI validation: nova-2-phonecall accepts only en or en-US.
        if (normalizedModel === 'nova-2-phonecall') {
          if (!language.toLowerCase().startsWith('en')) {
            // Non-English call -> downgrade to nova-2 which supports more languages
            normalizedModel = 'nova-2';
            language = prankLang === 'Italiano' ? 'it' : fallbackLanguage;
          } else if (language !== 'en' && language !== 'en-US') {
            language = 'en';
          }
        }
      }

      return { model: normalizedModel, language };
    };

    const normalizedTranscriber = normalizeVapiTranscriberConfig(
      settings['vapi_transcriber_provider'],
      settings['vapi_transcriber_model'],
      settings['vapi_transcriber_language'],
      prank.language
    );

    const transcriberLanguage = normalizedTranscriber.language;
    const transcriberModel = normalizedTranscriber.model;

    const endCallMessage = settings['vapi_end_call_message'] || (prank.language === 'Italiano' ? 'Arrivederci!' : 'Goodbye!');

    const recordingEnabled = settings['vapi_recording_enabled']
      ? settings['vapi_recording_enabled'] === 'true'
      : (prank.send_recording ?? true);
    // Get voice settings - PRIORITY: prank.elevenlabs_voice_id > voice_settings table > defaults
    let voiceId = prank.elevenlabs_voice_id || settings['vapi_voice_id'];
    let voiceProvider = '11labs'; // Always use 11labs for ElevenLabs voices
    
    // Use voice_settings for additional parameters (stability, similarity, etc.)
    const voiceSettings = voiceSettingsResult.data;
    
    if (prank.elevenlabs_voice_id) {
      // Use the voice_id directly from the prank record
      voiceId = prank.elevenlabs_voice_id;
      console.log('=== USING PRANK VOICE ID ===');
      console.log('Voice ID from prank:', voiceId);
      if (voiceSettings) {
        console.log('Voice settings found for parameters');
        console.log('Stability:', voiceSettings.elevenlabs_stability);
        console.log('Similarity:', voiceSettings.elevenlabs_similarity);
        console.log('Style:', voiceSettings.elevenlabs_style);
        console.log('Speed:', voiceSettings.elevenlabs_speed);
      }
    } else if (voiceSettings && voiceSettings.elevenlabs_voice_id) {
      // Fallback to voice_settings table
      voiceId = voiceSettings.elevenlabs_voice_id;
      voiceProvider = voiceSettings.voice_provider === 'elevenlabs' ? '11labs' : voiceSettings.voice_provider;
      console.log('=== USING VOICE_SETTINGS TABLE ===');
      console.log('Language:', voiceSettings.language);
      console.log('Gender:', voiceSettings.gender);
      console.log('Voice ID:', voiceId);
      console.log('Provider:', voiceProvider);
    } else {
      console.log('=== NO VOICE SETTINGS FOUND ===');
      console.log('Falling back to defaults');
      console.log('Voice ID:', voiceId);
      console.log('Provider:', voiceProvider);
    }

    console.log('=== DYNAMIC CONTENT ===');
    console.log('First Message:', firstMessage);
    console.log('Voice Provider:', voiceProvider);
    console.log('Voice ID:', voiceId);
    console.log('Transcriber Language:', transcriberLanguage);
    console.log('System Prompt Length:', systemPrompt.length, 'chars');

    // === BUILD VAPI TRANSIENT ASSISTANT REQUEST ===
    // We ALWAYS use transient assistant (no assistantId) for dynamic prank generation
    
    // Build webhook URL for status updates - set at assistant.server.url level
    const webhookUrl = `${SUPABASE_URL}/functions/v1/vapi-webhook`;
    console.log('Webhook URL:', webhookUrl);

    const parseOptionalFloat = (v: string | undefined): number | undefined => {
      const n = Number.parseFloat((v ?? '').toString());
      return Number.isFinite(n) ? n : undefined;
    };

    const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    const voiceStability =
      parseOptionalFloat(settings['vapi_voice_stability']) ??
      (typeof voiceSettings?.elevenlabs_stability === 'number' ? voiceSettings.elevenlabs_stability : undefined) ??
      0.5;

    const voiceSimilarityBoost =
      parseOptionalFloat(settings['vapi_voice_similarity_boost']) ??
      (typeof voiceSettings?.elevenlabs_similarity === 'number' ? voiceSettings.elevenlabs_similarity : undefined) ??
      0.75;

    const voiceStyle =
      parseOptionalFloat(settings['vapi_voice_style']) ??
      (typeof voiceSettings?.elevenlabs_style === 'number' ? voiceSettings.elevenlabs_style : undefined) ??
      0;

    // VAPI validation (observed): assistant.voice.speed must be <= 1.2
    const desiredVoiceSpeed =
      parseOptionalFloat(settings['vapi_voice_speed']) ??
      (typeof voiceSettings?.elevenlabs_speed === 'number' ? voiceSettings.elevenlabs_speed : undefined) ??
      1.0;

    const voiceSpeed = clampNumber(desiredVoiceSpeed, 0.7, 1.2);
    if (voiceSpeed !== desiredVoiceSpeed) {
      console.log('Clamped voice speed:', desiredVoiceSpeed, '->', voiceSpeed);
    }
    
    // NOTE: Webhooks must be configured in VAPI Dashboard, not in API call
    // Set webhook URL to: https://vtsankkghplkfhrlxefs.supabase.co/functions/v1/vapi-webhook
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
        
        // AI Model configuration - use provider from settings
        // VAPI requires model name WITHOUT provider prefix (e.g., "gpt-4o-mini" not "openai/gpt-4o-mini")
        model: {
          provider: settings['vapi_ai_provider'],
          model: settings['vapi_ai_model'].includes('/') 
            ? settings['vapi_ai_model'].split('/').pop() 
            : settings['vapi_ai_model'],
          systemPrompt: systemPrompt,
          temperature: parseFloat(settings['vapi_temperature']),
          maxTokens: parseInt(settings['vapi_max_tokens']),
        },
        
        // Voice configuration - use admin panel settings first, then voice_settings table as fallback
        voice: {
          provider: voiceProvider,
          voiceId: voiceId,
          model: settings['elevenlabs_model'],
          stability: voiceStability,
          similarityBoost: voiceSimilarityBoost,
          style: voiceStyle,
          speed: voiceSpeed,
          useSpeakerBoost: settings['vapi_voice_speaker_boost'] === 'true',
          fillerInjectionEnabled: settings['vapi_filler_injection_enabled'] === 'true',
        },
        
        // Transcriber configuration - use settings from admin panel
        // Different providers require different model formats
        transcriber: {
          provider: settings['vapi_transcriber_provider'],
          model: transcriberModel,
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
        recordingEnabled: recordingEnabled,
      },
    };

    // Background sound: explicitly send 'off' to avoid any provider defaults
    const bgSound = (settings['vapi_background_sound'] || 'off').trim();
    if (bgSound === 'off') {
      vapiCallBody.assistant.backgroundSound = 'off';
    } else if (bgSound === 'office' || bgSound.startsWith('http')) {
      vapiCallBody.assistant.backgroundSound = bgSound;
    }

    // Add backchanneling if enabled (natural "mhm", "ok" responses)
    if (settings['vapi_backchanneling'] === 'true') {
      vapiCallBody.assistant.backchannelingEnabled = true;
    }

    // Add background denoising if enabled
    if (settings['vapi_background_denoising'] === 'true') {
      vapiCallBody.assistant.backgroundDenoisingEnabled = true;
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