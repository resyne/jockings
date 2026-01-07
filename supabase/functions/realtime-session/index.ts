import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const { language, gender, voiceId, personality } = await req.json();
    
    console.log('Creating realtime session for:', { language, gender, voiceId, personality });

    // Build the system prompt for testing
    const languageMap: Record<string, string> = {
      'Italiano': 'Italian',
      'English': 'English',
    };
    
    const genderMap: Record<string, string> = {
      'male': 'a MAN (male)',
      'female': 'a WOMAN (female)',
    };

    const toneMap: Record<string, string> = {
      'enthusiastic': 'extremely enthusiastic, excited, and over-the-top happy',
      'serious': 'very serious, formal, and professional',
      'angry': 'frustrated, irritated, and increasingly angry',
      'confused': 'confused, uncertain, and easily distracted',
      'mysterious': 'mysterious, cryptic, and dramatically secretive',
      'friendly': 'warm, friendly, and chatty like an old friend',
    };

    const lang = languageMap[language] || 'Italian';
    const genderDesc = genderMap[gender] || genderMap['male'];
    const tone = toneMap[personality] || toneMap['friendly'];

    const systemPrompt = `You are testing a prank call voice configuration. 
You are ${genderDesc} with a ${tone} personality.
Speak ONLY in ${lang}.
Keep responses short (1-2 sentences).
Act naturally as if you're having a casual phone conversation.
If the user mentions they're testing, acknowledge it briefly and continue the conversation naturally.
Use appropriate grammatical gender forms for ${lang}.`;

    // Map our personality to OpenAI voice
    const voiceMap: Record<string, string> = {
      'male': 'echo',
      'female': 'shimmer',
    };
    const openaiVoice = voiceMap[gender] || 'echo';

    // Request an ephemeral token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: openaiVoice,
        instructions: systemPrompt,
        input_audio_transcription: {
          model: "whisper-1"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 800
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Session created successfully");
    
    return new Response(JSON.stringify(data), {
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
