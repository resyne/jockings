import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// Map language/gender to VAPI voice
const getVapiVoice = (gender: string, language: string): { provider: string; voiceId: string } => {
  // VAPI supports multiple voice providers: 11labs, openai, deepgram, etc.
  // Using ElevenLabs voices for consistency
  const voiceMap: Record<string, Record<string, string>> = {
    'Italiano': { 
      male: 'onwK4e9ZLuTAKqWW03F9',  // Italian male ElevenLabs voice
      female: 'EXAVITQu4vr4xnSDxMaL' // Italian female ElevenLabs voice
    },
    'English': { 
      male: 'TX3LPaxmHKxFdv7VOQHJ',  // English male
      female: 'EXAVITQu4vr4xnSDxMaL' // English female
    },
  };
  
  const voiceId = voiceMap[language]?.[gender] || voiceMap['Italiano']?.['male'] || 'onwK4e9ZLuTAKqWW03F9';
  
  return {
    provider: '11labs',
    voiceId
  };
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

    console.log('=== INITIATING VAPI CALL ===');

    // Fetch prank data
    const { data: prank, error: prankError } = await supabase
      .from('pranks')
      .select('*')
      .eq('id', prankId)
      .single();

    if (prankError || !prank) {
      throw new Error('Prank not found');
    }

    console.log('Prank:', prank.id, 'Theme:', prank.prank_theme);

    // Build the system prompt
    const systemPrompt = buildSystemPrompt(prank);
    
    // Get voice configuration
    const voice = getVapiVoice(prank.voice_gender, prank.language);

    // Prepare VAPI call request
    // VAPI API docs: https://docs.vapi.ai/api-reference/calls/create-call
    const vapiPayload = {
      phoneNumberId: undefined, // Will need to be configured - VAPI phone number ID
      customer: {
        number: prank.victim_phone,
      },
      assistant: {
        name: "Prank Caller",
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: systemPrompt
            }
          ],
          temperature: 0.7,
        },
        voice: {
          provider: voice.provider,
          voiceId: voice.voiceId,
        },
        firstMessage: prank.language === 'Italiano' 
          ? `Pronto, ${getTimeBasedGreeting(prank.language).greeting}!`
          : `Hello, ${getTimeBasedGreeting(prank.language).greeting}!`,
        transcriber: {
          provider: "deepgram",
          model: "nova-2",
          language: prank.language === 'Italiano' ? 'it' : 'en',
        },
        endCallFunctionEnabled: true,
        recordingEnabled: true,
        maxDurationSeconds: prank.max_duration * 60,
      },
      // Status webhook for call updates
      serverUrl: `${SUPABASE_URL}/functions/v1/vapi-webhook?prankId=${prankId}`,
    };

    console.log('VAPI payload:', JSON.stringify(vapiPayload, null, 2));

    // Create VAPI call
    const vapiResponse = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vapiPayload),
    });

    const vapiData = await vapiResponse.json();

    if (!vapiResponse.ok) {
      console.error('VAPI error:', vapiData);
      throw new Error(vapiData.message || vapiData.error || 'Failed to initiate VAPI call');
    }

    console.log('VAPI call initiated:', vapiData.id);

    // Update prank with VAPI call ID
    await supabase
      .from('pranks')
      .update({
        twilio_call_sid: vapiData.id, // Reusing this field for VAPI call ID
        call_status: 'initiated',
        voice_provider: 'vapi',
      })
      .eq('id', prankId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        callId: vapiData.id,
        provider: 'vapi',
        message: 'VAPI call initiated successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error initiating VAPI call:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
