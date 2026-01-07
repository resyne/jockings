import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm";

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
  settings: ElevenLabsSettings,
  modelId: string = 'eleven_turbo_v2_5',
  useSpeakerBoost: boolean = false
): Promise<string> => {
  const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  console.log('ElevenLabs - Model:', modelId, 'SpeakerBoost:', useSpeakerBoost, 'Settings:', settings);

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

// Build system prompt from prank data - OPTIMIZED for speed
const buildSystemPrompt = (prank: any): string => {
  const isItalian = prank.language === 'Italiano';
  const isMale = prank.voice_gender === 'male';
  const timeGreeting = getTimeBasedGreeting(prank.language);

  // Compact personality instructions
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

  return `Scherzo telefonico a ${prank.victim_first_name}. SCENARIO: ${prank.prank_theme}

Sei ${gender}. Parla SOLO in ${lang}. Saluto: "${timeGreeting.greeting}".
Personalità: ${tone}

REGOLE: Max 1-2 frasi. Mai rivelare lo scherzo. Nomi realistici (NO Mario Rossi). Rispondi SOLO con quello che diresti.`;
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

    // Get prank details and global voice settings in parallel
    const [prankResult, globalSettingsResult] = await Promise.all([
      supabase.from('pranks').select('*').eq('id', prankId).single(),
      supabase.from('app_settings').select('key, value').in('key', ['elevenlabs_stability', 'elevenlabs_similarity', 'elevenlabs_style', 'elevenlabs_speed', 'elevenlabs_speaker_boost', 'elevenlabs_model'])
    ]);

    const { data: prank, error } = prankResult;
    const globalVoiceSettings = globalSettingsResult.data || [];

    if (error || !prank) {
      throw new Error('Prank not found');
    }

    // Parse global settings
    const globalSettings: Record<string, string> = {};
    globalVoiceSettings.forEach((s: { key: string; value: string }) => {
      globalSettings[s.key] = s.value;
    });

    const voiceProvider = prank.voice_provider || 'openai';
    const langCode = getLanguageCode(prank.language);
    const pollyVoice = getTwilioPollyVoice(prank.voice_gender, prank.language);
    const customVoiceId = (prank as any).elevenlabs_voice_id;
    const elevenLabsVoiceId = customVoiceId || getElevenLabsDefaultVoice(prank.voice_gender, prank.language);
    
    console.log('ElevenLabs voice:', customVoiceId ? `custom (${elevenLabsVoiceId})` : `default (${elevenLabsVoiceId})`);
    const webhookBase = `https://vtsankkghplkfhrlxefs.supabase.co/functions/v1/twilio-voice`;
    
    // Use GLOBAL ElevenLabs settings from app_settings
    const elSettings: ElevenLabsSettings = {
      stability: parseFloat(globalSettings['elevenlabs_stability']) || 0.5,
      similarity_boost: parseFloat(globalSettings['elevenlabs_similarity']) || 0.75,
      style: parseFloat(globalSettings['elevenlabs_style']) || 0,
      speed: parseFloat(globalSettings['elevenlabs_speed']) || 1.0,
    };
    
    const elevenlabsModel = globalSettings['elevenlabs_model'] || 'eleven_turbo_v2_5';
    const useSpeakerBoost = globalSettings['elevenlabs_speaker_boost'] === 'true';
    
    console.log('GLOBAL ElevenLabs settings:', elSettings, 'Model:', elevenlabsModel);

    if (action === 'start') {
      console.log('Starting prank call for:', prank.victim_first_name);
      
      // Check for pre-generated audio URL (from initiate-call)
      const pregeneratedGreetingUrl = (prank as any).pregenerated_greeting_url;
      
      if (pregeneratedGreetingUrl) {
        console.log('Using pre-generated audio - FAST PATH');
        console.log('Greeting URL:', pregeneratedGreetingUrl);
        
        // Update status to in_progress
        await supabase
          .from('pranks')
          .update({ call_status: 'in_progress' })
          .eq('id', prankId);
        
        // Build TwiML with pre-generated audio
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Play>${pregeneratedGreetingUrl}</Play>
          <Gather input="speech" language="${langCode}" timeout="4" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=1">
          </Gather>
          <Pause length="2"/>
          <Gather input="speech" language="${langCode}" timeout="4" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=1">
          </Gather>
          <Hangup/>
        </Response>`;
        
        return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
      }
      
      // FALLBACK: Generate audio on-the-fly (should rarely happen now)
      console.log('No pre-generated audio found - SLOW PATH (fallback)');
      
      // Fetch AI model setting from database
      const { data: aiModelSetting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'ai_model')
        .single();
      
      const aiModel = aiModelSetting?.value || 'google/gemini-2.5-flash-lite';
      const useOpenAI = aiModel.startsWith('openai/') && !aiModel.includes('gpt-5');
      
      const systemPrompt = buildSystemPrompt(prank);
      
      const apiUrl = useOpenAI 
        ? 'https://api.openai.com/v1/chat/completions'
        : 'https://ai.gateway.lovable.dev/v1/chat/completions';
      const apiKey = useOpenAI 
        ? OPENAI_API_KEY 
        : Deno.env.get('LOVABLE_API_KEY');
      const modelName = useOpenAI ? 'gpt-4o-mini' : aiModel;
      
      const [_, aiResponse] = await Promise.all([
        supabase
          .from('pranks')
          .update({ call_status: 'in_progress', conversation_history: [] })
          .eq('id', prankId),
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
        })
      ]);

      const aiData = await aiResponse.json();
      const greeting = aiData.choices[0]?.message?.content || 'Pronto, buongiorno!';
      
      console.log('AI greeting (fallback):', greeting);

      await supabase
        .from('pranks')
        .update({ 
          conversation_history: [{ role: 'assistant', content: greeting }] 
        })
        .eq('id', prankId);

      const audioUrl = await generateElevenLabsAudioUrl(greeting, elevenLabsVoiceId, elSettings);
      
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
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

      // Fetch AI model setting and conversation history from database
      const [aiModelResult, historyResult] = await Promise.all([
        supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'ai_model')
          .single(),
        supabase
          .from('pranks')
          .select('conversation_history')
          .eq('id', prankId)
          .single()
      ]);
      
      const aiModel = aiModelResult.data?.value || 'google/gemini-2.5-flash';
      const conversationHistory = (historyResult.data?.conversation_history as any[]) || [];
      
      // Determine if we should use Lovable AI gateway
      // Lovable AI supports google/* and openai/gpt-5* models
      const isLovableAI = aiModel.startsWith('google/') || aiModel.startsWith('openai/gpt-5');
      
      // For OpenAI direct API, strip the "openai/" prefix from model names
      let modelName = aiModel;
      if (!isLovableAI && aiModel.startsWith('openai/')) {
        modelName = aiModel.replace('openai/', '');
      }
      
      console.log('Using AI model:', modelName, 'isLovableAI:', isLovableAI);
      console.log('Conversation history length:', conversationHistory.length);
      
      // Generate AI response with full conversation context
      const systemPrompt = buildSystemPrompt(prank);
      
      const apiUrl = isLovableAI 
        ? 'https://ai.gateway.lovable.dev/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
      const apiKey = isLovableAI 
        ? Deno.env.get('LOVABLE_API_KEY') 
        : OPENAI_API_KEY;
      
      // Build messages with full conversation history
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: speechResult }
      ];
      
      console.log('Sending to AI with', messages.length, 'messages');
      
      const requestBody: any = {
        model: modelName,
        messages,
        max_tokens: 100, // Reduced for faster responses
      };
      
      // Only add temperature for models that support it (not GPT-5 or newer)
      if (!modelName.includes('gpt-5') && !modelName.includes('o3') && !modelName.includes('o4')) {
        requestBody.temperature = 0.8;
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const aiData = await response.json();
      
      // Log full response for debugging
      if (!response.ok || !aiData.choices || !aiData.choices[0]) {
        console.error('AI API error:', JSON.stringify(aiData));
      }
      
      const aiResponse = aiData.choices?.[0]?.message?.content || 'Capisco, capisco...';
      
      console.log('AI response:', aiResponse);

      // Update conversation history and generate audio in parallel for speed
      const updatedHistory = [
        ...conversationHistory,
        { role: 'user', content: speechResult },
        { role: 'assistant', content: aiResponse }
      ];
      
      // Generate both audio files in parallel to reduce latency
      const stillThereText = prank.language === 'Italiano' ? 'Pronto?' : 'Hello?';
      
      const [_, audioUrl, stillThereAudioUrl] = await Promise.all([
        supabase
          .from('pranks')
          .update({ conversation_history: updatedHistory })
          .eq('id', prankId),
        generateElevenLabsAudioUrl(aiResponse, elevenLabsVoiceId, elSettings),
        generateElevenLabsAudioUrl(stillThereText, elevenLabsVoiceId, elSettings)
      ]);
      
      console.log('Generated audio URLs in parallel');
      
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Play>${audioUrl}</Play>
        <Gather input="speech" language="${langCode}" timeout="8" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=${turn + 1}">
        </Gather>
        <Pause length="2"/>
        <Play>${stillThereAudioUrl}</Play>
        <Gather input="speech" language="${langCode}" timeout="6" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=${turn + 1}">
        </Gather>
        <Hangup/>
      </Response>`;
      
      console.log('Returning TwiML for turn', turn + 1);

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
