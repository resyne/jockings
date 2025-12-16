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

    // Handle end-of-call-report which contains recording URL
    if (messageType === "end-of-call-report") {
      console.log("=== END OF CALL REPORT ===");
      const reportCallId = body.message?.call?.id;
      // Recording URL can be in multiple locations depending on VAPI version
      const recordingUrl = body.message?.recordingUrl 
        || body.message?.artifact?.recordingUrl
        || body.message?.artifact?.recording?.url
        || body.message?.call?.recordingUrl;
      const endedReason = body.message?.endedReason || body.message?.call?.endedReason;
      
      console.log("Report Call ID:", reportCallId);
      console.log("Recording URL:", recordingUrl);
      console.log("Ended Reason:", endedReason);
      
      if (reportCallId) {
        let newStatus = "completed";
        if (recordingUrl) {
          newStatus = "recording_available";
        } else if (endedReason === "customer-did-not-answer" || endedReason === "no-answer") {
          newStatus = "no_answer";
        } else if (endedReason === "customer-busy" || endedReason === "busy") {
          newStatus = "busy";
        } else if (endedReason?.includes("error") || endedReason?.includes("failed")) {
          newStatus = "failed";
        }
        
        const updateData: { call_status: string; recording_url?: string } = {
          call_status: newStatus,
        };
        
        if (recordingUrl) {
          updateData.recording_url = recordingUrl;
        }
        
        const { error } = await supabase
          .from("pranks")
          .update(updateData)
          .eq("twilio_call_sid", reportCallId);

        if (error) {
          console.error("Error updating prank from end-of-call-report:", error);
        } else {
          console.log("Prank updated from end-of-call-report:", newStatus);
        }
      }
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      case "status-update":
        const status = body.message?.status;
        console.log("Status update:", status);
        if (status === "ringing") {
          newStatus = "ringing";
        } else if (status === "in-progress") {
          newStatus = "in_progress";
        } else if (status === "ended") {
          newStatus = "completed";
        }
        break;
        
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

        // Check for recording URL in call-ended event
        recordingUrl = body.message?.call?.recordingUrl || body.message?.call?.artifact?.recordingUrl;
        if (recordingUrl) {
          console.log("Recording URL found in call-ended:", recordingUrl);
          newStatus = "recording_available";
        }
        break;

      case "transcript":
        // Handle transcript updates for live display
        console.log("=== TRANSCRIPT EVENT ===");
        const transcriptRole = body.message?.role; // "user" or "assistant"
        const transcriptText = body.message?.transcript;
        
        if (transcriptRole && transcriptText && callId) {
          console.log(`Transcript from ${transcriptRole}: ${transcriptText}`);
          
          // Fetch current conversation history
          const { data: prankData } = await supabase
            .from("pranks")
            .select("conversation_history")
            .eq("twilio_call_sid", callId)
            .single();
          
          const currentHistory = (prankData?.conversation_history as any[]) || [];
          const newMessage = {
            role: transcriptRole === "bot" ? "assistant" : transcriptRole,
            content: transcriptText,
            timestamp: new Date().toISOString()
          };
          
          // Append new message to history
          const updatedHistory = [...currentHistory, newMessage];
          
          const { error: updateError } = await supabase
            .from("pranks")
            .update({ conversation_history: updatedHistory })
            .eq("twilio_call_sid", callId);
          
          if (updateError) {
            console.error("Error updating transcript:", updateError);
          } else {
            console.log("Transcript updated successfully");
          }
        }
        break;
        
      case "speech-update":
      case "function-call":
      case "conversation-update":
      case "tool-calls":
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
