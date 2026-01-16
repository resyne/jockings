// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const STRIPE_VERSION = "2025-08-27.basil";

async function stripeGet(path: string) {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

  const res = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Stripe-Version": STRIPE_VERSION,
    },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || `Stripe error: ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
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

    // Check if this session was already processed
    const { data: existingPayment, error: checkError } = await supabaseClient
      .from("processed_payments")
      .select("id, pranks_added")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing payment:", checkError);
    }

    if (existingPayment) {
      console.log("=== SESSION ALREADY PROCESSED ===", existingPayment);

      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("available_pranks")
        .eq("user_id", user.id)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          pranks_added: existingPayment.pranks_added,
          total_pranks: profile?.available_pranks || 0,
          already_processed: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Retrieve the checkout session
    const session = await stripeGet(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
    console.log("Session status:", session.payment_status);
    console.log("Session metadata:", session.metadata);

    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Payment not completed",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Verify the user_id matches
    if (session.metadata?.user_id !== user.id) {
      throw new Error("User ID mismatch");
    }

    const pranksToAdd = parseInt(session.metadata?.pranks_to_add || "0");
    const amountPaid = session.amount_total ? session.amount_total / 100 : null;
    const currency = session.currency || "eur";
    const packageType = session.metadata?.package_type || null;
    console.log("Pranks to add:", pranksToAdd, "Amount:", amountPaid, currency);

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

    // Record this payment as processed to prevent duplicates
    const { error: insertError } = await supabaseClient
      .from("processed_payments")
      .insert({
        session_id: sessionId,
        user_id: user.id,
        pranks_added: pranksToAdd,
        amount_paid: amountPaid,
        currency: currency,
        package_type: packageType,
      });

    if (insertError) {
      console.error("Error recording processed payment:", insertError);
      // Don't throw - the pranks were already added
    }

    // Record promo code usage if one was used
    const promoCodeId = session.metadata?.promo_code_id;
    if (promoCodeId) {
      console.log("Recording promo code usage:", promoCodeId);
      const { error: promoError } = await supabaseClient
        .from("promo_code_uses")
        .insert({
          promo_code_id: promoCodeId,
          user_id: user.id,
          session_id: sessionId,
        });

      if (promoError) {
        console.error("Error recording promo code use:", promoError);
      } else {
        console.log("Promo code usage recorded successfully");
      }
    }

    console.log("=== PAYMENT VERIFIED - PRANKS ADDED ===");

    return new Response(
      JSON.stringify({
        success: true,
        pranks_added: pranksToAdd,
        total_pranks: newPranks,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    console.error("=== VERIFY-PAYMENT ERROR ===", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
