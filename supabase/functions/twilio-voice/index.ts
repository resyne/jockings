import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Language code mapping
const getLanguageCode = (language: string): string => {
  const langMap: Record<string, string> = {
    'Italiano': 'it-IT',
    'English': 'en-US',
  };
  return langMap[language] || 'it-IT';
};

// Map voice gender to Twilio Polly voice (fallback only)
const getTwilioPollyVoice = (gender: string, language: string): { voice: string; language: string } => {
  const voiceMap: Record<string, Record<string, string>> = {
    'it-IT': { male: 'Polly.Adriano-Neural', female: 'Polly.Bianca-Neural' },
    'en-US': { male: 'Polly.Matthew-Neural', female: 'Polly.Joanna-Neural' },
  };

  const lang = getLanguageCode(language);
  const voice = voiceMap[lang]?.[gender] || voiceMap['it-IT']?.['male'] || 'Polly.Adriano-Neural';
  
  return { voice, language: lang };
};

// ElevenLabs voice IDs mapped by gender and language (default fallback)
const getElevenLabsDefaultVoice = (gender: string, language: string): string => {
  // ElevenLabs multilingual voices - used only if no custom voice is selected
  const voiceMap: Record<string, Record<string, string>> = {
    'it-IT': { male: 'onwK4e9ZLuTAKqWW03F9', female: 'EXAVITQu4vr4xnSDxMaL' }, // Daniel, Sarah
    'en-US': { male: 'TX3LPaxmHKxFdv7VOQHJ', female: 'EXAVITQu4vr4xnSDxMaL' }, // Liam, Sarah
  };

  const lang = getLanguageCode(language);
  return voiceMap[lang]?.[gender] || voiceMap['it-IT']?.['male'] || 'onwK4e9ZLuTAKqWW03F9';
};

// ElevenLabs voice settings interface
interface ElevenLabsSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
}

// Generate audio using ElevenLabs API and store it, return the URL
const generateElevenLabsAudioUrl = async (
  text: string, 
  voiceId: string, 
  settings: ElevenLabsSettings
): Promise<string> => {
  const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  console.log('ElevenLabs settings:', settings);

  // Use eleven_turbo_v2_5 for faster generation (supports 32 languages including Italian)
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5', // Much faster than eleven_multilingual_v2
      voice_settings: {
        stability: settings.stability,
        similarity_boost: settings.similarity_boost,
        style: settings.style,
        use_speaker_boost: false, // Disable for faster processing
      },
      output_format: 'mp3_22050_32', // Lower quality but faster, fine for phone calls
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('ElevenLabs API error:', errorText);
    throw new Error('ElevenLabs TTS failed');
  }

  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Convert to base64 in chunks to avoid stack overflow
  let base64 = '';
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    base64 += String.fromCharCode.apply(null, Array.from(chunk));
  }
  const audioBase64 = btoa(base64);
  
  // Generate unique ID for this audio
  const audioId = crypto.randomUUID();
  
  // Store audio in serve-audio function
  const storeResponse = await fetch(`${SUPABASE_URL}/functions/v1/serve-audio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: audioId, audio: audioBase64 }),
  });

  if (!storeResponse.ok) {
    console.error('Failed to store audio:', await storeResponse.text());
    throw new Error('Failed to store audio');
  }

  console.log('Audio stored with ID:', audioId);
  
  // Return URL that Twilio can access
  return `${SUPABASE_URL}/functions/v1/serve-audio?id=${audioId}`;
};

// Get appropriate greeting based on time of day (Italy timezone)
const getTimeBasedGreeting = (language: string): { greeting: string; instruction: string } => {
  // Get current hour in Italy timezone (CET/CEST)
  const now = new Date();
  const italyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  const hour = italyTime.getHours();
  
  // In Italian: buongiorno until 18:00, then buonasera
  // In English: good morning until 12:00, good afternoon until 18:00, good evening after
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

  // Gender-specific instructions
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

  // Enhanced personality descriptions with specific behavior instructions
  const toneMap: Record<string, { description: string; behavior: string }> = {
    'enthusiastic': {
      description: 'extremely enthusiastic, excited, and over-the-top happy',
      behavior: 'Use exclamations! Speak fast with rising intonation. Show excessive excitement about everything. Use words like "fantastico!", "incredibile!", "meraviglioso!". Laugh easily. Be overly positive even about mundane things.'
    },
    'serious': {
      description: 'very serious, formal, and professional',
      behavior: 'Use formal language and titles. Speak in a measured, deliberate way. Avoid jokes or humor. Be direct and to the point. Use phrases like "mi permetta di", "è necessario che", "la informo che". Sound like a government official or lawyer.'
    },
    'angry': {
      description: 'frustrated, irritated, and increasingly angry',
      behavior: 'Start slightly annoyed and escalate your frustration. Use interruptions. Raise your tone. Express exasperation with sighs and "ma insomma!", "possibile che...", "ma lei non capisce!". Act like someone whos patience is running thin. Get defensive and accusatory.'
    },
    'confused': {
      description: 'confused, uncertain, and easily distracted',
      behavior: 'Frequently lose your train of thought. Say "aspetti... come dicevo?", "scusi, mi sono perso", "ma quindi...". Ask for clarification often. Mix up details. Sound genuinely befuddled. Pause mid-sentence. Contradict yourself occasionally.'
    },
    'mysterious': {
      description: 'mysterious, cryptic, and dramatically secretive',
      behavior: 'Speak in a low, conspiratorial tone. Use dramatic pauses. Say things like "non posso dire di più...", "ci sono cose che lei non sa...", "mi creda, è meglio così". Hint at secrets without revealing them. Be vague but intriguing.'
    },
    'friendly': {
      description: 'warm, friendly, and chatty like an old friend',
      behavior: 'Use informal language. Ask personal questions. Share unnecessary details about yourself. Use endearments like "caro mio", "tesoro". Laugh warmly. Show genuine interest in their life. Be nostalgic and reminiscent.'
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
8. React naturally but ALWAYS maintain your personality trait
9. If they get suspicious, deflect using your personality (angry = get more defensive, confused = get more lost, etc.)
10. Use the correct time-based greeting ("${timeGreeting.greeting}") when starting the call!
11. When introducing yourself, use REALISTIC Italian names - NEVER use generic names like "Mario Rossi", "Marco Rossi", "Giuseppe Bianchi", "Nunzio", etc. Use more authentic names like: Luca Ferretti, Alessandro Conti, Simone Marchetti, Davide Galli, Matteo Ricci (male) or Giulia Moretti, Francesca Lombardi, Chiara Santini, Elena Barbieri, Valentina Costa (female).

Respond with ONLY what you would say. Make your personality and gender OBVIOUS in how you speak.`;
};

serve(async (req) => {
  const url = new URL(req.url);
  const prankId = url.searchParams.get('prankId');
  const action = url.searchParams.get('action') || 'start';

  console.log('Twilio voice webhook called:', { prankId, action });

  if (!prankId) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say language="it-IT">Si è verificato un errore. Arrivederci.</Say>
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

    const voiceProvider = prank.voice_provider || 'openai';
    const langCode = getLanguageCode(prank.language);
    const pollyVoice = getTwilioPollyVoice(prank.voice_gender, prank.language);
    // Use custom voice ID if set, otherwise use default based on gender/language
    const customVoiceId = (prank as any).elevenlabs_voice_id;
    const elevenLabsVoiceId = customVoiceId || getElevenLabsDefaultVoice(prank.voice_gender, prank.language);
    
    console.log('ElevenLabs voice:', customVoiceId ? `custom (${elevenLabsVoiceId})` : `default (${elevenLabsVoiceId})`);
    const webhookBase = `https://vtsankkghplkfhrlxefs.supabase.co/functions/v1/twilio-voice`;
    
    // ElevenLabs settings from prank record
    const elSettings: ElevenLabsSettings = {
      stability: (prank as any).elevenlabs_stability ?? 0.5,
      similarity_boost: (prank as any).elevenlabs_similarity ?? 0.75,
      style: (prank as any).elevenlabs_style ?? 0,
      speed: (prank as any).elevenlabs_speed ?? 1.0,
    };
    
    console.log('Voice provider:', voiceProvider, 'Language:', langCode, 'EL Settings:', elSettings);

    if (action === 'start') {
      console.log('Starting prank call for:', prank.victim_first_name);
      
      // Fetch AI model setting from database
      const { data: aiModelSetting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'ai_model')
        .single();
      
      const aiModel = aiModelSetting?.value || 'openai/gpt-4o-mini';
      const useOpenAI = aiModel.startsWith('openai/') && !aiModel.includes('gpt-5');
      
      console.log('Using AI model:', aiModel, 'useOpenAI:', useOpenAI);
      
      // Run all operations in parallel for faster response
      const systemPrompt = buildSystemPrompt(prank);
      
      // Determine API endpoint and key based on model
      const apiUrl = useOpenAI 
        ? 'https://api.openai.com/v1/chat/completions'
        : 'https://ai.gateway.lovable.dev/v1/chat/completions';
      const apiKey = useOpenAI 
        ? OPENAI_API_KEY 
        : Deno.env.get('LOVABLE_API_KEY');
      
      // Map model names for OpenAI (gpt-4o-mini doesn't need prefix)
      const modelName = useOpenAI ? 'gpt-4o-mini' : aiModel;
      
      const [_, aiResponse, presetResult] = await Promise.all([
        // Update status (don't wait for result)
        supabase
          .from('pranks')
          .update({ call_status: 'in_progress' })
          .eq('id', prankId),
        // Generate greeting with AI
        fetch(apiUrl, {
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
        }),
        // Check for background sound (parallel, doesn't add latency)
        supabase
          .from('prank_presets')
          .select('background_sound_url')
          .eq('theme', prank.prank_theme)
          .eq('background_sound_enabled', true)
          .maybeSingle()
      ]);

      const aiData = await aiResponse.json();
      const greeting = aiData.choices[0]?.message?.content || 'Pronto, buongiorno!';
      const backgroundSoundUrl = presetResult.data?.background_sound_url;
      
      console.log('AI greeting:', greeting);
      if (backgroundSoundUrl) console.log('Background sound:', backgroundSoundUrl);

      // Generate TwiML based on voice provider
      let twiml: string;
      const bgSound = backgroundSoundUrl ? `<Play>${backgroundSoundUrl}</Play>` : '';
      
      // Only use ElevenLabs - no fallback to other voices
      const audioUrl = await generateElevenLabsAudioUrl(greeting, elevenLabsVoiceId, elSettings);
      
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        ${bgSound}
        <Play>${audioUrl}</Play>
        <Gather input="speech" language="${langCode}" timeout="4" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=1">
        </Gather>
        <Pause length="2"/>
        <Gather input="speech" language="${langCode}" timeout="4" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=1">
        </Gather>
        <Hangup/>
      </Response>`;

      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    if (action === 'respond') {
      // Parse form data from Twilio
      const formData = await req.formData();
      const speechResult = formData.get('SpeechResult') as string;
      const turn = parseInt(url.searchParams.get('turn') || '1');
      const useElevenLabs = url.searchParams.get('provider') === 'elevenlabs' || voiceProvider === 'elevenlabs';
      
      console.log('User said:', speechResult, 'Turn:', turn, 'Provider:', useElevenLabs ? 'elevenlabs' : 'polly');

      if (!speechResult) {
        // No speech detected, prompt again
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="${pollyVoice.voice}" language="${langCode}">Pronto? Mi sente?</Say>
          <Gather input="speech" language="${langCode}" timeout="5" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=${turn}${useElevenLabs ? '&amp;provider=elevenlabs' : ''}">
          </Gather>
          <Say voice="${pollyVoice.voice}" language="${langCode}">Sembra che la linea sia disturbata. Arrivederci.</Say>
          <Hangup/>
        </Response>`;
        return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
      }

      // Check if max duration/turns reached
      const maxTurns = Math.ceil(prank.max_duration / 15); // ~15 sec per turn
      if (turn >= maxTurns) {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="${pollyVoice.voice}" language="${langCode}">Va bene, devo andare. La richiamerò. Arrivederci!</Say>
          <Hangup/>
        </Response>`;
        return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
      }

      // Fetch AI model setting from database
      const { data: aiModelSetting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'ai_model')
        .single();
      
      const aiModel = aiModelSetting?.value || 'openai/gpt-4o-mini';
      const useOpenAI = aiModel.startsWith('openai/') && !aiModel.includes('gpt-5');
      
      // Generate AI response
      const systemPrompt = buildSystemPrompt(prank);
      
      const apiUrl = useOpenAI 
        ? 'https://api.openai.com/v1/chat/completions'
        : 'https://ai.gateway.lovable.dev/v1/chat/completions';
      const apiKey = useOpenAI 
        ? OPENAI_API_KEY 
        : Deno.env.get('LOVABLE_API_KEY');
      const modelName = useOpenAI ? 'gpt-4o-mini' : aiModel;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `The person said: "${speechResult}". Rispondi BREVEMENTE (max 1-2 frasi).` }
          ],
          max_tokens: 80,
          temperature: 0.7,
        }),
      });

      const aiData = await response.json();
      const aiResponse = aiData.choices[0]?.message?.content || 'Capisco, capisco...';
      
      console.log('AI response:', aiResponse);

      // Only use ElevenLabs - no fallback
      const audioUrl = await generateElevenLabsAudioUrl(aiResponse, elevenLabsVoiceId, elSettings);
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Play>${audioUrl}</Play>
        <Gather input="speech" language="${langCode}" timeout="5" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=${turn + 1}">
        </Gather>
        <Pause length="2"/>
        <Gather input="speech" language="${langCode}" timeout="3" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=${turn + 1}">
        </Gather>
        <Hangup/>
      </Response>`;

      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    throw new Error('Unknown action');

  } catch (error) {
    console.error('Error in voice webhook:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say language="it-IT">Mi scusi, c'è stato un problema tecnico. Arrivederci.</Say>
        <Hangup/>
      </Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
});

// Helper to escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
