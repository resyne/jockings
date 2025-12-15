import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { sessionId } = await req.json();
    console.log("=== VERIFY-PAYMENT ===");
    console.log("Session ID:", sessionId);

    if (!sessionId) {
      throw new Error("Missing session ID");
    }

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    console.log("User ID:", user.id);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log("Session status:", session.payment_status);
    console.log("Session metadata:", session.metadata);

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Payment not completed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify the user_id matches
    if (session.metadata?.user_id !== user.id) {
      throw new Error("User ID mismatch");
    }

    const pranksToAdd = parseInt(session.metadata?.pranks_to_add || "0");
    console.log("Pranks to add:", pranksToAdd);

    // Get current pranks count
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("available_pranks")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      throw new Error("Failed to fetch user profile");
    }

    const currentPranks = profile?.available_pranks || 0;
    const newPranks = currentPranks + pranksToAdd;

    console.log("Current pranks:", currentPranks, "New total:", newPranks);

    // Update user's available_pranks
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({ available_pranks: newPranks })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      throw new Error("Failed to update pranks count");
    }

    console.log("=== PAYMENT VERIFIED - PRANKS ADDED ===");

    return new Response(JSON.stringify({ 
      success: true, 
      pranks_added: pranksToAdd,
      total_pranks: newPranks 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("=== VERIFY-PAYMENT ERROR ===", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
