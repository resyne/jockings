import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map language to preferred country codes
const LANGUAGE_TO_COUNTRY_PRIORITY: Record<string, string[]> = {
  'Italiano': ['IT', 'CH', 'AT'],
  'English': ['US', 'GB', 'CA'],
};

// Language code mapping
const getLanguageCode = (language: string): string => {
  const langMap: Record<string, string> = {
    'Italiano': 'it-IT',
    'English': 'en-US',
  };
  return langMap[language] || 'it-IT';
};

// Get appropriate greeting based on time of day (Italy timezone)
const getTimeBasedGreeting = (language: string): { greeting: string; instruction: string } => {
  const now = new Date();
  const italyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  const hour = italyTime.getHours();
  
  if (language === 'Italian' || language === 'Italiano') {
    if (hour >= 6 && hour < 18) {
      return { greeting: 'buongiorno', instruction: 'Use "buongiorno" as greeting (it is daytime).' };
    } else {
      return { greeting: 'buonasera', instruction: 'Use "buonasera" as greeting (it is evening/night).' };
    }
  } else {
    if (hour >= 6 && hour < 12) {
      return { greeting: 'good morning', instruction: 'Use "good morning" as greeting.' };
    } else if (hour >= 12 && hour < 18) {
      return { greeting: 'good afternoon', instruction: 'Use "good afternoon" as greeting.' };
    } else {
      return { greeting: 'good evening', instruction: 'Use "good evening" as greeting.' };
    }
  }
};

// Build system prompt from prank data
const buildSystemPrompt = (prank: any): string => {
  const languageMap: Record<string, string> = {
    'Italiano': 'Italian',
    'English': 'English',
  };

  const genderMap: Record<string, { identity: string; style: string }> = {
    'male': {
      identity: 'a MAN (male)',
      style: 'Use masculine forms of words and adjectives. Speak with a male perspective and identity.'
    },
    'female': {
      identity: 'a WOMAN (female)',
      style: 'Use feminine forms of words and adjectives. Speak with a female perspective and identity.'
    },
  };

  const toneMap: Record<string, { description: string; behavior: string }> = {
    'enthusiastic': {
      description: 'extremely enthusiastic, excited, and over-the-top happy',
      behavior: 'Use exclamations! Speak fast with rising intonation. Show excessive excitement about everything.'
    },
    'serious': {
      description: 'very serious, formal, and professional',
      behavior: 'Use formal language and titles. Speak in a measured, deliberate way. Be direct and to the point.'
    },
    'angry': {
      description: 'frustrated, irritated, and increasingly angry',
      behavior: 'Start slightly annoyed and escalate your frustration. Use interruptions. Raise your tone.'
    },
    'confused': {
      description: 'confused, uncertain, and easily distracted',
      behavior: 'Frequently lose your train of thought. Ask for clarification often. Mix up details.'
    },
    'mysterious': {
      description: 'mysterious, cryptic, and dramatically secretive',
      behavior: 'Speak in a low, conspiratorial tone. Use dramatic pauses. Hint at secrets without revealing them.'
    },
    'friendly': {
      description: 'warm, friendly, and chatty like an old friend',
      behavior: 'Use informal language. Ask personal questions. Share unnecessary details about yourself.'
    },
  };

  const language = languageMap[prank.language] || 'Italian';
  const personality = toneMap[prank.personality_tone] || toneMap['enthusiastic'];
  const gender = genderMap[prank.voice_gender] || genderMap['male'];
  const creativity = prank.creativity_level > 70 ? 'very creative, unpredictable, and willing to improvise wildly' : 
                     prank.creativity_level > 30 ? 'moderately creative with occasional surprises' : 'straightforward and predictable';
  const timeGreeting = getTimeBasedGreeting(language);

  return `You are making a prank phone call. Your target is ${prank.victim_first_name} ${prank.victim_last_name}.

SCENARIO: ${prank.prank_theme}

YOUR GENDER: You are ${gender.identity}. ${gender.style}
YOUR PERSONALITY: You are ${personality.description}.
CRITICAL BEHAVIOR INSTRUCTIONS: ${personality.behavior}

TIME-AWARE GREETING: ${timeGreeting.instruction}

RULES:
1. Speak ONLY in ${language}
2. You are ${gender.identity} - ALWAYS use the correct grammatical gender for yourself!
3. EMBODY your personality in EVERY response - this is the most important thing!
4. Be ${creativity} with your responses
5. NEVER reveal this is a prank call
6. Stay in character at all times
7. Keep responses concise (1-3 sentences max)
8. Use the correct time-based greeting ("${timeGreeting.greeting}") when starting the call!
9. When introducing yourself, use REALISTIC names - NEVER use generic names like "Mario Rossi".

Respond with ONLY what you would say. Make your personality and gender OBVIOUS in how you speak.`;
};

// ElevenLabs voice settings interface
interface ElevenLabsSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
}

// Get default ElevenLabs voice based on gender/language
const getElevenLabsDefaultVoice = (gender: string, language: string): string => {
  const langCode = getLanguageCode(language);
  const voiceMap: Record<string, Record<string, string>> = {
    'it-IT': { male: 'onwK4e9ZLuTAKqWW03F9', female: 'EXAVITQu4vr4xnSDxMaL' },
    'en-US': { male: 'TX3LPaxmHKxFdv7VOQHJ', female: 'EXAVITQu4vr4xnSDxMaL' },
  };
  return voiceMap[langCode]?.[gender] || voiceMap['it-IT']?.['male'] || 'onwK4e9ZLuTAKqWW03F9';
};

// Generate audio using ElevenLabs API and store it, return the URL
const generateElevenLabsAudioUrl = async (
  text: string, 
  voiceId: string, 
  settings: ElevenLabsSettings,
  supabaseUrl: string,
  modelId: string = 'eleven_turbo_v2_5',
  useSpeakerBoost: boolean = false
): Promise<string> => {
  const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
  
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  console.log('Generating ElevenLabs audio - Model:', modelId, 'SpeakerBoost:', useSpeakerBoost);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: settings.stability,
        similarity_boost: settings.similarity_boost,
        style: settings.style,
        use_speaker_boost: useSpeakerBoost,
      },
      output_format: 'mp3_22050_32',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('ElevenLabs API error:', errorText);
    throw new Error('ElevenLabs TTS failed');
  }

  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  let base64 = '';
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    base64 += String.fromCharCode.apply(null, Array.from(chunk));
  }
  const audioBase64 = btoa(base64);
  
  const audioId = crypto.randomUUID();
  
  const storeResponse = await fetch(`${supabaseUrl}/functions/v1/serve-audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: audioId, audio: audioBase64 }),
  });

  if (!storeResponse.ok) {
    console.error('Failed to store audio:', await storeResponse.text());
    throw new Error('Failed to store audio');
  }

  return `${supabaseUrl}/functions/v1/serve-audio?id=${audioId}`;
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
    const TWILIO_PHONE_NUMBER_FALLBACK = Deno.env.get('TWILIO_PHONE_NUMBER');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('=== PRE-GENERATING AUDIO BEFORE CALL ===');

    // Run all initial queries in parallel
    const [prankResult, phoneNumbersResult, callerIdsResult, aiModelResult, globalVoiceSettingsResult] = await Promise.all([
      supabase.from('pranks').select('*').eq('id', prankId).single(),
      supabase.from('twilio_phone_numbers').select('*').eq('is_active', true),
      supabase.from('verified_caller_ids').select('*').eq('is_active', true).order('is_default', { ascending: false }),
      supabase.from('app_settings').select('value').eq('key', 'ai_model').single(),
      supabase.from('app_settings').select('key, value').in('key', ['elevenlabs_stability', 'elevenlabs_similarity', 'elevenlabs_style', 'elevenlabs_speed', 'elevenlabs_speaker_boost', 'elevenlabs_model'])
    ]);

    const { data: prank, error: prankError } = prankResult;
    const { data: phoneNumbers, error: phoneError } = phoneNumbersResult;
    const { data: allVerifiedCallerIds, error: callerIdError } = callerIdsResult;
    const globalVoiceSettings = globalVoiceSettingsResult.data || [];

    if (prankError || !prank) {
      throw new Error('Prank not found');
    }

    if (phoneError) console.error('Error fetching phone numbers:', phoneError);
    if (callerIdError) console.error('Error fetching verified caller IDs:', callerIdError);

    console.log('Prank:', prank.id, 'Theme:', prank.prank_theme);

    // Parse global voice settings
    const globalSettings: Record<string, string> = {};
    globalVoiceSettings.forEach((s: { key: string; value: string }) => {
      globalSettings[s.key] = s.value;
    });

    // Get AI model and voice settings - USE GLOBAL SETTINGS
    const aiModel = aiModelResult.data?.value || 'google/gemini-2.5-flash-lite';
    const useOpenAI = aiModel.startsWith('openai/') && !aiModel.includes('gpt-5');
    const apiUrl = useOpenAI ? 'https://api.openai.com/v1/chat/completions' : 'https://ai.gateway.lovable.dev/v1/chat/completions';
    const apiKey = useOpenAI ? OPENAI_API_KEY : Deno.env.get('LOVABLE_API_KEY');
    const modelName = useOpenAI ? 'gpt-4o-mini' : aiModel;

    const customVoiceId = prank.elevenlabs_voice_id;
    const elevenLabsVoiceId = customVoiceId || getElevenLabsDefaultVoice(prank.voice_gender, prank.language);
    
    // Use GLOBAL settings from app_settings (unified setup)
    const elSettings: ElevenLabsSettings = {
      stability: parseFloat(globalSettings['elevenlabs_stability']) || 0.5,
      similarity_boost: parseFloat(globalSettings['elevenlabs_similarity']) || 0.75,
      style: parseFloat(globalSettings['elevenlabs_style']) || 0,
      speed: parseFloat(globalSettings['elevenlabs_speed']) || 1.0,
    };
    
    const elevenlabsModel = globalSettings['elevenlabs_model'] || 'eleven_turbo_v2_5';
    const useSpeakerBoost = globalSettings['elevenlabs_speaker_boost'] === 'true';
    
    console.log('Using GLOBAL ElevenLabs settings:', elSettings, 'Model:', elevenlabsModel, 'SpeakerBoost:', useSpeakerBoost);

    // === STEP 1: Generate greeting text ===
    console.log('Step 1: Generating AI greeting...');
    const systemPrompt = buildSystemPrompt(prank);
    
    const aiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Inizia con un saluto breve (max 2 frasi). Presentati secondo lo scenario.' }
        ],
        max_tokens: 80,
        temperature: 0.7,
      }),
    });

    const aiData = await aiResponse.json();
    console.log('AI response status:', aiResponse.status);
    console.log('AI response data:', JSON.stringify(aiData));
    
    if (!aiData.choices || !aiData.choices[0]) {
      console.error('Invalid AI response - no choices:', aiData);
      throw new Error(`AI API error: ${aiData.error?.message || 'No choices in response'}`);
    }
    
    const greeting = aiData.choices[0]?.message?.content || 'Pronto, buongiorno!';
    console.log('AI greeting:', greeting);

    // === STEP 2: Generate greeting audio with GLOBAL settings ===
    console.log('Step 2: Generating audio...');
    const greetingUrl = await generateElevenLabsAudioUrl(greeting, elevenLabsVoiceId, elSettings, SUPABASE_URL, elevenlabsModel, useSpeakerBoost);
    console.log('Greeting URL:', greetingUrl);

    // === STEP 3: Save pre-generated URL to database ===
    const { error: updateError } = await supabase
      .from('pranks')
      .update({
        pregenerated_greeting_url: greetingUrl,
        pregenerated_background_url: null,
        conversation_history: [{ role: 'assistant', content: greeting }],
        call_status: 'initiated'
      })
      .eq('id', prankId);

    if (updateError) {
      console.error('Failed to save pre-generated URLs:', updateError);
    } else {
      console.log('Pre-generated URLs saved successfully');
    }

    console.log('=== AUDIO PRE-GENERATED, NOW INITIATING CALL ===');

    // === STEP 4: Handle caller ID and phone number selection (same as before) ===
    const STALE_THRESHOLD_MS = 10 * 60 * 1000;
    const now = new Date();
    
    if (allVerifiedCallerIds && allVerifiedCallerIds.length > 0) {
      const staleCallerIds = allVerifiedCallerIds.filter(c => {
        if (c.current_calls <= 0) return false;
        const updatedAt = new Date(c.updated_at);
        return (now.getTime() - updatedAt.getTime()) > STALE_THRESHOLD_MS;
      });
      
      if (staleCallerIds.length > 0) {
        console.log('Resetting', staleCallerIds.length, 'stale caller IDs');
        for (const stale of staleCallerIds) {
          await supabase
            .from('verified_caller_ids')
            .update({ current_calls: 0 })
            .eq('id', stale.id);
          stale.current_calls = 0;
        }
      }
    }

    let selectedCallerId: string | null = null;
    let selectedCallerIdRecord: { id: string; phone_number: string; current_calls: number } | null = null;

    if (allVerifiedCallerIds && allVerifiedCallerIds.length > 0) {
      const availableCallerId = allVerifiedCallerIds.find(c => c.current_calls < c.max_concurrent_calls);
      if (availableCallerId) {
        selectedCallerId = availableCallerId.phone_number;
        selectedCallerIdRecord = availableCallerId;
        await supabase
          .from('verified_caller_ids')
          .update({ current_calls: availableCallerId.current_calls + 1 })
          .eq('id', availableCallerId.id);
      }
    }

    let selectedPhoneNumber = TWILIO_PHONE_NUMBER_FALLBACK;
    let selectedPhoneId: string | null = null;

    if (phoneNumbers && phoneNumbers.length > 0) {
      const preferredCountries = LANGUAGE_TO_COUNTRY_PRIORITY[prank.language] || ['US', 'GB'];
      let bestMatch = null;
      
      for (const countryCode of preferredCountries) {
        const matchingNumbers = phoneNumbers.filter(
          p => p.country_code === countryCode && p.current_calls < p.max_concurrent_calls
        );
        if (matchingNumbers.length > 0) {
          bestMatch = matchingNumbers.reduce((a, b) => a.current_calls < b.current_calls ? a : b);
          break;
        }
      }

      if (!bestMatch) {
        const availableNumbers = phoneNumbers.filter(p => p.current_calls < p.max_concurrent_calls);
        if (availableNumbers.length > 0) {
          bestMatch = availableNumbers.reduce((a, b) => a.current_calls < b.current_calls ? a : b);
        }
      }

      if (bestMatch) {
        selectedPhoneNumber = bestMatch.phone_number;
        selectedPhoneId = bestMatch.id;
        await supabase
          .from('twilio_phone_numbers')
          .update({ current_calls: bestMatch.current_calls + 1 })
          .eq('id', bestMatch.id);
      }
    }

    if (!selectedPhoneNumber) {
      throw new Error('No phone number available for calls');
    }

    const callerIdToUse = selectedCallerId || selectedPhoneNumber;

    // === STEP 5: Initiate Twilio call ===
    const webhookUrl = `${SUPABASE_URL}/functions/v1/twilio-voice?prankId=${prankId}`;
    const callerIdParam = selectedCallerIdRecord ? `&callerIdId=${selectedCallerIdRecord.id}` : '';
    const statusCallbackUrl = `${SUPABASE_URL}/functions/v1/twilio-status?phoneNumberId=${selectedPhoneId || ''}${callerIdParam}`;

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

    console.log('Twilio call initiated:', twilioData.sid);

    await supabase
      .from('pranks')
      .update({
        twilio_call_sid: twilioData.sid,
        call_status: 'initiated',
      })
      .eq('id', prankId);

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