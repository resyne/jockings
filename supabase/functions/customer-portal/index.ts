// @ts-nocheck
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    console.log("[CUSTOMER-PORTAL] User:", user.email);

    // Find Stripe customer
    const customers = await stripeRequest("GET", "/customers", undefined, {
      email: user.email,
      limit: "1",
    });

    if (!customers?.data?.length) {
      throw new Error("Nessun account Stripe trovato per questo utente");
    }

    const customerId = customers.data[0].id;
    console.log("[CUSTOMER-PORTAL] Customer:", customerId);

    const origin = req.headers.get("origin") || "https://jockings.lovable.app";

    // Create portal session
    const portalParams = new URLSearchParams();
    portalParams.set("customer", customerId);
    portalParams.set("return_url", `${origin}/settings`);

    const portalSession = await stripeRequest("POST", "/billing_portal/sessions", portalParams);
    console.log("[CUSTOMER-PORTAL] Portal session created:", portalSession.id);

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("[CUSTOMER-PORTAL] ERROR:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
