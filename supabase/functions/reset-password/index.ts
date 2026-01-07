import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, newPassword } = await req.json();
    
    if (!token || !newPassword) {
      throw new Error("Token e password sono richiesti");
    }

    if (newPassword.length < 8) {
      throw new Error("La password deve avere almeno 8 caratteri");
    }

    console.log(`[RESET-PASSWORD] Attempting reset with token`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find and validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("token", token)
      .is("used_at", null)
      .maybeSingle();

    if (tokenError) {
      console.error("[RESET-PASSWORD] Error fetching token:", tokenError);
      throw new Error("Errore nel validare il token");
    }

    if (!tokenData) {
      console.log("[RESET-PASSWORD] Token not found or already used");
      throw new Error("Link non valido o già utilizzato");
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log("[RESET-PASSWORD] Token expired");
      throw new Error("Link scaduto. Richiedi un nuovo reset.");
    }

    // Update user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      tokenData.user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("[RESET-PASSWORD] Error updating password:", updateError);
      throw new Error("Errore nell'aggiornare la password");
    }

    // Mark token as used
    await supabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenData.id);

    console.log("[RESET-PASSWORD] Password reset successful for user:", tokenData.user_id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[RESET-PASSWORD] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
