import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Unauthorized");

    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Not admin");

    const { action, ticketId, category, message, userEmail, recipientEmail, responseText, adminNotes } = await req.json();

    if (action === "generate") {
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

      const categoryLabels: Record<string, string> = {
        bug: "Bug / Errore tecnico",
        suggestion: "Suggerimento di miglioramento",
        payment: "Problema con il pagamento",
        other: "Richiesta generica",
      };

      const systemPrompt = `Sei l'assistente di supporto di Sarano, un'app italiana per scherzi telefonici con AI. 
Scrivi risposte professionali, empatiche e in italiano. 
Il tono deve essere amichevole ma professionale.
Firma sempre come "Il Team Sarano".
NON usare markdown, scrivi in testo semplice.
Includi sempre un saluto iniziale personalizzato.`;

      const userPrompt = `Un utente ha inviato un ticket di supporto:
- Categoria: ${categoryLabels[category] || category}
- Email: ${userEmail || "non fornita"}
- Messaggio: "${message}"

Genera una risposta appropriata per comunicare che abbiamo preso in carico la segnalazione e, se è un bug, che è stato risolto. Sii specifico nel riferire al problema menzionato dall'utente.`;

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        console.error("AI error:", aiRes.status, errText);
        throw new Error("AI generation failed");
      }

      const aiData = await aiRes.json();
      const generatedText = aiData.choices?.[0]?.message?.content || "Impossibile generare risposta.";

      // Save AI response to ticket
      await supabase
        .from("support_tickets")
        .update({ ai_response: generatedText, status: "in_progress", updated_at: new Date().toISOString() })
        .eq("id", ticketId);

      return new Response(JSON.stringify({ response: generatedText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send") {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!resendKey) throw new Error("RESEND_API_KEY not configured");

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #7c3aed; margin: 0;">Sarano - Supporto</h2>
          </div>
          <div style="background: #f9fafb; border-radius: 12px; padding: 24px; line-height: 1.6;">
            ${responseText.replace(/\n/g, "<br>")}
          </div>
          <div style="margin-top: 24px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>Questa email è stata inviata dal team di supporto di Sarano.</p>
            <p>Se non hai richiesto assistenza, puoi ignorare questo messaggio.</p>
          </div>
        </div>
      `;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Sarano Supporto <noreply@sarano.ai>",
          to: [recipientEmail],
          subject: "Aggiornamento sulla tua segnalazione - Sarano",
          html: htmlBody,
        }),
      });

      const emailData = await res.json();
      if (!res.ok) {
        console.error("Resend error:", emailData);
        throw new Error(emailData?.message || "Email send failed");
      }

      // Update ticket
      await supabase
        .from("support_tickets")
        .update({
          status: "resolved",
          ai_response: responseText,
          admin_notes: adminNotes || null,
          responded_at: new Date().toISOString(),
          responded_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error: unknown) {
    console.error("ticket-ai-reply error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
