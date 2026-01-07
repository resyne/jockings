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

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const url = new URL(req.url);
  const audioId = url.searchParams.get('id');

  // Store audio
  if (req.method === 'POST') {
    try {
      const { id, audio } = await req.json();
      
      if (!id || !audio) {
        return new Response(JSON.stringify({ error: 'Missing id or audio' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Decode base64 to Uint8Array
      const binaryString = atob(audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('temp-audio')
        .upload(`${id}.mp3`, bytes, {
          contentType: 'audio/mpeg',
          upsert: true
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return new Response(JSON.stringify({ error: 'Failed to store audio' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`Audio stored with id: ${id}, size: ${bytes.length} bytes`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error storing audio:', error);
      return new Response(JSON.stringify({ error: 'Failed to store audio' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // Retrieve audio
  if (req.method === 'GET' && audioId) {
    try {
      const { data, error } = await supabase.storage
        .from('temp-audio')
        .download(`${audioId}.mp3`);
      
      if (error || !data) {
        console.log(`Audio not found: ${audioId}`, error);
        return new Response('Audio not found', { 
          status: 404,
          headers: corsHeaders 
        });
      }

      const arrayBuffer = await data.arrayBuffer();
      console.log(`Serving audio: ${audioId}, size: ${arrayBuffer.byteLength} bytes`);

      // Delete after serving (cleanup)
      supabase.storage.from('temp-audio').remove([`${audioId}.mp3`]).catch(console.error);

      return new Response(arrayBuffer, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'audio/mpeg',
          'Content-Length': arrayBuffer.byteLength.toString(),
        }
      });
    } catch (error) {
      console.error('Error retrieving audio:', error);
      return new Response('Error retrieving audio', { 
        status: 500,
        headers: corsHeaders 
      });
    }
  }

  return new Response('Bad request', { 
    status: 400,
    headers: corsHeaders 
  });
});
