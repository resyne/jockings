import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map voice gender to Twilio voice
const getTwilioVoice = (gender: string, language: string): { voice: string; language: string } => {
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

  const voiceMap: Record<string, Record<string, string>> = {
    'it-IT': { male: 'Polly.Giorgio', female: 'Polly.Carla', neutral: 'Polly.Giorgio' },
    'en-US': { male: 'Polly.Matthew', female: 'Polly.Joanna', neutral: 'Polly.Matthew' },
    'es-ES': { male: 'Polly.Enrique', female: 'Polly.Conchita', neutral: 'Polly.Enrique' },
    'fr-FR': { male: 'Polly.Mathieu', female: 'Polly.Celine', neutral: 'Polly.Mathieu' },
    'de-DE': { male: 'Polly.Hans', female: 'Polly.Marlene', neutral: 'Polly.Hans' },
  };

  const lang = langMap[language] || 'it-IT';
  const voice = voiceMap[lang]?.[gender] || voiceMap[lang]?.['male'] || 'Polly.Giorgio';
  
  return { voice, language: lang };
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

    const voiceConfig = getTwilioVoice(prank.voice_gender, prank.language);
    const webhookBase = `https://vtsankkghplkfhrlxefs.supabase.co/functions/v1/twilio-voice`;

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

      // Say greeting and gather response
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="${voiceConfig.voice}" language="${voiceConfig.language}">${escapeXml(greeting)}</Say>
        <Gather input="speech" language="${voiceConfig.language}" timeout="5" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=1">
          <Say voice="${voiceConfig.voice}" language="${voiceConfig.language}"></Say>
        </Gather>
        <Say voice="${voiceConfig.voice}" language="${voiceConfig.language}">Pronto? Mi sente?</Say>
        <Gather input="speech" language="${voiceConfig.language}" timeout="5" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=1">
        </Gather>
        <Say voice="${voiceConfig.voice}" language="${voiceConfig.language}">Va bene, la richiamerò. Arrivederci.</Say>
        <Hangup/>
      </Response>`;

      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    if (action === 'respond') {
      // Parse form data from Twilio
      const formData = await req.formData();
      const speechResult = formData.get('SpeechResult') as string;
      const turn = parseInt(url.searchParams.get('turn') || '1');
      
      console.log('User said:', speechResult, 'Turn:', turn);

      if (!speechResult) {
        // No speech detected, prompt again
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="${voiceConfig.voice}" language="${voiceConfig.language}">Pronto? Mi sente?</Say>
          <Gather input="speech" language="${voiceConfig.language}" timeout="5" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=${turn}">
          </Gather>
          <Say voice="${voiceConfig.voice}" language="${voiceConfig.language}">Sembra che la linea sia disturbata. Arrivederci.</Say>
          <Hangup/>
        </Response>`;
        return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
      }

      // Check if max duration/turns reached
      const maxTurns = Math.ceil(prank.max_duration / 15); // ~15 sec per turn
      if (turn >= maxTurns) {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="${voiceConfig.voice}" language="${voiceConfig.language}">Va bene, devo andare. La richiamerò. Arrivederci!</Say>
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

      // Continue conversation
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="${voiceConfig.voice}" language="${voiceConfig.language}">${escapeXml(aiResponse)}</Say>
        <Gather input="speech" language="${voiceConfig.language}" timeout="5" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=${turn + 1}">
        </Gather>
        <Say voice="${voiceConfig.voice}" language="${voiceConfig.language}">Pronto?</Say>
        <Gather input="speech" language="${voiceConfig.language}" timeout="3" speechTimeout="auto" action="${webhookBase}?prankId=${prankId}&amp;action=respond&amp;turn=${turn + 1}">
        </Gather>
        <Say voice="${voiceConfig.voice}" language="${voiceConfig.language}">Va bene, la richiamerò. Arrivederci.</Say>
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
