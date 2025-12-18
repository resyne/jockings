import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to decrement current_calls and process queue
async function decrementCallerIdAndProcessQueue(supabase: SupabaseClient) {
  console.log("=== DECREMENTING CALLER ID AND PROCESSING QUEUE ===");
  
  // Find all caller IDs with current_calls > 0 and decrement one
  // We decrement based on which ones have active calls
  const { data: activeCallerIds } = await supabase
    .from("verified_caller_ids")
    .select("*")
    .gt("current_calls", 0)
    .order("current_calls", { ascending: false })
    .limit(1);
  
  if (activeCallerIds && activeCallerIds.length > 0) {
    const callerId = activeCallerIds[0];
    const newCount = Math.max(0, (callerId.current_calls || 1) - 1);
    
    await supabase
      .from("verified_caller_ids")
      .update({ current_calls: newCount })
      .eq("id", callerId.id);
    
    console.log(`Decremented caller ID ${callerId.phone_number}: ${callerId.current_calls} -> ${newCount}`);
  }
  
  // Check if there are queued calls to process
  const { data: queuedCalls } = await supabase
    .from("call_queue")
    .select("*")
    .eq("status", "queued")
    .order("position", { ascending: true })
    .limit(1);
  
  if (queuedCalls && queuedCalls.length > 0) {
    const nextCall = queuedCalls[0];
    console.log("Found queued call to process:", nextCall.prank_id);
    
    // Check if there's now capacity
    const { data: availableCallerIds } = await supabase
      .from("verified_caller_ids")
      .select("*")
      .eq("is_active", true)
      .not("vapi_phone_number_id", "is", null);
    
    const hasCapacity = availableCallerIds?.some(
      (cid: any) => (cid.current_calls || 0) < (cid.max_concurrent_calls || 1)
    );
    
    if (hasCapacity) {
      console.log("Capacity available, triggering call for queued prank:", nextCall.prank_id);
      
      // Update queue status to processing
      await supabase
        .from("call_queue")
        .update({ status: "processing", started_at: new Date().toISOString() })
        .eq("id", nextCall.id);
      
      // Trigger the call via edge function
      try {
        await supabase.functions.invoke("initiate-call-vapi", {
          body: { prankId: nextCall.prank_id }
        });
        
        // Mark queue entry as completed
        await supabase
          .from("call_queue")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", nextCall.id);
        
        console.log("Queued call initiated successfully");
      } catch (error) {
        console.error("Error initiating queued call:", error);
        // Revert to queued status on error
        await supabase
          .from("call_queue")
          .update({ status: "queued" })
          .eq("id", nextCall.id);
      }
    } else {
      console.log("No capacity available yet for queued calls");
    }
  } else {
    console.log("No queued calls to process");
  }
}

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

    // Handle end-of-call-report which contains recording URL and call duration
    if (messageType === "end-of-call-report") {
      console.log("=== END OF CALL REPORT ===");
      const reportCallId = body.message?.call?.id;
      // Recording URL can be in multiple locations depending on VAPI version
      const recordingUrl = body.message?.recordingUrl 
        || body.message?.artifact?.recordingUrl
        || body.message?.artifact?.recording?.url
        || body.message?.call?.recordingUrl;
      const endedReason = body.message?.endedReason || body.message?.call?.endedReason;
      
      // Get call duration in seconds
      const durationSeconds = body.message?.durationSeconds 
        || body.message?.call?.duration
        || body.message?.artifact?.duration
        || 0;
      
      // Get conversation transcript from artifact
      const artifactMessages = body.message?.artifact?.messages;
      
      // Check if call was answered (customer picked up)
      const wasAnswered = endedReason !== "customer-did-not-answer" 
        && endedReason !== "no-answer"
        && endedReason !== "customer-busy"
        && endedReason !== "busy";
      
      const isFailed = endedReason?.includes("error") || endedReason?.includes("failed");
      
      console.log("Report Call ID:", reportCallId);
      console.log("Recording URL:", recordingUrl);
      console.log("Ended Reason:", endedReason);
      console.log("Duration (seconds):", durationSeconds);
      console.log("Was Answered:", wasAnswered);
      console.log("Is Failed:", isFailed);
      console.log("Artifact Messages:", artifactMessages?.length || 0);
      
      if (reportCallId) {
        let newStatus = "completed";
        if (recordingUrl) {
          newStatus = "recording_available";
        } else if (endedReason === "customer-did-not-answer" || endedReason === "no-answer") {
          newStatus = "no_answer";
        } else if (endedReason === "customer-busy" || endedReason === "busy") {
          newStatus = "busy";
        } else if (isFailed) {
          newStatus = "failed";
        }
        
        const updateData: { call_status: string; recording_url?: string; conversation_history?: unknown[] } = {
          call_status: newStatus,
        };
        
        if (recordingUrl) {
          updateData.recording_url = recordingUrl;
        }
        
        // Save conversation history from artifact messages if available
        if (artifactMessages && Array.isArray(artifactMessages) && artifactMessages.length > 0) {
          const conversationHistory = artifactMessages
            .filter((msg: any) => msg.role !== "system")
            .map((msg: any) => ({
              role: msg.role === "bot" ? "assistant" : (msg.role === "user" ? "user" : msg.role),
              content: msg.message || msg.content || "",
              timestamp: msg.time ? new Date(msg.time * 1000).toISOString() : new Date().toISOString()
            }));
          
          if (conversationHistory.length > 0) {
            updateData.conversation_history = conversationHistory;
            console.log("Saving conversation history with", conversationHistory.length, "messages");
          }
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
        
        // === DECREMENT CURRENT_CALLS AND PROCESS QUEUE ===
        await decrementCallerIdAndProcessQueue(supabase);
        
        // === PRANK CONSUMPTION LOGIC ===
        // Fetch prank to get user_id
        const { data: prankData } = await supabase
          .from("pranks")
          .select("user_id")
          .eq("twilio_call_sid", reportCallId)
          .maybeSingle();
        
        if (prankData?.user_id) {
          // Fetch consumption settings
          const { data: settings } = await supabase
            .from("app_settings")
            .select("key, value")
            .in("key", ["prank_min_duration", "prank_require_answered", "prank_count_failed"]);
          
          // Parse settings with defaults
          let minDuration = 30;
          let requireAnswered = true;
          let countFailed = false;
          
          settings?.forEach((s: { key: string; value: string }) => {
            if (s.key === "prank_min_duration") minDuration = parseInt(s.value) || 30;
            if (s.key === "prank_require_answered") requireAnswered = s.value === "true";
            if (s.key === "prank_count_failed") countFailed = s.value === "true";
          });
          
          console.log("=== CONSUMPTION RULES ===");
          console.log("Min Duration:", minDuration, "| Require Answered:", requireAnswered, "| Count Failed:", countFailed);
          
          // Determine if prank should be consumed
          let shouldConsume = true;
          
          // Check if call was answered (if required)
          if (requireAnswered && !wasAnswered) {
            console.log("Prank NOT consumed: call was not answered");
            shouldConsume = false;
          }
          
          // Check duration
          if (shouldConsume && minDuration > 0 && durationSeconds < minDuration) {
            console.log(`Prank NOT consumed: duration ${durationSeconds}s < minimum ${minDuration}s`);
            shouldConsume = false;
          }
          
          // Check if failed calls should be excluded
          if (shouldConsume && isFailed && !countFailed) {
            console.log("Prank NOT consumed: call failed and countFailed is disabled");
            shouldConsume = false;
          }
          
          // Decrement available_pranks if rules are satisfied
          if (shouldConsume) {
            console.log("=== CONSUMING PRANK ===");
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("available_pranks")
              .eq("user_id", prankData.user_id)
              .maybeSingle();
            
            if (profile && !profileError) {
              const currentPranks = profile.available_pranks || 0;
              const newPranks = Math.max(0, currentPranks - 1);
              
              const { error: updateError } = await supabase
                .from("profiles")
                .update({ available_pranks: newPranks })
                .eq("user_id", prankData.user_id);
              
              if (updateError) {
                console.error("Error decrementing pranks:", updateError);
              } else {
                console.log(`Pranks decremented: ${currentPranks} -> ${newPranks}`);
              }
            }
          }
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
        
      case "conversation-update":
        // Handle real-time conversation updates
        console.log("=== CONVERSATION UPDATE EVENT ===");
        const messages = body.message?.messages || body.message?.artifact?.messages;
        
        if (messages && Array.isArray(messages) && callId) {
          // Filter out system messages and format for display
          const conversationHistory = messages
            .filter((msg: any) => msg.role !== "system")
            .map((msg: any) => ({
              role: msg.role === "bot" ? "assistant" : msg.role,
              content: msg.message || msg.content || "",
              timestamp: msg.time ? new Date(msg.time).toISOString() : new Date().toISOString()
            }));
          
          console.log("Updating conversation history with", conversationHistory.length, "messages");
          
          const { error: convError } = await supabase
            .from("pranks")
            .update({ conversation_history: conversationHistory })
            .eq("twilio_call_sid", callId);
          
          if (convError) {
            console.error("Error updating conversation:", convError);
          } else {
            console.log("Conversation updated successfully");
          }
        }
        break;

      case "speech-update":
      case "function-call":
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
