// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    const { prompt, duration, presetId } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Generating sound effect:', { prompt, duration, presetId });

    // Call ElevenLabs Sound Effects API
    const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: prompt,
        duration_seconds: duration || 5,
        prompt_influence: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs Sound Effects API error:', errorText);
      throw new Error(`ElevenLabs error: ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    
    // Convert to base64 safely (avoiding stack overflow for large buffers)
    const uint8Array = new Uint8Array(audioBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const audioBase64 = btoa(binary);
    
    console.log('Sound effect generated, size:', audioBuffer.byteLength);

    // If presetId provided, save to Supabase Storage and update preset
    if (presetId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Upload to storage
      const fileName = `sound-effects/${presetId}.mp3`;
      const { error: uploadError } = await supabase.storage
        .from('temp-audio')
        .upload(fileName, new Uint8Array(audioBuffer), {
          contentType: 'audio/mpeg',
          upsert: true
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
      } else {
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('temp-audio')
          .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;
        console.log('Sound effect uploaded:', publicUrl);

        // Update preset with URL
        const { error: updateError } = await supabase
          .from('prank_presets')
          .update({ 
            background_sound_url: publicUrl,
            background_sound_enabled: true 
          })
          .eq('id', presetId);

        if (updateError) {
          console.error('Preset update error:', updateError);
        }

        return new Response(JSON.stringify({ 
          success: true, 
          audioUrl: publicUrl,
          audioBase64 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Return base64 audio if no preset to save to
    return new Response(JSON.stringify({ 
      success: true, 
      audioBase64 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error generating sound effect:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
