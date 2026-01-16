// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIPE_API_BASE = "https://api.stripe.com/v1";

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
    // Verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Important: propagate the caller JWT to PostgREST (RLS) queries
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle() as { data: { role: string } | null };

    if (!roleData) {
      throw new Error("Unauthorized: Admin access required");
    }

    console.log("=== LIST SUBSCRIPTIONS ===");
    console.log("Admin user:", user.email);

    // Fetch all subscriptions from Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    
    const subsUrl = `${STRIPE_API_BASE}/subscriptions?limit=100&expand[]=data.customer`;
    const subsRes = await fetch(subsUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
      },
    });
    
    const subscriptions = await subsRes.json();
    if (!subsRes.ok) {
      throw new Error(subscriptions?.error?.message || "Failed to fetch subscriptions");
    }

    console.log("Found subscriptions:", subscriptions.data?.length || 0);

    // Map subscriptions to a simpler format
    const mappedSubscriptions = (subscriptions.data || []).map((sub: any) => ({
      id: sub.id,
      status: sub.status,
      customer_email: sub.customer?.email || "N/A",
      customer_name: sub.customer?.name || sub.customer?.email || "N/A",
      amount: sub.items?.data?.[0]?.price?.unit_amount ? sub.items.data[0].price.unit_amount / 100 : 0,
      currency: sub.items?.data?.[0]?.price?.currency || "eur",
      interval: sub.items?.data?.[0]?.price?.recurring?.interval || "month",
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      created: sub.created,
      canceled_at: sub.canceled_at,
      cancel_at_period_end: sub.cancel_at_period_end,
      metadata: sub.metadata,
    }));

    return new Response(JSON.stringify({ subscriptions: mappedSubscriptions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("=== LIST SUBSCRIPTIONS ERROR ===", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
