import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map voice gender to OpenAI voice
const getOpenAIVoice = (gender: string): string => {
  switch (gender) {
    case 'male': return 'ash';
    case 'female': return 'coral';
    case 'neutral': return 'alloy';
    default: return 'alloy';
  }
};

// Build system prompt from prank data
const buildSystemPrompt = (prank: any): string => {
  const languageMap: Record<string, string> = {
    'Italiano': 'Italian',
    'Napoletano': 'Neapolitan Italian dialect',
    'Siciliano': 'Sicilian Italian dialect',
    'Romano': 'Roman Italian dialect',
    'Milanese': 'Milanese Italian dialect',
    'English': 'English',
    'Español': 'Spanish',
    'Français': 'French',
    'Deutsch': 'German',
  };

  const toneMap: Record<string, string> = {
    'enthusiastic': 'very enthusiastic and excited',
    'serious': 'serious and professional',
    'angry': 'frustrated and slightly angry',
    'confused': 'confused and uncertain',
    'mysterious': 'mysterious and intriguing',
    'friendly': 'warm and friendly',
  };

  const language = languageMap[prank.language] || 'Italian';
  const tone = toneMap[prank.personality_tone] || 'enthusiastic';
  const creativity = prank.creativity_level > 70 ? 'very creative and unpredictable' : 
                     prank.creativity_level > 30 ? 'moderately creative' : 'straightforward';

  return `You are making a prank phone call. Your target is ${prank.victim_first_name} ${prank.victim_last_name}.

SCENARIO: ${prank.prank_theme}

IMPORTANT RULES:
1. Speak ONLY in ${language}
2. Your personality is ${tone}
3. Be ${creativity} with your responses
4. NEVER reveal this is a prank call
5. Stay in character at all times
6. Keep responses concise (2-3 sentences max)
7. React naturally to what the person says
8. If they get suspicious, deflect and continue the scenario
9. Maximum call duration: ${prank.max_duration} seconds

Start the conversation by introducing yourself according to the scenario. Be convincing!`;
};

serve(async (req) => {
  const url = new URL(req.url);
  const prankId = url.searchParams.get('prankId');

  console.log('Twilio voice webhook called for prank:', prankId);

  if (!prankId) {
    // Return basic TwiML error
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>Si è verificato un errore. Arrivederci.</Say>
        <Hangup/>
      </Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get prank details
    const { data: prank, error } = await supabase
      .from('pranks')
      .select('*')
      .eq('id', prankId)
      .single();

    if (error || !prank) {
      throw new Error('Prank not found');
    }

    console.log('Prank data loaded:', prank.victim_first_name, prank.prank_theme);

    // Update status to in_progress
    await supabase
      .from('pranks')
      .update({ call_status: 'in_progress' })
      .eq('id', prankId);

    // Get OpenAI Realtime session
    const sessionResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: getOpenAIVoice(prank.voice_gender),
        instructions: buildSystemPrompt(prank),
        input_audio_format: "g711_ulaw",
        output_audio_format: "g711_ulaw",
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 800,
        },
      }),
    });

    if (!sessionResponse.ok) {
      const errorData = await sessionResponse.text();
      console.error('OpenAI session error:', errorData);
      throw new Error('Failed to create OpenAI session');
    }

    const sessionData = await sessionResponse.json();
    console.log('OpenAI session created');

    // Return TwiML to connect to OpenAI via Media Streams
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Connect>
        <Stream url="wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17">
          <Parameter name="openai_api_key" value="${OPENAI_API_KEY}"/>
          <Parameter name="openai_session_id" value="${sessionData.id}"/>
        </Stream>
      </Connect>
    </Response>`;

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Error in voice webhook:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say language="it-IT">Mi scusi, c'è stato un problema tecnico. La richiamerò più tardi.</Say>
        <Hangup/>
      </Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
});
