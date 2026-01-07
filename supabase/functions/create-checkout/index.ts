import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const STRIPE_VERSION = "2025-08-27.basil";

async function stripeRequest(
  method: "GET" | "POST",
  path: string,
  body?: URLSearchParams,
  query?: Record<string, string>,
) {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

  const url = new URL(`${STRIPE_API_BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      "Stripe-Version": STRIPE_VERSION,
    },
    body: method === "POST" ? body?.toString() : undefined,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || `Stripe error: ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// Price IDs from Stripe (LIVE)
const PRICES = {
  pack_10: "price_1Sg65pB6NXLO6CywoqK0Elxv", // €24.99 - 10 pranks
  pack_3: "price_1Sg69SB6NXLO6CywE0CR8XQb", // €9.99 - 3 pranks
  pack_1: "price_1Sg6AjB6NXLO6CywA3CNRbCu", // €3.99 - 1 prank
  subscription: "price_1Sg6BUB6NXLO6CywSCZFn66D", // €9.99/month - 5 pranks
} as const;

type PackageType = keyof typeof PRICES;

// Pranks per package
const PRANKS_PER_PACKAGE: Record<PackageType, number> = {
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
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const { packageType, promoCodeId, promoCode } = await req.json();
    console.log("=== CREATE-CHECKOUT ===");
    console.log("Package type:", packageType);
    console.log("Promo code ID:", promoCodeId);
    console.log("Promo code:", promoCode);

    if (!packageType || !(packageType in PRICES)) {
      throw new Error("Invalid package type");
    }

    const typedPackage = packageType as PackageType;
    const priceId = PRICES[typedPackage];
    const isSubscription = typedPackage === "subscription";
    const pranksToAdd = PRANKS_PER_PACKAGE[typedPackage];

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    console.log("User:", user.email, "User ID:", user.id);

    // Validate promo code if provided
    let stripeCouponId: string | undefined;
    let discountPercentage = 0;

    if (promoCodeId && promoCode) {
      console.log("Validating promo code...");

      const { data: promoCodeData, error: promoError } = await supabaseAdmin
        .from("promo_codes")
        .select("*")
        .eq("id", promoCodeId)
        .eq("code", promoCode)
        .eq("is_active", true)
        .single();

      if (promoError || !promoCodeData) {
        console.error("Promo code validation failed:", promoError);
        throw new Error("Codice promo non valido");
      }

      if (promoCodeData.expires_at && new Date(promoCodeData.expires_at) < new Date()) {
        throw new Error("Codice promo scaduto");
      }

      if (promoCodeData.max_uses) {
        const { count } = await supabaseAdmin
          .from("promo_code_uses")
          .select("*", { count: "exact", head: true })
          .eq("promo_code_id", promoCodeId);

        if (count && count >= promoCodeData.max_uses) {
          throw new Error("Codice promo esaurito");
        }
      }

      const { data: existingUse } = await supabaseAdmin
        .from("promo_code_uses")
        .select("id")
        .eq("promo_code_id", promoCodeId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingUse) {
        throw new Error("Hai già utilizzato questo codice promo");
      }

      discountPercentage = promoCodeData.discount_percentage;
      console.log("Promo code valid, discount:", discountPercentage + "%");

      const couponParams = new URLSearchParams();
      couponParams.set("percent_off", String(discountPercentage));
      couponParams.set("duration", "once");
      couponParams.set("name", `Promo ${promoCode}`);

      const coupon = await stripeRequest("POST", "/coupons", couponParams);
      stripeCouponId = coupon.id;
      console.log("Created Stripe coupon:", stripeCouponId);
    }

    // Find Stripe customer by email
    const customers = await stripeRequest("GET", "/customers", undefined, {
      email: user.email,
      limit: "1",
    });

    const customerId = Array.isArray(customers?.data) && customers.data.length > 0
      ? customers.data[0].id
      : undefined;

    if (customerId) {
      console.log("Found existing customer:", customerId);
    }

    const origin = req.headers.get("origin") || "https://vtsankkghplkfhrlxefs.lovableproject.com";

    const sessionParams = new URLSearchParams();
    if (customerId) sessionParams.set("customer", customerId);
    else sessionParams.set("customer_email", user.email);

    sessionParams.set("mode", isSubscription ? "subscription" : "payment");
    sessionParams.set(
      "success_url",
      `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&pranks=${pranksToAdd}&package=${typedPackage}`,
    );
    sessionParams.set("cancel_url", `${origin}/pricing`);

    sessionParams.set("line_items[0][price]", priceId);
    sessionParams.set("line_items[0][quantity]", "1");

    sessionParams.set("metadata[user_id]", user.id);
    sessionParams.set("metadata[package_type]", typedPackage);
    sessionParams.set("metadata[pranks_to_add]", pranksToAdd.toString());
    sessionParams.set("metadata[promo_code_id]", promoCodeId || "");
    sessionParams.set("metadata[promo_code]", promoCode || "");

    if (stripeCouponId) {
      sessionParams.set("discounts[0][coupon]", stripeCouponId);
    }

    if (isSubscription) {
      sessionParams.set("subscription_data[metadata][user_id]", user.id);
      sessionParams.set("subscription_data[metadata][package_type]", typedPackage);
      sessionParams.set("subscription_data[metadata][pranks_to_add]", pranksToAdd.toString());
    }

    const session = await stripeRequest("POST", "/checkout/sessions", sessionParams);
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
