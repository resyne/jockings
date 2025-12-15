import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Price IDs from Stripe
const PRICES = {
  pack_10: "price_1SekVmBG90OlMQuV86NSD7yz", // €24.99 - 10 pranks
  pack_3: "price_1SekWJBG90OlMQuVthD2sRIm",  // €9.99 - 3 pranks
  pack_1: "price_1SekY7BG90OlMQuVFlAhPr2k",  // €3.99 - 1 prank
  subscription: "price_1SekYXBG90OlMQuVJuuEJG9t", // €9.99/month - 5 pranks
};

// Pranks per package
const PRANKS_PER_PACKAGE: Record<string, number> = {
  pack_10: 10,
  pack_3: 3,
  pack_1: 1,
  subscription: 5,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Get request body
    const { packageType } = await req.json();
    console.log("=== CREATE-CHECKOUT ===");
    console.log("Package type:", packageType);

    if (!packageType || !PRICES[packageType as keyof typeof PRICES]) {
      throw new Error("Invalid package type");
    }

    const priceId = PRICES[packageType as keyof typeof PRICES];
    const isSubscription = packageType === "subscription";
    const pranksToAdd = PRANKS_PER_PACKAGE[packageType];

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    console.log("User:", user.email, "User ID:", user.id);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if a Stripe customer record exists for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("Found existing customer:", customerId);
    }

    const origin = req.headers.get("origin") || "https://vtsankkghplkfhrlxefs.lovableproject.com";
    
    // Create checkout session with metadata for webhook processing
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: isSubscription ? "subscription" : "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&pranks=${pranksToAdd}&package=${packageType}`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        user_id: user.id,
        package_type: packageType,
        pranks_to_add: pranksToAdd.toString(),
      },
    };

    // For subscriptions, add subscription_data with metadata
    if (isSubscription) {
      sessionParams.subscription_data = {
        metadata: {
          user_id: user.id,
          package_type: packageType,
          pranks_to_add: pranksToAdd.toString(),
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log("Checkout session created:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("=== CHECKOUT ERROR ===", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
