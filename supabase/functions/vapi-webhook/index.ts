import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    console.log("=== VAPI WEBHOOK RECEIVED ===");
    console.log("Event type:", body.message?.type);
    console.log("Call ID:", body.message?.call?.id);
    console.log("Full payload:", JSON.stringify(body, null, 2));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const messageType = body.message?.type;
    const callId = body.message?.call?.id;

    if (!callId) {
      console.log("No call ID in webhook, skipping");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map VAPI status to our call_status
    let newStatus: string | null = null;
    let recordingUrl: string | null = null;

    switch (messageType) {
      case "call-started":
        newStatus = "in_progress";
        break;
      case "call-ringing":
        newStatus = "ringing";
        break;
      case "call-answered":
        newStatus = "in_progress";
        break;
      case "call-ended":
        // Check end reason
        const endReason = body.message?.call?.endedReason;
        console.log("Call ended reason:", endReason);
        
        if (endReason === "customer-did-not-answer" || endReason === "no-answer") {
          newStatus = "no_answer";
        } else if (endReason === "customer-busy" || endReason === "busy") {
          newStatus = "busy";
        } else if (endReason === "customer-ended-call" || endReason === "assistant-ended-call" || endReason === "max-duration-reached") {
          newStatus = "completed";
        } else if (endReason?.includes("error") || endReason?.includes("failed")) {
          newStatus = "failed";
        } else {
          newStatus = "completed";
        }

        // Check for recording URL
        recordingUrl = body.message?.call?.recordingUrl || body.message?.call?.artifact?.recordingUrl;
        if (recordingUrl) {
          console.log("Recording URL found:", recordingUrl);
          newStatus = "recording_available";
        }
        break;
      
      case "recording-completed":
        recordingUrl = body.message?.recording?.url || body.message?.recordingUrl;
        if (recordingUrl) {
          newStatus = "recording_available";
          console.log("Recording completed:", recordingUrl);
        }
        break;

      case "transcript":
      case "speech-update":
      case "function-call":
        // These are informational, don't update status
        console.log("Informational event, no status update");
        break;

      default:
        console.log("Unknown event type:", messageType);
    }

    // Update the prank in the database if we have a status change
    if (newStatus) {
      console.log(`Updating prank with VAPI call ID ${callId} to status: ${newStatus}`);
      
      const updateData: { call_status: string; recording_url?: string } = {
        call_status: newStatus,
      };
      
      if (recordingUrl) {
        updateData.recording_url = recordingUrl;
      }

      const { data, error } = await supabase
        .from("pranks")
        .update(updateData)
        .eq("twilio_call_sid", callId);

      if (error) {
        console.error("Error updating prank:", error);
      } else {
        console.log("Prank updated successfully");
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
