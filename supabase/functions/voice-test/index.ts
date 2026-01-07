// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      userMessage, 
      conversationHistory, 
      language, 
      gender, 
      voiceId, 
      personality,
      elevenlabsSettings 
    } = await req.json();

    console.log('Voice test request:', { language, gender, voiceId, personality });

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not set');
    }

    // Get AI model from app_settings
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settingsData, error: settingsError } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['ai_model', 'elevenlabs_model']);

    if (settingsError) {
      console.warn('Settings fetch error:', settingsError);
    }

    const appSettings: Record<string, string> = {};
    settingsData?.forEach((s: { key: string; value: string }) => {
      if (s.value) appSettings[s.key] = s.value;
    });

    const aiModel = appSettings['ai_model'] || 'google/gemini-2.5-flash-lite';
    const elevenlabsModel = appSettings['elevenlabs_model'] || 'eleven_turbo_v2_5';
    console.log('Using AI model:', aiModel);
    console.log('Using ElevenLabs model:', elevenlabsModel);

    // Determine API endpoint and key based on model
    // Lovable AI handles: google/* models and openai/gpt-5*
    // OpenAI API handles: openai/gpt-4o* and other OpenAI models
    const isLovableAI = aiModel.startsWith('google/') || aiModel.includes('gpt-5');
    const apiEndpoint = isLovableAI 
      ? 'https://ai.gateway.lovable.dev/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
    const apiKey = isLovableAI ? LOVABLE_API_KEY : OPENAI_API_KEY;

    // Strip prefix for OpenAI API (e.g., "openai/gpt-4o-mini" -> "gpt-4o-mini")
    const modelName = isLovableAI ? aiModel : aiModel.replace('openai/', '');
    console.log('API endpoint:', apiEndpoint, 'Model name:', modelName);

    if (!apiKey) {
      throw new Error(isLovableAI ? 'LOVABLE_API_KEY is not set' : 'OPENAI_API_KEY is not set');
    }

    // Build system prompt
    const genderDesc = gender === 'male' ? 'un UOMO (maschio)' : 'una DONNA (femmina)';
    const langDesc = language === 'Italiano' ? 'italiano' : 'inglese';
    
    const toneMap: Record<string, string> = {
      'enthusiastic': 'estremamente entusiasta, eccitato e felice',
      'serious': 'molto serio, formale e professionale',
      'angry': 'frustrato, irritato e sempre più arrabbiato',
      'confused': 'confuso, incerto e facilmente distratto',
      'mysterious': 'misterioso, criptico e drammaticamente segreto',
      'friendly': 'caldo, amichevole e chiacchierone come un vecchio amico',
    };
    const tone = toneMap[personality] || toneMap['friendly'];

    const systemPrompt = `Sei ${genderDesc} che sta testando una configurazione vocale per chiamate.
Hai una personalità ${tone}.
Parla SOLO in ${langDesc}.
Mantieni le risposte BREVI (1-2 frasi).
Agisci naturalmente come in una conversazione telefonica casuale.
Usa le forme grammaticali appropriate per il genere ${gender === 'male' ? 'maschile' : 'femminile'}.`;

    // Build messages array with history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []),
      { role: 'user', content: userMessage }
    ];

    // Call AI API
    console.log('Calling AI API...');
    const aiResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiText = aiData.choices?.[0]?.message?.content || 'Mi dispiace, non ho capito.';
    console.log('AI response:', aiText);

    // Generate ElevenLabs audio
    const voiceParams = (elevenlabsSettings ?? {}) as { stability?: number; similarity?: number; style?: number; speed?: number };
    const stability = (voiceParams.stability ?? 50) / 100;
    const similarityBoost = (voiceParams.similarity ?? 75) / 100;
    const style = (voiceParams.style ?? 0) / 100;
    const speed = voiceParams.speed ?? 1.0;

    console.log('Generating ElevenLabs audio with voice:', voiceId);
    const elevenlabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: aiText,
          model_id: elevenlabsModel,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: false,
            speed,
          },
        }),
      }
    );

    if (!elevenlabsResponse.ok) {
      const errorText = await elevenlabsResponse.text();
      console.error('ElevenLabs error:', elevenlabsResponse.status, errorText);
      throw new Error(`ElevenLabs error: ${elevenlabsResponse.status}`);
    }

    // Convert audio to base64
    const audioBuffer = await elevenlabsResponse.arrayBuffer();
    const uint8Array = new Uint8Array(audioBuffer);
    
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const audioBase64 = btoa(binary);

    console.log('Audio generated, size:', audioBuffer.byteLength);

    return new Response(JSON.stringify({ 
      text: aiText,
      audio: audioBase64,
      model: aiModel
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
