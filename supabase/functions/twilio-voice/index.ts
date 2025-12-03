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
    'Napoletano': 'it-IT',
    'Siciliano': 'it-IT',
    'Romano': 'it-IT',
    'Milanese': 'it-IT',
    'English': 'en-US',
    'Español': 'es-ES',
    'Français': 'fr-FR',
    'Deutsch': 'de-DE',
  };
  return langMap[language] || 'it-IT';
};

// Map voice gender to Twilio Polly voice
const getTwilioPollyVoice = (gender: string, language: string): { voice: string; language: string } => {
  const voiceMap: Record<string, Record<string, string>> = {
    'it-IT': { male: 'Polly.Adriano-Neural', female: 'Polly.Bianca-Neural', neutral: 'Polly.Adriano-Neural' },
    'en-US': { male: 'Polly.Matthew-Neural', female: 'Polly.Joanna-Neural', neutral: 'Polly.Matthew-Neural' },
    'es-ES': { male: 'Polly.Sergio-Neural', female: 'Polly.Lucia-Neural', neutral: 'Polly.Sergio-Neural' },
    'fr-FR': { male: 'Polly.Remi-Neural', female: 'Polly.Lea-Neural', neutral: 'Polly.Remi-Neural' },
    'de-DE': { male: 'Polly.Daniel-Neural', female: 'Polly.Vicki-Neural', neutral: 'Polly.Daniel-Neural' },
  };

  const lang = getLanguageCode(language);
  const voice = voiceMap[lang]?.[gender] || voiceMap[lang]?.['male'] || 'Polly.Adriano-Neural';
  
  return { voice, language: lang };
};

// ElevenLabs voice IDs mapped by gender and language (default fallback)
const getElevenLabsDefaultVoice = (gender: string, language: string): string => {
  // ElevenLabs multilingual voices - used only if no custom voice is selected
  const voiceMap: Record<string, Record<string, string>> = {
    'it-IT': { male: 'onwK4e9ZLuTAKqWW03F9', female: 'EXAVITQu4vr4xnSDxMaL', neutral: 'CwhRBWXzGAHq8TQ4Fs17' }, // Daniel, Sarah, Roger
    'en-US': { male: 'TX3LPaxmHKxFdv7VOQHJ', female: 'EXAVITQu4vr4xnSDxMaL', neutral: 'CwhRBWXzGAHq8TQ4Fs17' }, // Liam, Sarah, Roger
    'es-ES': { male: 'onwK4e9ZLuTAKqWW03F9', female: 'pFZP5JQG7iQjIQuC4Bku', neutral: 'CwhRBWXzGAHq8TQ4Fs17' }, // Daniel, Lily, Roger
    'fr-FR': { male: 'onwK4e9ZLuTAKqWW03F9', female: 'XrExE9yKIg1WjnnlVkGX', neutral: 'CwhRBWXzGAHq8TQ4Fs17' }, // Daniel, Matilda, Roger
    'de-DE': { male: 'nPczCjzI2devNBz1zQrb', female: 'XB0fDUnXU5powFXDhCwa', neutral: 'CwhRBWXzGAHq8TQ4Fs17' }, // Brian, Charlotte, Roger
  };

  const lang = getLanguageCode(language);
  return voiceMap[lang]?.[gender] || voiceMap[lang]?.['male'] || 'onwK4e9ZLuTAKqWW03F9';
};

// ElevenLabs voice settings interface
interface ElevenLabsSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
}

// Generate audio using ElevenLabs API and return base64
const generateElevenLabsAudio = async (
  text: string, 
  voiceId: string, 
  settings: ElevenLabsSettings
): Promise<string> => {
  const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
  
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  console.log('ElevenLabs settings:', settings);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: settings.stability,
        similarity_boost: settings.similarity_boost,
        style: settings.style,
        use_speaker_boost: true,
      },
      // Speed is applied via output settings
      output_format: 'mp3_44100_128',
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
  
  return btoa(base64);
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
6. Keep responses concise (1-2 sentences max, under 100 words)
7. React naturally to what the person says
8. If they get suspicious, deflect and continue the scenario

Respond with ONLY what you would say, no additional text or explanations.`;
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
      
      // Update status to in_progress
      await supabase
        .from('pranks')
        .update({ call_status: 'in_progress' })
        .eq('id', prankId);

      // Generate initial greeting with AI
      const systemPrompt = buildSystemPrompt(prank);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Start the conversation with your opening line. Introduce yourself according to the scenario.' }
          ],
          max_tokens: 150,
          temperature: 0.8,
        }),
      });

      const aiData = await response.json();
      const greeting = aiData.choices[0]?.message?.content || 'Pronto, buongiorno!';
      
      console.log('AI greeting:', greeting);

      // Generate TwiML based on voice provider
      let twiml: string;
      
      if (voiceProvider === 'elevenlabs') {
        try {
          const audioBase64 = await generateElevenLabsAudio(greeting, elevenLabsVoiceId, elSettings);
          const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
          
          // ElevenLabs: Use Play with base64 audio
          twiml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Play>data:audio/mpeg;base64,${audioBase64}</Play>
            <Gather input="speech" language="${langCode}" timeout="5" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=1&amp;provider=elevenlabs">
            </Gather>
            <Say voice="${pollyVoice.voice}" language="${langCode}">Pronto? Mi sente?</Say>
            <Gather input="speech" language="${langCode}" timeout="5" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=1&amp;provider=elevenlabs">
            </Gather>
            <Say voice="${pollyVoice.voice}" language="${langCode}">Va bene, la richiamerò. Arrivederci.</Say>
            <Hangup/>
          </Response>`;
        } catch (elevenLabsError) {
          console.error('ElevenLabs error, falling back to Polly:', elevenLabsError);
          // Fallback to Polly
          twiml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="${pollyVoice.voice}" language="${pollyVoice.language}">${escapeXml(greeting)}</Say>
            <Gather input="speech" language="${langCode}" timeout="5" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=1">
            </Gather>
            <Say voice="${pollyVoice.voice}" language="${langCode}">Pronto? Mi sente?</Say>
            <Gather input="speech" language="${langCode}" timeout="5" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=1">
            </Gather>
            <Say voice="${pollyVoice.voice}" language="${langCode}">Va bene, la richiamerò. Arrivederci.</Say>
            <Hangup/>
          </Response>`;
        }
      } else {
        // OpenAI/Polly voice
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="${pollyVoice.voice}" language="${pollyVoice.language}">${escapeXml(greeting)}</Say>
          <Gather input="speech" language="${langCode}" timeout="5" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=1">
          </Gather>
          <Say voice="${pollyVoice.voice}" language="${langCode}">Pronto? Mi sente?</Say>
          <Gather input="speech" language="${langCode}" timeout="5" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=1">
          </Gather>
          <Say voice="${pollyVoice.voice}" language="${langCode}">Va bene, la richiamerò. Arrivederci.</Say>
          <Hangup/>
        </Response>`;
      }

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

      // Generate AI response
      const systemPrompt = buildSystemPrompt(prank);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `The person said: "${speechResult}". Respond naturally in character.` }
          ],
          max_tokens: 150,
          temperature: 0.8,
        }),
      });

      const aiData = await response.json();
      const aiResponse = aiData.choices[0]?.message?.content || 'Capisco, capisco...';
      
      console.log('AI response:', aiResponse);

      // Continue conversation based on provider
      let twiml: string;
      
      if (useElevenLabs) {
        try {
          const audioBase64 = await generateElevenLabsAudio(aiResponse, elevenLabsVoiceId, elSettings);
          twiml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Play>data:audio/mpeg;base64,${audioBase64}</Play>
            <Gather input="speech" language="${langCode}" timeout="5" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=${turn + 1}&amp;provider=elevenlabs">
            </Gather>
            <Say voice="${pollyVoice.voice}" language="${langCode}">Pronto?</Say>
            <Gather input="speech" language="${langCode}" timeout="3" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=${turn + 1}&amp;provider=elevenlabs">
            </Gather>
            <Say voice="${pollyVoice.voice}" language="${langCode}">Va bene, la richiamerò. Arrivederci.</Say>
            <Hangup/>
          </Response>`;
        } catch (elevenLabsError) {
          console.error('ElevenLabs error in respond, falling back:', elevenLabsError);
          twiml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="${pollyVoice.voice}" language="${langCode}">${escapeXml(aiResponse)}</Say>
            <Gather input="speech" language="${langCode}" timeout="5" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=${turn + 1}">
            </Gather>
            <Say voice="${pollyVoice.voice}" language="${langCode}">Pronto?</Say>
            <Gather input="speech" language="${langCode}" timeout="3" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=${turn + 1}">
            </Gather>
            <Say voice="${pollyVoice.voice}" language="${langCode}">Va bene, la richiamerò. Arrivederci.</Say>
            <Hangup/>
          </Response>`;
        }
      } else {
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="${pollyVoice.voice}" language="${langCode}">${escapeXml(aiResponse)}</Say>
          <Gather input="speech" language="${langCode}" timeout="5" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=${turn + 1}">
          </Gather>
          <Say voice="${pollyVoice.voice}" language="${langCode}">Pronto?</Say>
          <Gather input="speech" language="${langCode}" timeout="3" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=${turn + 1}">
          </Gather>
          <Say voice="${pollyVoice.voice}" language="${langCode}">Va bene, la richiamerò. Arrivederci.</Say>
          <Hangup/>
        </Response>`;
      }

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
