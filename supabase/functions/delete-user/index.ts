// @ts-nocheck
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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Invalid token");
    }

    // Check if user is admin
    const { data: adminCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminCheck) {
      throw new Error("Unauthorized: Admin access required");
    }

    const { user_id } = await req.json();

    if (!user_id) {
      throw new Error("user_id is required");
    }

    // Prevent self-deletion
    if (user_id === userData.user.id) {
      throw new Error("Cannot delete your own account");
    }

    console.log(`=== DELETING USER ${user_id} ===`);

    // Get user's prank IDs first for cleaning up related tables
    const { data: userPranks } = await supabaseAdmin
      .from("pranks")
      .select("id")
      .eq("user_id", user_id);

    const prankIds = (userPranks || []).map((p) => p.id);

    // Delete all related data in correct order (child tables first)
    // 1. Prank disclaimer acceptances (references pranks)
    if (prankIds.length > 0) {
      await supabaseAdmin
        .from("prank_disclaimer_acceptances")
        .delete()
        .in("prank_id", prankIds);
      console.log(`Deleted disclaimer acceptances for ${prankIds.length} pranks`);

      // 2. Call queue entries (references pranks)
      await supabaseAdmin
        .from("call_queue")
        .delete()
        .in("prank_id", prankIds);
      console.log(`Deleted call queue entries`);
    }

    // 3. Pranks
    const { error: pranksError } = await supabaseAdmin
      .from("pranks")
      .delete()
      .eq("user_id", user_id);
    console.log(`Deleted pranks: ${pranksError ? pranksError.message : "OK"}`);

    // 4. Processed payments
    const { error: paymentsError } = await supabaseAdmin
      .from("processed_payments")
      .delete()
      .eq("user_id", user_id);
    console.log(`Deleted payments: ${paymentsError ? paymentsError.message : "OK"}`);

    // 5. Promo code uses
    const { error: promoError } = await supabaseAdmin
      .from("promo_code_uses")
      .delete()
      .eq("user_id", user_id);
    console.log(`Deleted promo uses: ${promoError ? promoError.message : "OK"}`);

    // 6. Support tickets
    const { error: ticketsError } = await supabaseAdmin
      .from("support_tickets")
      .delete()
      .eq("user_id", user_id);
    console.log(`Deleted tickets: ${ticketsError ? ticketsError.message : "OK"}`);

    // 7. Voice settings audit log
    const { error: auditError } = await supabaseAdmin
      .from("voice_settings_audit_log")
      .delete()
      .eq("user_id", user_id);
    console.log(`Deleted audit log: ${auditError ? auditError.message : "OK"}`);

    // 8. User roles
    const { error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", user_id);
    console.log(`Deleted user roles: ${rolesError ? rolesError.message : "OK"}`);

    // 9. Password reset tokens
    const { error: tokensError } = await supabaseAdmin
      .from("password_reset_tokens")
      .delete()
      .eq("user_id", user_id);
    console.log(`Deleted reset tokens: ${tokensError ? tokensError.message : "OK"}`);

    // 10. Profile (last, as other tables might reference user_id)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("user_id", user_id);
    console.log(`Deleted profile: ${profileError ? profileError.message : "OK"}`);

    // 11. Finally delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteError) {
      throw deleteError;
    }

    console.log(`=== USER ${user_id} FULLY DELETED by admin ${userData.user.id} ===`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error deleting user:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
