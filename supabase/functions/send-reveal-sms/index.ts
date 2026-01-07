import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Array of fun reveal messages in Italian
const REVEAL_MESSAGES = [
  "😂 SORPRESA! Eri appena vittima di uno scherzo telefonico AI creato con sarano.ai! Il tuo \"amico\" {senderPhone} ti ha fatto un regalo speciale 🎁",
  "🎭 SCHERZO SVELATO! Quella chiamata era uno scherzo AI da sarano.ai! Ringrazia {senderPhone} per la risata 😜",
  "🤖 GOTCHA! Era tutto uno scherzo AI fatto con sarano.ai! {senderPhone} ti ha beccato 🎉",
  "📞 Quella chiamata era uno SCHERZO AI! Fatto con sarano.ai per te da {senderPhone}. Ora tocca a te vendicarti! 😈",
  "🎪 RIVELAZIONE: sei stato/a scherzato/a dall'AI di sarano.ai! Mandante: {senderPhone}. Ci sei cascato/a? 🙈",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prankId } = await req.json();

    if (!prankId) {
      console.error("Missing prankId");
      return new Response(JSON.stringify({ error: "Missing prankId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("=== SEND REVEAL SMS ===");
    console.log("Prank ID:", prankId);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get prank data with decrypted victim phone using the RPC function
    const { data: pranksDecrypted, error: prankError } = await supabase
      .rpc("get_user_pranks_decrypted");

    // Find the specific prank from the decrypted results
    const prank = pranksDecrypted?.find((p: { id: string }) => p.id === prankId);

    if (prankError || !prank) {
      console.error("Error fetching prank:", prankError);
      return new Response(JSON.stringify({ error: "Prank not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if send_reveal_sms is enabled
    const { data: prankFull } = await supabase
      .from("pranks")
      .select("send_reveal_sms, user_id")
      .eq("id", prankId)
      .single();

    if (!prankFull?.send_reveal_sms) {
      console.log("Reveal SMS not enabled for this prank");
      return new Response(JSON.stringify({ success: false, message: "Reveal SMS not enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the sender's phone number from their profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("phone_number")
      .eq("user_id", prankFull.user_id)
      .single();

    if (profileError || !profile?.phone_number) {
      console.error("Error fetching sender profile or phone not verified:", profileError);
      return new Response(JSON.stringify({ error: "Sender phone not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const victimPhone = prank.victim_phone as string;
    const senderPhone = profile.phone_number;

    if (!victimPhone) {
      console.error("Victim phone not found");
      return new Response(JSON.stringify({ error: "Victim phone not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick a random reveal message
    const randomMessage = REVEAL_MESSAGES[Math.floor(Math.random() * REVEAL_MESSAGES.length)];
    const smsBody = randomMessage.replace(/{senderPhone}/g, senderPhone);

    console.log("Sending reveal SMS to:", victimPhone);
    console.log("Message:", smsBody);

    // Get Twilio credentials
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error("Missing Twilio credentials");
      return new Response(JSON.stringify({ error: "Missing Twilio credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append("To", victimPhone);
    formData.append("From", twilioPhoneNumber);
    formData.append("Body", smsBody);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioResult);
      return new Response(JSON.stringify({ error: "Failed to send SMS", details: twilioResult }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("SMS sent successfully:", twilioResult.sid);

    return new Response(JSON.stringify({ success: true, smsSid: twilioResult.sid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error sending reveal SMS:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
