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
    console.log("=== PROCESS SCHEDULED REVEAL SMS ===");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find pranks where reveal SMS is scheduled, time has passed, and not yet sent
    const { data: pendingSms, error: fetchError } = await supabase
      .from("pranks")
      .select("id")
      .eq("send_reveal_sms", true)
      .eq("reveal_sms_sent", false)
      .not("reveal_sms_scheduled_at", "is", null)
      .lte("reveal_sms_scheduled_at", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching pending SMS:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${pendingSms?.length || 0} pending reveal SMS to send`);

    const results = [];

    for (const prank of (pendingSms || [])) {
      try {
        console.log(`Sending reveal SMS for prank ${prank.id}`);
        const { error: smsError } = await supabase.functions.invoke("send-reveal-sms", {
          body: { prankId: prank.id }
        });

        // Mark as sent regardless of SMS delivery outcome to avoid retries
        await supabase
          .from("pranks")
          .update({ reveal_sms_sent: true })
          .eq("id", prank.id);

        if (smsError) {
          console.error(`Error sending SMS for prank ${prank.id}:`, smsError);
          results.push({ prankId: prank.id, success: false, error: smsError.message });
        } else {
          console.log(`SMS sent successfully for prank ${prank.id}`);
          results.push({ prankId: prank.id, success: true });
        }
      } catch (err) {
        console.error(`Exception for prank ${prank.id}:`, err);
        await supabase
          .from("pranks")
          .update({ reveal_sms_sent: true })
          .eq("id", prank.id);
        results.push({ prankId: prank.id, success: false, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error processing scheduled SMS:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
