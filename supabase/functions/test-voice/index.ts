import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { voiceId, stability, similarity, style, speed, text, language } = await req.json();

    if (!voiceId) {
      return new Response(
        JSON.stringify({ error: "Voice ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ElevenLabs API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default test text based on language
    const testTexts: Record<string, string> = {
      "Italiano": "Ciao! Questa è una prova della mia voce. Come ti sembra? Sono pronto per fare scherzi telefonici!",
      "Napoletano": "Uè! Chesta è na prova d'a voce mia. Comme te pare? So' pronto pe fa' scherzi!",
      "Siciliano": "Talè! Chista è na prova da me vuci. Comu ti pari? Sugnu prontu pi fari scherzi!",
      "Romano": "Aò! Questa è na prova de la voce mia. Come te sembra? So' pronto pe fa' scherzi!",
      "Milanese": "Ciao! Questa l'è una prova de la mia vos. Come te par? Son pront per fa scherzi!",
      "English": "Hello! This is a test of my voice. How does it sound? I'm ready to make prank calls!",
      "Español": "¡Hola! Esta es una prueba de mi voz. ¿Cómo te parece? ¡Estoy listo para hacer bromas telefónicas!",
      "Français": "Bonjour! Ceci est un test de ma voix. Comment ça sonne? Je suis prêt pour faire des farces téléphoniques!",
      "Deutsch": "Hallo! Dies ist ein Test meiner Stimme. Wie klingt es? Ich bin bereit für Telefonstreiche!",
    };

    const testText = text || testTexts[language] || testTexts["Italiano"];

    console.log(`Testing voice ${voiceId} with text: ${testText.substring(0, 50)}...`);

    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: testText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: stability ?? 0.5,
            similarity_boost: similarity ?? 0.75,
            style: style ?? 0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text();
      console.error("ElevenLabs error:", errorText);
      return new Response(
        JSON.stringify({ error: "ElevenLabs API error", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBuffer = await elevenLabsResponse.arrayBuffer();
    const base64Audio = btoa(
      new Uint8Array(audioBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    console.log("Audio generated successfully, size:", audioBuffer.byteLength);

    return new Response(
      JSON.stringify({ 
        audioUrl: `data:audio/mpeg;base64,${base64Audio}`,
        success: true 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in test-voice:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
