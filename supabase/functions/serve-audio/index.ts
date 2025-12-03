import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache for audio (will be cleared on function restart)
const audioCache = new Map<string, { data: Uint8Array; timestamp: number }>();

// Clean old entries (older than 5 minutes)
const cleanOldEntries = () => {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes
  for (const [key, value] of audioCache.entries()) {
    if (now - value.timestamp > maxAge) {
      audioCache.delete(key);
    }
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

      audioCache.set(id, { data: bytes, timestamp: Date.now() });
      cleanOldEntries();

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
    const cached = audioCache.get(audioId);
    
    if (!cached) {
      console.log(`Audio not found: ${audioId}`);
      return new Response('Audio not found', { 
        status: 404,
        headers: corsHeaders 
      });
    }

    console.log(`Serving audio: ${audioId}, size: ${cached.data.length} bytes`);

    return new Response(new Uint8Array(cached.data).buffer as ArrayBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Content-Length': cached.data.length.toString(),
      }
    });
  }

  return new Response('Bad request', { 
    status: 400,
    headers: corsHeaders 
  });
});
