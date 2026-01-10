import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { voiceSettingId, voiceId, stability, similarity, style, speed, language } = await req.json();

    if (!voiceSettingId || !voiceId) {
      return new Response(
        JSON.stringify({ error: "voiceSettingId and voiceId are required" }),
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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Supabase configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Sample text based on language
    const testTexts: Record<string, string> = {
      "Italiano": "Ciao! Sono pronto per fare scherzi telefonici divertentissimi!",
      "Napoletano": "Uè! So' pronto pe fa' scherzi telefonici spettacolari!",
      "Siciliano": "Talè! Sugnu prontu pi fari scherzi telefonici!",
      "Romano": "Aò! So' pronto pe fa' scherzi telefonici!",
      "Milanese": "Ciao! Son pront per fa scherzi telefonici!",
      "English": "Hello! I'm ready to make hilarious prank calls!",
      "Español": "¡Hola! ¡Estoy listo para hacer bromas telefónicas!",
      "Français": "Bonjour! Je suis prêt pour faire des farces téléphoniques!",
      "Deutsch": "Hallo! Ich bin bereit für Telefonstreiche!",
    };

    const testText = testTexts[language] || testTexts["Italiano"];

    console.log(`Generating sample for voice ${voiceId}...`);

    // Generate audio from ElevenLabs
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
    const audioBytes = new Uint8Array(audioBuffer);

    console.log("Audio generated, size:", audioBuffer.byteLength);

    // Upload to Supabase Storage
    const fileName = `voice-samples/${voiceSettingId}-${Date.now()}.mp3`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("temp-audio")
      .upload(fileName, audioBytes, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload audio", details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("temp-audio")
      .getPublicUrl(fileName);

    const sampleAudioUrl = publicUrlData.publicUrl;

    console.log("Audio uploaded to:", sampleAudioUrl);

    // Update voice_settings with the sample URL
    const { error: updateError } = await supabase
      .from("voice_settings")
      .update({ sample_audio_url: sampleAudioUrl })
      .eq("id", voiceSettingId);

    if (updateError) {
      console.error("Database update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update voice settings", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Voice setting updated successfully");

    return new Response(
      JSON.stringify({ 
        success: true,
        sampleAudioUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-voice-sample:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
