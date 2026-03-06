// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Get prank data including encrypted fields
    const { data: prank, error: prankError } = await supabase
      .from("pranks")
      .select("send_reveal_sms, reveal_sender_name, user_id, victim_phone")
      .eq("id", prankId)
      .single();

    if (prankError || !prank) {
      console.error("Error fetching prank:", prankError);
      return new Response(JSON.stringify({ error: "Prank not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!prank.send_reveal_sms) {
      console.log("Reveal SMS not enabled for this prank");
      return new Response(JSON.stringify({ success: false, message: "Reveal SMS not enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decrypt victim phone using the database function directly
    const { data: decryptedPhone, error: decryptError } = await supabase
      .rpc("decrypt_victim_data", { encrypted_text: prank.victim_phone });

    if (decryptError || !decryptedPhone) {
      console.error("Error decrypting victim phone:", decryptError);
      return new Response(JSON.stringify({ error: "Could not decrypt victim phone" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const victimPhone = decryptedPhone as string;

    if (!victimPhone) {
      console.error("Victim phone not found");
      return new Response(JSON.stringify({ error: "Victim phone not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the SMS message
    const senderName = prank.reveal_sender_name || "Un amico";
    const smsBody = `Sarano AI: la chiamata ricevuta era parte di uno scherzo.\n\nInviato da: ${senderName} (tramite Sarano AI).`;

    console.log("Sending reveal SMS to:", victimPhone);
    console.log("Sender name:", senderName);

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
