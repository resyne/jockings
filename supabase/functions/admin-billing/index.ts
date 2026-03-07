import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Unauthorized");

    const userId = claimsData.claims.sub;

    // Check admin role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) throw new Error("Admin access required");

    const results: Record<string, any> = {};

    // ── Twilio Balance ──
    try {
      const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
      if (twilioSid && twilioAuth) {
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Balance.json`,
          {
            headers: {
              Authorization: "Basic " + btoa(`${twilioSid}:${twilioAuth}`),
            },
          }
        );
        const data = await res.json();
        results.twilio = {
          balance: parseFloat(data.balance || "0"),
          currency: data.currency || "USD",
          status: "ok",
        };
      } else {
        results.twilio = { status: "not_configured" };
      }
    } catch (e: any) {
      console.error("Twilio balance error:", e.message);
      results.twilio = { status: "error", message: e.message };
    }

    // ── VAPI Balance ──
    try {
      const vapiKey = Deno.env.get("VAPI_API_KEY");
      if (vapiKey) {
        // VAPI doesn't have a direct balance endpoint in their public API
        // We'll fetch org info which may include billing
        const res = await fetch("https://api.vapi.ai/org", {
          headers: { Authorization: `Bearer ${vapiKey}` },
        });
        if (res.ok) {
          const data = await res.json();
          results.vapi = {
            name: data.name || "N/A",
            plan: data.subscription?.plan || data.plan || "N/A",
            balance: data.balance ?? data.hipaaEnabled ?? null,
            concurrencyLimit: data.concurrencyLimit || null,
            status: "ok",
            raw: {
              billingLimit: data.subscription?.monthlyChargeLimit || null,
            },
          };
        } else {
          const errText = await res.text();
          results.vapi = { status: "error", message: errText };
        }
      } else {
        results.vapi = { status: "not_configured" };
      }
    } catch (e: any) {
      console.error("VAPI balance error:", e.message);
      results.vapi = { status: "error", message: e.message };
    }

    // ── Stripe Balance ──
    try {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (stripeKey) {
        const res = await fetch("https://api.stripe.com/v1/balance", {
          headers: { Authorization: `Bearer ${stripeKey}` },
        });
        const data = await res.json();
        if (res.ok) {
          const available = data.available?.[0] || {};
          const pending = data.pending?.[0] || {};
          results.stripe = {
            available: (available.amount || 0) / 100,
            pending: (pending.amount || 0) / 100,
            currency: available.currency || "eur",
            status: "ok",
          };
        } else {
          results.stripe = { status: "error", message: data.error?.message };
        }
      } else {
        results.stripe = { status: "not_configured" };
      }
    } catch (e: any) {
      console.error("Stripe balance error:", e.message);
      results.stripe = { status: "error", message: e.message };
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error instanceof Error && error.message.includes("nauthorized") ? 401 : 500,
    });
  }
});
